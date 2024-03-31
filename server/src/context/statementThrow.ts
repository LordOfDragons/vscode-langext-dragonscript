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
import { StatementThrowCstNode } from "../nodeclasses/statementThrow";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { TextDocument } from "vscode-languageserver-textdocument";


export class ContextThrow extends Context{
	protected _exception?: Context;
	
	
	constructor(node: StatementThrowCstNode, parent: Context) {
		super(Context.ContextType.Throw, parent);
		
		if (node.children.exception) {
			this._exception = ContextBuilder.createExpression(node.children.exception[0], this);
		}
		
		const tokBegin = node.children.throw[0];
		const tokEnd = this._exception?.range?.end;
		if (tokBegin && tokEnd) {
			this.range = Range.create(Helpers.rangeFrom(tokBegin).start, tokEnd);
		}
	}
	
	public dispose(): void {
		super.dispose();
		this._exception?.dispose();
	}
	
	
	public get exception(): Context | undefined {
		return this._exception;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		this._exception?.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._exception?.resolveStatements(state);
		
		this.requireCastable(state, this.exception, ResolveNamespace.classException, "Exception");
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._exception?.collectChildDocSymbols(list);
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._exception?.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._exception?.contextAtRange(range)
			?? this;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		return this._exception?.completion(document, position) ?? [];
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		if (this._exception) {
			this._exception?.log(console, `${prefix}Throw: ${this.logRange}: `, `${prefixLines}  `);
		} else {
			console.log(`${prefix}Throw ${this.logRange}`);
		}
	}
}
