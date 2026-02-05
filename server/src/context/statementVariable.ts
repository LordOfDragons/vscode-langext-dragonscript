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
import { CompletionItem, Definition, DiagnosticRelatedInformation, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole } from "vscode-languageserver";
import { StatementVariableCstNode } from "../nodeclasses/statementVariables";
import { TypeName } from "./typename";
import { Identifier } from "./identifier";
import { ContextBuilder } from "./contextBuilder";
import { ResolveSearch } from "../resolve/search";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { IToken } from "chevrotain";
import { HoverInfo } from "../hoverinfo";
import { FullyQualifiedClassNameCstNode } from "../nodeclasses/fullyQualifiedClassName";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { ResolveLocalVariable } from "../resolve/localVariable";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ContextClass } from "./scriptClass";
import { ResolveVariable } from "../resolve/variable";
import { ResolveFunction } from "../resolve/function";
import { CodeActionRemove } from "../codeactions/remove";
import { CodeActionCommentOut } from "../codeactions/commentout";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { CodeActionInsertCast } from "../codeactions/insertCast";
import { DebugSettings } from "../debugSettings";
import { debugLogMessage } from "../server";
import { semtokens } from "../semanticTokens";


export class ContextVariable extends Context {
	protected _name?: Identifier;
	protected _typename: TypeName;
	protected _value?: Context;
	protected _firstVariable?: ContextVariable;
	protected _resolveVariable?: ResolveLocalVariable;
	protected _checkUsage = false;
	protected _tokenAssign?: IToken;
	public isSingleVar = false;
	public isLastVar = false;
	
	
	constructor(node: StatementVariableCstNode | undefined,
				typeNode: FullyQualifiedClassNameCstNode,
				firstVar: ContextVariable | undefined,
				endToken: IToken | undefined, varToken: IToken, parent: Context) {
		super(Context.ContextType.Variable, parent);
		const children = node?.children;
		
		const nodeName = children?.name?.at(0);
		if (nodeName) {
			this._name = new Identifier(nodeName);
		}
		this._typename = new TypeName(typeNode);
		this._firstVariable = firstVar;
		
		if (children?.value) {
			this._tokenAssign = children.assign?.at(0);
			this._value = ContextBuilder.createExpression(children.value[0], this);
		}
		
		const tokBegin = firstVar ? this._name?.token : varToken; //typeNode.children.identifier[0];
		const tokEnd = endToken ?? this._name?.token;
		const posEnd = tokEnd ? Helpers.positionFrom(tokEnd, false) : this._typename.range?.end;
		
		if (tokBegin && posEnd) {
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
		}
	}

	public dispose(): void {
		super.dispose()
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;
		this._typename.dispose();
		this._value?.dispose;
	}

