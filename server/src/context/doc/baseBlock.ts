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

import { Position, Range } from "vscode-languageserver";
import { Helpers } from "../../helpers";
import { DocumentationBlockTextCstNode, DocumentationBlockTextWordCstNode } from "../../nodeclasses/doc/blockText";
import { ResolveState } from "../../resolve/state";
import { Context } from "../context";
import { ContextDocBuilder } from "./builder";
import { ContextDocBase } from "./contextDoc";
import { ContextDocumentationDocState } from "./docState";
import { ContextDocumentationNewline } from "./newline";


export class ContextDocBaseBlock extends ContextDocBase{
	protected _words: ContextDocBase[] = [];
	
	
	constructor(type: Context.ContextType, parent: Context) {
		super(type, parent);
	}
	
	dispose(): void {
		this._words.forEach(each => each.dispose());
		this._words.splice(0);
		
		super.dispose();
	}
	
	
	public get words(): Context[] {
		return this._words;
	}
	
	
	public addWords(node: DocumentationBlockTextCstNode): void {
		const list = node.children.docBlockTextWord;
		if (list) {
			for (const each of list) {
				const ec = each.children;
				if (ec.docWord) {
					const c = ContextDocBuilder.createWord(ec.docWord[0], this);
					if (c) {
						this._words.push(c);
					}
				} else if (ec.ruleNewline) {
					this._words.push(new ContextDocumentationNewline(ec.ruleNewline[0], this));
				}
			}
		}
	}
	
	
	public resolveStatements(state: ResolveState): void {
		for (const each of this._words) {
			each.resolveStatements(state);
		}
	}
	
	
	protected buildDocWords(state: ContextDocumentationDocState): void {
		for (const each of this._words) {
			each.buildDoc(state);
		}
	}
	
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._words, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this.contextAtRangeList(this._words, range)
			?? this;
	}
}
