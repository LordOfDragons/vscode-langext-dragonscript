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

import { RemoteConsole } from "vscode-languageserver";
import { ScriptDocument } from "./scriptDocument";
import { DeferredPromise } from "./deferredPromise";


class DeferredPromiseGet extends DeferredPromise<ScriptDocument> {
	private _uri: string;
	
	constructor (uri: string) {
		super();
		this._uri = uri;
	}
	
	public get uri(): string {
		return this._uri;
	}
}


export class ScriptDocuments {
	protected _console: RemoteConsole;
	protected _documents: Map<string, ScriptDocument>;
	protected _promisesGet: DeferredPromiseGet[] = [];
	
	
	constructor(console: RemoteConsole) {
		this._console = console;
		this._documents = new Map<string, ScriptDocument>();
	}
	
	public dispose(): void {
		this.removeAll()
		
		const promises = [...this._promisesGet];
		this._promisesGet.splice(0);
		for (const each of promises) {
			each.fail();
		}
	}
	
	
	/** All documents. */
	public get documents(): Map<string, ScriptDocument> {
		return this._documents;
	}
	
	/** Document for URI or undefined. */
	public get(uri: string): ScriptDocument | undefined {
		return this._documents.get(uri);
	}
	
	/** Document for URI waiting for it to appear if absend. */
	public async ensureGet(uri: string): Promise<ScriptDocument> {
		const document = this._documents.get(uri);
		if (document) {
			return document;
		}
		
		const promise = new DeferredPromiseGet(uri);
		this._promisesGet.push(promise);
		return promise.promise;
	}
	
	/** Add document replacing existing one if present. */
	public add(document: ScriptDocument): void {
		this._documents.get(document.uri)?.dispose();
		this._documents.set(document.uri, document);
		
		const promises = this._promisesGet.filter(p => p.uri == document.uri);
		for (const each of promises) {
			const index = this._promisesGet.indexOf(each);
			if (index != -1) {
				this._promisesGet.splice(index, 1);
			}
			each.succeed(document);
		}
	}
	
	/** Remove document. */
	public remove(document: ScriptDocument): void {
		this._documents.get(document.uri)?.dispose();
		this._documents.delete(document.uri);
	}
	
	/** Remove all documents. */
	public removeAll(): void {
		for (const each of this._documents.values()) {
			each.dispose();
		}
		this._documents.clear();
	}
}
