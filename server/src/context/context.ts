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

import { Definition, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, URI } from "vscode-languageserver";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { capabilities } from "../server";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveType } from "../resolve/type";
import { ResolveSearch } from "../resolve/search";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";


/** Base context. */
export class Context {
	protected _type: Context.ContextType;
	public parent?: Context;
	public documentSymbol?: DocumentSymbol;
	protected _hover: Hover | null | undefined;
	public range?: Range
	public expressionType?: ResolveType;
	public expressionAutoCast: Context.AutoCast = Context.AutoCast.No;
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];
	protected _reportInfoText?: string;


	constructor(type: Context.ContextType, parent?: Context) {
		this._type = type;
		this.parent = parent;
	}

	/** Dispose of context. */
	dispose(): void {
		this.parent = undefined;
		this.expressionType = undefined;
		this.expressionAutoCast = Context.AutoCast.No;
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
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		if (this.documentSymbol) {
			list.push(this.documentSymbol);
		}
	}
	

	public get fullyQualifiedName(): string {
		return this.parent?.fullyQualifiedName || "";
	}

	public get simpleName(): string {
		return "";
	}

	public resolveClasses(state: ResolveState): void {
	}

	public resolveInheritance(state: ResolveState): void {
	}

	public resolveMembers(state: ResolveState): void {
	}

	public resolveStatements(state: ResolveState): void {
	}

	public hover(position: Position): Hover | null {
		if (!this._hover || (this._hover.range && !Helpers.isPositionInsideRange(this._hover.range, position))) {
			this._hover = this.updateHover(position);
		}
		return this._hover;
	}

	protected updateHover(position: Position): Hover | null {
		return null;
	}
	
	public definition(position: Position): Definition {
		return [];
	}
	
	public resolveLocation(range?: Range): Location | undefined {
		const uri = this.getDocumentUri();
		return uri && range ? Location.create(uri, range) : undefined;
	}
	
	public resolveLocationSelf(): Location | undefined {
		return this.resolveLocation(this.range);
	}
	

	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		return "?";
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
	}

	protected updateResolveTextLong(): string[] {
		return ["?"];
	}

	public get reportInfoText(): string {
		if (!this._reportInfoText) {
			this._reportInfoText = this.updateReportInfoText();
		}
		return this._reportInfoText ?? "?";
	}

	protected updateReportInfoText(): string {
		return "?";
	}

	public contextAtPosition(position: Position): Context | undefined {
		return undefined;
	}

	protected contextAtPositionList(list: Context[], position: Position): Context | undefined {
		for (const each of list) {
			const context = each.contextAtPosition(position);
			if (context) {
				return context;
			}
		}
		return undefined;
	}
	
	public getDocumentUri(): URI | undefined {
		return this.parent?.getDocumentUri();
	}
	
	public getReportLocation(): Location {
		return Location.create(this.getDocumentUri() ?? "",
			this.documentSymbol?.range ?? this.range ??
				Range.create(Position.create(1, 1), Position.create(1, 1)));
	}
	
	public createReportInfo(message: string): DiagnosticRelatedInformation {
		return DiagnosticRelatedInformation.create(this.getReportLocation(), message);
	}
	
	public addReportInfo(relatedInformation: DiagnosticRelatedInformation[], message: string) {
		relatedInformation.push(this.createReportInfo(message));
	}

	protected ignoreException(code: () => void) {
		try {
			code();
		} catch (error) {
			/*
			if (error instanceof Error) {
				let err = error as Error;
				debugLogMessage(err.name);
				if (err.stack) {
					debugLogMessage(err.stack);
				}
			} else {
				debugLogMessage(`${error}`);
			}
			*/
		}
	}


	public search(search: ResolveSearch, before: Context | undefined = undefined): void {
	}
	
	protected requireCastable(state: ResolveState, context: Context | undefined,
			targetType: ResolveType | undefined, infoPrefix: string): void {
		if (context && targetType) {
			const ct = context.expressionType;
			if (ct && ResolveSignatureArgument.typeMatches(ct, targetType, context.expressionAutoCast) == ResolveSignature.Match.No) {
				let ri: DiagnosticRelatedInformation[] = [];
				ct.addReportInfo(ri, `Source Type: ${ct.reportInfoText}`);
				targetType.addReportInfo(ri, `Target Type: ${targetType.reportInfoText}`);
				state.reportError(context.range, `${infoPrefix}: Invalid cast from ${ct.name} to ${targetType.name}`, ri);
			}
		}
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
		ClassVariable,
		Return,
		Break,
		Continue,
		If,
		IfElif,
		While,
		Select,
		SelectCase,
		For,
		Throw,
		Statements,
		FunctionCall,
		InlineIfElse,
		Member,
		Constant,
		Block,
		Try,
		TryCatch,
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

	/** Acces level. */
	export enum AccessLevel {
		Public,
		Protected,
		Private
	}


	/** Type modifier set. */
	export class TypeModifierSet extends Set<Context.TypeModifier> {

		protected _canonical?: Context.TypeModifier[];
		protected _typestring?: string;
		protected _accessLevel: AccessLevel = AccessLevel.Public;
		protected _abstract: boolean = false;
		protected _fixed: boolean = false;
		protected _static: boolean = false;

		constructor(node: TypeModifiersCstNode | undefined, defaultModifier: Context.TypeModifier) {
			super();
			
			if (!node || !node.children.typeModifier) {
				this.add(defaultModifier);
				
				switch (defaultModifier) {
				case Context.TypeModifier.Public:
					this._accessLevel = AccessLevel.Public;
					break;
					
				case Context.TypeModifier.Protected:
					this._accessLevel = AccessLevel.Protected;
					break;
					
				case Context.TypeModifier.Private:
					this._accessLevel = AccessLevel.Private;
					break;
				}
				
				return;
			}

			for (const each of node.children.typeModifier) {
				if (each.children.public) {
					this.add(Context.TypeModifier.Public);
					this._accessLevel = AccessLevel.Public;

				} else if (each.children.protected) {
					this.add(Context.TypeModifier.Protected);
					this._accessLevel = AccessLevel.Protected;

				} else if (each.children.private) {
					this.add(Context.TypeModifier.Private);
					this._accessLevel = AccessLevel.Private;

				} else if (each.children.abstract) {
					this.add(Context.TypeModifier.Abstract);
					this._abstract = true;

				} else if (each.children.fixed) {
					this.add(Context.TypeModifier.Fixed);
					this._fixed = true;

				} else if (each.children.static) {
					this.add(Context.TypeModifier.Static);
					this._static = true;

				} else if (each.children.native) {
					this.add(Context.TypeModifier.Native);
				}
			}
		}


		public get accessLevel(): AccessLevel {
			return this._accessLevel;
		}

		public get isPublic(): boolean {
			return this._accessLevel == AccessLevel.Public;
		}

		public get isProtected(): boolean {
			return this._accessLevel == AccessLevel.Protected;
		}

		public get isPrivate(): boolean {
			return this._accessLevel == AccessLevel.Private;
		}

		public get isPublicOrProtected(): boolean {
			return this._accessLevel <= AccessLevel.Protected;
		}

		public get isProtectedOrPrivate(): boolean {
			return this._accessLevel >= AccessLevel.Protected;
		}

		public get isAbstract(): boolean {
			return this._abstract;
		}

		public get isFixed(): boolean {
			return this._fixed;
		}

		public get isStatic(): boolean {
			return this._static;
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
	
	/**
	 * Auto-cast support from null keyword or literal to types
	 * where an explicit cast would be otherwise required.
	 */
	export enum AutoCast {
		/** No auto cast. */
		No,
		
		/** Auto cast constant 'null'. */
		KeywordNull,
		
		/** Auto cast literal of type byte. */
		LiteralByte,
		
		/** Auto cast literal of type int. */
		LiteralInt,
		
		/** Auto cast value of type byte. */
		ValueByte,
		
		/** Auto cast value of type int. */
		ValueInt
	}
}
