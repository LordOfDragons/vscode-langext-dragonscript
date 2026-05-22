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

import { existsSync, statSync } from "fs"
import { readdir, readFile, writeFile } from "fs/promises"
import { createHash } from "crypto"
import { platform } from "os"
import { join } from "path"
import { get as httpsGet } from "https"
import { IncomingMessage } from "http"
import { RemoteConsole } from "vscode-languageserver"
import { Package } from "./package"
import { Minimatch } from "minimatch"
import { Helpers } from "../helpers"
import { delgaCacher, notifyScriptVersion, fullReload } from "../server"
import { BaseCacheDelgaHandler } from "../delgaCacher"
import yauzl = require('yauzl-promise')

interface DelgaFileEntry {
	uri: string
	entry: yauzl.Entry
	filename: string
	pathDelga: string
}

class PackageCacheDelgaHandler extends BaseCacheDelgaHandler {
	private _entries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>()
	private _matcher: Minimatch
	private _pathDelga: string
	
	constructor (entries: Map<string,DelgaFileEntry>, matcher: Minimatch, pathDelga: string) {
		super()
		this._entries = entries
		this._matcher = matcher
		this._pathDelga = pathDelga
	}
	
	async cacheDelga(cachePath: string): Promise<void> {
		const promisses = []
		for (const each of this._entries) {
			if (this._pathDelga == each[1].pathDelga && this._matcher.match(each[1].filename)) {
				promisses.push(this.doCacheDelga(cachePath, each[1].entry, each[1].filename))
			}
		}
		await Promise.all(promisses)
	}
}

interface LocalVersionCandidate {
	version: string
	pathDeal?: string
	pathDealModule?: string
	pathModule?: string
}

interface OnlineVersionEntry {
	version: string
	size: number
	hash: string
	filename: string
}

export class PackageDEModule extends Package {
	protected _pathDragengine: string = ""
	protected _scriptVersion: string = ""
	protected _workspaceScriptVersion: string = ""
	protected _moduleVersion?: string
	protected _pathModule?: string
	protected _pathDeal?: string
	protected _pathDealModule?: string
	protected _dealFiles: yauzl.ZipFile[] = []
	protected _dealFileEntries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>()
	protected _onlineZipPath?: string
	protected _onlineZipFiles: yauzl.ZipFile[] = []
	protected _onlineZipFileEntries: Map<string,DelgaFileEntry> = new Map<string,DelgaFileEntry>()
	
	
	public static readonly PACKAGE_ID: string = "DragengineModule"
	
	
	constructor(console: RemoteConsole) {
		super(console, PackageDEModule.PACKAGE_ID)
		this._console.log("PackageDEModule: Created")
	}
	
	public async dispose(): Promise<void> {
		await this.clearDeals()
		await super.dispose()
	}
	
	
	protected async clearDeals(): Promise<void> {
		this._dealFileEntries.clear()
		this._onlineZipFileEntries.clear()
		for (const each of this._dealFiles) {
			await each.close()
		}
		this._dealFiles.splice(0)
		for (const each of this._onlineZipFiles) {
			await each.close()
		}
		this._onlineZipFiles.splice(0)
	}
	
	public get pathDragengine(): string {
		return this._pathDragengine
	}
	
	public set pathDragengine(value: string) {
		if (value == this._pathDragengine) {
			return
		}
		
		this._pathDragengine = value
		
		if (this._loaded) {
			fullReload()
		}
	}
	
	public get scriptVersion(): string {
		return this._scriptVersion
	}
	
	public set scriptVersion(value: string) {
		if (value == this._scriptVersion) {
			return
		}
		
		this._scriptVersion = value
		
		if (this._loaded) {
			fullReload()
		}
	}
	
	public get workspaceScriptVersion(): string {
		return this._workspaceScriptVersion
	}
	
	public set workspaceScriptVersion(value: string) {
		if (value == this._workspaceScriptVersion) {
			return
		}
		
		const prevEffective = this.effectiveScriptVersion()
		this._workspaceScriptVersion = value
		
		if (this._loaded && this.effectiveScriptVersion() !== prevEffective) {
			fullReload()
		}
	}
	
