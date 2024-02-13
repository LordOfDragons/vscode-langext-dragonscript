/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { IToken } from "chevrotain";
import { integer, Position, Range, RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../helpers";
import { DocumentationDocCstNode } from "../nodeclasses/doc/documentation";
import { debugErrorMessage, debugLogMessage, documentationValidator, documents, scriptDocuments } from "../server";
import { Context } from "./context";
import { ContextDocumentationDoc } from "./doc/doc";


export class ContextDocumentation extends Context{
	protected _token: IToken;
	public targetContexts: Set<Context> = new Set<Context>();
	public docNode?: DocumentationDocCstNode;
	public docContext?: ContextDocumentationDoc;
	private _docText?: string[];
	
	
	constructor(token: IToken, parent: Context) {
		super(Context.ContextType.Documentation, parent);
		this._token = token;
		this.range = Helpers.rangeFrom(token);
	}
	
	dispose(): void {
		super.dispose();
		this.docContext?.dispose();
		this.docContext = undefined;
		this.docNode = undefined;
		this.targetContexts.clear();
	}
	
	
	public get token(): IToken {
		return this._token;
	}
	
	
	public get docText(): string[] {
		if (!this._docText) {
			this._docText = this.buildDocText();
		}
		return this._docText;
	}
	
	
	public parseDocumentation(): void {
		this.docContext?.dispose();
		this.docContext = undefined;
		this.docNode = undefined;
		
		const uri = this.documentUri;
		if (!uri) {
			return;
		}
		
		const scriptDocument = scriptDocuments.get(uri);
		if (!scriptDocument) {
			return;
		}
		
		const textDocument = documents.get(uri);
		if (textDocument) {
			documentationValidator.parse(scriptDocument, this, textDocument);
			
		} else {
			let logs: string[] = [];
			try {
				documentationValidator.parseLog(scriptDocument, this, logs);
			} catch (error) {
				debugErrorMessage('Documentation Failed parsing');
				if (error instanceof Error) {
					let err = error as Error;
					debugErrorMessage(error.name);
					if (error.stack) {
						debugErrorMessage(error.stack);
					}
				} else {
					debugErrorMessage(`${error}`);
				}
				return;
			}
			
			for (const each of logs) {
				debugLogMessage(each);
			}
		}
	}
	
	protected updateResolveTextLong(): string[] {
		this.parseDocumentation();
		
		let lines: string[] = [];
		if (this.docContext) {
			this.docContext.buildDoc();
			if (this.docContext.brief) {
				lines.push(...this.docContext.brief);
				lines.push('___');
			}
			lines.push(...this.docContext.details);
		}
		
		lines.push('___');
		lines.push(...this.docText);
		return lines;
	}
	
	protected updateResolveTextShort(): string {
		return this.docText.join('  \n');
	}
	
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this;
	}
	
	
	protected buildDocText(): string[] {
		let content: string[] = [];
		for (let each of this._token.image.split('\n')) {
			each = each.trim();
			if (each == '*') {
				continue;
			} else if (each.startsWith('/**')) {
				each = each.substring(3);
			} else if (each.startsWith('*/')) {
				continue;
			} else if (each.startsWith('* ')) {
				each = each.substring(2);
			}
			if (each.endsWith('*/')) {
				each = each.substring(0, each.length - 2);
			}
			if (each.trim().length == 0) {
				continue;
			}
			content.push(each);
		}
		return content;
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Documentation`);
	}
}


export class ContextDocumentationIterator{
	protected _list: ContextDocumentation[];
	protected _nextIndex: integer;
	protected _count: integer;
	protected _last: integer;
	
	constructor(list: ContextDocumentation[]) {
		this._list = list;
		this._nextIndex = 0;
		this._count = list.length;
		this._last = this._count - 1;
	}
	
	public get current(): ContextDocumentation | undefined {
		return this._list.at(this._nextIndex);
	}
	
	public currentIfBefore(position: Position | undefined): ContextDocumentation | undefined {
		if (!position) {
			return undefined;
		}
		const doc = this.current;
		const docpos = doc?.range?.start;
		return docpos && Helpers.isPositionBefore(docpos, position) ? doc : undefined;
	}
	
	public get next(): ContextDocumentation | undefined {
		if (this._nextIndex < this._count) {
			this._nextIndex++;
		}
		return this.current;
	}
	
	public lastBefore(position: Position): ContextDocumentation | undefined {
		if (this._nextIndex == this._count) {
			return undefined;
		}
		
		var doc = this._list[this._nextIndex];
		var docpos = doc?.range?.start;
		if (!(docpos && Helpers.isPositionBefore(docpos, position))) {
			return undefined;
		}
		
		while (this._nextIndex < this._last) {
			const next = this._list[this._nextIndex + 1];
			docpos = next?.range?.start;
			if (docpos && Helpers.isPositionBefore(docpos, position)) {
				this._nextIndex++;
				doc = next;
			} else {
				break;
			}
		}
		return doc;
	}
	
	public firstAfter(position: Position): ContextDocumentation | undefined {
		var doc = this.current;
		var docpos = doc?.range?.start;
		if (docpos && Helpers.isPositionAfter(docpos, position)) {
			return doc;
		}
		
		while (true) {
			doc = this.next;
			if (!doc) {
				return undefined;
			}
			
			docpos = doc.range?.start;
			if (docpos && Helpers.isPositionAfter(docpos, position)) {
				return doc;
			}
		}
	}
}
