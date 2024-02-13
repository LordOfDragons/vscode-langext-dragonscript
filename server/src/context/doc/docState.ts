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

import { Context } from "../context";
import { ContextDocumentationDoc } from "./doc";


export class ContextDocumentationDocState {
	protected _doc: ContextDocumentationDoc;
	public curBlockType: Context.ContextType;
	public lines: string[] = [];
	public words: string[] = [];
	public hasNewline = false;
	
	
	constructor(doc: ContextDocumentationDoc) {
		this._doc = doc;
		this.curBlockType = Context.ContextType.DocumentationBrief;
	}
	
	
	public get doc(): ContextDocumentationDoc {
		return this._doc;
	}
	
	public addNewline(): void {
		if (this.hasNewline) {
			this.endParagraph();
		} else {
			this.hasNewline = true;
		}
	}
	
	public addWord(word: string): void {
		this.hasNewline = false;
		this.words.push(word);
	}
	
	public endParagraph(): void {
		this.hasNewline = false;
		
		if (this.words.length > 0) {
			this.lines.push(this.words.join(' '));
			this.words.splice(0);
		}
		
		if (this.lines.length > 0) {
			switch (this.curBlockType) {
			case Context.ContextType.DocumentationBrief:
				this._doc.brief = this.lines;
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationDetails:
				if (this._doc.details) {
					this._doc.details.push('');
				}
				this._doc.details.push(...this.lines);
				this.lines.splice(0);
				
			default:
				if (this._doc.details) {
					this._doc.details.push('');
				}
				this._doc.details.push(...this.lines);
				this.lines.splice(0);
				break;
			}
		}
	}
	
	public newParagraph(): void {
		this.endParagraph();
	}
}
