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

import { stat } from "fs/promises";
import { Disposable, Event, EventEmitter, FileChangeEvent, FilePermission, FileStat, FileSystemError, FileSystemProvider, FileType, Uri } from "vscode";
import yauzl = require('yauzl-promise');

class DelgaFileNode {
	private _name: string;
	private _isDir: boolean;
	private _nodes: Map<string,DelgaFileNode> = new Map<string,DelgaFileNode>();
	
	constructor (name: string, isDir: boolean, entry?: yauzl.Entry) {
		this._name = name;
		this._isDir = isDir;
		this.entry = entry;
	}
	
	get name(): string {
		return this._name;
	}
	
	get isDir(): boolean {
		return this._isDir;
	}
	
	public entry: yauzl.Entry | undefined;
	
	get nodes(): Map<string,DelgaFileNode> {
		return this._nodes;
	}
	
	ensureDir(parts: string[]): DelgaFileNode {
		let node: DelgaFileNode = this;
		for (const each of parts) {
			let node2 = node.nodes.get(each);
			if (!node2) {
				node2 = new DelgaFileNode(each, true);
				node.nodes.set(each, node2);
			} else if (!node2.isDir) {
				throw new Error("Zip file invalid");
			}
			node = node2;
		}
		return node;
	}
	
	getPath(path: string): DelgaFileNode | undefined {
		const parts = path.split('/');
		let node: DelgaFileNode = this;
		for (const each of parts) {
			if (!node.isDir) {
				return undefined;
			}
			
			node = node.nodes.get(each);
			if (!node) {
				return undefined;
			}
		}
		return node !== this ? node : undefined;
	}
}

class DelgaFile implements Disposable {
	private _path: string;
	private _archive: yauzl.ZipFile | undefined;
	private _rootNode: DelgaFileNode = new DelgaFileNode("", true);
	private _fileMTime: number = 0;
	
	constructor (path: string) {
		this._path = path;
	}
	
	dispose() {
		this._rootNode.nodes.clear();
		this._archive?.close();
		this._archive = undefined;
	}
	
	async init() {
		const archiveStats = await stat(this._path);
		this._fileMTime = archiveStats.mtimeMs;
		
		this._archive = await yauzl.open(this._path);
		
		for await (const each of this._archive) {
			let filename = each.filename;
			filename = filename.replace(/\\/g, '/'); // windows zip spec violation protection
			
			if (filename.endsWith('/')) {
				filename = filename.substring(0, filename.length - 1);
				const node = this._rootNode.ensureDir(filename.split('/'));
				node.entry = each;
				
			} else {
				const parts = filename.split('/');
				const node = new DelgaFileNode(parts.at(-1), false, each);
				this._rootNode.ensureDir(parts.slice(0, -1)).nodes.set(node.name, node);
			}
		}
	}
	
	get path(): string {
		return this._path;
	}
	
	get rootNode(): DelgaFileNode {
		return this._rootNode;
	}
	
	async stat(path: string): Promise<FileStat> {
		let node = this._rootNode.getPath(path);
		if (!node) {
			throw FileSystemError.FileNotFound(`File '${path}' not found in archive '${this._path}'`);
		}
		
		const mtime = node.entry?.getLastMod()?.getTime() ?? this._fileMTime;
		return {
			ctime: mtime,
			mtime: mtime,
			size: node.entry?.uncompressedSize ?? 0,
			type: node.isDir ? FileType.Directory : FileType.File,
			permissions: FilePermission.Readonly
		}
	}
	
	async readDirectory(path: string): Promise<[string, FileType][]> {
		let node = this._rootNode.getPath(path);
		if (!node) {
			throw FileSystemError.FileNotFound(`Directory '${path}' not found in archive '${this._path}'`);
		}
		if (!node.isDir) {
			throw FileSystemError.FileNotFound(`'${path}' in '${this._path}' is a file not a directory`);
		}
		
		const result: [string, FileType][] = [];
		for (const each of node.nodes) {
			result.push([each[0], each[1].isDir ? FileType.Directory : FileType.File]);
		}
		return result;
	}
	
