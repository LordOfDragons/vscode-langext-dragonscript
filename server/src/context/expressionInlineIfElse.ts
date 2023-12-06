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
import { DiagnosticRelatedInformation, DocumentSymbol, Hover, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ExpressionInlineIfElseCstNode } from "../nodeclasses/expressionInlineIfElse";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { Helpers } from "../helpers";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";


export class ContextInlineIfElse extends Context{
	protected _node: ExpressionInlineIfElseCstNode;
	protected _condition: Context;
	protected _ifvalue: Context;
	protected _elsevalue: Context;


	constructor(node: ExpressionInlineIfElseCstNode, parent: Context) {
		super(Context.ContextType.InlineIfElse, parent);
		this._node = node;
		
		let c = node.children;
		let m = c.more![0].children;
		this._condition = ContextBuilder.createExpressionLogic(c.condition[0], this);
		this._ifvalue = ContextBuilder.createExpressionLogic(m.expressionIf[0], this);
		this._elsevalue = ContextBuilder.createExpressionLogic(m.expressionElse[0], this);
		
		const rangeBegin = this._condition.range?.start;
		const rangeEnd = this._elsevalue.range?.end;
		if (rangeBegin && rangeEnd) {
			this.range = Range.create(rangeBegin, rangeEnd);
		}
	}
	
	public dispose(): void {
		super.dispose();
		this._condition.dispose();
		this._ifvalue.dispose();
		this._elsevalue.dispose();
	}


	public get node(): ExpressionInlineIfElseCstNode {
		return this._node;
	}

	public get condition(): Context {
		return this._condition;
	}

	public get ifvalue(): Context {
		return this._ifvalue;
	}

	public get elsevalue(): Context {
		return this._elsevalue;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		this._condition.resolveMembers(state);
		this._ifvalue.resolveMembers(state);
		this._elsevalue.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._condition.resolveStatements(state);
		this._ifvalue.resolveStatements(state);
		this._elsevalue.resolveStatements(state);
		
		this.expressionType = this._ifvalue.expressionType;
		this.expressionAutoCast = this._ifvalue.expressionAutoCast;
		
		const typeBool = ResolveNamespace.classBool;
		const ct = this._condition.expressionType;
		if (ct && ResolveSignatureArgument.typeMatches(ct, typeBool, this._condition.expressionAutoCast) == ResolveSignature.Match.No) {
			let ri: DiagnosticRelatedInformation[] = [];
			ct.addReportInfo(ri, `Source Type: ${ct.reportInfoText}`);
			typeBool.addReportInfo(ri, `Target Type: ${typeBool.reportInfoText}`);
			state.reportError(this._condition.range, `Condition: Invalid cast from ${ct.name} to ${typeBool.name}`, ri);
		}
		
		const it = this._ifvalue.expressionType;
		const et = this._elsevalue.expressionType;
		if (it && et && ResolveSignatureArgument.typeMatches(et, it, this._elsevalue.expressionAutoCast) == ResolveSignature.Match.No) {
			let ri: DiagnosticRelatedInformation[] = [];
			et.addReportInfo(ri, `Source Type: ${et.reportInfoText}`);
			it.addReportInfo(ri, `Target Type: ${it.reportInfoText}`);
			state.reportError(this._elsevalue.range, `Else: Invalid cast from ${et.name} to ${it.name}`, ri);
		}
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._condition.collectChildDocSymbols(list);
		this._ifvalue.collectChildDocSymbols(list);
		this._elsevalue.collectChildDocSymbols(list);
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		
		return this._condition.contextAtPosition(position)
			?? this._ifvalue.contextAtPosition(position)
			?? this._elsevalue.contextAtPosition(position)
			?? this;
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Inline If-Else`);
		this._condition.log(console, `${prefixLines}- Cond: `, `${prefixLines}  `);
		this._ifvalue.log(console, `${prefixLines}- If: `, `${prefixLines}  `);
		this._elsevalue.log(console, `${prefixLines}- Else: `, `${prefixLines}  `);
	}
}
