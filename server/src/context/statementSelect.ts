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
import { StatementCaseCstNode, StatementSelectCstNode } from "../nodeclasses/statementSelect";
import { DocumentSymbol, Position, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";


export class ContextSelectCase extends Context {
	protected _node: StatementCaseCstNode;
	protected _values: Context[];
	protected _statements: ContextStatements;
	
	
	constructor(node: StatementCaseCstNode, parent: ContextSelect) {
		super(Context.ContextType.SelectCase, parent);
		this._node = node;
		this._values = [];
		
		const values = node.children.value;
		if (values) {
			for (const each of values) {
				this._values.push(ContextBuilder.createExpression(each, parent));
			}
		}
		
		this._statements = new ContextStatements(node.children.statements[0], parent);
		
		const tokBegin = node.children.case[0];
		let tokEnd = this._statements.range?.end;
		
		if (tokEnd) {
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), tokEnd);
		}
	}
	
	public dispose(): void {
		for (const each of this._values) {
			each.dispose();
		}
		this._statements.dispose();
	}
	
	
	public get values(): Context[] {
		return this._values;
	}
	
	public get statements(): ContextStatements {
		return this._statements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._values) {
				each.resolveMembers(state);
			}
			this._statements.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._values) {
				each.resolveStatements(state);
			}
			this._statements.resolveStatements(state);
		});
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		
		return this._values.find((each) => each.contextAtPosition(position))
			?? this._statements.contextAtPosition(position);
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		for (const each of this._values) {
			each.collectChildDocSymbols(list);
		}
		this._statements?.collectChildDocSymbols(list);
	}
	
	
	log(console: RemoteConsole, prefix: string = ""): void {
		console.log(`${prefix}- Case`);
		for (const each of this._values) {
			each.log(console, `${prefix}  - Val: `, `${prefix}    `);
		}
		this._statements.log(console, `${prefix}  - `, `${prefix}    `);
	}
}


export class ContextSelect extends Context {
	protected _node: StatementSelectCstNode;
	protected _value: Context;
	protected _cases: ContextSelectCase[];
	protected _elsestatements?: ContextStatements;
	
	
	constructor(node: StatementSelectCstNode, parent: Context) {
		super(Context.ContextType.Select, parent);
		this._node = node;
		this._cases = [];
		
		let selbegin = node.children.statementSelectBegin[0].children;
		this._value = ContextBuilder.createExpression(selbegin.value[0], this);
		
		if (node.children.statementCase) {
			for (const each of node.children.statementCase) {
				this._cases.push(new ContextSelectCase(each, this));
			}
		}
		
		if (node.children.statementSelectElse) {
			this._elsestatements = new ContextStatements(node.children.statementSelectElse[0].children.statements[0], this);
		}
		
		const tokBegin = node.children.statementSelectBegin[0].children.select[0];
		let tokEnd = node.children.statementSelectEnd[0].children.end[0];
		
		this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
	}
	
	public dispose(): void {
		super.dispose();
		this._value.dispose();
		for (const each of this._cases) {
			each.dispose();
		}
		this._elsestatements?.dispose();
	}
	
	
	public get node(): StatementSelectCstNode {
		return this._node;
	}
	
	public get condition(): Context {
		return this._value;
	}
	
	public get cases(): ContextSelectCase[] {
		return this._cases;
	}
	
	public get elsestatements(): ContextStatements | undefined {
		return this._elsestatements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._value.resolveMembers(state);
			for (const each of this._cases) {
				each.resolveMembers(state);
			}
			this._elsestatements?.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._value.resolveStatements(state);
			for (const each of this._cases) {
				each.resolveStatements(state);
			}
			this._elsestatements?.resolveStatements(state);
		});
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		
		return this._value.contextAtPosition(position)
			?? this.contextAtPositionList(this._cases, position)
			?? this._elsestatements?.contextAtPosition(position);
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._value?.collectChildDocSymbols(list);
		for (const each of this._cases) {
			each.collectChildDocSymbols(list);
		}
		this._elsestatements?.collectChildDocSymbols(list);
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Select ${this.logRange}`);
		this.logChild(this._value, console, prefixLines, "Value: ");
		for (const each of this._cases) {
			each.log(console, prefixLines);
		}
		if (this._elsestatements) {
			console.log(`${prefixLines}- Else`);
			this.logChild(this._elsestatements, console, `${prefixLines}  `);
		}
	}
}
