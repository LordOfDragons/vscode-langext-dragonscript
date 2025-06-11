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
import { debugLogMessage, getDocumentSettings, getFileSettings, packages, reportDiagnostics } from "../server";
import { PackageDEModule } from "./dragenginemodule";
import { PackageDSLanguage } from "./dslanguage";
import { Package } from "./package";
import { Minimatch } from "minimatch";
import { join, parse } from "path";
import { Stats, statSync } from "fs";
import { URI } from "vscode-uri";
import { DSSettings, FileSettings } from "../settings";
import yauzl = require('yauzl-promise');

export class PackageBasePackage extends Package {
	private _uri: string;
	private _path: string;
	private _name: string;
	private _timerResolve?: NodeJS.Timeout;
	private _delgaFile?: yauzl.ZipFile;
	private _delgaFileEntries: Map<string,yauzl.Entry> = new Map<string,yauzl.Entry>();
	
	
	constructor(console: RemoteConsole, uri: string) {
		super(console, `${PackageBasePackage.PACKAGE_PREFIX}${uri}`);
		this._uri = uri;
		this._path = URI.parse(uri).fsPath;
		this._name = parse(this._path).base;
	}
	
	public dispose(): void {
		this._delgaFileEntries.clear();
		this._delgaFile?.close();
		this._delgaFile = undefined;
		super.dispose();
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
				if (exclude.find(m => m.match(each.filename))) {
					continue;
				}
				if (each.filename.endsWith('/')) {
					continue;
				}
				if (each.filename.endsWith('.ds')) {
					const url = `delga://${each.filename}`;
					this._files.push(url);
					this._delgaFileEntries.set(url, each);
				}
			}
		} catch(err) {
			this._console.log(`BasePackage '${this._name}': Reading DELGA file failed.`);
		}
	}
	
	protected async readFile(path: string): Promise<string> {
		if (path.startsWith("delga://")) {
			const entry = this._delgaFileEntries.get(path);
			if (entry) {
				const stream = await entry.openReadStream();
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
