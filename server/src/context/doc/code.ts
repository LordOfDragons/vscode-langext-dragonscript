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

import { Position, Range, RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../../helpers";
import { DocumentationCodeCstNode } from "../../nodeclasses/doc/code";
import { Context } from "../context";
import { ContextDocBaseBlock } from "./baseBlock";
import { ContextDocumentationDocState } from "./docState";


export class ContextDocumentationCode extends ContextDocBaseBlock{
	protected _node: DocumentationCodeCstNode;
	protected _language: string;
	protected _codeSuffix: string;
	protected _codeLines: string[];
	
	
	constructor(node: DocumentationCodeCstNode, parent: Context) {
		super(Context.ContextType.DocumentationCode, parent);
		this._node = node;
		this._canAppend = false;
		
		const token = node.children.code[0];
		var text = token.image;
		
		text = text.substring(5, text.length - 8);
		if (text.startsWith('{')) {
			const index = text.indexOf('}');
			this._codeSuffix = text.substring(1, index);
			text = text.substring(index + 1);
		} else {
			this._codeSuffix = '.ds';
		}
		
		switch (this._codeSuffix) {
		case '.ds':
			this._language = 'dragonscript';
			break;
			
		case '.xml':
			this._language = 'xml';
			break;
			
		default:
			this._language = 'text';
		}
		
		this._codeLines = text.split('\n');
	}
	
	
	public get node(): DocumentationCodeCstNode {
		return this._node;
	}
	
	public get language(): string {
		return this._language;
	}
	
	public get codeSuffix(): string {
		return this._codeSuffix;
	}
	
	public get codeLines(): string[] {
		return this._codeLines;
	}
	
	
	public buildDoc(state: ContextDocumentationDocState): void {
		state.newParagraph();
		state.addWord(`\`\`\`${this._language}`);
		for (const each of this._codeLines) {
			state.addWord('\n');
			state.addWord(each);
		}
		state.addWord('\n');
		state.addWord('```');
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
	
	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Code`);
		this.logChildren(this._words, console, prefixLines)
	}
}
