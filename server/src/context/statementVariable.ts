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
import { Definition, DocumentSymbol, Hover, Location, Position, RemoteConsole } from "vscode-languageserver";
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


export class ContextVariable extends Context {
	protected _node: StatementVariableCstNode;
	protected _name: Identifier;
	protected _typename: TypeName;
	protected _value?: Context;
	protected _firstVariable?: ContextVariable;
	protected _resolveVariable?: ResolveLocalVariable;


	constructor(node: StatementVariableCstNode,
				typeNode: FullyQualifiedClassNameCstNode,
				firstVar: ContextVariable | undefined,
				endToken: IToken, parent: Context) {
		super(Context.ContextType.Variable, parent);
		this._node = node;
		
		this._name = new Identifier(node.children.name[0]);
		this._typename = new TypeName(typeNode);
		this._firstVariable = firstVar;
		
		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0], this);
		}

		let tokBegin = firstVar ? this._name.token : typeNode.children.identifier[0];
		if (tokBegin) {
			this.range = Helpers.rangeFrom(tokBegin, endToken, true, false);
		}
	}

	public dispose(): void {
		super.dispose()
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;
		this._typename.dispose();
		this._value?.dispose;
	}


	public get node(): StatementVariableCstNode {
		return this._node;
	}

	public get name(): Identifier {
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
		return this._name.name;
	}
	
	public get resolveVariable(): ResolveLocalVariable | undefined {
		return this._resolveVariable;
	}


	public resolveMembers(state: ResolveState): void {
		if (this._firstVariable) {
			this._typename.resolve = this._firstVariable._typename.resolve;
		} else {
			this._typename.resolveType(state, this);
		}
		
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;
		
		this._resolveVariable = new ResolveLocalVariable(this);
		
		this._value?.resolveMembers(state);
		
		// TODO check for shadowing
	}

	public resolveStatements(state: ResolveState): void {
		// pushScopeContext on purpose to keep context on stack until parent scope is removed
		state.pushScopeContext(this);
		this._value?.resolveStatements(state);
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

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
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
		return [`**local variable** *${this._typename}* **${this._name}**`];
	}

	protected updateReportInfoText(): string {
		return `${this._typename} ${this._name}`;
	}

	public search(search: ResolveSearch, before?: Context): void {
		if (search.onlyTypes) {
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
	
	public definition(position: Position): Definition {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.definition(position);
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
			return this._resolveVariable;
		} else if (this._typename?.isPositionInside(position)) {
			return this._typename.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._typename?.location(this)
			?? this._name?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name.range);
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Local Variable ${this._typename.name} ${this._name}`);
		this._value?.log(console, `${prefixLines}- Value: `, `${prefixLines}  `);
	}
}
