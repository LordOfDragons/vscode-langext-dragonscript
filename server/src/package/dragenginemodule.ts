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

import { statSync } from "fs";
import { readdir } from "fs/promises";
import { platform } from "os";
import { join } from "path";
import { RemoteConsole } from "vscode-languageserver";
import { Package } from "./package";
import { Minimatch } from "minimatch";
import yauzl = require('yauzl-promise');
import { Helpers } from "../helpers";
import { DelgaFileEntry } from "./basepackage";
import { delgaCacher } from "../server";
import { BaseCacheDelgaHandler } from "../delgaCacher";

class PackageCacheDelgaHandler extends BaseCacheDelgaHandler {
	private _entries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>();
	private _matcher: Minimatch;
	
	constructor (entries: Map<string,DelgaFileEntry>, matcher: Minimatch) {
		super();
		this._entries = entries;
		this._matcher = matcher;
	}
	
	async cacheDelga(cachePath: string): Promise<void> {
		for (const each of this._entries) {
			if (this._matcher.match(each[1].filename)) {
				this.doCacheDelga(cachePath, each[1].entry, each[1].filename);
			}
		}
	}
}

export class PackageDEModule extends Package {
	protected _pathDragengine: string = "";
	protected _moduleVersion?: string;
	protected _pathModule?: string;
	protected _pathDeal?: string;
	protected _pathDealModule?: string;
	protected _dealFiles: yauzl.ZipFile[] = [];
	protected _dealFileEntries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>();
	
	
	public static readonly PACKAGE_ID: string = "DragengineModule";
	
	
	constructor(console: RemoteConsole) {
		super(console, PackageDEModule.PACKAGE_ID);
		this._console.log("PackageDEModule: Created");
	}
	
	public async dispose(): Promise<void> {
		await this.clearDeals();
		await super.dispose();
	}
	
	
	protected async clearDeals(): Promise<void> {
		this._dealFileEntries.clear();
		for (const each of this._dealFiles) {
			await each.close();
		}
		this._dealFiles.splice(0);
	}
	
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
	
	protected async clear(): Promise<void> {
		await super.clear();
		this._pathModule = undefined;
		this._pathDeal = undefined;
		this._pathDealModule = undefined;
		
		await this.clearDeals();
	}
	
	protected async loadPackage(): Promise<void> {
		await this.findPathModule();
		
		if (!this._pathModule && !this._pathDealModule) {
			this._console.log(`Package '${this._id}': Module path not found.`);
			return;
		}
		
		this._console.log(`Package '${this._id}': Scan package`);
		let startTime = Date.now();
		
		if (this._pathDeal && this._pathDealModule) {
			let matcher = new Minimatch(join(this._pathDealModule, "@(native|scripts)", "**", "*.ds"));
			
			const delgaStats = statSync(this._pathDeal);
			const cachePath = await delgaCacher.checkCache(
				this._pathDeal, delgaStats.size, delgaStats.mtime.getTime(),
				new PackageCacheDelgaHandler(this._dealFileEntries, matcher));
			
			if (cachePath) {
				const prev = new Map<string,DelgaFileEntry>(this._dealFileEntries);
				this._dealFileEntries.clear();
				
				for (const each of prev) {
					let uri = each[0];
					if (matcher.match(each[1].filename)) {
						uri = join(cachePath, ...each[1].filename.split("/"));
						each[1].uri = uri;
					}
					this._dealFileEntries.set(uri, each[1]);
				}
			}
			
			for (const each of this._dealFileEntries) {
				if (matcher.match(each[1].filename)) {
					this._files.push(each[0]);
				}
			}
		}
		
		if (this._pathModule){
			await Promise.all([
				this.scanPackage(this._files, join(this._pathModule, "native")),
				this.scanPackage(this._files, join(this._pathModule, "scripts"))
			]);
		}
		
		let elapsedTime = Date.now() - startTime;
		this._console.log(`Package '${this._id}': Package scanned in ${elapsedTime / 1000}s found ${this._files.length} files`);
		
		await this.loadFiles();
		
		this.loadingFinished();
	}

