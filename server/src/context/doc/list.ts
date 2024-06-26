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
import { RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../../helpers";
import { Context } from "../context";
import { ContextDocBaseBlock } from "./baseBlock";
import { ContextDocumentationDocState } from "./docState";


export class ContextDocumentationList extends ContextDocBaseBlock{
	protected _token: IToken;
	
	
	constructor(token: IToken, parent: Context) {
		super(Context.ContextType.DocumentationList, parent);
		this._token = token;
	}
	
	
	public prepareRange(state: ContextDocumentationDocState): void {
		const lastWord = this._words.at(this._words.length - 1);
		lastWord?.prepareRange(state);
		
		this.range = Helpers.rangeFrom(this._token);
		this.range = Helpers.rangeFromPosition(this.range.start, lastWord?.range?.end ?? this.range.end);
	}
	
	public buildDoc(state: ContextDocumentationDocState): void {
		this.findIndent(state);
		
		state.newParagraph();
		
		const character = this._token.image.at(0);
		switch (character) {
		case '-':
		case '+':
		case '*':
			state.addWord(`  ${this.indentText}-`);
			break;
			
		default:
			state.addWord(`  ${this.indentText}1.`);
		}
		
		this.buildDocWords(state);
	}
	
	
	log(console: RemoteConsole, prefix: string = "", _prefixLines: string = "") {
		console.log(`${prefix}Newline`);
	}
}
