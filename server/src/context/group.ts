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
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole, SignatureHelp } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { ExpressionGroupCstNode } from "../nodeclasses/expressionObject";
import { ResolveType } from "../resolve/type";


export class ContextGroup extends Context{
	protected _node: ExpressionGroupCstNode;
	protected _expression: Context;
	
	
	constructor(node: ExpressionGroupCstNode, parent: Context) {
		super(Context.ContextType.Group, parent);
		this._node = node;
		this._expression = ContextBuilder.createExpression(node.children.expression[0], this);
		this.range = Helpers.rangeFrom(node.children.leftParanthesis[0], node.children.rightParanthesis[0]);
	}
	
	public dispose(): void {
		super.dispose();
		this._expression.dispose();
	}
	
	
	public get node(): ExpressionGroupCstNode {
		return this._node;
	}

	public get expression(): Context | undefined {
		return this._expression;
	}
	
	
	protected updateResolveTextLong(): string[] {
		return this._expression.resolveTextLong;
	}
	
	protected updateResolveTextShort(): string {
		return this._expression.resolveTextShort;
	}
	
	protected updateReportInfoText(): string {
		return this._expression.reportInfoText;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		this._expression.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._expression.resolveStatements(state);
		this.expressionType = this._expression.expressionType;
		this.expressionAutoCast = this._expression.expressionAutoCast;
		this.expressionTypeType = this._expression.expressionTypeType;
		this.expressionWriteableResolve = this._expression.expressionWriteableResolve;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._expression.collectChildDocSymbols(list);
	}
	
	public searchExpression(search: ResolveSearch, moveUp: boolean, before: Context): void {
		super.searchExpression(search, moveUp, before);
		if (search.stopSearching) {
			return;
		}
		
		this._expression.searchExpression(search, false, this);
	}
	
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._expression.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._expression.contextAtRange(range)
			?? this;
	}
	
	public completion(_document: TextDocument, position: Position): CompletionItem[] {
		return CompletionHelper.createExpression(Range.create(position, position), this);
	}
	
	public expectTypes(_context: Context): ResolveType[] | undefined {
		return this._expression.expectTypes(this);
	}
	
	public signatureHelpAtPosition(position: Position): SignatureHelp | undefined {
		return this.parent?.signatureHelpAtPosition(position);
	}
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Group`);
		this.logChild(this._expression, console, `${prefixLines}  `);
	}
}
