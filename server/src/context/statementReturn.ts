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
import { CompletionItem, DiagnosticRelatedInformation, DocumentSymbol, Hover, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { StatementReturnCstNode } from "../nodeclasses/statementReturn";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { ResolveNamespace } from "../resolve/namespace";
import { CodeActionInsertCast } from "../codeactions/insertCast";
import { CodeActionRemove } from "../codeactions/remove";
import { ContextFunction } from "./classFunction";
import { TextDocument } from "vscode-languageserver-textdocument";


export class ContextReturn extends Context{
	protected _node: StatementReturnCstNode;
	private _value?: Context;


	constructor(node: StatementReturnCstNode, parent: Context) {
		super(Context.ContextType.Return, parent);
		this._node = node;

		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0], this);
		}

		const tokBegin = node.children.return[0];
		const tokEnd = this._value?.range?.end;
		if (tokBegin && tokEnd) {
			this.range = Range.create(Helpers.rangeFrom(tokBegin).start, tokEnd);
		}
	}

	public dispose(): void {
		super.dispose();
		this._value?.dispose();
	}


	public get node(): StatementReturnCstNode {
		return this._node;
	}

	protected get value(): Context | undefined {
		return this._value;
	}

	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		this._value?.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._value?.resolveStatements(state);
		
		const cbf = state.topScopeBlock ?? state.topScopeFunction;
		if (!cbf) {
			return;
		}
		
		var frt = cbf.returnType?.resolve?.resolved as ResolveType;
		if (cbf.type == Context.ContextType.Function) {
			switch ((cbf as ContextFunction).functionType) {
			case ContextFunction.Type.Constructor:
			case ContextFunction.Type.Destructor:
				frt = ResolveNamespace.classVoid;
				break;
			}
		}
		const ov = this._value;
		
		if (frt && frt !== ResolveNamespace.classVoid) {
			if (ov) {
				const tv = ov.expressionType;
				if (ResolveSignatureArgument.typeMatches(tv, frt, ov.expressionAutoCast) === ResolveSignature.Match.No) {
					let ri: DiagnosticRelatedInformation[] = [];
					tv?.addReportInfo(ri, `Return Value Type: ${tv?.reportInfoText}`);
					frt.addReportInfo(ri, `Function Return Type: ${frt.reportInfoText}`);
					cbf.addReportInfo(ri, `Function ${cbf.reportInfoText}`);
					const di = state.reportError(Helpers.rangeFrom(this.node.children.return[0]),
						`Invalid cast from ${tv?.name} to ${frt.name}`, ri);
					if (di && tv) {
						this.codeActions.push(new CodeActionInsertCast(di, tv, frt, ov, ov.expressionAutoCast));
					}
				}
				
			} else {
				let ri: DiagnosticRelatedInformation[] = [];
				cbf.addReportInfo(ri, `Function ${cbf.reportInfoText}`);
				state.reportError(Helpers.rangeFrom(this.node.children.return[0]),
					`Missing return value for function with return type ${frt.name}`, ri);
			}
			
		} else {
			if (ov) {
				let ri: DiagnosticRelatedInformation[] = [];
				cbf.addReportInfo(ri, `Function ${cbf.reportInfoText}`);
				const di = state.reportError(Helpers.rangeFrom(this.node.children.return[0]),
					'Return value not allowed in function with void return type', ri);
				if (di && this.range) {
					this.codeActions.push(new CodeActionRemove(di, 'Remove return value',
						Helpers.shrinkRange(this.range, 6, 0), this));
				}
			}
		}
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._value?.collectChildDocSymbols(list);
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._value?.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._value?.contextAtRange(range)
			?? this;
	}
	
	protected updateHover(position: Position): Hover | null {
		return null;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		return this._value?.completion(document, position) ?? [];
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		if (this._value) {
			this._value.log(console, `${prefix}Return: ${this.logRange}: `, `${prefixLines}  `);
		} else {
			console.log(`${prefix}Return ${this.logRange}`);
		}
	}
}
