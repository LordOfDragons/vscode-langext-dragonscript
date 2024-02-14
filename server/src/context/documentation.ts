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
import { integer, MarkupContent, MarkupKind, Position, Range, RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../helpers";
import { DocumentationDocCstNode } from "../nodeclasses/doc/documentation";
import { ResolveState } from "../resolve/state";
import { debugErrorMessage, debugLogMessage, documentationValidator, documents, scriptDocuments } from "../server";
import { Context } from "./context";
import { ContextDocumentationDoc } from "./doc/doc";


export class ContextDocumentation extends Context{
	protected _token: IToken;
	public targetContexts: Set<Context> = new Set<Context>();
	public docNode?: DocumentationDocCstNode;
	public docContext?: ContextDocumentationDoc;
	protected _docText?: string[];
	protected _isDeprecated = false;
	protected _markup: MarkupContent | undefined;
	protected _sectionDeprecated: string[] = [];
	protected _sectionBrief: string[] = [];
	protected _sectionDetails: string[] = [];
	protected _sectionParams: string[] = [];
	protected _sectionReturn: string[] = [];
	protected _sectionTodo: string[] = [];
	
	
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
	
	public get isDeprecated(): boolean {
		return this._isDeprecated;
	}
	
	
	public parseDocumentation(): void {
		this.docContext?.dispose();
		this.docContext = undefined;
		this.docNode = undefined;
		this._isDeprecated = false;
		this._sectionDeprecated.splice(0);
		this._sectionBrief.splice(0);
		this._sectionDetails.splice(0);
		this._sectionParams.splice(0);
		this._sectionReturn.splice(0);
		this._sectionTodo.splice(0);
		
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
	
	protected updateDocumentation(): void {
		this.parseDocumentation();
		
		const dc = this.docContext;
		if (dc) {
			dc.buildDoc();
			this._isDeprecated = dc.deprecated.length > 0;
		}
	}
	
	protected updateResolveTextLong(): string[] {
		let lines: string[] = [];
		
		const dc = this.docContext;
		if (dc) {
			if (dc.since != '') {
				lines.push(`Since Version: \`\`\`${dc.since}\`\`\``);
			}
			
			this.buildSectionDeprecated(dc);
			this.buildSectionBrief(dc);
			this.buildSectionDetails(dc);
			this.buildSectionParams(dc);
			this.buildSectionReturn(dc);
			this.buildSectionTodo(dc);
			
			lines.push(...this._sectionDeprecated);
			lines.push(...this._sectionBrief);
			lines.push(...this._sectionDetails);
			lines.push(...this._sectionParams);
			lines.push(...this._sectionReturn);
			lines.push(...this._sectionTodo);
		}
		
		return lines;
	}
	
	protected buildSectionDeprecated(context: ContextDocumentationDoc): void {
		if (context.deprecated.length == 0) {
			return;
		}
		
		this._sectionDeprecated.push('### Deprecated');
		this._sectionDeprecated.push(...context.deprecated);
	}
	
	protected buildSectionBrief(context: ContextDocumentationDoc): void {
		if (!context.brief) {
			return;
		}
		
		if (this._sectionBrief.length > 0 && this._sectionBrief[this._sectionBrief.length - 1] != '___') {
			this._sectionBrief.push('___');
		}
		this._sectionBrief.push(...context.brief);
	}
	
	protected buildSectionDetails(context: ContextDocumentationDoc): void {
		if (context.details.length == 0) {
			return;
		}
		
		if (this._sectionDetails.length > 0 && this._sectionDetails[this._sectionDetails.length - 1] != '___') {
			this._sectionDetails.push('___');
		}
		this._sectionDetails.push(...context.details);
	}
	
	protected buildSectionParams(context: ContextDocumentationDoc): void {
		if (context.params.size == 0) {
			return;
		}
		
		this._sectionParams.push('### Parameters');
		
		let parts: string[] = [];
		parts.push('| | | |');
		parts.push('| :--- | :--- | :--- |');
		for (const each of context.params) {
			const c = each[1];
			var text = '';
			if (c.direction) {
				text = c.direction;
			}
			parts.push(`| ${text} | \`\`\`${c.name}\`\`\` | ${c.description.join(' ')} |`);
		}
		this._sectionParams.push(parts.join('\n'));
	}
	
	protected buildSectionReturn(context: ContextDocumentationDoc): void {
		if (context.return.length == 0 && context.retvals.length == 0) {
			return;
		}
		
		this._sectionReturn.push('### Returns');
		this._sectionReturn.push(...context.return);
		
		if (context.retvals.length == 0) {
			return;
		}
		
		if (context.return.length > 0) {
			this._sectionReturn.push('');
		}
		
		let parts: string[] = [];
		parts.push('| | |');
		parts.push('| :--- | :--- |');
		for (const each of context.retvals) {
			parts.push(`| \`\`\`${each.value}\`\`\` | ${each.description.join(' ')} |`);
		}
		this._sectionReturn.push(parts.join('\n'));
	}
	
	protected buildSectionTodo(context: ContextDocumentationDoc): void {
		if (context.todo.length == 0) {
			return;
		}
		
		this._sectionTodo.push('### Todo');
		this._sectionTodo.push(...context.todo);
	}
	
	protected updateResolveTextShort(): string {
		return this.docText.join('  \n');
	}
	
	public get markup(): MarkupContent {
		if (!this._markup) {
			this._markup = {
				kind: MarkupKind.Markdown,
				value: this.resolveTextLong.join('  \n')
			}
		}
		return this._markup;
	}
	
	
	public resolveStatements(state: ResolveState): void {
		this.docContext?.resolveMembers(state);
		this.updateDocumentation();
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