	async readFile(path: string): Promise<Uint8Array> {
		let node = this._rootNode.getPath(path);
		if (!node) {
			throw FileSystemError.FileNotFound(`File '${path}' not found in archive '${this._path}'`);
		}
		if (node.isDir) {
			throw FileSystemError.FileNotFound(`'${path}' in '${this._path}' is a directory not a file`);
		}
		if (!node.entry) {
			return new Uint8Array;
		}
		
		const stream = await node.entry.openReadStream();
		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(Buffer.from(chunk));
		}
		return Buffer.concat(chunks);
	}
}

interface DelgaPath {
	delga: string;
	file: string;
}

interface DelgaResult {
	delga: DelgaFile;
	path: string;
}

export class DelgaFileProvider implements FileSystemProvider, Disposable {
	private _delgas: Map<string,DelgaFile> = new Map<string,DelgaFile>();
	private _emitter = new EventEmitter<FileChangeEvent[]>();
	
	dispose() {
		for (const each of this._delgas) {
			each[1].dispose();
		}
		this._delgas.clear();
	}
	
	/**
	 * Convert URI to delga path.
	 * 
	 * URI format has to be "delga:/path/to/file.delga?path=path/to/file".
	 */
	uri2delga(uri: Uri): DelgaPath | undefined{
		const url: URL = new URL(uri.toString());
		
		let path = url.searchParams.get('path');
		if (path === null) {
			return undefined;
		}
		
		path = path.replace(/\\/g, '/'); // windows zip spec violation protection
		if (path.startsWith("/")) {
			path = path.substring(1);
		}
		
		return {
			delga: `${uri.authority}${uri.path}`,
			file: path
		};
	}
	
	resolveDelga(uri: Uri): DelgaResult {
		const dp = this.uri2delga(uri);
		if (!dp) {
			throw FileSystemError.FileNotFound(`Invalid URI: ${uri.toString()}`);
		}
		
		const delga = this._delgas.get(dp.delga);
		if (!delga) {
			throw FileSystemError.FileNotFound(`File not found: ${dp.delga}`);
		}
		
		return {delga: delga, path: dp.file};
	}
	
	readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;
	
	watch(uri: Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
		// archives are read only so nothing can ever change
		return {
			dispose: function () {
			}
		}
	}
	
	stat(uri: Uri): FileStat | Thenable<FileStat> {
		const r = this.resolveDelga(uri);
		console.log(`stat: '${uri.toString()}' ${r}`);
		return r.delga.stat(r.path);
	}
	
	readDirectory(uri: Uri): Array<[string, FileType]> | Thenable<Array<[string, FileType]>> {
		const r = this.resolveDelga(uri);
		return r.delga.readDirectory(r.path);
	}
	
	createDirectory(uri: Uri): void | Thenable<void> {
		throw FileSystemError.NoPermissions(`Read-only: ${this.resolveDelga(uri).delga.path}`);
	}
	
	readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
		const r = this.resolveDelga(uri);
		console.log(`read: '${uri.toString()}' ${r}`);
		return r.delga.readFile(r.path);
	}
	
	writeFile(uri: Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
		throw FileSystemError.NoPermissions(`Read-only: ${this.resolveDelga(uri).delga.path}`);
	}
	
	delete(uri: Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
		throw FileSystemError.NoPermissions(`Read-only: ${this.resolveDelga(uri).delga.path}`);
	}
	
	rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw FileSystemError.NoPermissions(`Read-only: ${this.resolveDelga(newUri).delga.path}`);
	}
	
	copy?(source: Uri, destination: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw FileSystemError.NoPermissions(`Read-only: ${this.resolveDelga(destination).delga.path}`);
	}
}
