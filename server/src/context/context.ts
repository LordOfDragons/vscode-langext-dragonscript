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
import { Diagnostic, DiagnosticSeverity, DocumentSymbol, Hover, Position, Range, RemoteConsole } from "vscode-languageserver";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { ResolveNamespace } from "../resolve/namespace";
import { capabilities } from "../server";
import { ContextNamespace } from "./namespace";
import { ResolveState } from "../resolve/state";


/** Base context. */
export class Context {
	protected _type: Context.ContextType;
	public parent?: Context;
	public documentSymbol?: DocumentSymbol;
	protected _hover: Hover | null | undefined;


	constructor(type: Context.ContextType, parent?: Context) {
		this._type = type;
		this.parent = parent;
	}

	/** Dispose of context. */
	dispose(): void {
		this.parent = undefined;
	}


	/** Type. */
	public get type(): Context.ContextType{
		return this._type;
	}
	
	public addChildDocumentSymbols(list: Context[]) {
		if (!this.documentSymbol || list.length == 0) {
			return;
		}

		if (!this.documentSymbol.children) {
			this.documentSymbol.children = [];
		}

		let docSyms = this.documentSymbol.children;
		for (const each of list) {
			if (each.documentSymbol) {
				docSyms.push(each.documentSymbol);
			}
		}
	}

	public get fullyQualifiedName(): string {
		return this.parent?.fullyQualifiedName || "";
	}

	public resolveClasses(state: ResolveState): void {
	}

	public resolveStatements(state: ResolveState): void {
	}

	public hover(position: Position): Hover | null {
		if (!this._hover || (this._hover!.range && !this.isPositionInsideRange(this._hover!.range!, position))) {
			this._hover = this.updateHover(position);
		}
		return this._hover;
	}

	protected updateHover(position: Position): Hover | null {
		return null;
	}

	public contextAtPosition(position: Position): Context | undefined {
		return undefined;
	}

	protected contextAtPositionList(list: Context[], position: Position): Context | undefined {
		var context: Context | undefined;
		list.find(each => context = each.contextAtPosition(position));
		return context;
	}

	public isPositionInsideRange(range: Range, position: Position): boolean {
		if (position.line < range.start.line) {
			return false;
		} else if (position.line == range.start.line) {
			if (position.character < range.start.character) {
				return false;
			}
		}

		if (position.line > range.end.line) {
			return false;
		} else if (position.line == range.end.line) {
			if (position.character > range.end.character) {
				return false;
			}
		}

		return true;
	}

	public isPositionInsideToken(token: IToken, position: Position): boolean {
		return this.isPositionInsideRange(this.rangeFrom(token), position);
	}

	public isPositionInsideTokens(start: IToken, end: IToken, position: Position): boolean {
		return this.isPositionInsideRange(this.rangeFrom(start, end), position);
	}


	/**
	 * Range from start and end token.
	 * If end is undefined start is used as end token.
	 */
	protected rangeFrom(start: IToken, end?: IToken, startAtLeft: boolean = true, endAtLeft: boolean = false): Range {
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

	protected reportError(diagnostics: Diagnostic[], uri: string, range: Range, message: string) {
		this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Error, range, message);
	}

