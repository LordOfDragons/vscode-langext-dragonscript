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
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";
import { IToken } from "chevrotain";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveType } from "../resolve/type";


export class ContextSelectCase extends Context {
	protected _node: StatementCaseCstNode;
	protected _values: Context[];
	protected _statements: ContextStatements;
	
	
	constructor(node: StatementCaseCstNode, parent: ContextSelect) {
		super(Context.ContextType.SelectCase, parent);
		this._node = node;
		this._values = [];
		
		var posEnd: Position | undefined;
		
		const values = node.children.statementCaseValues?.at(0)?.children.value;
		if (values) {
			for (const each of values) {
				this._values.push(ContextBuilder.createExpression(each, parent));
			}
		}
		
		this._statements = new ContextStatements(node.children.statements?.at(0), parent);
		
		const tokBegin = node.children.case[0];
		posEnd = Helpers.endOfCommandBegin(node.children.endOfCommand) ?? this._statements.range?.end ?? posEnd;
		
		if (posEnd) {
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
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
		return this.contextAtPositionList(this._values, position)
			?? this._statements.contextAtPosition(position)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		for (const each of this._values) {
			each.collectChildDocSymbols(list);
		}
		this._statements?.collectChildDocSymbols(list);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const vt = this.parent?.expectTypes(this);
		if (!vt) {
			return [];
		}
		
		const cv = this._values.find(each => Helpers.isPositionInsideRange(each.range, position));
		return CompletionHelper.createExpression(cv?.range ?? Range.create(position, position), this, vt);
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		return this.parent?.expectTypes(context);
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
		
		const body = node.children.statementSelectBody?.at(0)?.children;
		if (body?.statementCase) {
			for (const each of body?.statementCase) {
				this._cases.push(new ContextSelectCase(each, this));
			}
		}
		
		if (body?.statementSelectElse) {
			this._elsestatements = new ContextStatements(body?.statementSelectElse[0].children.statements[0], this);
		}
		
		const tokBegin = node.children.statementSelectBegin[0].children.select[0];
		
		var tokEnd: IToken | undefined;
		
		const selEnd = node.children.statementSelectEnd?.at(0)?.children;
		if (selEnd) {
			if (selEnd.end) {
				tokEnd = selEnd.end[0];
			} else if (selEnd.endOfCommand) {
				const selEnd2 = selEnd.endOfCommand[0].children;
				if (selEnd2) {
					tokEnd = (selEnd2.newline ?? selEnd2.commandSeparator)?.at(0);
				}
			}
		}
		
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
	
	public get value(): Context {
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
			?? this._elsestatements?.contextAtPosition(position)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._value?.collectChildDocSymbols(list);
		for (const each of this._cases) {
			each.collectChildDocSymbols(list);
		}
		this._elsestatements?.collectChildDocSymbols(list);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const range = Range.create(position, position);
		let items: CompletionItem[] = [];
		
		if (this._value.contextAtPosition(position)) {
			items.push(...CompletionHelper.createExpression(this._value.range ?? range, this));
		} else {
			items.push(CompletionHelper.createSelectCase(range));
			if (this._cases.length > 0 && !this._elsestatements) {
				items.push(CompletionHelper.createSelectElse(range));
			}
		}
		
		return items;
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		const vt = this._value.expressionType;
		if (vt) {
			return vt === ResolveNamespace.classInt ? [ResolveNamespace.classInt] : [ResolveNamespace.classEnumeration];
		} else {
			return undefined;
		}
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
