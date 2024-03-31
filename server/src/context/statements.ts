/**
 * MIT License
 *
 * Copyright (c) 2022 DragonDreams (info@dragondreams.ch)
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

import { Context } from "./context";
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { StatementsCstNode } from "../nodeclasses/statement";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextStatements extends Context{
	protected _statements: Context[];


	constructor(node: StatementsCstNode | undefined, parent: Context) {
		super(Context.ContextType.Statements, parent);
		this._statements = [];

		const stas = node?.children.statement;
		if (stas) {
			var rangeBegin: Position | undefined;
			var rangeEnd: Position | undefined;
			
			for (const staNode of stas) {
				for (const staCtx of ContextBuilder.createStatement(staNode, this)) {
					if (staCtx.range) {
						if (!rangeBegin) {
							rangeBegin = staCtx.range.start;
						}
						rangeEnd = staCtx.range.end;
					}
					this._statements.push(staCtx);
				}
			}
			
			if (rangeBegin && rangeEnd) {
				this.range = Range.create(rangeBegin, rangeEnd);
			}
		}
	}
	
	public dispose(): void {
		super.dispose();
		for (const each of this._statements) {
			each.dispose();
		}
	}

	
	public get statements(): Context[] {
		return this._statements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		for (const each of this._statements) {
			each.resolveMembers(state);
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		for (const each of this._statements) {
			each.resolveStatements(state);
		}
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		for (const each of this._statements) {
			each.collectChildDocSymbols(list);
		}
	}
	
	public searchExpression(search: ResolveSearch, moveUp: boolean, before: Context): void {
		super.searchExpression(search, moveUp, before);
		if (search.stopSearching) {
			return;
		}
		
		for (const each of this._statements) {
			if (each === before) {
				break;
			}
			each.searchExpression(search, false, this);
			if (search.stopSearching) {
				return;
			}
		}
	}
	
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._statements, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this.contextAtRangeList(this._statements, range)
			?? this;
	}
	
	public statementBefore(position: Position): Context | undefined {
		var statement: Context | undefined;
		for (const each of this._statements) {
			const stapos = each.range?.end;
			if (stapos && Helpers.isPositionBefore(position, stapos)) {
				break;
			}
			statement = each;
		}
		return statement;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		return CompletionHelper.createStatement(Range.create(position, position), this);
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		for (const each of this._statements) {
			each.log(console, prefix, prefixLines);
		}
	}
}
