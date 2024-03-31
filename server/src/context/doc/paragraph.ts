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
import { DocumentationParagraphCstNode } from "../../nodeclasses/doc/paragraph";
import { ResolveState } from "../../resolve/state";
import { Context } from "../context";
import { ContextDocBaseBlock } from "./baseBlock";
import { ContextDocBuilder } from "./builder";
import { ContextDocBase } from "./contextDoc";
import { ContextDocumentationDocState } from "./docState";


export class ContextDocumentationParagraph extends ContextDocBaseBlock{
	protected _title: ContextDocBase[] = [];
	
	
	constructor(node: DocumentationParagraphCstNode, parent: Context) {
		super(Context.ContextType.DocumentationParagraph, parent);
		
		const list = node.children.docWord;
		if (list) {
			for (const each of list) {
				const c = ContextDocBuilder.createWord(each, this);
				if (c) {
					this._title.push(c);
				}
			}
		}
	}
	
	dispose(): void {
		this._title.forEach(c => c.dispose());
		this._title.splice(0);
		super.dispose();
	}
	
	
	public resolveStatements(state: ResolveState): void {
		for (const each of this._title) {
			each.resolveStatements(state);
		}
	}
	
	
	public buildDoc(state: ContextDocumentationDocState): void {
		state.newParagraph(Context.ContextType.DocumentationDetails);
		state.wrap('### ', '\n', () => {
			for (const each of this._title) {
				each.buildDoc(state);
			}
		});
		this.buildDocWords(state);
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
		console.log(`${prefix}Paragraph`);
		this.logChildren(this._words, console, prefixLines)
	}
}