	protected reportWarning(diagnostics: Diagnostic[], uri: string, range: Range, message: string) {
		this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Warning, range, message);
	}

	protected reportInfo(diagnostics: Diagnostic[], uri: string, range: Range, message: string) {
		this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Information, range, message);
	}

	protected reportHint(diagnostics: Diagnostic[], uri: string, range: Range, message: string) {
		this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Hint, range, message);
	}

	protected reportDiagnostic(diagnostics: Diagnostic[], uri: string, severity: DiagnosticSeverity, range: Range, message: string) {
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
						uri: uri,
						range: Object.assign({}, range)
					},
					message: 'Semantics'
				}
			];
		}

		diagnostics.push(diagnostic);
	}


	/** Debug. */
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Context: ${Context.ContextType[this._type]}`);
	}

	/** Debug log children. */
	protected logChildren(children: Context[] | undefined, console: RemoteConsole, prefix: string, prefixSuffix: string = "") {
		if (children) {
			let prefixChild = `${prefix}- ${prefixSuffix}`;
			let prefixLinesChild = `${prefix}  `;
			for (const each of children) {
				each.log(console, prefixChild, prefixLinesChild);
			}
		}
	}

	/** Debug log child. */
	protected logChild(child: Context | undefined, console: RemoteConsole, prefix: string, prefixSuffix: string = "") {
		if (child) {
			let prefixChild = `${prefix}- ${prefixSuffix}`;
			let prefixLinesChild = `${prefix}  `;
			child.log(console, prefixChild, prefixLinesChild);
		}
	}
}


export namespace Context {
	/** Context type. */
	export enum ContextType {
		Script,
		Namespace,
		PinNamespace,
		Class,
		Interface,
		Enumeration,
		EnumerationEntry,
		Function,
		FunctionArgument,
		Variable,
		Return,
		Break,
		Continue,
		If,
		While,
		Select,
		For,
		Throw,
		Statements,
		FunctionCall,
		InlineIfElse,
		Member,
		Constant,
		Generic
	}


	/** Type modifier. */
	export enum TypeModifier {
		Public,
		Protected,
		Private,
		Abstract,
		Fixed,
		Static,
		Native
	}


	/** Type modifier set. */
	export class TypeModifierSet extends Set<Context.TypeModifier> {
		protected _canonical?: Context.TypeModifier[];
		protected _typestring?: string;

		constructor(node?: TypeModifiersCstNode) {
			super();
			if (!node || !node.children.typeModifier) {
				this.add(Context.TypeModifier.Public);
				return;
			}

			for (const each of node.children.typeModifier) {
				if (each.children.public) {
					this.add(Context.TypeModifier.Public);
				} else if (each.children.protected) {
					this.add(Context.TypeModifier.Protected);
				} else if (each.children.private) {
					this.add(Context.TypeModifier.Private);
				} else if (each.children.abstract) {
					this.add(Context.TypeModifier.Abstract);
				} else if (each.children.fixed) {
					this.add(Context.TypeModifier.Fixed);
				} else if (each.children.static) {
					this.add(Context.TypeModifier.Static);
				} else if (each.children.native) {
					this.add(Context.TypeModifier.Native);
				}
			}
		}


		public get canonical(): Context.TypeModifier[] {
			if (!this._canonical) {
				this._canonical = [];
				if (this.has(Context.TypeModifier.Native)) {
					this._canonical.push(Context.TypeModifier.Native);
				}
				if (this.has(Context.TypeModifier.Static)) {
					this._canonical.push(Context.TypeModifier.Static);
				}
				if (this.has(Context.TypeModifier.Fixed)) {
					this._canonical.push(Context.TypeModifier.Fixed);
				}
				if (this.has(Context.TypeModifier.Abstract)) {
					this._canonical.push(Context.TypeModifier.Abstract);
				}
				if (this.has(Context.TypeModifier.Public)) {
					this._canonical.push(Context.TypeModifier.Public);
				}
				if (this.has(Context.TypeModifier.Protected)) {
					this._canonical.push(Context.TypeModifier.Protected);
				}
				if (this.has(Context.TypeModifier.Private)) {
					this._canonical.push(Context.TypeModifier.Private);
				}
			}
			return this._canonical;
		}

		public get typestring(): string {
			if (!this._typestring) {
				let parts = [];
				if (this.has(Context.TypeModifier.Native)) {
					parts.push('native');
				}
				if (this.has(Context.TypeModifier.Static)) {
					parts.push('static');
				}
				if (this.has(Context.TypeModifier.Fixed)) {
					parts.push('fixed');
				}
				if (this.has(Context.TypeModifier.Abstract)) {
					parts.push('abstract');
				}
				if (this.has(Context.TypeModifier.Public)) {
					parts.push('public');
				}
				if (this.has(Context.TypeModifier.Protected)) {
					parts.push('protected');
				}
				if (this.has(Context.TypeModifier.Private)) {
					parts.push('private');
				}
				this._typestring = parts.length > 0 ? parts.reduce((a, b) => `${a} ${b}`) : "";
			}
			return this._typestring;
		}
		
		toString() : string {
			if (this.size > 0) {
				return "(" + this.canonical.map(x => Context.TypeModifier[x]).reduce((a, b) => `${a}, ${b}`) + ")";
			} else {
				return "()";
			}
		}
	}
}
