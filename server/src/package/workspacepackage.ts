/**
* MIT License
*
* Copyright (c) 2022 DragonDreams (info@dragondreams.ch)
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

import { Diagnostic, RemoteConsole, WorkspaceFolder } from "vscode-languageserver";
import { ReportConfig } from "../reportConfig";
import { debugLogMessage, getDocumentSettings, getFileSettings, packages, reportDiagnostics } from "../server";
import { PackageDEModule } from "./dragenginemodule";
import { PackageDSLanguage } from "./dslanguage";
import { Package } from "./package";
import { Minimatch } from "minimatch";
import { dirname, join } from "path";
import { readdir, readFile } from "fs/promises";
import { watch, FSWatcher } from "fs";
import { URI } from "vscode-uri";
import { PackageBasePackage } from "./basepackage";
import { XMLParser } from "fast-xml-parser";

export class PackageWorkspace extends Package {
	private _uri: string;
	private _path: string;
	private _name: string;
	private _timerResolve?: NodeJS.Timeout;
	private _degpFilePath?: string;
	private _degpWatcher?: FSWatcher;
	private _timerDegpChange?: NodeJS.Timeout;
	
	
	constructor(console: RemoteConsole, folder: WorkspaceFolder) {
		super(console, PackageWorkspace.PACKAGE_ID);
		this._uri = folder.uri;
		this._path = URI.parse(folder.uri).fsPath;
		this._name = folder.name;
	}
	
	
	public static readonly PACKAGE_ID: string = "WorkspacePackage";
	
	
	public get uri(): string {
		return this._uri;
	}
	
	public get path(): string {
		return this._path;
	}
	
	public get name(): string {
		return this._name;
	}
	
	
	public async dispose(): Promise<void> {
		this.stopDegpWatcher();
		await super.dispose();
	}
	
	public resolveAllLater(): void {
		this.armResolveAll();
	}
	
	
	protected async loadPackage(): Promise<void> {
		let pkg: Package = packages.get(PackageDSLanguage.PACKAGE_ID)!;
		await pkg.load();
		
		const settings = await getDocumentSettings(this._uri);
		if (settings.requiresPackageDragengine) {
			if (!settings.scriptVersion) {
				const degpScriptVersion = await this.detectDegpScriptVersion();
				if (degpScriptVersion) {
					(packages.get(PackageDEModule.PACKAGE_ID) as PackageDEModule).workspaceScriptVersion = degpScriptVersion;
				}
				if (this._degpFilePath) {
					this.startDegpWatcher();
				}
			} else {
				this.stopDegpWatcher();
			}
			await packages.get(PackageDEModule.PACKAGE_ID)!.load();
		} else {
			this.stopDegpWatcher();
		}
		
		for (const each of settings.basePackages) {
			let pkg2 = packages.get(`${PackageBasePackage.PACKAGE_PREFIX}${each}`);
			if (!pkg2) {
				pkg2 = new PackageBasePackage(this.console, each);
				packages.add(pkg2);
			}
			await pkg2.load();
		}
		
		const fileSettings = await getFileSettings(this._uri);
		
		this._console.log(`WorkspacePackage '${this._name}': Scan files`);
		const startTime = Date.now();
		
		const exclude: Minimatch[] = [];
		for (const pattern of Object.keys(fileSettings.exclude)) {
			if (fileSettings.exclude[pattern]) {
				const path = join(this._path, pattern);
				debugLogMessage(`exclude: '${pattern}' => '${path}'`);
				exclude.push(new Minimatch(path));
			}
		}
		
		for (const each of settings.scriptDirectories) {
			const path = join(this._path, each);
			this._console.log(`- '${each}' => '${path}'`);
			await this.scanPackage(this._files, path, exclude);
		}
		//await this.scanPackage(this._files, this._path, exclude);
		let elapsedTime = Date.now() - startTime;
		this._console.log(`WorkspacePackage '${this._name}': Files scanned in ${elapsedTime / 1000}s found ${this._files.length} files`);
		
		await this.loadFiles();
		this.loadingFinished();
	}
	
	private async detectDegpScriptVersion(): Promise<string | undefined> {
		// find *.degp file. this is usually located in the workspace root but if the workspace
		// contains a directory deeper inside the project we search up the directory tree.
		let degpFilePath: string | undefined;
		let searchDir = this._path;
		while (true) {
			let files: string[];
			try {
				files = await readdir(searchDir);
			} catch {
				break;
			}
			
			const degpFile = files.find(f => f.endsWith('.degp'));
			if (degpFile) {
				degpFilePath = join(searchDir, degpFile);
				break;
			}
			
			const parentDir = dirname(searchDir);
			if (parentDir === searchDir) {
				break;
			}
			searchDir = parentDir;
		}
		
		if (!degpFilePath) {
			this._console.log(`WorkspacePackage '${this._name}': No *.degp file found in workspace directory or parent directories`);
			this._degpFilePath = undefined;
			return undefined;
		}
		
		this._degpFilePath = degpFilePath;
		return this.readDegpScriptVersion(degpFilePath);
	}
	
	private async readDegpScriptVersion(degpFilePath: string): Promise<string | undefined> {
		try {
			const content = await readFile(degpFilePath, 'utf8');
			const parser = new XMLParser({ ignoreAttributes: false });
			const doc = parser.parse(content);
			const version = doc?.gameProject?.scriptModule?.['@_version'];
			if (version) {
				this._console.log(`WorkspacePackage '${this._name}': Detected required DragonScript version ${version} from '${degpFilePath}'`);
				return String(version);
			}
		} catch (error) {
			this._console.log(`WorkspacePackage '${this._name}': Failed to read/parse '${degpFilePath}' for DragonScript version detection: ${error}`);
		}
		return undefined;
	}
	
	private startDegpWatcher(): void {
		const filePath = this._degpFilePath;
		if (!filePath) return;
		
		// stop any existing watcher before starting a new one
		this.stopDegpWatcher();
		
		this._console.log(`WorkspacePackage '${this._name}': Watching '${filePath}' for changes`);
		try {
			this._degpWatcher = watch(filePath, () => this.onDegpFileChanged());
			this._degpWatcher.on('error', (err) => {
				this._console.log(`WorkspacePackage '${this._name}': Watcher error for '${filePath}': ${err}`);
				this.stopDegpWatcher();
			});
		} catch (err) {
			this._console.log(`WorkspacePackage '${this._name}': Failed to watch '${filePath}': ${err}`);
		}
	}
	
	private stopDegpWatcher(): void {
		if (this._timerDegpChange) {
			clearTimeout(this._timerDegpChange);
			this._timerDegpChange = undefined;
		}
		if (this._degpWatcher) {
			this._degpWatcher.close();
			this._degpWatcher = undefined;
		}
	}
	
	private onDegpFileChanged(): void {
		// debounce: editors often write files in multiple steps
		if (this._timerDegpChange) {
			clearTimeout(this._timerDegpChange);
		}
		this._timerDegpChange = setTimeout(() => this.applyDegpChange(), 500);
	}
	
	private async applyDegpChange(): Promise<void> {
		this._timerDegpChange = undefined;
		const filePath = this._degpFilePath;
		if (!filePath) return;
		
		this._console.log(`WorkspacePackage '${this._name}': '${filePath}' changed, re-detecting script version`);
		const newVersion = await this.readDegpScriptVersion(filePath);
		
		const deModule = packages.get(PackageDEModule.PACKAGE_ID) as PackageDEModule;
		if (deModule) {
			deModule.workspaceScriptVersion = newVersion ?? '';
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
