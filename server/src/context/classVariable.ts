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
import { DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver";
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


export class ContextVariable extends Context{
	protected _node: ClassVariableCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _name: Identifier;
	protected _typename: TypeName;
	protected _value?: Context;
	protected _firstVariable?: ContextVariable;
	protected _resolveVariable?: ResolveVariable;


	constructor(node: ClassVariableCstNode,
			    typemodNode: TypeModifiersCstNode | undefined,
				typeNode: FullyQualifiedClassNameCstNode,
				firstVar: ContextVariable | undefined,
				endToken: IToken, parent: Context) {
		super(Context.ContextType.Variable, parent);
		this._node = node;
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		this._name = new Identifier(node.children.name[0]);
		this._typename = new TypeName(typeNode);
		this._firstVariable = firstVar;
		
		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0], this);
		}

		let tokBegin = firstVar ? this._name.token : typeNode.children.identifier[0];
		if (tokBegin) {
			this.range = Helpers.rangeFrom(tokBegin, endToken, true, false);
			this.documentSymbol = DocumentSymbol.create(this._name.name, this._typename.name,
				this._typeModifiers.has(Context.TypeModifier.Fixed) ? SymbolKind.Constant : SymbolKind.Variable,
				this.range, Helpers.rangeFrom(tokBegin, endToken, true, true));
		}
	}

	dispose(): void {
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;

		super.dispose()
		this._typename.dispose();
		this._value?.dispose;
	}


	public get node(): ClassVariableCstNode {
		return this._node;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
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

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}
	
	public get resolveVariable(): ResolveVariable | undefined {
		return this._resolveVariable;
	}

	public resolveMembers(state: ResolveState): void {
		if (this._firstVariable) {
			this._typename.resolve = this._firstVariable._typename.resolve;
		} else {
			this._typename.resolveType(state);
		}
		
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;

		this._resolveVariable = new ResolveVariable(this);
		if (this.parent) {
			var container: ResolveType | undefined;
			if (this.parent.type == Context.ContextType.Class) {
				container = (this.parent as ContextClass).resolveClass;
			} else if (this.parent.type == Context.ContextType.Interface) {
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

	public resolveStatements(state: ResolveState): void {
		this._value?.resolveStatements(state);
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}

		if (this._name.isPositionInside(position)) {
			return this;
		}
		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this;
		}
		return this._value?.contextAtPosition(position);
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
			let content = [];
			content.push(`${this._typeModifiers.typestring} **variable** *${this._typename}* *${this.parent!.fullyQualifiedName}*.**${this._name}**`);
			return new HoverInfo(content, this._name.range);
		}

		if (!this._firstVariable && this._typename.isPositionInside(position)) {
			return this._typename.hover(position);
		}

		return null;
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Variable ${this._typeModifiers} ${this._typename.name} ${this._name}`);
		this._value?.log(console, `${prefixLines}- Value: `, `${prefixLines}  `);
	}
}


export namespace ContextFunction {
	/** Function type. */
	export enum ContextFunctionType {
		Constructor,
		Destructor,
		Operator,
		Regular
	}
}
