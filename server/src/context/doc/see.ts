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
import { DocumentationSeeCstNode } from "../../nodeclasses/doc/see";
import { Resolved } from "../../resolve/resolved";
import { ResolveState } from "../../resolve/state";
import { Context } from "../context";
import { ContextDocBaseBlock } from "./baseBlock";
import { ContextDocumentationDocState } from "./docState";
import { ContextDocumentationWord } from "./word";


export class ContextDocumentationSee extends ContextDocBaseBlock{
	protected _resolved: (Resolved | undefined)[] = [];
	
	
	constructor(node: DocumentationSeeCstNode, parent: Context) {
		super(Context.ContextType.DocumentationSee, parent);
	}
	
	dispose(): void {
		this._resolved.splice(0); // no dispose!
		
		super.dispose();
	}
	
	
	public resolveStatements(state: ResolveState): void {
		this._resolved.splice(0); // no dispose!
		
		for (const each of this._words) {
			if (each.type == Context.ContextType.DocumentationWord) {
				this._resolved.push(this.resolveSymbol(state, this.parseSymbol((each as ContextDocumentationWord).text)));
			} else {
				this._resolved.push(undefined);
			}
		}
	}
	
	
	public buildDoc(state: ContextDocumentationDocState): void {
		state.newParagraph(Context.ContextType.DocumentationSee);
		
		for (var i=0; i<this._words.length; i++) {
			const r = this._resolved.at(i);
			if (r) {
				const l = r.resolveLocation.at(0);
				if (l) {
					state.addWordEscape(Helpers.linkFromLocation(l, r.linkName));
					continue;
				}
			}
			this._words[i].buildDoc(state);
		}
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
		console.log(`${prefix}See`);
		this.logChildren(this._words, console, prefixLines)
	}
}
