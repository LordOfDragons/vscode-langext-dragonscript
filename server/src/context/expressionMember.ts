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
import { CompletionItem, Definition, DiagnosticRelatedInformation, Hover, integer, Location, Position, Range, RemoteConsole, SignatureHelp } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { ExpressionMemberCstNode, ExpressionObjectCstNode } from "../nodeclasses/expressionObject";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";
import { ResolveType } from "../resolve/type";
import { ResolveSearch } from "../resolve/search";
import { ContextFunctionArgument } from "./classFunctionArgument";
import { ContextVariable } from "./statementVariable";
import { ResolveVariable } from "../resolve/variable";
import { ContextClass } from "./scriptClass";
import { ContextTryCatch } from "./statementTry";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { IToken } from "chevrotain";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { CodeActionUnknownMember } from "../codeactions/unknownMember";
import { debugLogMessage } from "../server";


export class ContextMember extends Context{
	protected _tokenPeriod?: IToken;
	protected _memberIndex: integer;
	protected _object?: Context;
	protected _name?: Identifier;
	protected _matches?: ResolveSearch;
	protected _resolveArgument?: ContextFunctionArgument | ContextTryCatch;
	protected _resolveLocalVariable?: ContextVariable;
	protected _resolveVariable?: ResolveVariable;
	protected _resolveType?: ResolveType;
	protected _resolveUsage?: ResolveUsage;


	protected constructor(node: ExpressionObjectCstNode | ExpressionMemberCstNode,
			memberIndex: integer, parent: Context) {
		super(Context.ContextType.Member, parent);
		this._memberIndex = memberIndex;
	}

	public static newObject(node: ExpressionObjectCstNode, memberIndex: integer,
			object: Context | undefined, parent: Context) {
		let cm = new ContextMember(node, memberIndex, parent);
		
