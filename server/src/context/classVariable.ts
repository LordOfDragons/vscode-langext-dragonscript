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
import { RemoteConsole } from "vscode-languageserver";
import { TypeName } from "./typename";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";


export class ContextVariable extends Context{
	protected _node: ClassVariableCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _name: Identifier;
	protected _typename: TypeName;
	protected _value?: Context;


	constructor(node: ClassVariableCstNode,
			    typemodNode: TypeModifiersCstNode | undefined,
				typeNode: FullyQualifiedClassNameCstNode) {
		super(Context.ContextType.Variable);
		this._node = node;
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		this._name = new Identifier(node.children.name[0]);
		this._typename = new TypeName(typeNode);
		
		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0]);
		}
	}

	dispose(): void {
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


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Variable ${this._typeModifiers} ${this._typename.name} ${this._name}`);
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