/**
* MIT License
*
* Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import { Diagnostic, RemoteConsole } from "vscode-languageserver";
import { ReportConfig } from "../reportConfig";
import { debugLogMessage, delgaCacher, getDocumentSettings, getFileSettings, packages, reportDiagnostics } from "../server";
import { PackageDEModule } from "./dragenginemodule";
import { PackageDSLanguage } from "./dslanguage";
import { Package } from "./package";
import { Minimatch } from "minimatch";
import { join, parse } from "path";
import { Stats, statSync } from "fs";
import { URI } from "vscode-uri";
import { DSSettings, FileSettings } from "../settings";
import yauzl = require('yauzl-promise');
import { Helpers } from "../helpers";
import { BaseCacheDelgaHandler } from "../delgaCacher";

export interface DelgaFileEntry {
	uri: string;
	entry: yauzl.Entry;
	filename: string;
};

class PackageCacheDelgaHandler extends BaseCacheDelgaHandler {
	private _entries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>();
	
	constructor (entries: Map<string,DelgaFileEntry>) {
		super();
		this._entries = entries;
	}
	
	async cacheDelga(cachePath: string): Promise<void> {
		for (const each of this._entries) {
			this.doCacheDelga(cachePath, each[1].entry, each[1].filename);
		}
	}
}

export class PackageBasePackage extends Package {
	private _uri: string;
	private _path: string;
	private _name: string;
	private _timerResolve?: NodeJS.Timeout;
	private _delgaFile?: yauzl.ZipFile;
	private _delgaFileEntries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>();
	
	
	constructor(console: RemoteConsole, uri: string) {
		super(console, `${PackageBasePackage.PACKAGE_PREFIX}${uri}`);
		this._uri = uri;
		this._path = URI.parse(uri).fsPath;
		this._name = parse(this._path).base;
	}
	
	public async dispose(): Promise<void> {
		this._delgaFileEntries.clear();
		await this._delgaFile?.close();
		this._delgaFile = undefined;
		await super.dispose();
	}
	
	public static readonly PACKAGE_PREFIX: string = "BasePackage:";
	
	
	public get uri(): string {
		return this._uri;
	}
	
	public get path(): string {
		return this._path;
	}
	
	public get name(): string {
		return this._name;
	}
	
	
	public resolveAllLater(): void {
		this.armResolveAll();
	}
	
	
	protected async loadPackage(): Promise<void> {
		let pkg: Package = packages.get(PackageDSLanguage.PACKAGE_ID)!;
		await pkg.load();
		
		const settings = await getDocumentSettings(this._uri);
		if (settings.requiresPackageDragengine) {
			let pkg: Package = packages.get(PackageDEModule.PACKAGE_ID)!;
			await pkg.load();
		}
		
		const fileSettings = await getFileSettings(this._uri);
		
		var stats: Stats | undefined;
		try {
			stats = statSync(this._path);
		} catch(err) {
			this._console.log(`BasePackage '${this._name}': Path not found. Skipping`);
		}
		
		const startTime = Date.now();
		
		if (stats?.isDirectory()) {
			await this.loadPackageDirectory(settings, fileSettings);
			
		} else if (stats?.isFile()) {
			if (this._path.endsWith('.delga') || this._path.endsWith('.deal')) {
				this._assignUri = false;
				await this.loadPackageDelga(settings, fileSettings);
				
			} else {
				this._console.log(`BasePackage '${this._name}': Not a DELGA file. Skipping`);
			}
			
		} else {
			this._console.log(`BasePackage '${this._name}': No directory nor file. Skipping`);
		}
		
		const elapsedTime = Date.now() - startTime;
		this._console.log(`BasePackage '${this._name}': Files scanned in ${elapsedTime / 1000}s found ${this._files.length} files`);
		
		await this.loadFiles();
		this.loadingFinished();
	}
	
	protected async loadPackageDirectory(settings: DSSettings, fileSettings: FileSettings): Promise<void> {
		this._console.log(`BasePackage '${this._name}': Scan files in directory`);
		
		const exclude: Minimatch[] = [];
		for (const pattern of Object.keys(fileSettings.exclude)) {
			if (fileSettings.exclude[pattern]) {
				const path = join(this._path, pattern);
				debugLogMessage(`exclude: '${pattern}' => '${path}'`);
				exclude.push(new Minimatch(path));
			}
		}
		
		await this.scanPackage(this._files, this._path, exclude);
	}
	
	protected async loadPackageDelga(settings: DSSettings, fileSettings: FileSettings): Promise<void> {
		this._console.log(`BasePackage '${this._name}': Scan files in DELGA`);
		
		const exclude: Minimatch[] = [];
		for (const pattern of Object.keys(fileSettings.exclude)) {
			if (fileSettings.exclude[pattern]) {
				const path = join(this._path, pattern);
				debugLogMessage(`exclude: '${pattern}' => '${path}'`);
				exclude.push(new Minimatch(path));
			}
		}
		
		try {
			this._delgaFile = await yauzl.open(this._path);
			for await (const each of this._delgaFile) {
				let filename = each.filename;
				filename = filename.replace(/\\/g, '/'); // windows zip spec violation protection
				
				if (exclude.find(m => m.match(filename))) {
					continue;
				}
				if (filename.endsWith('/')) {
					continue;
				}
				if (filename.endsWith('.ds')) {
					const uri = Helpers.createDelgaUri(this._path, filename);
					this._delgaFileEntries.set(uri, {uri: uri, entry: each, filename: filename});
				}
			}
		} catch(err) {
			this._console.log(`BasePackage '${this._name}': Reading DELGA file failed.`);
		}
		
		const delgaStats = statSync(this._path);
		const cachePath = await delgaCacher.checkCache(
			this._path, delgaStats.size, delgaStats.mtime.getTime(),
			new PackageCacheDelgaHandler(this._delgaFileEntries));
		
		if (cachePath) {
			const prev = new Map<string,DelgaFileEntry>(this._delgaFileEntries);
			this._delgaFileEntries.clear();
			
			for (const each of prev) {
				let uri = join(cachePath, ...each[1].filename.split("/"));
				each[1].uri = uri;
				this._delgaFileEntries.set(uri, each[1]);
			}
		}
		
		for await (const each of this._delgaFileEntries) {
			this._files.push(each[1].uri);
		}
	}
	
	protected async readFile(path: string): Promise<string> {
		if (path.startsWith("delga:/")) {
			const entry = this._delgaFileEntries.get(path);
			if (entry) {
				const stream = await entry.entry.openReadStream();
				const chunks = [];
				for await (const chunk of stream) {
					chunks.push(Buffer.from(chunk));
				}
				return Buffer.concat(chunks).toString("utf-8");
				
			} else {
				throw Error("Entry not find in DELGA file");
			}
			
		} else {
			return super.readFile(path);
		}
	}
	
	private armResolveAll(): void {
		if (this._timerResolve) {
			clearTimeout(this._timerResolve);
			this._timerResolve = undefined;
		}
		
		const myself = this;
		this._timerResolve = setTimeout(() => myself.resolveAll(new ReportConfig), 1000);
	}
	
	protected resolveLogDiagnostics(diagnostics: Diagnostic[], uri: string): void {
		reportDiagnostics(uri, diagnostics);
	}
}
