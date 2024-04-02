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
import { ClassVariableCstNode } from "../nodeclasses/declareClass";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { FullyQualifiedClassNameCstNode } from "../nodeclasses/fullyQualifiedClassName";
import { CompletionItem, Definition, DiagnosticRelatedInformation, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { TypeName } from "./typename";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { IToken } from "chevrotain";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveVariable } from "../resolve/variable";
import { ResolveType } from "../resolve/type";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { Helpers } from "../helpers";
import { ResolveClass } from "../resolve/class";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextClassVariable extends Context{
	protected _typeModifiers: Context.TypeModifierSet;
	protected _name?: Identifier;
	protected _typename: TypeName;
	protected _value?: Context;
	protected _firstVariable?: ContextClassVariable;
	protected _resolveVariable?: ResolveVariable;


	constructor(node: ClassVariableCstNode | undefined,
				typemodNode: TypeModifiersCstNode | undefined,
				typeNode: FullyQualifiedClassNameCstNode,
				firstVar: ContextClassVariable | undefined,
				endToken: IToken | undefined, parent: Context) {
		super(Context.ContextType.ClassVariable, parent);
		const children = node?.children;
		
		this._typeModifiers = new Context.TypeModifierSet(typemodNode,
			Context.AccessLevel.Private, [Context.TypeModifier.Private]);
		
		if (children) {
			this._name = new Identifier(children.name[0]);
		}
		
		this._typename = new TypeName(typeNode);
		this._firstVariable = firstVar;
		
		if (children?.value) {
			this._value = ContextBuilder.createExpression(children.value[0], this);
		}
		
		let tokBegin = firstVar ? this._name?.token : typeNode.children.fullyQualifiedClassNamePart?.at(0)?.children.identifier?.at(0);
		let tokEnd = endToken ?? this._name?.token;
		
		if (tokBegin) {
			this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
			
			if (this._name) {
				const symkind = this._typeModifiers.has(Context.TypeModifier.Fixed) ? SymbolKind.Constant : SymbolKind.Variable;
				this.documentSymbol = DocumentSymbol.create(this._name.name, this._typename.name, symkind,
					this.range, Helpers.rangeFrom(tokBegin, tokEnd, true, true));
			}
		}
	}

	dispose(): void {
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;

		super.dispose()
		this._typename.dispose();
		this._value?.dispose;
	}


	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get name(): Identifier | undefined {
		return this._name;
	}

	public get typename(): TypeName {
		return this._typename;
	}

	public get value(): Context | undefined {
		return this._value;
	}

	public get firstVariable(): ContextClassVariable | undefined {
		return this._firstVariable;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name?.name ?? "?";
	}

	public get simpleName(): string {
		return this._name?.name ?? "?";
	}
	
	public get resolveVariable(): ResolveVariable | undefined {
		return this._resolveVariable;
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;
		
		if (this._firstVariable) {
			this._typename.resolve = this._firstVariable._typename.resolve;
		} else {
			this._typename.resolveType(state, this);
		}
		
		if (this._name) {
			this._resolveVariable = new ResolveVariable(this);
			if (this.parent) {
				var container: ResolveType | undefined;
				if (this.parent.type === Context.ContextType.Class) {
					container = (this.parent as ContextClass).resolveClass;
				} else if (this.parent.type === Context.ContextType.Interface) {
					container = (this.parent as ContextInterface).resolveInterface;
				}

				if (container) {
					if (container.variable(this._name.name)) {
						state.reportError(this._name.range, `Duplicate variable ${this._name}`);
					} else {
						container.addVariable(this._resolveVariable);
					}
				}
			}
		}
	}

	public resolveStatements(state: ResolveState): void {
		if (this.resolveVariable && this._name) {
			const parentClass = this.resolveVariable.parent as ResolveClass;
			let pcr = parentClass?.context?.extends?.resolve?.resolved as ResolveClass;
			while (pcr) {
				const v = pcr.variable(this._name.name);
				if (v) {
					if (v.canAccess(parentClass)) {
						let ri: DiagnosticRelatedInformation[] = [];
						v.addReportInfo(ri, `Target: ${v.reportInfoText}`);
						state.reportWarning(this._name.range, `Shadows variable ${this._name.name} in ${pcr.fullyQualifiedName}`, ri);
					}
					break;
				}
				pcr = pcr.context?.extends?.resolve?.resolved as ResolveClass;
			}
		}

		this._value?.resolveStatements(state);
		
		this.documentation?.resolveStatements(state);
		
		if (this._typeModifiers.isStatic && this._typeModifiers.isFixed && !this._value) {
			state.reportError(this._name?.range, `Static fixed variables require an initial value`);
		}
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
		if (this._name?.isPositionInside(position)) {
			let content: string[] = [];
			content.push(...this.resolveTextLong);
			if (this.documentation) {
				content.push('___');
				content.push(...this.documentation.resolveTextLong);
			}
			return new HoverInfo(content, this._name.range);
		}
		
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.hover(position);
		}
		
		return null;
	}

	protected updateResolveTextShort(): string {
		return `${this._typename} ${this.parent?.simpleName}.${this._name}`;
	}

	protected updateResolveTextLong(): string[] {
		return [`${this._typeModifiers.typestring} **variable** *${this._typename}* *${this.parent?.fullyQualifiedName}*.**${this._name}**`];
	}

	protected updateReportInfoText(): string {
		return `${this._typeModifiers.typestring} ${this._typename} ${this.parent?.simpleName}.${this._name}`;
	}
	
	public definition(position: Position): Definition {
		if (this._name?.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.definition(position);
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name?.isPositionInside(position)) {
			return this._resolveVariable;
		} else if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return (!this._firstVariable ? this._typename?.location(this) : undefined)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this._name ? this.resolveLocation(this._name.range) : undefined;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._firstVariable) {
			return [];
		}
		
		const npos = this._name?.range?.start;
		if (!npos || Helpers.isPositionBefore(position, npos)) {
			if (this._typename) {
				return this._typename.completion(document, position, this);
			}
		}
		
		// TODO propose variable names
		return []
	}
	
	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Variable ${this._typeModifiers} ${this._typename.name} ${this._name}`);
		this._value?.log(console, `${prefixLines}- Value: `, `${prefixLines}  `);
	}
}
