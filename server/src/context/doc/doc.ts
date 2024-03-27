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
import { Helpers } from "../../helpers";
import { DocumentationDocCstNode } from "../../nodeclasses/doc/documentation";
import { ResolveState } from "../../resolve/state";
import { Context } from "../context";
import { ContextDocBaseBlock } from "./baseBlock";
import { ContextDocumentationBlockText } from "./blockText";
import { ContextDocumentationBrief } from "./brief";
import { ContextDocBuilder } from "./builder";
import { ContextDocumentationCode } from "./code";
import { ContextDocumentationCopyDoc } from "./copyDoc";
import { ContextDocumentationDeprecated } from "./deprecated";
import { ContextDocumentationDetails } from "./details";
import { ContextDocumentationDocState } from "./docState";
import { ContextDocumentationList } from "./list";
import { ContextDocumentationNewline } from "./newline";
import { ContextDocumentationNote } from "./note";
import { ContextDocumentationParagraph } from "./paragraph";
import { ContextDocumentationParam } from "./param";
import { ContextDocumentationReturn } from "./return";
import { ContextDocumentationReturnValue } from "./returnValue";
import { ContextDocumentationSee } from "./see";
import { ContextDocumentationSince } from "./since";
import { ContextDocumentationThrow } from "./throw";
import { ContextDocumentationTodo } from "./todo";
import { ContextDocumentationVersion } from "./version";
import { ContextDocumentationWarning } from "./warning";
import { ContextDocumentationWordIterator } from "./worditerator";
import { ContextDocumentationDate } from "./date";
import { ContextDocumentationAuthor } from "./author";
import { DocumentationWhitespace } from "./whitespace";
import { debugLogMessage } from "../../server";
import { ContextDocumentationTable } from "./table";


export class ContextDocumentationDoc extends Context{
	protected _node: DocumentationDocCstNode;
	protected _blocks: ContextDocBaseBlock[] = [];
	
	public brief: string[] = [];
	public details: string[] = [];
	public since: string = '';
	public date: string[] = [];
	public author: string[] = [];
	protected _params: Map<string, ContextDocumentationParam> = new Map();
	public return: string[] = [];
	protected _retvals: ContextDocumentationReturnValue[] = [];
	public deprecated: string[] = [];
	public todo: string[] = [];
	public note: string[] = [];
	public warning: string[] = [];
	protected _throws: ContextDocumentationThrow[] = [];
	public see: string[] = [];
	public hasDeprecated = false;
	
	protected _whitespaces: DocumentationWhitespace[] = [];
	protected _iterWhitespace: integer = 0;
	