	protected effectiveScriptVersion(): string {
		return this._scriptVersion || this._workspaceScriptVersion
	}
	
	protected compareVersions(a: string, b: string): number {
		const ap = a.split('.').map(x => parseInt(x) || 0)
		const bp = b.split('.').map(x => parseInt(x) || 0)
		const len = Math.max(ap.length, bp.length)
		for (let i = 0; i < len; i++) {
			const av = ap[i] ?? 0
			const bv = bp[i] ?? 0
			if (av !== bv) return av - bv
		}
		return 0
	}
	
	protected selectBestLocalVersion(candidates: LocalVersionCandidate[], desiredVersion: string): LocalVersionCandidate | undefined {
		if (!desiredVersion) {
			// no preferred version: pick highest available
			return candidates.reduce<LocalVersionCandidate | undefined>((best, c) => {
				return (!best || this.compareVersions(c.version, best.version) > 0) ? c : best
			}, undefined)
		}
		
		// pick smallest version that is >= desired version
		let best: LocalVersionCandidate | undefined
		for (const c of candidates) {
			if (this.compareVersions(c.version, desiredVersion) < 0){
				continue
			}
			if (!best || this.compareVersions(c.version, best.version) < 0) {
				best = c
			}
		}
		return best
	}
	
	protected async clear(): Promise<void> {
		await super.clear()
		this._pathModule = undefined
		this._pathDeal = undefined
		this._pathDealModule = undefined
		this._onlineZipPath = undefined
		
		await this.clearDeals()
		notifyScriptVersion(undefined, undefined)
	}
	
	protected async loadPackage(): Promise<void> {
		await this.findPathModule()
		
		if (!this._pathModule && !this._pathDealModule && !this._onlineZipPath) {
			this._console.log(`Package '${this._id}': Module path not found.`)
			return
		}
		
		this._console.log(`Package '${this._id}': Scan package`)
		let startTime = Date.now()
		
		if (this._pathDeal && this._pathDealModule) {
			let matcher = new Minimatch(join(this._pathDealModule, "@(native|scripts)", "**", "*.ds"))
			
			const delgaStats = statSync(this._pathDeal)
			const cachePath = await delgaCacher.checkCache(
				this._pathDeal, delgaStats.size, delgaStats.mtime.getTime(),
				new PackageCacheDelgaHandler(this._dealFileEntries, matcher, this._pathDeal))
			
			if (cachePath) {
				const prev = new Map<string,DelgaFileEntry>(this._dealFileEntries)
				this._dealFileEntries.clear()
				
				for (const each of prev) {
					let uri = each[0]
					if (matcher.match(each[1].filename)) {
						uri = join(cachePath, ...each[1].filename.split("/"))
						each[1].uri = uri
					}
					this._dealFileEntries.set(uri, each[1])
				}
			}
			
			for (const each of this._dealFileEntries) {
				if (matcher.match(each[1].filename)) {
					this._files.push(each[0])
				}
			}
		}
		
		if (this._pathModule){
			await Promise.all([
				this.scanPackage(this._files, join(this._pathModule, "native")),
				this.scanPackage(this._files, join(this._pathModule, "scripts"))
			])
		}
		
		if (this._onlineZipPath) {
			const onlineMatcher = new Minimatch("@(native|scripts)/**/*.ds")
			
			try {
				const zipFile = await yauzl.open(this._onlineZipPath)
				this._onlineZipFiles.push(zipFile)
				
				for await (const entry of zipFile) {
					if (entry.filename.endsWith('/')) {
						continue
					}
					
					const uri = Helpers.createDelgaUri(this._onlineZipPath, entry.filename)
					this._onlineZipFileEntries.set(uri, {
						uri: uri,
						entry: entry,
						filename: entry.filename,
						pathDelga: this._onlineZipPath
					})
				}
			} catch(err) {
				this._console.log(`Package '${this._id}': Reading online zip file failed: ${err}`)
			}
			
			const zipStats = statSync(this._onlineZipPath)
			const cachePath = await delgaCacher.checkCache(
				this._onlineZipPath, zipStats.size, zipStats.mtime.getTime(),
				new PackageCacheDelgaHandler(this._onlineZipFileEntries, onlineMatcher, this._onlineZipPath))
			
			if (cachePath) {
				const prev = new Map<string,DelgaFileEntry>(this._onlineZipFileEntries)
				this._onlineZipFileEntries.clear()
				
				for (const each of prev) {
					let uri = each[0]
					if (onlineMatcher.match(each[1].filename)) {
						uri = join(cachePath, ...each[1].filename.split("/"))
						each[1].uri = uri
					}
					this._onlineZipFileEntries.set(uri, each[1])
				}
			}
			
			for (const each of this._onlineZipFileEntries) {
				if (onlineMatcher.match(each[1].filename)) {
					this._files.push(each[0])
				}
			}
		}
		
		let elapsedTime = Date.now() - startTime
		this._console.log(`Package '${this._id}': Package scanned in ${elapsedTime / 1000}s found ${this._files.length} files`)
		
		await this.loadFiles()
		
		this.loadingFinished()
	}