		if (object) {
			object.parent = cm;
		}
		cm._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0], cm);
		
		const name = node.children.member?.at(memberIndex)?.children.name?.at(0);
		if (name && name.image) {
			cm._name = new Identifier(name);
		}
		
		cm._tokenPeriod = node.children.period?.at(memberIndex);
		var rangeObject = cm._object?.range;
		var nameRange = cm._name?.range;
		
		var rangeBegin = rangeObject?.start;
		var rangeEnd = nameRange?.end;
		
		if (!rangeBegin && cm._tokenPeriod) {
			rangeBegin = Helpers.positionFrom(cm._tokenPeriod, true);
		}
		if (!rangeBegin && nameRange) {
			rangeBegin = nameRange.start;
		}
		
		if (!rangeEnd && cm._tokenPeriod) {
			rangeEnd = Helpers.positionFrom(cm._tokenPeriod, false);
		}
		if (!rangeEnd && rangeObject) {
			rangeEnd = rangeObject.end;
		}
		
		if (rangeBegin && rangeEnd) {
			cm.range = Range.create(rangeBegin, rangeEnd);
		}
		
		return cm;
	}

	public static newMember(node: ExpressionMemberCstNode, parent: Context) {
		let cm = new ContextMember(node, 0, parent);
		cm._name = new Identifier(node.children.name?.at(0));
		cm.range = cm._name?.range;
		return cm;
	}

	public dispose(): void {
		super.dispose();
		this._object?.dispose();
		this._matches = undefined;
		this._resolveArgument = undefined;
		this._resolveLocalVariable = undefined;
		this._resolveVariable = undefined;
		this._resolveType = undefined;
		this._resolveUsage?.dispose();
		this._resolveUsage = undefined;
	}


	public get memberIndex(): integer {
		return this._memberIndex;
	}

	public get object(): Context {
		return this._object!;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	
	public get resolveArgument(): ContextFunctionArgument | ContextTryCatch | undefined {
		return this._resolveArgument;
	};
	
	public get resolveLocalVariable(): ContextVariable | undefined {
		return this._resolveLocalVariable;
	}
	
	public get resolveVariable(): ResolveVariable | undefined {
		return this._resolveVariable;
	}
	
	public get resolveType(): ResolveType | undefined {
		return this._resolveType;
	}
	
	public get resolveAny(): ContextFunctionArgument | ContextTryCatch | ContextVariable | ResolveVariable | ResolveType | undefined {
		return this._resolveArgument ?? this._resolveLocalVariable ?? this._resolveVariable ?? this._resolveType;
	}
	
	public get resolveUsage(): ResolveUsage | undefined {
		return this._resolveUsage;
	}
	
	protected updateReportInfoText(): string {
		return this._resolveArgument?.reportInfoText
			?? this._resolveLocalVariable?.reportInfoText
			?? this._resolveVariable?.reportInfoText
			?? this._resolveType?.reportInfoText
			?? '?';
	}
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._resolveUsage?.dispose();
		this._resolveUsage = undefined;
		
		this._resolveArgument = undefined;
		this._resolveLocalVariable = undefined;
		this._resolveVariable = undefined;
		this._resolveType = undefined;
		
		this._matches = undefined;
		
		this._object?.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._object?.resolveStatements(state);

		if (!this._name) {
			return;
		}

		let objtype: ResolveType | undefined;
		
		if (this._object) {
			objtype = this._object.expressionType
			if (!objtype) {
				// if base object has a problem an error has been already reported so do nothing here
				return;
			}
		}

		this._matches = new ResolveSearch();
		this._matches.name = this._name.name;
		this._matches.ignoreFunctions = true;
		this._matches.addToAllList = true;
		this._matches.stopAfterFirstMatch = true;
		
		if (this._matches.name) {
			if (objtype) {
				objtype.search(this._matches);
			} else {
				state.search(this._matches, this);
			}
		}
		
		if (this._matches.all.length == 0) {
			const di = state.reportError(this._name.range, `Unknown member ${this._name}`);
			if (di) {
				let ca = new CodeActionUnknownMember(di, this, this._name);
				ca.includeVariables = true;
				ca.includeFunctions = true;
				ca.includeTypes = true;
				ca.objectType = objtype;
				ca.objectTypeType = this._object?.expressionTypeType ?? Context.ExpressionType.Void;
				if (!objtype) {
					ca.searchTypes = new Set(CompletionHelper.searchExpressionType(this).types);
				}
				this._codeActions.push(ca);
			}
			
		} else {
			const found = this._matches.all[0];
			
			switch (found.type) {
			case Context.ContextType.Variable:{
				this._resolveLocalVariable = found as ContextVariable;
				if (this._resolveLocalVariable.resolveVariable) {
					this._resolveUsage = new ResolveUsage(this._resolveLocalVariable.resolveVariable, this);
				}
				this.expressionType = this._resolveLocalVariable.typename.resolve?.resolved as ResolveType;
				this.expressionTypeType = Context.ExpressionType.Object;
				this.expressionWriteableResolve = this._resolveUsage;
				}break;
				
			case Context.ContextType.FunctionArgument:
			case Context.ContextType.TryCatch:{
				this._resolveArgument = found as (ContextFunctionArgument | ContextTryCatch);
				if (this._resolveArgument.resolveArgument) {
					this._resolveUsage = new ResolveUsage(this._resolveArgument.resolveArgument, this);
				}
				this.expressionType = this._resolveArgument.typename.resolve?.resolved as ResolveType;
				this.expressionTypeType = Context.ExpressionType.Object;
				this.expressionWriteableResolve = this._resolveUsage;
				}break;
				
			case Resolved.Type.Variable:{
				this._resolveVariable = found as ResolveVariable;
				this._resolveUsage = new ResolveUsage(this._resolveVariable, this);
				this.expressionType = this._resolveVariable.variableType;
				this.expressionTypeType = Context.ExpressionType.Object;
				if (this._resolveVariable.typeModifiers && !this._resolveVariable.typeModifiers?.isFixed) {
					this.expressionWriteableResolve = this._resolveUsage;
				}
				
				const tfcc = state.topScopeFunction?.parent as ContextClass;
				if (tfcc?.type === Context.ContextType.Class) {
					const tfrc = tfcc.resolveClass;
					if (tfrc && !this._resolveVariable.canAccess(tfrc)) {
						let ri: DiagnosticRelatedInformation[] = [];
						this._resolveVariable.addReportInfo(ri, `Variable: ${this._resolveVariable.reportInfoText}`);
						this._resolveVariable.parent?.addReportInfo(ri, `Owner Class: ${this._resolveVariable.parent.reportInfoText}`);
						tfrc.addReportInfo(ri, `Accessing Class: ${tfrc.reportInfoText}`);
						state.reportError(this._name.range, `Can not access variable ${this._resolveVariable.name}`, ri);
					}
				}
				}break;
				
			case Resolved.Type.Class:
			case Resolved.Type.Interface:
			case Resolved.Type.Enumeration:
			case Resolved.Type.Namespace:{
				this._resolveType = found as ResolveType;
				if (this._resolveType) {
					this._resolveUsage = new ResolveUsage(this._resolveType, this);
				}
				this.expressionType = this._resolveType;
				this.expressionTypeType = Context.ExpressionType.Type;
				}break;
			}
		}
		
		if (this._resolveUsage) {
			this._resolveUsage.range = this._name.range;
		}
	}


	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._object?.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._object?.contextAtRange(range)
			?? this;
	}
	
	
	protected updateHover(_position: Position): Hover | null {
		if (!this._name?.range) {
			return null;
		}

		let content: string[] = [];

		if (this._resolveArgument) {
			content.push(...this._resolveArgument.resolveTextLong);
			
		} else if (this._resolveLocalVariable) {
			content.push(...this._resolveLocalVariable.resolveTextLong);
			
		} else if (this._resolveVariable) {
			content.push(...this._resolveVariable.resolveTextLong);
			
		} else if (this._resolveType) {
			content.push(...this._resolveType.resolveTextLong);
		}
		
		const doc = this.resolveAny?.documentation;
		if (doc) {
			content.push('___');
			content.push(...doc.resolveTextLong);
		}
		
		return new HoverInfo(content, this._name.range);
	}
	
	public definition(_position: Position): Definition {
		if (!this._name?.range) {
			return this.definitionSelf();
		}
		
		var location: Location | undefined;
		if (this._resolveArgument) {
			location = this._resolveArgument.resolveLocationSelf;
		} else if (this._resolveLocalVariable) {
			location = this._resolveLocalVariable.resolveLocationSelf;
		} else if (this._resolveVariable) {
			location = this._resolveVariable.context?.resolveLocationSelf;
		} else if (this._resolveType) {
			return this._resolveType.resolveLocation;
		}
		return location ? [location] : [];
	}
	
	public completion(_document: TextDocument, position: Position): CompletionItem[] {
		const range = this._name?.range ?? Range.create(position, position);
		
		if (this._object && this._tokenPeriod) {
			return CompletionHelper.createObject(range, this, this._object);
		} else {
			return CompletionHelper.createStatementOrExpression(range, this);
		}
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name?.isPositionInside(position)) {
			return this._resolveArgument?.resolveArgument
				?? this._resolveLocalVariable?.resolveVariable
				?? this._resolveVariable
				?? this._resolveType;
		}
		return super.resolvedAtPosition(position);
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		if (context === this._object) {
			return this.parent?.expectTypes(this);
		}
		return super.expectTypes(context);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._name?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name?.range);
	}
	
	public signatureHelpAtPosition(position: Position): SignatureHelp | undefined {
		return this.parent?.signatureHelpAtPosition(position);
	}
	
	public sameTarget(other: Context | undefined): boolean {
		if (!other || other.type !== this.type) {
			return false;
		}
		
		const m2 = other as ContextMember;
		
		if (this._resolveArgument) {
			return this._resolveArgument === m2._resolveArgument;
			
		} else if (this._resolveLocalVariable) {
			return this._resolveLocalVariable === m2._resolveLocalVariable;
			
		} else if (this._resolveVariable) {
			if (this._resolveVariable !== m2._resolveVariable) {
				return false;
			}
			
			if (this._object) {
				return this._object.sameTarget(m2._object);
				
			} else {
				return !m2._object;
			}
		}
		
		return false;
	}
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Member ${this._name ?? '-'} ${this.logRange}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
	}
}
