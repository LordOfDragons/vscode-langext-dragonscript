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
import { DiagnosticRelatedInformation, Hover, integer, Position, Range, RemoteConsole } from "vscode-languageserver";
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
import { ResolveClass } from "../resolve/class";
import { ContextClassVariable } from "./classVariable";
import { ContextTryCatch } from "./statementTry";


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
		cm._name = new Identifier(node.children.member![memberIndex].children.name[0]);
		cm.updateRange();
		return cm;
	}

	public static newMember(node: ExpressionMemberCstNode, parent: Context) {
		let cm = new ContextMember(node, 0, parent);
		cm._name = new Identifier(node.children.name[0]);
		cm.updateRange();
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

		if (objtype) {
			objtype.search(this._matches);
		} else {
			state.search(this._matches, this);
		}

		const matchTypeCount = this._matches.matchTypeCount;
		
		if (matchTypeCount == 0) {
			state.reportError(this._name.range, `Unknown member ${this._name}`);

		} else {
			if (this._matches.arguments.length > 0) {
				this._resolveArgument = this._matches.arguments[0];
				this.expressionType = this._resolveArgument.typename.resolve as ResolveType;

			} else if (this._matches.localVariables.length > 0) {
				this._resolveLocalVariable = this._matches.localVariables[0];
				this.expressionType = this._resolveLocalVariable.typename.resolve as ResolveType;

			} else if (this._matches.variables.length > 0) {
				this._resolveVariable = this._matches.variables[0];
				this.expressionType = this._resolveVariable.variableType;
				
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
	
			} else if (this._matches.types.length > 0) {
				this._resolveType = this._matches.types[0];
				this.expressionType = this._resolveType;
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

		if (this._name?.isPositionInside(position)) {
			return this;
		}

		return this._object?.contextAtPosition(position);
	}


	protected updateRange(): void {
		if (!this._name?.range) {
			return;
		}

		const rangeBegin = this.object?.range?.start || this._name.range.start;
		const rangeEnd = this._name.range.end;

		this.range = Range.create(rangeBegin, rangeEnd);
	}

	protected updateHover(position: Position): Hover | null {
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

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Member ${this._name}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
	}
}