	protected async findPathModule(): Promise<void> {
		this._moduleVersion = undefined
		this._pathModule = undefined
		this._pathDeal = undefined
		this._pathDealModule = undefined
		
		await this.clearDeals()
		
		let pathEngine = this._pathDragengine
		if (!pathEngine) {
			switch (platform()) {
				case 'win32':
					pathEngine = "C:\\Program Files\\Dragengine\\Share"
					break
					
				case 'haiku':
					pathEngine = "/boot/system/data/dragengine"
					break
					
				default:
					pathEngine = "/usr/share/dragengine"
			}
		}
		
		let pathScrDSPart
		switch (platform()) {
			case 'win32':
				pathScrDSPart = join("Modules", "Scripting", "DragonScript")
				break
				
			default:
				pathScrDSPart = join("modules", "scripting", "dragonscript")
		}
		let pathScrDS = join(pathEngine, pathScrDSPart)
		
		var filesDeals: string[] = []
		try {
			filesDeals = await readdir(pathEngine)
		} catch {
			this._console.log(`Package '${this._id}': Failed reading directory '${pathEngine}'`)
		}
		
		var filesVerDirs: string[] = []
		try {
			filesVerDirs = await readdir(pathScrDS)
		} catch {
			this._console.log(`Package '${this._id}': Failed reading directory '${pathScrDS}'`)
		}
		
		let matcherDeal = new Minimatch("dragengine-*.deal")
		
		// no join for deals as this uses backslash on windows!
		let prefixDealDSDir = "modules/scripting/dragonscript/"
		let lenPrefixDealDSDir = prefixDealDSDir.length
		
		const candidates: LocalVersionCandidate[] = []
		
		for (const each of filesDeals) {
			let dealpath = join(pathEngine, each)
			let stats = statSync(dealpath)
			if (!stats.isFile() || !matcherDeal.match(each)) {
				continue
			}
			this._console.log(`Package '${this._id}': Found Asset Library '${each}'`)
			
			try {
				let dealFile = await yauzl.open(dealpath)
				this._dealFiles.push(dealFile)
				
				let dealDSVersFound = new Set<string>()
				
				for await (const each of dealFile) {
					let filename = each.filename
					filename = filename.replace(/\\/g, '/') // windows zip spec violation protection
					
					const uri = Helpers.createDelgaUri(dealpath, filename)
					this._dealFileEntries.set(uri, {
						uri: uri,
						entry: each,
						filename: filename,
						pathDelga: dealpath
					})
					
					if (!filename.startsWith(prefixDealDSDir)) {
						continue
					}
					
					let index = filename.indexOf('/', lenPrefixDealDSDir)
					if (index == -1) {
						index = filename.length
					}
					let modver = filename.substring(lenPrefixDealDSDir, index)
					if (!modver || dealDSVersFound.has(modver)) {
						continue
					}
					dealDSVersFound.add(modver)
					
					this._console.log(`Package '${this._id}': Asset Library: Found Module Version ${modver}`)
					candidates.push({
						version: modver,
						pathDeal: dealpath,
						pathDealModule: join(prefixDealDSDir, modver)
					})
				}
			} catch(err) {
				this._console.log(`Package '${this._id}': Reading DEAL file failed.`)
			}
		}
		
		for (const each of filesVerDirs) {
			let modpath = join(pathScrDS, each)
			let stats = statSync(modpath)
			if (stats.isDirectory()) {
				this._console.log(`Package '${this._id}': Found Module Version ${each}`)
				candidates.push({
					version: each,
					pathModule: modpath
				})
			}
		}
		
		const desiredVersion = this.effectiveScriptVersion()
		const selectedLocal = this.selectBestLocalVersion(candidates, desiredVersion)
		
		// always fetch online list and pick the single best version across local and online
		const onlineEntries = await this.fetchOnlineVersionList()
		const selectedOnline = this.selectBestOnlineVersion(onlineEntries, desiredVersion)
		
		if (this.shouldPreferOnline(selectedLocal?.version, selectedOnline?.version, desiredVersion)) {
			const zipPath = await this.downloadAndCacheOnlineVersion(selectedOnline!)
			if (zipPath) {
				await this.clearDeals()
				this._pathModule = undefined
				this._pathDeal = undefined
				this._pathDealModule = undefined
				this._moduleVersion = selectedOnline!.version
				this._onlineZipPath = zipPath
			} else if (selectedLocal) {
				this._console.log(`Package '${this._id}': Online download failed, falling back to local version ${selectedLocal.version}`)
				this._moduleVersion = selectedLocal.version
				this._pathDeal = selectedLocal.pathDeal
				this._pathDealModule = selectedLocal.pathDealModule
				this._pathModule = selectedLocal.pathModule
			}
		} else if (selectedLocal) {
			this._moduleVersion = selectedLocal.version
			this._pathDeal = selectedLocal.pathDeal
			this._pathDealModule = selectedLocal.pathDealModule
			this._pathModule = selectedLocal.pathModule
		}
		
		if (this._moduleVersion) {
			this._console.log(`Package '${this._id}': Using Module Version ${this._moduleVersion} (${this._onlineZipPath ? 'online' : (this._pathDeal ?? this._pathModule ?? 'none')})`)
		} else {
			this._console.log(`Package '${this._id}': No suitable DragonScript version found locally or online`)
		}
		notifyScriptVersion(this._moduleVersion, this._workspaceScriptVersion || undefined)
	}
	
