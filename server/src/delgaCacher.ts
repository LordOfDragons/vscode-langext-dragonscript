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

import { existsSync } from "fs";
import { open, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { lock, unlock } from "proper-lockfile";
import { Helpers } from "./helpers";
import { randomUUID } from "crypto";

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

export class DelgaCacher {
	private _pathCacheFile?: string;
	private _cacheFileLocked = false;
	
	constructor(){
	}
	
	
	/** Cache directory */
	public cacheDir?: string;
	
	
	async initCache(): Promise<void> {
		if (!this.cacheDir) {
			return;
		}
		
		Helpers.ensureDirectory(this.cacheDir);
		this._pathCacheFile = join(this.cacheDir, "cache.json");
		
		// test
		/*
		try {
			await this.lockCacheFile();
			const cf = await this.readCacheFile();
			cf.entries.push({
				delga: "/somewhere/something.delga",
				size: 1800,
				mtime: Date.now(),
				lastUsedTime: Date.now(),
				slot: 1
			});
			cf.entries.push({
				delga: "/whoopsie/pooopsie.deal",
				size: 746632,
				mtime: Date.now(),
				lastUsedTime: Date.now(),
				slot: 2
			});
			await this.writeCacheFile(cf);
		} finally {
			if (this._cacheFileLocked) {
				await this.unlockCacheFile();
			}
		}
		*/
	}
	
	async checkCache(path: string, size: number, mtime: number, handler: CacheDelgaHandler): Promise<string | undefined> {
		if (!this.cacheDir) {
			return undefined;
		}
		
		await this.lockCacheFile();
		try {
			const cf = await this.readCacheFile();
			
			let entry = cf.entries.find(each => {
				return each.delga == path && each.size == size && each.mtime == mtime
			});
			
			if (entry) {
				entry.lastUsedTime = Date.now();
				await this.writeCacheFile(cf);
				return join(this.cacheDir, entry.slot);
			}
			
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
			return usePath;
			
		} finally {
			if (this._cacheFileLocked) {
				await this.unlockCacheFile();
			}
		}
	}
	
	
	private async lockCacheFile(): Promise<void> {
		if (!this._pathCacheFile) {
			throw Error('Cache file path missing');
		}
		if (this._cacheFileLocked) {
			throw Error('Cache file already locked');
		}
		
		if (!existsSync(this._pathCacheFile)) {
			await this.writeCacheFile(new CacheFile());
		}
		
		await lock(this._pathCacheFile);
		this._cacheFileLocked = true;
	}
	
	private async unlockCacheFile(): Promise<void> {
		if (!this._pathCacheFile) {
			throw Error('Cache file path missing');
		}
		if (!this._cacheFileLocked) {
			throw Error('Cache file not locked');
		}
		
		this._cacheFileLocked = false;
		await unlock(this._pathCacheFile);
	}
	
	private async readCacheFile(): Promise<CacheFile> {
		if (!this._pathCacheFile) {
			throw Error('Cache file path missing');
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
			writeFile(f, JSON.stringify(cacheFile, null, 2));
			//writeFile(f, JSON.stringify(cacheFile));
		} finally {
			f.close();
		}
	}
}
