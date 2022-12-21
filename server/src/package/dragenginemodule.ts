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

import { readdirSync, statSync } from "fs";
import { platform } from "os";
import { join } from "path";
import { RemoteConsole } from "vscode-languageserver";
import { Package } from "./package";

export class PackageDEModule extends Package {
	protected _pathDragengine: string = "";
	protected _moduleVersion?: string;
	protected _pathModule?: string;

	protected _loaded: boolean = false;


	constructor(console: RemoteConsole) {
		super(console, PackageDEModule.PACKAGE_ID);
		this._console.log("PackageDEModule: Created");
	}


	public static readonly PACKAGE_ID: string = "DragengineModule";


	public get pathDragengine(): string {
		return this._pathDragengine;
	}

	public set pathDragengine(value: string) {
		if (value == this._pathDragengine) {
			return;
		}

		this._pathDragengine = value;

		if (this._loaded) {
			this.reload();
		}
	}

	public load(): void {
		if (!this._loaded) {
			this.reload();
		}
	}

	public reload(): void {
		this._loaded = true;
		this._console.log(`PackageDEModule: ${this._loaded ? "Reload" : "Load"}`);
		this.findPathModule();
		this.scanPackage();
	}

	protected findPathModule(): void {
		this._moduleVersion = undefined;
		this._pathModule = undefined;

		let pathEngine = this._pathDragengine;
		if (!pathEngine) {
			switch (platform()) {
				case 'win32':
					pathEngine = "C:\\Program Files\\Dragengine\\Data\\Modules\\Scripting\\DragonScript";
					break;

				default:
					pathEngine = "/usr/share/dragengine/modules/scripting/dragonscript";
			}
		}

		readdirSync(pathEngine).forEach(each => {
			let modpath = join(pathEngine, each);
			let stats = statSync(modpath);
			if (stats.isDirectory()) {
				this._console.log(`PackageDEModule: Found Module Version ${each}`);

				let better: boolean = false;

				if (this._moduleVersion) {
					let a = this._moduleVersion.split('.').map(x => parseInt(x));
					let b = each.split('.').map(x => parseInt(x));

					for (let i = 0; i < a.length; i++) {
						if (i == b.length || b[i] > a[i]) {
							better = true;
							break;
						} else if (b[i] < a[i]) {
							break;
						}
					}

				} else {
					better = true;
				}

				if (better) {
					this._moduleVersion = each;
					this._pathModule = modpath;
				}
			}
		});

		this._console.log(`PackageDEModule: Using Module Version ${this._moduleVersion}`);
	}

	protected scanPackage(): void {
		this._console.log("PackageDEModule: Scan package");
		this._console.log(`PackageDEModule: Path: '${this._pathModule}'`);
	}
}