	protected async readFile(path: string): Promise<string> {
		if (path.startsWith("delga:/")) {
			const entry = this._dealFileEntries.get(path) ?? this._onlineZipFileEntries.get(path)
			if (entry) {
				const stream = await entry.entry.openReadStream()
				const chunks = []
				for await (const chunk of stream) {
					chunks.push(Buffer.from(chunk))
				}
				return Buffer.concat(chunks).toString("utf-8")
				
			} else {
				throw Error("Entry not found in documentation files")
			}
			
		} else {
			return super.readFile(path)
		}
	}
	
	protected httpsGetBuffer(url: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const handleResponse = (res: IncomingMessage) => {
				if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					// follow redirect
					httpsGet(res.headers.location, handleResponse).on('error', reject)
					return
				}
				if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
					reject(new Error(`HTTP ${res.statusCode}`))
					return
				}
				const chunks: Buffer[] = []
				res.on('data', (chunk: Buffer) => chunks.push(chunk))
				res.on('end', () => resolve(Buffer.concat(chunks)))
				res.on('error', reject)
			}
			httpsGet(url, handleResponse).on('error', reject)
		})
	}
	
	protected onlineCacheDir(): string | undefined {
		const cacheDir = delgaCacher.cacheDir
		if (!cacheDir) {
			return undefined
		}
		return join(cacheDir, "onlineVersions", "dragonscript")
	}
	
	protected parseOnlineVersionList(content: string): OnlineVersionEntry[] {
		const entries: OnlineVersionEntry[] = []
		for (const line of content.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed) {
				continue
			}
			const parts = trimmed.split(/\s+/)
			if (parts.length >= 4) {
				entries.push({
					version: parts[0],
					size: parseInt(parts[1]),
					hash: parts[2],
					filename: parts[3]
				})
			}
		}
		return entries
	}
	
	protected selectBestOnlineVersion(entries: OnlineVersionEntry[], wantVersion: string): OnlineVersionEntry | undefined {
		if (!wantVersion) {
			// no preferred version: pick highest available
			return entries.reduce<OnlineVersionEntry | undefined>((best, e) => {
				return (!best || this.compareVersions(e.version, best.version) > 0) ? e : best
			}, undefined)
		}
		
		// pick smallest version that is >= wantVersion
		let best: OnlineVersionEntry | undefined
		for (const e of entries) {
			if (this.compareVersions(e.version, wantVersion) < 0) {
				continue
			}
			if (!best || this.compareVersions(e.version, best.version) < 0) {
				best = e
			}
		}
		return best
	}
	
	protected async downloadAndCacheOnlineVersion(entry: OnlineVersionEntry): Promise<string | undefined> {
		const cacheDir = this.onlineCacheDir()
		if (!cacheDir) {
			this._console.log(`Package '${this._id}': No cache directory available, cannot download online version`)
			return undefined
		}
		
		Helpers.ensureDirectory(cacheDir)
		
		const zipPath = join(cacheDir, entry.filename)
		const hashFile = zipPath + ".sha256"
		
		// check if we already have a valid cached download
		if (existsSync(zipPath) && existsSync(hashFile)) {
			try {
				const cachedHash = (await readFile(hashFile, 'utf8')).trim()
				if (cachedHash === entry.hash) {
					this._console.log(`Package '${this._id}': Using cached online version ${entry.version}`)
					return zipPath
				}
			} catch {
				// ignore - will re-download
			}
		}
		
		const url = `https://lordofdragons.github.io/dragengine/artifacts/idescripts/dragonscript/${entry.filename}`
		this._console.log(`Package '${this._id}': Downloading online version ${entry.version} from ${url}`)
		
		try {
			const buffer = await this.httpsGetBuffer(url)
			
			// verify SHA-256 hash
			const hash = createHash('sha256').update(buffer).digest('hex')
			if (hash !== entry.hash) {
				throw new Error(`SHA-256 hash mismatch: expected ${entry.hash}, got ${hash}`)
			}
			
			await writeFile(zipPath, buffer)
			await writeFile(hashFile, hash)
			
			this._console.log(`Package '${this._id}': Downloaded and cached online version ${entry.version}`)
			return zipPath
		} catch (err) {
			this._console.log(`Package '${this._id}': Failed to download online version ${entry.version}: ${err}`)
			return undefined
		}
	}
	
	protected async fetchOnlineVersionList(): Promise<OnlineVersionEntry[]> {
		this._console.log(`Package '${this._id}': Fetching online version list`)
		try {
			const listUrl = "https://lordofdragons.github.io/dragengine/artifacts/idescripts/dragonscript/list"
			const listContent = (await this.httpsGetBuffer(listUrl)).toString('utf8')
			const entries = this.parseOnlineVersionList(listContent)
			this._console.log(`Package '${this._id}': Found ${entries.length} online versions`)
			return entries
		} catch (err) {
			this._console.log(`Package '${this._id}': Failed to fetch online version list: ${err}`)
			return []
		}
	}
	
	protected shouldPreferOnline(localVer: string | undefined, onlineVer: string | undefined, desired: string): boolean {
		if (!onlineVer) {
			return false
		}
		if (!localVer) {
			return true
		}
		
		if (!desired) {
			// no desired version: pick highest available, local wins on tie
			return this.compareVersions(onlineVer, localVer) > 0
		}
		
		const localOk = this.compareVersions(localVer, desired) >= 0
		const onlineOk = this.compareVersions(onlineVer, desired) >= 0
		
		if (!localOk && !onlineOk) {
			return false // neither satisfies desired, keep local
		}
		if (!localOk) {
			return true // only online satisfies desired
		}
		if (!onlineOk) {
			return false // only local satisfies desired
		}
		
		// both satisfy desired: pick smaller (closer), local wins on tie
		return this.compareVersions(onlineVer, localVer) < 0
	}
}
