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
import { RemoteConsole } from "vscode-languageserver";
import { StatementVariableCstNode, StatementVariablesCstNode } from "../nodeclasses/statementVariables";
import { TypeName } from "./typename";
import { Identifier } from "./identifier";
import { ContextBuilder } from "./contextBuilder";


export class ContextVariablesVariable {
	protected _node: StatementVariableCstNode;
	protected _name: Identifier;
	protected _value?: Context;


	constructor(node: StatementVariableCstNode) {
		this._node = node;
		this._name = new Identifier(node.children.name[0]);
		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0]);
		}
	}

	public dispose(): void {
		this._value?.dispose();
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		if (this._value) {
			this._value.log(console, `${prefix}- ${this._name} = `, `${prefix}  `);
		} else {
			console.log(`${prefix}- ${this._name}`);
		}
	}
}


export class ContextVariables extends Context {
	protected _node: StatementVariablesCstNode;
	protected _typename: TypeName;
	protected _variables: ContextVariablesVariable[];


	constructor(node: StatementVariablesCstNode) {
		super(Context.ContextType.Break);
		this._node = node;
		
		this._typename = new TypeName(node.children.type[0]);
		this._variables = [];

		node.children.statementVariable?.forEach(each => {
			this._variables.push(new ContextVariablesVariable(each));
		});
	}

	public dispose(): void {
		super.dispose();
		this._typename.dispose();
		this._variables?.forEach(each => each.dispose);
	}


	public get node(): StatementVariablesCstNode {
		return this._node;
	}

	public get typename(): TypeName {
		return this._typename;
	}

	public get variables(): ContextVariablesVariable[] {
		return this._variables;
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Variables ${this._typename}`);
		this._variables.forEach(each => each.log(console, prefixLines));
	}
}
