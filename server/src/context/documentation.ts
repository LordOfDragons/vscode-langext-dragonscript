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
	protected _markup: MarkupContent | undefined;
	protected _sectionDeprecated: string[] = [];
	protected _sectionBrief: string[] = [];
	protected _sectionDetails: string[] = [];
	protected _sectionParams: string[] = [];
	protected _sectionReturn: string[] = [];
	protected _sectionTodo: string[] = [];
	protected _sectionNote: string[] = [];
	protected _sectionWarning: string[] = [];
	protected _sectionThrows: string[] = [];
	protected _sectionSee: string[] = [];
	protected _sectionDate: string[] = [];
	protected _sectionAuthor: string[] = [];
	
	
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
		return this.docContext?.hasDeprecated ?? false;
	}
	
	/*
	public static parentDocumentation(context: ContextDocBase): ContextDocumentation | undefined {
		var c: Context | undefined = context;
		while (c) {
			if (c.type === Context.ContextType.Documentation) {
				return c as ContextDocumentation;
			}
			c = c.parent;
		}
		return undefined;
	}
	*/
	
	
	protected parseDocumentation(): void {
		if (this.docContext) {
			return;
		}
		
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
	
	protected dropDocumentation(): void {
		this._docText = undefined;
		this._markup = undefined;
		this._sectionDeprecated.splice(0);
		this._sectionBrief.splice(0);
		this._sectionDetails.splice(0);
		this._sectionParams.splice(0);
		this._sectionReturn.splice(0);
		this._sectionTodo.splice(0);
		this._sectionNote.splice(0);
		this._sectionWarning.splice(0);
		this._sectionThrows.splice(0);
		this._sectionSee.splice(0);
		this._sectionDate.splice(0);
		this._sectionAuthor.splice(0);
		this._resolveTextLong = undefined;
		this._resolveTextShort = undefined;
	}
	
	protected updateDocumentation(state: ResolveState): void {
		this.parseDocumentation();
		this.docContext?.resolveStatements(state);
	}
	
	protected updateResolveTextLong(): string[] {
		let lines: string[] = [];
		
		const dc = this.docContext;
		if (dc) {
			dc.buildDoc();
			
			this.buildSectionDeprecated(dc);
			this.buildSectionBrief(dc);
			this.buildSectionDetails(dc);
			this.buildSectionParams(dc);
			this.buildSectionReturn(dc);
			this.buildSectionThrows(dc);
			this.buildSectionTodo(dc);
			this.buildSectionNote(dc);
			this.buildSectionWarning(dc);
			this.buildSectionSee(dc);
			this.buildSectionDate(dc);
			this.buildSectionAuthor(dc);
			
			if (dc.since != '') {
				lines.push(`Since Version: \`\`\`${dc.since}\`\`\``);
			}
			lines.push(...this._sectionDate);
			lines.push(...this._sectionAuthor);
			
			lines.push(...this._sectionDeprecated);
			
			this.addParaSepIfRequired(lines);
			lines.push(...this._sectionBrief);
			
			this.addParaSepIfRequired(lines);
			lines.push(...this._sectionDetails);
			
			lines.push(...this._sectionSee);
			lines.push(...this._sectionParams);
			lines.push(...this._sectionReturn);
			lines.push(...this._sectionThrows);
			lines.push(...this._sectionWarning);
			lines.push(...this._sectionNote);
			lines.push(...this._sectionTodo);
		}
		
		return lines;
	}
	
	protected addParaSepIfRequired(lines: string[]) {
		if (lines.length > 0 && lines[lines.length - 1] != '___') {
			lines.push('___');
		}
	}
	
	protected buildSectionDeprecated(context: ContextDocumentationDoc): void {
		if (context.deprecated.length == 0) {
			return;
		}
		
		this._sectionDeprecated.push('### 🪦 Deprecated');
		this._sectionDeprecated.push(...context.deprecated);
	}
	
	protected buildSectionBrief(context: ContextDocumentationDoc): void {
		this._sectionBrief.push(...context.brief);
	}
	
	protected buildSectionDetails(context: ContextDocumentationDoc): void {
		this._sectionDetails.push(...context.details);
	}
	
	protected buildSectionParams(context: ContextDocumentationDoc): void {
		if (context.params.size == 0) {
			return;
		}
		
		this._sectionParams.push('### 🔀 Parameters');
		
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
		
		this._sectionReturn.push('### ↪️ Returns');
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
		
		this._sectionTodo.push('### 📝 Todo');
		this._sectionTodo.push(...context.todo);
	}
	
	protected buildSectionNote(context: ContextDocumentationDoc): void {
		if (context.note.length == 0) {
			return;
		}
		
		this._sectionNote.push('### 📌 Note');
		this._sectionNote.push(...context.note);
	}
	
	protected buildSectionWarning(context: ContextDocumentationDoc): void {
		if (context.warning.length == 0) {
			return;
		}
		
		this._sectionWarning.push('### ⚠️ Warning');
		this._sectionWarning.push(...context.warning);
	}
	
	protected buildSectionThrows(context: ContextDocumentationDoc): void {
		if (context.throws.length == 0) {
			return;
		}
		
		this._sectionThrows.push('### ⚡️ Throws');
		
		let parts: string[] = [];
		parts.push('| | |');
		parts.push('| :--- | :--- |');
		for (const each of context.throws) {
			parts.push(`| \`\`\`${each.throwType}\`\`\` | ${each.description.join(' ')} |`);
		}
		this._sectionThrows.push(parts.join('\n'));
	}
	
	protected buildSectionSee(context: ContextDocumentationDoc): void {
		if (context.see.length == 0) {
			return;
		}
		
		this._sectionSee.push('### 🔗 See');
		let parts: string[] = [];
		for (const each of context.see) {
			parts.push(`  - ${each}`);
		}
		this._sectionSee.push(parts.join('\n'));
	}
	
	protected buildSectionDate(context: ContextDocumentationDoc): void {
		if (context.date.length == 0) {
			return;
		}
		
		let parts: string[] = [];
		for (const each of context.date) {
			parts.push(`\`\`\`${each}\`\`\``);
		}
		this._sectionDate.push(`Date: ${parts.join(', ')}`);
	}
	
	protected buildSectionAuthor(context: ContextDocumentationDoc): void {
		if (context.author.length == 0) {
			return;
		}
		
		let parts: string[] = [];
		for (const each of context.author) {
			parts.push(`\`\`\`${each}\`\`\``);
		}
		this._sectionAuthor.push(`Author: ${parts.join(', ')}`);
	}
	
	protected updateResolveTextShort(): string {
		//return this.docText.join('  \n');
		return this.resolveTextLong.join('  \n');
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
		this.dropDocumentation();
		this.updateDocumentation(state);
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
		var text = this._token.image;
		var indexStart = 0, indexEnd = text.length;
		var skipLineStart = false;
		
		if (text.startsWith('/**')) {
			indexStart = 3;
			if (text.endsWith('*/')) {
				indexEnd -= 2;
			}
			skipLineStart = true;
		} else if (text.startsWith('//<!')) {
			indexStart = 4;
		}
		text = text.substring(indexStart, indexEnd);
		
		let lines = text.split('\n').map(l => l.trim());
		if (skipLineStart) {
			lines = lines.map(l => l.startsWith('*') ? l.substring(1) : l);
		}
		return lines;
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
