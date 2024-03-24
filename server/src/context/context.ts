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

import { CodeAction, CompletionItem, Definition, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SignatureHelp, SymbolInformation, URI } from "vscode-languageserver";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { capabilities, logError } from "../server";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveType } from "../resolve/type";
import { ResolveSearch } from "../resolve/search";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { ContextDocumentation, ContextDocumentationIterator } from "./documentation";
import { BaseCodeAction } from "../codeactions/base";


/** Base context. */
export class Context {
	protected _type: Context.ContextType;
	public parent?: Context;
	public documentSymbol?: DocumentSymbol;
	public workspaceSymbol?: SymbolInformation;
	protected _hover: Hover | null | undefined;
	public range?: Range
	public expressionType?: ResolveType;
	public expressionAutoCast: Context.AutoCast = Context.AutoCast.No;
	public expressionTypeType: Context.ExpressionType = Context.ExpressionType.Void;
	public expressionWriteableResolve?: ResolveUsage;
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];
	protected _reportInfoText?: string;
	private static _defaultTypeModifiers?: Context.TypeModifierSet;
	public documentation?: ContextDocumentation;
	protected _codeActions: BaseCodeAction[] = [];
	

	constructor(type: Context.ContextType, parent?: Context) {
		this._type = type;
		this.parent = parent;
	}

	/** Dispose of context. */
	dispose(): void {
		this.parent = undefined;
		this.expressionType = undefined;
		this.expressionAutoCast = Context.AutoCast.No;
		this.expressionWriteableResolve?.dispose();
		this.expressionWriteableResolve = undefined;
		this.documentation = undefined;
		this._codeActions.splice(0);
	}


	/** Type. */
	public get type(): Context.ContextType {
		return this._type;
	}
	
	public addChildDocumentSymbols(list: Context[]): void {
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
	
	public collectChildDocSymbols(list: DocumentSymbol[]): void {
		if (this.documentSymbol) {
			list.push(this.documentSymbol);
		}
	}
	
	public collectWorkspaceSymbols(list: SymbolInformation[]): void {
		if (!this.documentSymbol) {
			return;
		}
		
		if (!this.workspaceSymbol) {
			this.workspaceSymbol = SymbolInformation.create(this.documentSymbol.name,
				this.documentSymbol.kind, this.documentSymbol.range, this.documentUri);
		}
		list.push(this.workspaceSymbol)
	}
	
	
	
	public static get defaultTypeModifiers(): Context.TypeModifierSet {
		if (!Context._defaultTypeModifiers) {
			Context._defaultTypeModifiers = new Context.TypeModifierSet(undefined, Context.TypeModifier.Public);
		}
		return Context._defaultTypeModifiers;
	}
	
	public get fullyQualifiedName(): string {
		return this.parent?.fullyQualifiedName || "";
	}

	public get simpleName(): string {
		return "";
	}
	
	public get codeActions(): BaseCodeAction[] {
		return this._codeActions;
	}

	public resolveClasses(state: ResolveState): void {
	}

	public resolveInheritance(state: ResolveState): void {
	}

	public resolveMembers(state: ResolveState): void {
		this._hover = undefined;
		this.expressionType = undefined;
		this.expressionAutoCast = Context.AutoCast.No;
		this.expressionTypeType = Context.ExpressionType.Void;
		this.expressionWriteableResolve?.dispose();
		this.expressionWriteableResolve = undefined;
		this._resolveTextShort = undefined;
		this._resolveTextLong = undefined;
		this._reportInfoText = undefined;
		
		this._codeActions.splice(0);
	}
	
	public resolveStatements(state: ResolveState): void {
	}
	
	public leaveScope(state: ResolveState): void {
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
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		return [];
	}
	
	protected definitionSelf(): Definition {
		const l = this.resolveLocationSelf;
		return l ? [l] : [];
	}
	
	public resolveLocation(range?: Range): Location | undefined {
		const uri = this.documentUri;
		return uri && range ? Location.create(uri, range) : undefined;
	}
	
	public get resolveLocationSelf(): Location | undefined {
		return this.resolveLocation(this.range);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocationSelf;
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

	public contextAtRange(range: Range): Context | undefined {
		return undefined;
	}

	protected contextAtRangeList(list: Context[], range: Range): Context | undefined {
		for (const each of list) {
			const context = each.contextAtRange(range);
			if (context) {
				return context;
			}
		}
		return undefined;
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		return undefined;
	}
	
	public signatureHelpAtPosition(position: Position): SignatureHelp | undefined {
		return undefined;
	}
	
	public codeAction(range: Range): CodeAction[] {
		const actions: CodeAction[] = [];
		for (const each of this._codeActions) {
			actions.push(...each.createCodeActions(range));
		}
		return actions;
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return undefined;
	}
	
	public get documentUri(): URI | undefined {
		return this.parent?.documentUri;
	}
	
	public getReportLocation(): Location {
		return Location.create(this.documentUri ?? "",
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
			logError(error);
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
	
	
	public search(search: ResolveSearch, before?: Context): void {
	}
	
	public searchExpression(search: ResolveSearch, moveUp: boolean, before: Context): void {
		if (search.stopSearching) {
			return;
		}
		
		if (moveUp) {
			this.parent?.searchExpression(search, true, this);
			if (search.stopSearching) {
				return;
			}
		}
		this.search(search, before);
	}
	
	protected requireCastable(state: ResolveState, context: Context | undefined,
			targetType: ResolveType | undefined, infoPrefix: string): void {
		if (context && targetType) {
			const ct = context.expressionType;
			if (ct && ResolveSignatureArgument.typeMatches(ct, targetType, context.expressionAutoCast) === ResolveSignature.Match.No) {
				let ri: DiagnosticRelatedInformation[] = [];
				ct.addReportInfo(ri, `Source Type: ${ct.reportInfoText}`);
				targetType.addReportInfo(ri, `Target Type: ${targetType.reportInfoText}`);
				state.reportError(context.range, `${infoPrefix}: Invalid cast from ${ct.name} to ${targetType.name}`, ri);
			}
		}
	}
	
	public selfOrParentWithType(type: Context.ContextType): Context | undefined {
		return this._type === type ? this : this.parent?.selfOrParentWithType(type);
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		return undefined;
	}
	
	public expectVariable(context: Context): Context.ExpectVariable {
		return Context.ExpectVariable.None;
	}
	
	public consumeDocumentation(iterator: ContextDocumentationIterator): void {
		if (!this.range) {
			return;
		}
		
		this.documentation = iterator.lastBefore(this.range.start);
		iterator.firstAfter(this.range.end);
	}
	
	protected consumeDocumentationDescent(iterator: ContextDocumentationIterator): void {
		if (!this.range) {
			return;
		}
		
		this.documentation = iterator.lastBefore(this.range.start);
		if (this.documentation) {
			iterator.next;
		}
	}
	
	protected consumeDocumentationList(iterator: ContextDocumentationIterator, list: Context[]): void {
		for (const each of list) {
			each.consumeDocumentation(iterator);
		}
	}
	
	/** Both contexts refer to the same target (member, argument, variable). */
	public sameTarget(other: Context | undefined): boolean {
		return false;
	}
	
	/** Both contexts refer to the same compile time value. */
	public sameValue(other: Context | undefined): boolean | undefined {
		return undefined;
	}
	
	protected reportError(diagnostics: Diagnostic[], uri: string, range: Range, message: string): Diagnostic {
		return this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Error, range, message);
	}

	protected reportWarning(diagnostics: Diagnostic[], uri: string, range: Range, message: string): Diagnostic {
		return this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Warning, range, message);
	}

	protected reportInfo(diagnostics: Diagnostic[], uri: string, range: Range, message: string): Diagnostic {
		return this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Information, range, message);
	}

	protected reportHint(diagnostics: Diagnostic[], uri: string, range: Range, message: string): Diagnostic {
		return this.reportDiagnostic(diagnostics, uri, DiagnosticSeverity.Hint, range, message);
	}

	protected reportDiagnostic(diagnostics: Diagnostic[], uri: string, severity: DiagnosticSeverity,
			range: Range, message: string): Diagnostic {
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
		return diagnostic;
	}
	
	
	/** Debug. */
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Context: ${Context.ContextType[this._type]}`);
	}

	/** Debug log children. */
	protected logChildren(children: Context[] | undefined, console: RemoteConsole, prefix: string, prefixSuffix: string = ""): void {
		if (children) {
			let prefixChild = `${prefix}- ${prefixSuffix}`;
			let prefixLinesChild = `${prefix}  `;
			for (const each of children) {
				each.log(console, prefixChild, prefixLinesChild);
			}
		}
	}

	/** Debug log child. */
	protected logChild(child: Context | undefined, console: RemoteConsole, prefix: string, prefixSuffix: string = ""): void {
		if (child) {
			let prefixChild = `${prefix}- ${prefixSuffix}`;
			let prefixLinesChild = `${prefix}  `;
			child.log(console, prefixChild, prefixLinesChild);
		}
	}
	
	public get logRange(): string {
		return Helpers.logRange(this.range);
	}
}


export namespace Context {
	/** Context type. */
	export enum ContextType {
		Script,
		Namespace,
		PinNamespace,
		RequiresPackage,
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
		Group,
		Expression,
		Documentation,
		Comment,
		
		DocumentationDoc,
		DocumentationBlockText,
		DocumentationBrief,
		DocumentationDetails,
		DocumentationParam,
		DocumentationCode,
		DocumentationCopyDoc,
		DocumentationNote,
		DocumentationDeprecated,
		DocumentationParagraph,
		DocumentationReturn,
		DocumentationReturnValue,
		DocumentationSince,
		DocumentationVersion,
		DocumentationThrow,
		DocumentationTodo,
		DocumentationWarning,
		DocumentationEmboss,
		DocumentationReference,
		DocumentationSee,
		DocumentationBold,
		DocumentationString,
		DocumentationWord,
		DocumentationNewline,
		
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
	
	/** Access level. */
	export enum AccessLevel {
		Public,
		Protected,
		Private
	}
	
	/** Expect variable result. */
	export enum ExpectVariable {
		None,
		Read,
		Write
	}
	
	
	/** Type modifier set. */
	export class TypeModifierSet extends Set<Context.TypeModifier> {
		
		protected _canonical?: Context.TypeModifier[];
		protected _typestring?: string;
		protected _accessLevel = AccessLevel.Public;
		protected _abstract = false;
		protected _fixed = false;
		protected _static = false;

		constructor(node: TypeModifiersCstNode | undefined, defaultModifier: Context.TypeModifier | undefined) {
			super();
			
			if (!node || !node.children.typeModifier) {
				if (defaultModifier) {
					this.add(defaultModifier);
				}
				
			} else {
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
		}
		
		
		public add(value: Context.TypeModifier): this {
			super.add(value);
			
			switch (value) {
			case Context.TypeModifier.Public:
				this._accessLevel = AccessLevel.Public;
				break;
				
			case Context.TypeModifier.Protected:
				this._accessLevel = AccessLevel.Protected;
				break;
				
			case Context.TypeModifier.Private:
				this._accessLevel = AccessLevel.Private;
				break;
				
			case Context.TypeModifier.Abstract:
				this._abstract = true;
				break;
				
			case Context.TypeModifier.Fixed:
				this._fixed = true;
				break;
				
			case Context.TypeModifier.Static:
				this._static = true;
				break;
			}
			
			return this;
		}
		
		public get accessLevel(): AccessLevel {
			return this._accessLevel;
		}

		public get isPublic(): boolean {
			return this._accessLevel === AccessLevel.Public;
		}

		public get isProtected(): boolean {
			return this._accessLevel === AccessLevel.Protected;
		}

		public get isPrivate(): boolean {
			return this._accessLevel === AccessLevel.Private;
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
		
		public filter(modifiers: Set<Context.TypeModifier>): Context.TypeModifierSet {
			let tm = new Context.TypeModifierSet(undefined, undefined);
			for (const each of this) {
				if (modifiers.has(each)) {
					tm.add(each);
				}
			}
			return tm;
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
		
		/** Auto cast literal of type bool. */
		LiteralBool,
		
		/** Auto cast value of type byte. */
		ValueByte,
		
		/** Auto cast value of type int. */
		ValueInt
	}
	
	/** Expression type. */
	export enum ExpressionType {
		/** Expression is neither an object nor a type (void). */
		Void,
		
		/** Expression is an object. */
		Object,
		
		/** Expression is a type. */
		Type
	}
}
