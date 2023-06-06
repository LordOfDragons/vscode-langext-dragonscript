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
	protected _parent?: ContextVariables;
	protected _node: StatementVariableCstNode;
	protected _name: Identifier;
	protected _value?: Context;
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];


	constructor(node: StatementVariableCstNode, parent: ContextVariables) {
		this._parent = parent;
		this._node = node;
		this._name = new Identifier(node.children.name[0]);
		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0], parent);
		}
	}

	public dispose(): void {
		this._value?.dispose();
		this._parent = undefined;
	}


	public get parent(): ContextVariables {
		return this._parent!;
	}

	public get name(): Identifier {
		return this._name;
	}

	public get value(): Context | undefined {
		return this._value;
	}

	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		return `**variable** *${this.parent.typename}* **${this._name}**`;
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
	}

	protected updateResolveTextLong(): string[] {
		return [`**variable** *${this.parent.typename}* **${this._name}**`];
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


	constructor(node: StatementVariablesCstNode, parent: Context) {
		super(Context.ContextType.Variable, parent);
		this._node = node;
		
		this._typename = new TypeName(node.children.type[0]);
		this._variables = [];

		const vars = node.children.statementVariable;
		if (vars) {
			for (const each of vars) {
				this._variables.push(new ContextVariablesVariable(each, this));
			}
		}
	}

	public dispose(): void {
		super.dispose();
		this._typename.dispose();
		if (this._variables) {
			for (const each of this._variables) {
				each.dispose();
			}
		}
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
		for (const each of this._variables) {
			each.log(console, prefixLines);
		}
	}
}
