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
import { CompletionItem, DiagnosticRelatedInformation, DocumentSymbol, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { StatementForCstNode } from "../nodeclasses/statementFor";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextFor extends Context{
	protected _variable?: Context;
	protected _from?: Context;
	protected _to?: Context;
	protected _downto: boolean;
	protected _step?: Context | undefined;
	protected _statements: ContextStatements;
	protected _posFrom?: Position;
	protected _posTo?: Position;
	protected _posStep?: Position;
	protected _posEnd?: Position;
	

	constructor(node: StatementForCstNode, parent: Context) {
		super(Context.ContextType.For, parent);
		
		const forBegin = node.children.statementForBegin[0].children;
		const forTo = forBegin.statementForTo?.at(0)?.children;
		const forFrom = forBegin.statementForFrom?.at(0)?.children;
		const forVariable = forBegin.statementForVariable[0].children;
		const forStep = forBegin.statementForStep?.at(0)?.children;
		
		const valueVariable = forVariable.variable.at(0);
		if (valueVariable) {
			this._variable = ContextBuilder.createExpressionObject(valueVariable, this);
		}
		
		const valueFrom = forFrom?.value?.at(0)
		if (valueFrom) {
			this._from = ContextBuilder.createExpression(valueFrom, this);
		}
		
		const valueTo = forTo?.value?.at(0);
		if (valueTo) {
			this._to = ContextBuilder.createExpression(valueTo, this);
		}
		this._downto = forTo?.downto !== undefined;
		
		if (forStep) {
			this._step = ContextBuilder.createExpression(forStep.value[0], this);
		}
		
		this._statements = new ContextStatements(node.children.statements[0], this);
		
		const tokBegin = node.children.statementForBegin[0].children.for[0];
		let tokEnd = node.children.statementForEnd[0].children.end?.at(0);
		
		const tokAssign = forBegin.statementForFrom?.at(0)?.children.assign?.at(0);
		if (tokAssign) {
			this._posFrom = Helpers.positionFrom(tokAssign);
		}
		
		const tokTo = forTo?.to?.at(0) ?? forTo?.downto?.at(0);
		if (tokTo) {
			this._posTo = Helpers.positionFrom(tokTo);
		}
		
		this._posEnd = Helpers.endOfCommandBegin(forBegin.endOfCommand);
		
		this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
	}

	public dispose(): void {
		super.dispose();
		this._variable?.dispose();
		this._from?.dispose();
		this._to?.dispose();
		this._step?.dispose();
		this._statements.dispose();
	}


	public get variable(): Context | undefined {
		return this._variable;
	}

	public get from(): Context | undefined {
		return this._from;
	}

	public get to(): Context | undefined {
		return this._to;
	}

	public get downto(): boolean {
		return this._downto;
	}

	public get step(): Context | undefined {
		return this._step;
	}

	public get statements(): ContextStatements {
		return this._statements;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._variable?.resolveMembers(state);
		this._from?.resolveMembers(state);
		this._to?.resolveMembers(state);
		this._step?.resolveMembers(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		this._variable?.resolveStatements(state);
		this._from?.resolveStatements(state);
		this._to?.resolveStatements(state);
		this._step?.resolveStatements(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
		});
		
		this.requireCastable(state, this._variable, ResolveNamespace.classInt, 'From');
		this.requireCastable(state, this._from, ResolveNamespace.classInt, 'From');
		this.requireCastable(state, this._to, ResolveNamespace.classInt, 'To');
		if (this._step) {
			this.requireCastable(state, this._step, ResolveNamespace.classInt, 'Step');
		}
		
		// find problems
		if (this._variable?.expressionWriteableResolve) {
			this._variable.expressionWriteableResolve.write = true;
		} else {
			let ri: DiagnosticRelatedInformation[] = [];
			this._variable?.addReportInfo(ri, `Variable: ${this._variable.reportInfoText}`);
			state.reportError(this._variable?.range, 'Variable is not writeable', ri);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._variable?.contextAtPosition(position)
			?? this._from?.contextAtPosition(position)
			?? this._to?.contextAtPosition(position)
			?? this._step?.contextAtPosition(position)
			?? this._statements.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._variable?.contextAtRange(range)
			?? this._from?.contextAtRange(range)
			?? this._to?.contextAtRange(range)
			?? this._step?.contextAtRange(range)
			?? this._statements.contextAtRange(range)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._variable?.collectChildDocSymbols(list);
		this._from?.collectChildDocSymbols(list);
		this._to?.collectChildDocSymbols(list);
		this._step?.collectChildDocSymbols(list);
		this._statements.collectChildDocSymbols(list);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const range = Range.create(position, position);
		let items: CompletionItem[] = [];
		
		if (this._posEnd && Helpers.isPositionAfter(position, this._posEnd)) {
			items.push(...CompletionHelper.createStatement(range, this));
		} else if (this._posStep && Helpers.isPositionAfter(position, this._posStep)) {
			items.push(...CompletionHelper.createExpression(range, this));
		} else if (this._posTo && Helpers.isPositionAfter(position, this._posTo)) {
			items.push(...CompletionHelper.createExpression(range, this));
		} else if (this._posFrom && Helpers.isPositionAfter(position, this._posFrom)) {
			items.push(...CompletionHelper.createExpression(range, this));
		} else {
			items.push(...CompletionHelper.createVariable(range, this, true));
		}
		
		return items;
	}
	
	public expectVariable(context: Context): Context.ExpectVariable {
		return context === this._variable ? Context.ExpectVariable.Write : Context.ExpectVariable.None;
	}
	
	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}For`);
		this.logChild(this._variable, console, prefixLines, "Var: ");
		this.logChild(this._from, console, prefixLines, "From: ");
		this.logChild(this._to, console, prefixLines, this._downto ? "DownTo: " : "To: ");
		this.logChild(this._step, console, prefixLines, "Step: ");
		this.logChild(this._statements, console, prefixLines);
	}
}
