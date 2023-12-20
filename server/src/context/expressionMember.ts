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
import { CompletionItem, CompletionItemKind, Definition, DiagnosticRelatedInformation, Hover, integer, Location, Position, Range, RemoteConsole } from "vscode-languageserver";
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
import { ContextConstant } from "./expressionConstant";
import { ResolveNamespace } from "../resolve/namespace";
import { RefactoringHelper } from "../refactoringHelper";


export class ContextMember extends Context{
	protected _node: ExpressionObjectCstNode | ExpressionMemberCstNode;
	protected _memberIndex: integer;
	protected _object?: Context;
	protected _name?: Identifier;
	protected _matches?: ResolveSearch;
	protected _resolveArgument?: ContextFunctionArgument | ContextTryCatch;
	protected _resolveLocalVariable?: ContextVariable;
	protected _resolveVariable?: ResolveVariable;
	protected _resolveType?: ResolveType;


	protected constructor(node: ExpressionObjectCstNode | ExpressionMemberCstNode,
			memberIndex: integer, parent: Context) {
		super(Context.ContextType.Member, parent);
		this._node = node;
		this._memberIndex = memberIndex;
	}

	public static newObject(node: ExpressionObjectCstNode, memberIndex: integer,
			object: Context | undefined, parent: Context) {
		let cm = new ContextMember(node, memberIndex, parent);
		cm._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0], cm);
		
		const name = node.children.member?.at(memberIndex)?.children.name[0];
		if (name && name.image) {
			cm._name = new Identifier(name);
		}
		
		var period = node.children.period?.at(memberIndex);
		var rangeObject = cm._object?.range;
		var nameRange = cm._name?.range;
		
		var rangeBegin = rangeObject?.start;
		var rangeEnd = nameRange?.end;
		
		if (!rangeBegin && period) {
			rangeBegin = Helpers.positionFrom(period, true);
		}
		if (!rangeBegin && nameRange) {
			rangeBegin = nameRange.start;
		}
		
		if (!rangeEnd && period) {
			rangeEnd = Helpers.positionFrom(period, false);
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
		cm._name = new Identifier(node.children.name[0]);
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
	}


	public get node(): ExpressionObjectCstNode | ExpressionMemberCstNode {
		return this._node;
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
	
	public resolveMembers(state: ResolveState): void {
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
		
		if (this._matches.name) {
			if (objtype) {
				objtype.search(this._matches);
			} else {
				state.search(this._matches, this);
			}
		}
		
		const matchTypeCount = this._matches.matchTypeCount;
		
		if (matchTypeCount == 0) {
			state.reportError(this._name.range, `Unknown member ${this._name}`);
			
		} else {
			if (this._matches.arguments.length > 0) {
				this._resolveArgument = this._matches.arguments[0];
				this.expressionType = this._resolveArgument.typename.resolve as ResolveType;
				this.expressionTypeType = Context.ExpressionType.Object;
				
			} else if (this._matches.localVariables.length > 0) {
				this._resolveLocalVariable = this._matches.localVariables[0];
				this.expressionType = this._resolveLocalVariable.typename.resolve as ResolveType;
				this.expressionTypeType = Context.ExpressionType.Object;
				
			} else if (this._matches.variables.length > 0) {
				this._resolveVariable = this._matches.variables[0];
				this.expressionType = this._resolveVariable.variableType;
				this.expressionTypeType = Context.ExpressionType.Object;
				
				const tfcc = state.topScopeFunction?.parent as ContextClass;
				if (tfcc?.type == Context.ContextType.Class) {
					const tfrc = tfcc.resolveClass;
					if (tfrc && !this._resolveVariable.canAccess(tfrc)) {
						let ri: DiagnosticRelatedInformation[] = [];
						this._resolveVariable.addReportInfo(ri, `Variable: ${this._resolveVariable.reportInfoText}`);
						this._resolveVariable.parent?.addReportInfo(ri, `Owner Class: ${this._resolveVariable.parent.reportInfoText}`);
						tfrc.addReportInfo(ri, `Accessing Class: ${tfrc.reportInfoText}`);
						state.reportError(this._name.range, `Can not access variable ${this._resolveVariable.name}`, ri);
					}
				}
				
			} else if (this._matches.types.size > 0) {
				this._resolveType = this._matches.types.values().next().value;
				this.expressionType = this._resolveType;
				this.expressionTypeType = Context.ExpressionType.Type;
			}
			
			/*
			if (matchTypeCount > 1) {
				var content = [`Ambigous member ${this._name}. Possible candidates:`];
				if (this._matches.arguments.length > 0) {
					content.push(`- Parameter: ${this._matches.arguments[0].resolveTextShort}`)
				}
				if (this._matches.localVariables.length > 0) {
					content.push(`- Local Variable: ${this._matches.localVariables[0].resolveTextShort}`)
				}
				if (this._matches.variables.length > 0) {
					content.push(`- Class Variable: ${this._matches.variables[0].resolveTextShort}`)
				}
				for (const each of this._matches.types) {
					content.push(`- Type: ${each.resolveTextShort}`)
				}
				state.reportWarning(this._name.range, content.join('\n'));
			}
			*/
		}
	}


	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._object?.contextAtPosition(position)
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

		/*
		if (this._matches) {
			content.push(`\n`);
			content.push(`**member** ${this._name.name}`);
			content.push(` lv(${this._matches.localVariables.length})`);
			content.push(` a(${this._matches.arguments.length})`);
			content.push(` v(${this._matches.variables.length})`);
			content.push(` t(${this._matches.types.length})`);
		} else {
			content.push(`**member** ${this._name.name}`);
		}
		*/
		
		return new HoverInfo(content, this._name.range);
	}
	
	public definition(_position: Position): Definition {
		if (!this._name?.range) {
			return this.definitionSelf();
		}
		
		var location: Location | undefined;
		if (this._resolveArgument) {
			location = this._resolveArgument.resolveLocationSelf();
		} else if (this._resolveLocalVariable) {
			location = this._resolveLocalVariable.resolveLocationSelf();
		} else if (this._resolveVariable) {
			location = this._resolveVariable.context?.resolveLocationSelf();
		} else if (this._resolveType) {
			return this._resolveType.resolveLocation();
		}
		return location ? [location] : [];
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		var range: Range | undefined = this._name?.range ?? Range.create(position, position);
		let items: CompletionItem[] = [];
		
		const search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		
		var visibleTypes: Set<ResolveType> | undefined;
		var insertPinPosition: Position | undefined;
		
		if (this._object) {
			var objtype = this._object.expressionType;
			if (objtype) {
				switch (this._object.expressionTypeType) {
				case Context.ExpressionType.Object:
					search.ignoreStatic = true;
					objtype.search(search);
					search.removeType(objtype);
					break;
					
				case Context.ExpressionType.Type:
					search.onlyStatic = true;
					objtype.search(search);
					search.removeType(objtype);
					break;
				}
			}
			
			visibleTypes = new Set(search.types);
			
		} else {
			this.searchExpression(search, true, this);
			
			search.onlyTypes = true;
			
			const objtype = ContextClass.thisContext(this)?.resolveClass;
			if (objtype) {
				objtype.search(search);
			}
			
			visibleTypes = new Set(search.types);
			
			ResolveNamespace.root.searchGlobalTypes(search);
			
			items.push(...ContextClass.createCompletionItemThisSuper(this, range));
			items.push(...ContextConstant.createCompletionItemBooleans(range));
			items.push(ContextConstant.createCompletionItemNull(range));
		}
		
		for (const each of search.localVariables) {
			items.push({
				label: each.name.name + "(lv): " + each.resolveTextShort,
				sortText: each.name.name,
				filterText: each.name.name,
				kind: CompletionItemKind.Variable});
		}
		
		for (const each of search.arguments) {
			items.push({
				label: each.simpleName + "(a): " + each.resolveTextShort,
				sortText: each.simpleName,
				filterText: each.simpleName,
				kind: CompletionItemKind.Variable});
		}
		
		for (const each of search.functionsAll) {
			if (each.context) {
				const tfrc = (this.selfOrParentWithType(Context.ContextType.Class) as ContextClass)?.resolveClass;
				if (tfrc && each.canAccess(tfrc)) {
					items.push(each.createCompletionItem(document, range));
				}
			}
		}
		
		for (const each of search.variables) {
			if (each.context) {
				const tfrc = (this.selfOrParentWithType(Context.ContextType.Class) as ContextClass)?.resolveClass;
				if (tfrc && each.canAccess(tfrc)) {
					items.push(each.createCompletionItem(document, range));
				}
			}
		}
		
		for (const each of search.types) {
			if (!visibleTypes?.has(each)) {
				if (!insertPinPosition) {
					insertPinPosition = RefactoringHelper.insertPinPosition(this);
				}
				items.push(each.createCompletionItem(range, insertPinPosition));
				
			} else {
				items.push(each.createCompletionItem(range));
			}
		}
		
		return items;
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Member ${this._name ?? '-'} ${this.logRange}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
	}
}
