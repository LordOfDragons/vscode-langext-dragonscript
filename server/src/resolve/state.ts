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

import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver"
import { ContextFunction } from "../context/classFunction";
import { Context } from "../context/context";
import { ContextBlock } from "../context/expressionBlock";
import { ContextClass } from "../context/scriptClass";
import { capabilities } from "../server";
import { ResolveNamespace } from "./namespace";
import { ResolveSearch } from "./search";


export class ResolveState {
	protected _diagnostics: Diagnostic[];
	protected _uri: string;
	protected _pins: ResolveNamespace[] = [];
	protected _scopeContext?: Context;
	protected _scopeContextStack: Context[] = [];


	constructor (diagnostics: Diagnostic[], uri: string) {
		this._diagnostics = diagnostics;
		this._uri = uri;
	}


	public get diagnostics(): Diagnostic[] {
		return this._diagnostics;
	}
	
	public get uri(): string {
		return this._uri;
	}

	public get pins(): ResolveNamespace[] {
		return this._pins;
	}

	public clearPins(): void {
		this._pins.length = 0;
	}

	public get scopeContextStack(): Context[] {
		return this._scopeContextStack;
	}
	
	public get scopeContext(): Context | undefined {
		return this._scopeContext;
	}

	public pushScopeContext(context: Context): void {
		this._scopeContext = context;
		this._scopeContextStack.push(context)
	}

	public popScopeContext(): void {
		this._scopeContextStack.pop();
		this._scopeContext = this._scopeContextStack[this._scopeContextStack.length - 1];
	}

	public popScopeContextUntil(context: Context): void {
		while (this._scopeContext) {
			const found = this._scopeContext == context;
			this.popScopeContext();
			if (found) {
				break;
			}
		}
	}

	public withScopeContext(context: Context, block: Function) {
		this.pushScopeContext(context);
		try {
			block();
		} finally {
			this.popScopeContextUntil(context);
		}
	}

	public get topScopeClass(): ContextClass | undefined {
		return this.topScope(Context.ContextType.Class) as ContextClass;
	}

	public get topScopeFunction(): ContextFunction | undefined {
		return this.topScope(Context.ContextType.Function) as ContextFunction;
	}

	public get topScopeBlock(): ContextBlock | undefined {
		return this.topScope(Context.ContextType.Block) as ContextBlock;
	}

	public topScope(type: Context.ContextType): Context | undefined {
		for (let i=this._scopeContextStack.length - 1; i >= 0; i--) {
			const c = this._scopeContextStack[i];
			if (c.type == type) {
				return c;
			}
		}
		return undefined;
	}


	public search(search: ResolveSearch, before: Context): void {
		const onlyTypes = search.onlyTypes;

		for (let i=this._scopeContextStack.length - 1; i >= 0; i--) {
			let c = this._scopeContextStack[i];
			c.search(search, before)
			before = c;

			if (!search.onlyTypes) {
				switch (c.type) {
					case Context.ContextType.Class:
					case Context.ContextType.Interface:
					case Context.ContextType.Enumeration:
						search.onlyTypes = true;
				}
			}
		}
		
		for (const each of this._pins) {
			each.search(search);
		}

		search.onlyTypes = onlyTypes;
	}


	public reset(): void {
		this._pins.length = 0;
		this._scopeContext = undefined;
		this._scopeContextStack = [];
	}


	public reportError(range: Range | undefined, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Error, range, message);
	}

	public reportWarning(range: Range | undefined, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Warning, range, message);
	}

	public reportInfo(range: Range | undefined, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Information, range, message);
	}

	public reportHint(range: Range | undefined, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Hint, range, message);
	}

	public reportDiagnostic(severity: DiagnosticSeverity, range: Range | undefined, message: string) {
		if (!range) {
			return;
		}
		
		const diagnostic: Diagnostic = {
			severity: severity,
			range: range,
			message: message,
			source: 'Semantics'
		};

		if (capabilities.hasDiagnosticRelatedInformation) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: this._uri,
						range: Object.assign({}, range)
					},
					message: 'Semantics'
				}
			];
		}

		this._diagnostics.push(diagnostic);
	}
}
