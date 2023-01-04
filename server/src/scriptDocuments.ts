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

export class ScriptDocuments {
	protected _console: RemoteConsole;
	protected _documents: Map<string, ScriptDocument>;


	constructor(console: RemoteConsole) {
		this._console = console;
		this._documents = new Map<string, ScriptDocument>();
	}

	public dispose(): void {
		this.removeAll()
	}


	/** All documents. */
	public get documents(): Map<string, ScriptDocument> {
		return this._documents;
	}

	/** Document for URI or undefined. */
	public get(uri: string): ScriptDocument | undefined {
		return this._documents.get(uri);
	}

	/** Add document replacing existing one if present. */
	public add(document: ScriptDocument): void {
		this._documents.get(document.uri)?.dispose();
		this._documents.set(document.uri, document);
	}

	/** Remove document. */
	public remove(document: ScriptDocument): void {
		this._documents.get(document.uri)?.dispose();
		this._documents.delete(document.uri);
	}

	/** Remove all documents. */
	public removeAll(): void {
		this._documents.forEach((value, key) => value.dispose());
		this._documents.clear();
	}
}