	protected async findPathModule(): Promise<void> {
		this._moduleVersion = undefined;
		this._pathModule = undefined;
		this._pathDeal = undefined;
		this._pathDealModule = undefined;
		
		await this.clearDeals();
		
		let pathEngine = this._pathDragengine;
		if (!pathEngine) {
			switch (platform()) {
				case 'win32':
					pathEngine = "C:\\Program Files\\Dragengine\\Share";
					break;
					
				default:
					pathEngine = "/usr/share/dragengine";
			}
		}
		
		let pathScrDSPart;
		switch (platform()) {
			case 'win32':
				pathScrDSPart = join("Modules", "Scripting", "DragonScript")
				break;
				
			default:
				pathScrDSPart = join("modules", "scripting", "dragonscript");
		}
		let pathScrDS = join(pathEngine, pathScrDSPart);
		
		var filesDeals: string[] = [];
		try {
			filesDeals = await readdir(pathEngine);
		} catch {
			this._console.log(`Package '${this._id}': Failed reading directory '${pathEngine}'`);
		}
		
		var filesVerDirs: string[] = [];
		try {
			filesVerDirs = await readdir(pathScrDS);
		} catch {
			this._console.log(`Package '${this._id}': Failed reading directory '${pathScrDS}'`);
		}
		
		let matcherDeal = new Minimatch("dragengine-*.deal");
		
		// no join for deals as this uses backslash on windows!
		let prefixDealDSDir = "modules/scripting/dragonscript/";
		let lenPrefixDealDSDir = prefixDealDSDir.length;
		
		for (const each of filesDeals) {
			let dealpath = join(pathEngine, each);
			let stats = statSync(dealpath);
			if (!stats.isFile() || !matcherDeal.match(each)) {
				continue;
			}
			this._console.log(`Package '${this._id}': Found Asset Library '${each}'`);
			
			try {
				let dealFile = await yauzl.open(dealpath);
				this._dealFiles.push(dealFile);
				
				let dealDSVersFound = new Set<string>();
				
				for await (const each of dealFile) {
					let filename = each.filename;
					filename = filename.replace(/\\/g, '/'); // windows zip spec violation protection
					
					const uri = Helpers.createDelgaUri(dealpath, filename);
					this._dealFileEntries.set(uri, {uri: uri, entry: each, filename: filename});
					
					if (!filename.startsWith(prefixDealDSDir)) {
						continue;
					}
					
					let index = filename.indexOf('/', lenPrefixDealDSDir);
					if (index == -1) {
						index = filename.length;
					}
					let modver = filename.substring(lenPrefixDealDSDir, index);
					if (!modver || dealDSVersFound.has(modver)) {
						continue;
					}
					dealDSVersFound.add(modver);
					
					this._console.log(`Package '${this._id}': Asset Library: Found Module Version ${modver}`);
					let betterOrSame: boolean = false;
					
					if (this._moduleVersion) {
						let a = this._moduleVersion.split('.').map(x => parseInt(x));
						let b = modver.split('.').map(x => parseInt(x));
						
						for (let i = 0; i < a.length; i++) {
							if (i == b.length || b[i] >= a[i]) {
								betterOrSame = true;
								break;
							} else if (b[i] < a[i]) {
								break;
							}
						}
						
					} else {
						betterOrSame = true;
					}
					
					if (betterOrSame) {
						if (this._moduleVersion != modver) {
							this._pathModule = undefined;
						}
						this._moduleVersion = modver;
						this._pathDeal = dealpath;
						this._pathDealModule = join(prefixDealDSDir, modver);
					}
				}
			} catch(err) {
				this._console.log(`Package '${this._id}': Reading DEAL file failed.`);
			}
		}
		
		for (const each of filesVerDirs) {
			let modpath = join(pathScrDS, each);
			let stats = statSync(modpath);
			if (stats.isDirectory()) {
				this._console.log(`Package '${this._id}': Found Module Version ${each}`);
				
				let betterOrSame: boolean = false;
				
				if (this._moduleVersion) {
					let a = this._moduleVersion.split('.').map(x => parseInt(x));
					let b = each.split('.').map(x => parseInt(x));
					
					for (let i = 0; i < a.length; i++) {
						if (i == b.length || b[i] >= a[i]) {
							betterOrSame = true;
							break;
						} else if (b[i] < a[i]) {
							break;
						}
					}
					
				} else {
					betterOrSame = true;
				}
				
				if (betterOrSame) {
					if (this._moduleVersion != each) {
						this._pathDeal = undefined;
						this._pathDealModule = undefined;
					}
					this._moduleVersion = each;
					this._pathModule = modpath;
				}
			}
		}
		
		this._console.log(`Package '${this._id}': Using Module Version ${this._moduleVersion} (${this._pathDeal})`);
	}
	
	protected async readFile(path: string): Promise<string> {
		if (path.startsWith("delga:/")) {
			const entry = this._dealFileEntries.get(path);
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
}