	public static regexList = /^(-#|-|\+|\*|\d+\.)$/;
	
	constructor(node: DocumentationDocCstNode, parent: Context) {
		super(Context.ContextType.DocumentationDoc, parent);
		this._node = node;
		
		for (const each of node.children.docBlock) {
			const ec = each.children;
			if (ec.ruleBrief) {
				this._blocks.push(new ContextDocumentationBrief(ec.ruleBrief[0], this));
			} else if (ec.ruleCode) {
				this._blocks.push(new ContextDocumentationCode(ec.ruleCode[0], this));
			} else if (ec.ruleCopyDoc) {
				this._blocks.push(new ContextDocumentationCopyDoc(ec.ruleCopyDoc[0], this));
			} else if (ec.ruleDeprecated) {
				this._blocks.push(new ContextDocumentationDeprecated(ec.ruleDeprecated[0], this));
				this.hasDeprecated = true;
			} else if (ec.ruleDetails) {
				this._blocks.push(new ContextDocumentationDetails(ec.ruleDetails[0], this));
			} else if (ec.ruleNote) {
				this._blocks.push(new ContextDocumentationNote(ec.ruleNote[0], this));
			} else if (ec.ruleParagraph) {
				this._blocks.push(new ContextDocumentationParagraph(ec.ruleParagraph[0], this));
			} else if (ec.ruleParam) {
				this._blocks.push(new ContextDocumentationParam(ec.ruleParam[0], this));
			} else if (ec.ruleReturn) {
				this._blocks.push(new ContextDocumentationReturn(ec.ruleReturn[0], this));
			} else if (ec.ruleReturnValue) {
				this._blocks.push(new ContextDocumentationReturnValue(ec.ruleReturnValue[0], this));
			} else if (ec.ruleSince) {
				this._blocks.push(new ContextDocumentationSince(ec.ruleSince[0], this));
			} else if (ec.ruleDate) {
				this._blocks.push(new ContextDocumentationDate(ec.ruleDate[0], this));
			} else if (ec.ruleAuthor) {
				this._blocks.push(new ContextDocumentationAuthor(ec.ruleAuthor[0], this));
			} else if (ec.ruleThrow) {
				this._blocks.push(new ContextDocumentationThrow(ec.ruleThrow[0], this));
			} else if (ec.ruleTodo) {
				this._blocks.push(new ContextDocumentationTodo(ec.ruleTodo[0], this));
			} else if (ec.ruleVersion) {
				this._blocks.push(new ContextDocumentationVersion(ec.ruleVersion[0], this));
			} else if (ec.ruleWarning) {
				this._blocks.push(new ContextDocumentationWarning(ec.ruleWarning[0], this));
			} else if (ec.ruleSee) {
				this._blocks.push(new ContextDocumentationSee(ec.ruleSee[0], this));
			}
			
			const words = ec.docBlockText?.at(0)?.children.docBlockTextWord;
			if (words) {
				const iterator = new ContextDocumentationWordIterator(words);
				var word = iterator.current;
				var newline = true;
				
				var block = this._blocks.at(this._blocks.length - 1);
				if (!block?.canAppend) {
					block = new ContextDocumentationBlockText(this);
					this._blocks.push(block);
				}
				
				while (word) {
					const ec = word.children;
					word = iterator.next;
					if (ec.docWord) {
						const ec2 = ec.docWord[0].children;
						
						if (newline) {
							newline = false;
							
							const word = (ec2.word ?? ec2.docLine)?.at(0);
							
							if (word) {
								if (ContextDocumentationDoc.regexList.test(word.image)) {
									block = new ContextDocumentationList(word, this);
									this._blocks.push(block);
									continue;
									
								} else if (word.image == '|') {
									block = new ContextDocumentationTable(word, this);
									this._blocks.push(block);
								}
							}
						}
						
						const c = ContextDocBuilder.createWord(ec.docWord[0], block);
						if (c) {
							block.words.push(c);
						}
						
					} else if (ec.newline) {
						block.words.push(new ContextDocumentationNewline(ec.newline[0], this));
						newline = true;
					}
				}
			}
		}
	}
	
	dispose(): void {
		this._blocks.forEach(each => each.dispose());
		this._blocks.splice(0);
		this._params.clear();
		this._retvals.splice(0);
		this._throws.splice(0);
		
		super.dispose();
	}
	
	
	public get node(): DocumentationDocCstNode {
		return this._node;
	}
	
	public get blocks(): ContextDocBaseBlock[] {
		return this._blocks;
	}
	
	public get params(): Map<string, ContextDocumentationParam> {
		return this._params;
	}
	
	public get retvals(): ContextDocumentationReturnValue[] {
		return this._retvals;
	}
	
	public get throws(): ContextDocumentationThrow[] {
		return this._throws;
	}
	
	
	public get whitespaces(): DocumentationWhitespace[] {
		return this._whitespaces;
	}
	
	public setWhitespaces(tokens: IToken[]) {
		this._whitespaces = tokens.map(t => new DocumentationWhitespace(t));
		this._iterWhitespace = 0;
	}
	
	public whitespaceBefore(position: Position): DocumentationWhitespace | undefined {
		var whitespace = this._whitespaces.at(this._iterWhitespace);
		if (!whitespace) {
			return undefined;
		}
		
		if (Helpers.isPositionAfter(position, whitespace.range.start)) {
			while (true) {
				const index = this._iterWhitespace + 1;
				const next = this._whitespaces.at(index);
				if (!next || Helpers.isPositionBefore(position, next.range.start)) {
					return whitespace;
				}
				this._iterWhitespace = index;
				whitespace = next;
			}
			
		} else {
			while (true) {
				const index = this._iterWhitespace - 1;
				const next = this._whitespaces.at(index);
				if (!next) {
					return undefined;
				}
				this._iterWhitespace = index;
				whitespace = next;
				
				if (Helpers.isPositionAfter(position, whitespace.range.start)) {
					return whitespace;
				}
			}
		}
	}
	
	
	public resolveStatements(state: ResolveState): void {
		for (const each of this._blocks) {
			each.resolveStatements(state);
		}
	}
	
	
	public clearDoc(): void {
		this.brief.splice(0);
		this.details.splice(0);
		this.since = '';
		this.date.splice(0);
		this.author.splice(0);
		this._params.clear();
		this.return.splice(0);
		this._retvals.splice(0);
		this.deprecated.splice(0);
		this.todo.splice(0);
		this.note.splice(0);
		this.warning.splice(0);
		this._throws.splice(0);
		this.see.splice(0);
	}
	
	public buildDoc(): void {
		this.clearDoc();
		let state = new ContextDocumentationDocState(this);
		for (const each of this._blocks) {
			each.buildDoc(state);
		}
		state.endParagraph();
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
		console.log(`${prefix}Doc`);
		this.logChildren(this._blocks, console, prefixLines)
	}
}
