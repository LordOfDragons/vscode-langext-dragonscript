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
import { debugLogContext, debugLogMessage, debugLogObj, getDocumentSettings, getFileSettings, packages, reportDiagnostics } from "../server";
import { PackageDEModule } from "./dragenginemodule";
import { PackageDSLanguage } from "./dslanguage";
import { Package } from "./package";
import { Minimatch } from "minimatch";
import { join } from "path";
import { URI } from "vscode-uri";

export class PackageWorkspace extends Package {
	private _uri: string;
	private _path: string;
	private _name: string;
	private _timerResolve?: NodeJS.Timeout;
	
	
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
