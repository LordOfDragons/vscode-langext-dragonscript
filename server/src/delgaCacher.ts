/**
 * MIT License
 *
 * Copyright (c) 2025 DragonDreams (info@dragondreams.ch)
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

import { chmodSync, existsSync, Mode } from "fs";
import { constants, open, readFile, rm, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { lock, unlock } from "proper-lockfile";
import { Helpers } from "./helpers";
import { randomUUID } from "crypto";
import { RemoteConsole } from "vscode-languageserver";
import { Minimatch } from "minimatch";
import { platform } from "os";
import yauzl = require('yauzl-promise');

class CacheEntry {
	public delga: string = "";
	public size: number = 0;
	public mtime: number = 0;
	public lastUsedTime: number = 0;
	public slot: string = "";
}

class CacheFile {
	public entries: CacheEntry[] = [];
}

export interface CacheDelgaHandler {
	cacheDelga(cachePath: string): Promise<void>;
}

export class BaseCacheDelgaHandler implements CacheDelgaHandler {
	private _chmodMode: Mode;
	
	constructor () {
		switch (platform()) {
			case 'win32':
				this._chmodMode = constants.S_IRUSR;
				break;
				
			default:
				this._chmodMode = constants.S_IRUSR | constants.S_IRGRP | constants.S_IROTH;
		}
	}
	
	async cacheDelga(cachePath: string): Promise<void> {
	}
	
	protected async doCacheDelga(cachePath: string, entry: yauzl.Entry, filename: string): Promise<void> {
		const cacheEntryPath = join(cachePath, ...filename.split("/"));
		Helpers.ensureDirectory(dirname(cacheEntryPath))
		
		const f = await open(cacheEntryPath, "w");
		try {
			const stream = await entry.openReadStream();
			for await (const chunk of stream) {
				await f.write(chunk);
			}
		} finally {
			await f.close();
		}
		
		chmodSync(cacheEntryPath, this._chmodMode);
	}
}

export class DelgaCacher {
	private _pathCacheFile?: string;
	private _cacheFileLocked = false;
	private _retentionTimeMs;
	protected _console: RemoteConsole;
	
	constructor(console: RemoteConsole){
		this._console = console;
		this._retentionTimeMs = 30 * 24 * 60 * 60 * 1000; // 30 days as milliseconds
	}
	
	
	/** Cache directory */
	public cacheDir?: string;
	
	
	async initCache(): Promise<void> {
		if (!this.cacheDir) {
			return;
		}
		
		Helpers.ensureDirectory(this.cacheDir);
		this._pathCacheFile = join(this.cacheDir, "cache.json");
		this._console.log("delgaCacher: initialized");
	}
	
	async checkCache(path: string, size: number, mtime: number, handler: CacheDelgaHandler): Promise<string | undefined> {
		if (!this.cacheDir) {
			return undefined;
		}
		
		await this.lockCacheFile();
		try {
			const cf = await this.readCacheFile();
			await this.pruneOutdatedDelgaCaches(cf);
			
			let entry = cf.entries.find(each => {
				return each.delga == path && each.size == size && each.mtime == mtime
			});
			
			if (entry) {
				this._console.log(`delgaCacher: using cached delga file '${path}'`);
				entry.lastUsedTime = Date.now();
				await this.writeCacheFile(cf);
				return join(this.cacheDir, entry.slot);
			}
			
			this._console.log(`delgaCacher: cache delga file '${path}'`);
			entry = {
				delga: path,
				size: size,
				mtime: mtime,
				lastUsedTime: Date.now(),
				slot: randomUUID()
			};
			cf.entries.push(entry);
			await this.writeCacheFile(cf);
			
			const usePath = join(this.cacheDir, entry.slot);
			await handler.cacheDelga(usePath);
			this._console.log("delgaCacher: delga file successfully cached");
			return usePath;
			
		} finally {
			if (this._cacheFileLocked) {
				await this.unlockCacheFile();
			}
		}
	}
	
	
	private async lockCacheFile(): Promise<void> {
		if (!this._pathCacheFile) {
			throw Error("Cache file path missing");
		}
		if (this._cacheFileLocked) {
			throw Error("Cache file already locked");
		}
		
		if (!existsSync(this._pathCacheFile)) {
			await this.writeCacheFile(new CacheFile());
		}
		
		await lock(this._pathCacheFile);
		this._cacheFileLocked = true;
	}
	
	private async unlockCacheFile(): Promise<void> {
		if (!this._pathCacheFile) {
			throw Error("Cache file path missing");
		}
		if (!this._cacheFileLocked) {
			throw Error("Cache file not locked");
		}
		
		this._cacheFileLocked = false;
		await unlock(this._pathCacheFile);
	}
	
	private async readCacheFile(): Promise<CacheFile> {
		if (!this._pathCacheFile) {
			throw Error("Cache file path missing");
		}
		
		try {
			return JSON.parse(await readFile(this._pathCacheFile, 'utf8')) as CacheFile;
		} catch {
			return new CacheFile();
		}
	}
	
	private async writeCacheFile(cacheFile: CacheFile): Promise<void> {
		if (!this._pathCacheFile) {
			throw Error('Cache file path missing');
		}
		
		const f = await open(this._pathCacheFile, "w");
		try {
			await writeFile(f, JSON.stringify(cacheFile, null, 2));
			//await writeFile(f, JSON.stringify(cacheFile));
		} finally {
			await f.close();
		}
	}
	
	private async pruneOutdatedDelgaCaches(cacheFile: CacheFile): Promise<void> {
		if (!this.cacheDir) {
			return;
		}
		
		const pruneEntries: CacheEntry[] = [];
		const threshold = Date.now() - this._retentionTimeMs;
		
		for (const each of cacheFile.entries) {
			if (each.lastUsedTime < threshold) {
				pruneEntries.push(each);
			}
		}
		
		if (!pruneEntries) {
			return;
		}
		
		for (const each of pruneEntries) {
			this._console.log(`delgaCacher: prune outdated cache for delga file '${each.delga}'`);
			await rm(join(this.cacheDir, each.slot), {recursive: true});
			const index = cacheFile.entries.indexOf(each);
			if (index > -1) {
				cacheFile.entries.splice(index, 1);
			}
			this._console.log("delgaCacher: outdated cache delga file pruned");
		}
		
		await this.writeCacheFile(cacheFile);
	}
}