	public addSemanticTokens(builder: semtokens.Builder): void {
		semtokens.addDeclarationToken(builder, this._name, semtokens.typeVariable);
		this._typename.addSemanticTokens(builder);
		this._value?.addSemanticTokens(builder);
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

	public get firstVariable(): ContextVariable | undefined {
		return this._firstVariable;
	}

	public get simpleName(): string {
		return this._name?.name ?? "?";
	}
	
	public get resolveVariable(): ResolveLocalVariable | undefined {
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
		
		this._value?.resolveMembers(state);
		
		// check for shadowing and duplication
		if (this._name) {
			const search = new ResolveSearch();
			search.name = this._name.name;
			search.addToAllList = true;
			search.stopAfterFirstMatch = true;
			
			if (state.topScopeFunction?.isBodyStatic) {
				search.onlyStatic = true;
			}
			
			state.search(search, this);
			
			if (search.all.length > 0) {
				const found = search.all[0];
				
				switch (found.type) {
				case Context.ContextType.Variable:{
					let ri: DiagnosticRelatedInformation[] = [];
					found.addReportInfo(ri, `Target: ${found.reportInfoText}`);
					state.reportError(this._name.range, `Duplicate local variable ${this._name.name}`, ri);
					}break;
					
				case Context.ContextType.FunctionArgument:
				case Context.ContextType.TryCatch:{
					let ri: DiagnosticRelatedInformation[] = [];
					found.addReportInfo(ri, `Target: ${found.reportInfoText}`);
					state.reportWarning(this._name.range, `Shadows argument ${this._name.name}`, ri);
					}break;
					
				case Resolved.Type.Variable:{
					const thisClass = ContextClass.thisContext(this)?.resolveClass;
					if (thisClass) {
						const v = found as ResolveVariable;
						if (v.canAccess(thisClass)) {
							let ri: DiagnosticRelatedInformation[] = [];
							v.addReportInfo(ri, `Target: ${v.reportInfoText}`);
							state.reportWarning(this._name.range, `Shadows variable ${this._name.name} in ${v.parent?.fullyQualifiedName}`, ri);
						}
					}
					}break;
					
				case Resolved.Type.Function:{
					const thisClass = ContextClass.thisContext(this)?.resolveClass;
					if (thisClass) {
						const f = found as ResolveFunction;
						if (f.canAccess(thisClass)) {
							let ri: DiagnosticRelatedInformation[] = [];
							f.addReportInfo(ri, `Target: ${f.reportInfoText}`);
							state.reportWarning(this._name.range, `Shadows function ${this._name.name} in ${f.parent?.fullyQualifiedName}`, ri);
						}
					}
					}break;
				}
			}
		}
		
		// has to come after resolving members in value to avoid them resolving this variable
		this._resolveVariable = new ResolveLocalVariable(this);
		
		// pushScopeContext on purpose to keep context on stack until parent scope is removed.
		// has to come after resolving statements in value to avoid resolving this variable
		state.pushScopeContext(this);
	}

	public resolveStatements(state: ResolveState): void {
		if (this._value) {
			this._value?.resolveStatements(state);
			
			const at1 = this._value.expressionType;
			const at2 = this._typename.resolve?.resolved as ResolveType;
			if (at1 && at2 && ResolveSignatureArgument.typeMatches(at1, at2, this._value.expressionAutoCast) === ResolveSignature.Match.No) {
				let ri: DiagnosticRelatedInformation[] = [];
				at2?.addReportInfo(ri, `Source Type: ${at1?.reportInfoText}`);
				at1?.addReportInfo(ri, `Target Type: ${at2?.reportInfoText}`);
				const range = this._tokenAssign ? Helpers.rangeFrom(this._tokenAssign) : this._name?.range;
				if (range) {
					const di = state.reportError(range, `Invalid cast from ${at1?.name} to ${at2?.name}`, ri);
					if (di && at1 && at2) {
						this._codeActions.push(new CodeActionInsertCast(di, at1, at2, this._value, this._value.expressionAutoCast));
					}
				}
			}
		}
		
		// pushScopeContext on purpose to keep context on stack until parent scope is removed.
		// has to come after resolving statements in value to avoid resolving this variable
		state.pushScopeContext(this);
		this._checkUsage = true;
	}
	
	public leaveScope(state: ResolveState): void {
		if (this._checkUsage) {
			this._checkUsage = false;
			this._doCheckUsage(state);
		}
	}
	
	protected _doCheckUsage(state: ResolveState): void {
		if (!this._resolveVariable || !this._name) {
			return;
		}
		
		if (this._resolveVariable.usage.size == 0) {
			const di = state.reportWarning(this._name.range, `Local variable is never used`);
			if (di && this.range && this._name.range) {
				const action = new CodeActionRemove(di, "Remove unused local variable", this.range, this);
				var action2: CodeActionRemove | undefined;
				var action3 = new CodeActionCommentOut(di, "Comment out unused local variable", this.range, this);
				
				if (this.isSingleVar) {
					action.extendEnd = true;
					action3.singleLineComment = true;
					
					if (this._value && this._value.range) {
						action2 = new CodeActionRemove(di, "Remove unused local variable but keep init-value",
							Range.create(this.range.start, this._value.range.start), this);
					}
					
				} else {
					if (this._value) {
						action.range = Range.create(this._name.range.start,
							this._value.range?.end ?? this._name.range.end);
					} else {
						action.range = this._name.range;
					}
					action3.range = this._name.range;
					
					if (this._firstVariable) {
						action.extendBegin = true;
						action.extendBeginChars.push(',')
						action3.singleLineComment = this.isLastVar;
						
					} else {
						action.extendEnd = true;
						action.extendEndChars.push(',')
					}
				}
				
				this._codeActions.push(action);
				
				if (action2) {
					this._codeActions.push(action2);
				}
				
				action3.extendBegin = action.extendBegin;
				action3.extendBeginChars = action.extendBeginChars;
				action3.extendEnd = action.extendEnd;
				action3.extendEndChars = action.extendEndChars;
				this._codeActions.push(action3);
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
		if (this._name?.isPositionInside(position)) {
			return new HoverInfo(this.resolveTextLong, this._name.range);
		}
		
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.hover(position);
		}
		
		return null;
	}

	protected updateResolveTextShort(): string {
		return `${this._typename} ${this._name}`;
	}

	protected updateResolveTextLong(): string[] {
		return [`**local variable** _${this._typename.simpleNameLink}_ ${this.simpleNameLink}`];
	}

	protected updateReportInfoText(): string {
		return `${this._typename} ${this._name}`;
	}

	public search(search: ResolveSearch, before?: Context): void {
		if (!this._name || search.onlyTypes || search.stopSearching) {
			return;
		}
		
		if (before && before === this._value) {
			return;
		}
		
		if (search.matchableName) {
			if (search.matchableName.matches(this._name.matchableName)) {
				search.addLocalVariable(this);
			}
			
		} else if (this._name.name == search.name || !search.name) {
			search.addLocalVariable(this);
		}
	}
	
	public definition(position: Position): Location[] {
		if (this._name?.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.definition(position);
		}
		return super.definition(position);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (DebugSettings.debugCompletion) {
			debugLogMessage('ContextVariable.completion');
		}
		
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
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name?.isPositionInside(position)) {
			return this._resolveVariable;
		} else if (this._typename?.isPositionInside(position)) {
			return this._typename.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._typename?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this._name ? this.resolveLocation(this._name.range) : undefined;
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Local Variable ${this._typename.name} ${this._name} ${this.logRange}`);
		this._value?.log(console, `${prefixLines}- Value: `, `${prefixLines}  `);
	}
}
