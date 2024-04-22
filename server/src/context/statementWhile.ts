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
import { StatementWhileCstNode } from "../nodeclasses/statementWhile";
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { Helpers } from "../helpers";
import { ResolveType } from "../resolve/type";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { DebugSettings } from "../debugSettings";
import { debugLogMessage } from "../server";


export class ContextWhile extends Context{
	protected _condition?: Context;
	protected _statements: ContextStatements;
	protected _posEnd?: Position;
	

	constructor(node: StatementWhileCstNode, parent: Context) {
		super(Context.ContextType.While, parent);
		
		const whileBegin = node.children.statementWhileBegin[0].children;
		if (whileBegin.condition) {
			this._condition = ContextBuilder.createExpression(whileBegin.condition[0], this);
		}
		
		this._posEnd = Helpers.endOfCommandBegin(whileBegin.endOfCommand);
		
		this._statements = new ContextStatements(node.children.statements?.at(0), this);
		
		const tokBegin = whileBegin.while[0];
		
		var posEnd: Position | undefined;
		
		const whileEnd = node.children.statementWhileEnd?.at(0)?.children;
		if (whileEnd?.end?.at(0)) {
			posEnd = Helpers.positionFrom(whileEnd.end[0], false);
			this.blockClosed = true;
		}
		
		posEnd = posEnd ?? this._statements.range?.end
			?? this._posEnd
			?? this._condition?.range?.end
			?? Helpers.positionFrom(tokBegin, false);
		
		this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
	}

	public dispose(): void {
		super.dispose();
		this._condition?.dispose();
		this._statements.dispose();
	}


	public get condition(): Context | undefined {
		return this._condition;
	}

	public get statements(): ContextStatements {
		return this._statements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._condition?.resolveMembers(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		this._condition?.resolveStatements(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
		});
		
		this.requireCastable(state, this._condition, ResolveNamespace.classBool, 'Condition');
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._condition?.contextAtPosition(position)
			?? this._statements.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._condition?.contextAtRange(range)
			?? this._statements.contextAtRange(range)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._condition?.collectChildDocSymbols(list);
		this._statements.collectChildDocSymbols(list);
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		if (context == this._condition) {
			return [ResolveNamespace.classBool];
		}
		return undefined;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (DebugSettings.debugCompletion) {
			debugLogMessage('ContextWhile.completion');
		}
		
		if (this._posEnd && Helpers.isPositionAfter(position, this._posEnd)) {
			return this._statements.completion(document, position);
		} else {
			const range = CompletionHelper.wordRange(document, position);
			return CompletionHelper.createExpression(range, this);
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}While ${this.logRange}`);
		this.logChild(this._condition, console, prefixLines, "Cond: ");
		this.logChild(this._statements, console, prefixLines);
	}
}
