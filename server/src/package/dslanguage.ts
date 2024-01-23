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

import { join } from "path";
import { RemoteConsole } from "vscode-languageserver";
import { ResolveNamespace } from "../resolve/namespace";
import { Package } from "./package";

export class PackageDSLanguage extends Package {
	constructor(console: RemoteConsole) {
		super(console, PackageDSLanguage.PACKAGE_ID);
		this._console.log(`Package '${this._id}': Created`);
	}
	
	
	public static readonly PACKAGE_ID: string = "DragonScript";
	
	
	protected async loadPackage(): Promise<void> {
		this._console.log(`Package '${this._id}': Scan package`);
		let startTime = Date.now();
		await this.scanPackage(this._files, join(__dirname, "..", "data", "dslanguage"));
		let elapsedTime = Date.now() - startTime;
		this._console.log(`Package '${this._id}': Package scanned in ${elapsedTime / 1000}s found ${this._files.length} files`);
		
		await this.loadFiles();
		
		// fetch primitive classes to ensure they are properly initialized
		ResolveNamespace.classBool;
		ResolveNamespace.classByte;
		ResolveNamespace.classInt;
		ResolveNamespace.classFloat;
		ResolveNamespace.classString;
		ResolveNamespace.classBlock;
		ResolveNamespace.classException;
		
		this.loadingFinished();
	}
}
