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
import { StatementElifCstNode, StatementIfCstNode } from "../nodeclasses/statementIf";
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveType } from "../resolve/type";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextIfElif extends Context {
	protected _node: StatementElifCstNode;
	protected _condition?: Context;
	protected _statements: ContextStatements;
	protected _endBegin?: Position;
	
	
	constructor(node: StatementElifCstNode, parent: Context) {
		super(Context.ContextType.IfElif, parent);
		this._node = node;
		
		const valueCondition = node.children.condition?.at(0);
		if (valueCondition) {
			this._condition = ContextBuilder.createExpression(valueCondition, parent);
		}
		
		this._endBegin = Helpers.endOfCommandEnd(node.children.endOfCommand);
		
		this._statements = new ContextStatements(node.children.statements?.at(0), parent);
		
		const tokBegin = node.children.elif[0];
		var posEnd = this._statements.range?.end
			?? Helpers.endOfCommandBegin(node.children.endOfCommand)
			?? this._condition?.range?.end
			?? Helpers.positionFrom(node.children.elif[0], false);
		
		if (posEnd) {
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
		}
	}
	
	public dispose(): void {
		this._condition?.dispose()
		this._statements.dispose()
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
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._endBegin && Helpers.isPositionAfter(position, this._endBegin)) {
			return this._statements.completion(document, position);
			
		} else {
			return this._condition?.completion(document, position)
				?? CompletionHelper.createExpression(Range.create(position, position), this);
		}
	}


	log(console: RemoteConsole, prefix: string = "") {
		console.log(`${prefix}- Elif ${this.logRange}`);
		this._condition?.log(console, `${prefix}  - Cond: `, `${prefix}    `);
		this._statements.log(console, `${prefix}  - `, `${prefix}    `);
	}
}


export class ContextIf extends Context {
	protected _node: StatementIfCstNode;
	protected _condition?: Context;
	protected _ifstatements: ContextStatements;
	protected _elif: ContextIfElif[];
	protected _elsestatements?: ContextStatements;
	protected _endBegin?: Position;
	
	
	constructor(node: StatementIfCstNode, parent: Context) {
		super(Context.ContextType.If, parent);
		this._node = node;
		this._elif = [];
		
		let ifbegin = node.children.statementIfBegin[0].children;
		this._condition = ContextBuilder.createExpression(ifbegin.condition[0], this);
		
		this._endBegin = Helpers.endOfCommandEnd(ifbegin.endOfCommand);
		
		this._ifstatements = new ContextStatements(ifbegin.statements?.at(0), this);
		
		if (node.children.statementElif) {
			for (const each of node.children.statementElif) {
				this._elif.push(new ContextIfElif(each, this));
			}
		}
		
		if (node.children.statementElse) {
			this._elsestatements = new ContextStatements(node.children.statementElse[0].children.statements[0], this);
		}
		
		const tokBegin = ifbegin.if[0];
		var posEnd: Position | undefined;
		
		const tokEnd = node.children.statementIfEnd[0].children.end?.at(0);
		if (tokEnd) {
			posEnd = Helpers.positionFrom(tokEnd, false);
		}
		
		posEnd = posEnd ?? this._elsestatements?.range?.end
			?? this._elif.at(this._elif.length - 1)?.range?.end
			?? this._endBegin
			?? Helpers.positionFrom(ifbegin.if[0], false);
		
		this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
	}
	
	public dispose(): void {
		super.dispose();
		this._condition?.dispose();
		this._ifstatements.dispose();
		for (const each of this._elif) {
			each.dispose();
		}
		this._elsestatements?.dispose();
	}
	
	
	public get node(): StatementIfCstNode {
		return this._node;
	}
	
	public get condition(): Context | undefined {
		return this._condition;
	}
	
	public get ifstatements(): ContextStatements {
		return this._ifstatements;
	}
	
	public get elif(): ContextIfElif[] {
		return this._elif;
	}
	
	public elifBefore(position: Position): ContextIfElif | undefined {
		var statement: ContextIfElif | undefined;
		for (const each of this._elif) {
			const stapos = each.range?.end;
			if (stapos && Helpers.isPositionBefore(position, stapos)) {
				break;
			}
			statement = each;
		}
		return statement;
	}
	
	public get elsestatements(): ContextStatements | undefined {
		return this._elsestatements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._condition?.resolveMembers(state);
		
		state.withScopeContext(this, () => {
			this._ifstatements.resolveMembers(state);
		});
		
		for (const each of this._elif) {
			each.resolveMembers(state);
		}
		
		if (this._elsestatements) {
			state.withScopeContext(this, () => {
				this._elsestatements?.resolveMembers(state);
			});
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		this._condition?.resolveStatements(state);
		
		state.withScopeContext(this, () => {
			this._ifstatements.resolveStatements(state);
		});
		
		for (const each of this._elif) {
			each.resolveStatements(state);
		}
		
		if (this._elsestatements) {
			state.withScopeContext(this, () => {
				this._elsestatements?.resolveStatements(state);
			});
		}
		
		this.requireCastable(state, this._condition, ResolveNamespace.classBool, 'Condition');
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._condition?.contextAtPosition(position)
			?? this._ifstatements.contextAtPosition(position)
			?? this.contextAtPositionList(this._elif, position)
			?? this._elsestatements?.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._condition?.contextAtRange(range)
			?? this._ifstatements.contextAtRange(range)
			?? this.contextAtRangeList(this._elif, range)
			?? this._elsestatements?.contextAtRange(range)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._condition?.collectChildDocSymbols(list);
		this._ifstatements.collectChildDocSymbols(list);
		for (const each of this._elif) {
			each.collectChildDocSymbols(list);
		}
		this._elsestatements?.collectChildDocSymbols(list);
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		return context === this._condition ? [ResolveNamespace.classBool] : undefined;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._endBegin && Helpers.isPositionAfter(position, this._endBegin)) {
			const posElse = this._elsestatements?.range?.start;
			if (posElse && Helpers.isPositionAfter(position, posElse)) {
				return this._elsestatements?.completion(document, position) ?? [];
			}
			
			const posElif = this._elif.at(0)?.range?.start;
			if (posElif && Helpers.isPositionAfter(position, posElif)) {
				return this.elifBefore(position)?.completion(document, position) ?? [];
			}
			
			return this._ifstatements.completion(document, position);
			
		} else {
			return this._condition?.completion(document, position)
				?? CompletionHelper.createExpression(Range.create(position, position), this);
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}If-Else ${this.logRange}`);
		this.logChild(this._condition, console, prefixLines, "Cond: ");
		console.log(`${prefixLines}- If ${this._ifstatements.logRange}`);
		this.logChild(this._ifstatements, console, `${prefixLines}  `);
		for (const each of this._elif) {
			each.log(console, prefixLines);
		}
		if (this._elsestatements) {
			console.log(`${prefixLines}- Else ${this._elsestatements.logRange}`);
			this.logChild(this._elsestatements, console, `${prefixLines}  `);
		}
	}
}
