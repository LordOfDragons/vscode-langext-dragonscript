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

import { IToken } from "chevrotain";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver"
import { ContextFunction } from "../context/classFunction";
import { ContextNamespace } from "../context/namespace";
import { ContextClass } from "../context/scriptClass";
import { ContextEnumeration } from "../context/scriptEnum";
import { ContextInterface } from "../context/scriptInterface";
import { capabilities } from "../server";
import { ResolveNamespace } from "./namespace";


export class ResolveState {
	protected _diagnostics: Diagnostic[];
	protected _uri: string;
	protected _pins: ResolveNamespace[] = [];


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

	public parentNamespace?: ContextNamespace;
	public parentClass?: ContextClass;
	public parentInterface?: ContextInterface;
	public parentEnumeration?: ContextEnumeration;
	public parentFunction?: ContextFunction;

	public reset(): void {
		this._pins.length = 0;
		this.parentNamespace = undefined;
		this.parentClass = undefined;
		this.parentInterface = undefined;
		this.parentEnumeration = undefined;
		this.parentFunction = undefined;
	}


	public rangeFrom(start: IToken, end?: IToken, startAtLeft: boolean = true, endAtLeft: boolean = false): Range {
		// note: end column ist at the left side of the last character hence (+1 -1) cancels out
		let a = start;
		let b = end || start;
		
		let startLine = a.startLine || 1;
		let endLine = b.endLine || startLine;
		
		let startColumn = startAtLeft ? (a.startColumn || 1) : (a.endColumn || 1) + 1;
		let endColumn = endAtLeft ? (b.startColumn || 1) : (b.endColumn || 1) + 1;
		
		// note: line/column in chevrotain is base-1 and in vs base-0
		return Range.create(startLine - 1, startColumn - 1, endLine - 1, endColumn - 1);
	}


	public reportError(range: Range, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Error, range, message);
	}

	public reportWarning(range: Range, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Warning, range, message);
	}

	public reportInfo(range: Range, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Information, range, message);
	}

	public reportHint(range: Range, message: string) {
		this.reportDiagnostic(DiagnosticSeverity.Hint, range, message);
	}

	public reportDiagnostic(severity: DiagnosticSeverity, range: Range, message: string) {
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
