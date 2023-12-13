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

import { RemoteConsole, WorkspaceFolder } from "vscode-languageserver";
import { ReportConfig } from "../reportConfig";
import { getDocumentSettings, packages, reportDiagnostics } from "../server";
import { PackageDEModule } from "./dragenginemodule";
import { PackageDSLanguage } from "./dslanguage";
import { Package } from "./package";

export class PackageWorkspace extends Package {
	private _uri: string;
	private _path: string;
	private _name: string;
	private _timerResolve?: NodeJS.Timeout;
	
	
	constructor(console: RemoteConsole, folder: WorkspaceFolder) {
		super(console, PackageWorkspace.PACKAGE_ID);
		this._uri = folder.uri;
		this._path = folder.uri.slice(7);
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
	
	
	public resolveAll(): void {
		this.armTimeoutResolve();
	}
	
	
	protected async loadPackage(): Promise<void> {
		let pkg: Package = packages.get(PackageDSLanguage.PACKAGE_ID)!;
		await pkg.load();
		
		const settings = await getDocumentSettings(this._uri);
		if (settings.requiresPackageDragengine) {
			let pkg: Package = packages.get(PackageDEModule.PACKAGE_ID)!;
			await pkg.load();
		}
		
		this._console.log(`WorkspacePackage '${this._name}': Scan files`);
		let startTime = Date.now();
		await this.scanPackage(this._files, this._path);
		let elapsedTime = Date.now() - startTime;
		this._console.log(`WorkspacePackage '${this._name}': Files scanned in ${elapsedTime / 1000}s found ${this._files.length} files`);
		
		await this.loadFiles();
		this.loadingFinished();
	}
	
	private armTimeoutResolve(): void {
		if (this._timerResolve) {
			clearTimeout(this._timerResolve);
			this._timerResolve = undefined;
		}
		this._timerResolve = setTimeout(this._resolveAll.bind(this), 1000);
	}
	
	private _resolveAll(): void {
		var reportConfig = new ReportConfig;
		for (const each of this._scriptDocuments) {
			each.resolveStatements(reportConfig).then(diagnostics => reportDiagnostics(each.uri, diagnostics));
		};
	}
}
