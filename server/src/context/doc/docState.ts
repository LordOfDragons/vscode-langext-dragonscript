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
import { ContextDocumentationParam } from "./param";
import { ContextDocumentationReturnValue } from "./returnValue";
import { ContextDocumentationSee } from "./see";
import { ContextDocumentationThrow } from "./throw";


export class ContextDocumentationDocState {
	protected _doc: ContextDocumentationDoc;
	public curBlockType: Context.ContextType;
	public lines: string[] = [];
	public words: string[] = [];
	public hasNewline = false;
	protected _wordWrap?: string;
	public curParam?: ContextDocumentationParam;
	public curRetVal?: ContextDocumentationReturnValue;
	public curThrow?: ContextDocumentationThrow;
	public curSee?: ContextDocumentationSee;
	
	
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
	
	public escapeHtml(text: string): string {
		return text.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
	
	public addWord(word: string): void {
		this.hasNewline = false;
		if (this._wordWrap) {
			this.words.push(this._wordWrap + word);
			this._wordWrap = undefined;
		} else {
			this.words.push(word);
		}
	}
	
	public addWordEscape(word: string): void {
		this.addWord(this.escapeHtml(word));
	}
	
	public wrap(wrapBegin: string, wrapEnd: string, block: Function): void {
		this._wordWrap = wrapBegin;
		try {
			block();
		} finally {
			if (this._wordWrap) {
				this._wordWrap = undefined;
			} else if (this.words.length > 0) {
				const index = this.words.length - 1;
				const word = this.words.at(index);
				this.words[index] = word + wrapEnd;
			}
		}
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
				this._doc.brief.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
			
			case Context.ContextType.DocumentationSince:
			case Context.ContextType.DocumentationVersion:
				this._doc.since = this.lines.join(' ');
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationParam:
				if (!this.curParam) {
					break;
				}
				this.curParam.description.push(...this.lines);
				this.curParam = undefined;
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
			
			case Context.ContextType.DocumentationReturnValue:
				if (!this.curRetVal) {
					break;
				}
				this.curRetVal.description.push(...this.lines);
				this.curRetVal = undefined;
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationReturn:
				this._doc.return.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationDeprecated:
				this._doc.deprecated.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationTodo:
				this._doc.todo.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationNote:
				this._doc.note.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationWarning:
				this._doc.warning.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
			
			case Context.ContextType.DocumentationThrow:
				if (!this.curThrow) {
					break;
				}
				this.curThrow.description.push(...this.lines);
				this.curThrow = undefined;
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationSee:
				this._doc.see.push(...this.lines);
				this.lines = [];
				this.curBlockType = Context.ContextType.DocumentationDetails;
				break;
				
			case Context.ContextType.DocumentationDetails:
			default:
				if (this._doc.details.length > 0) {
					this._doc.details.push('');
				}
				this._doc.details.push(...this.lines);
				this.lines = [];
			}
		}
	}
	
	public newParagraph(type?: Context.ContextType): void {
		this.endParagraph();
		this.curBlockType = type ?? this.curBlockType;
	}
}
