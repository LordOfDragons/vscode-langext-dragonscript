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
import { ContextStatements } from "./statements";
import { StatementCatchCstNode, StatementTryCstNode } from "../nodeclasses/statementTry";
import { TypeName } from "./typename";
import { Identifier } from "./identifier";


export class ContextTryCatch {
	protected _node: StatementCatchCstNode;
	protected _type: TypeName;
	protected _variable: Identifier;
	protected _statements: ContextStatements;


	constructor(node: StatementCatchCstNode, parent: Context) {
		let c = node.children;

		this._node = node;
		this._type = new TypeName(c.type[0]);
		this._variable = new Identifier(c.variable[0]);
		this._statements = new ContextStatements(c.statements[0], parent);
	}

	public dispose(): void {
		this._type.dispose();
		this._statements.dispose();
	}


	public log(console: RemoteConsole, prefix: string = ""): void {
		console.log(`${prefix}- Catch ${this._type} ${this._variable}`);
		this._statements.log(console, `${prefix}  - `, `${prefix}    `);
	}
}


export class ContextTry extends Context {
	protected _node: StatementTryCstNode;
	protected _statements: ContextStatements;
	protected _catches: ContextTryCatch[];


	constructor(node: StatementTryCstNode, parent: Context) {
		super(Context.ContextType.Select, parent);
		this._node = node;
		this._catches = [];

		this._statements = new ContextStatements(node.children.statements[0], this);

		const catches = node.children.statementCatch;
		if (catches) {
			for (const each of catches) {
				this._catches.push(new ContextTryCatch(each, this));
			}
		}
	}

	public dispose(): void {
		super.dispose();
		this._statements.dispose();
		for (const each of this._catches) {
			each.dispose();
		}
	}


	public get node(): StatementTryCstNode {
		return this._node;
	}

	public get statements(): Context {
		return this._statements;
	}

	public get catches(): ContextTryCatch[] {
		return this._catches;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Try`);
		this.logChild(this._statements, console, prefixLines);
		for (const each of this._catches) {
			each.log(console, prefixLines);
		}
	}
}
