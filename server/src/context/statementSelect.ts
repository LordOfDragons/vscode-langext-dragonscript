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
import { StatementCaseCstNode, StatementSelectCstNode } from "../nodeclasses/statementSelect";
import { RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";


export class ContextSelectCase {
	protected _node: StatementCaseCstNode;
	protected _values: Context[];
	protected _statements: ContextStatements;


	constructor(node: StatementCaseCstNode, parent: Context) {
		this._node = node;
		this._values = [];

		const values = node.children.value;
		if (values) {
			for (const each of values) {
				this._values.push(ContextBuilder.createExpression(each, parent));
			}
		}
		
		this._statements = new ContextStatements(node.children.statements[0], parent);
	}

	public dispose(): void {
		for (const each of this._values) {
			each.dispose();
		}
		this._statements.dispose();
	}


	public get values(): Context[] {
		return this._values;
	}
	
	public get statements(): ContextStatements {
		return this._statements;
	}


	log(console: RemoteConsole, prefix: string = ""): void {
		console.log(`${prefix}- Case`);
		for (const each of this._values) {
			each.log(console, `${prefix}  - Val: `, `${prefix}    `);
		}
		this._statements.log(console, `${prefix}  - `, `${prefix}    `);
	}
}


export class ContextSelect extends Context {
	protected _node: StatementSelectCstNode;
	protected _value: Context;
	protected _cases: ContextSelectCase[];
	protected _elsestatements?: ContextStatements;


	constructor(node: StatementSelectCstNode, parent: Context) {
		super(Context.ContextType.Select, parent);
		this._node = node;
		this._cases = [];

		let selbegin = node.children.statementSelectBegin[0].children;
		this._value = ContextBuilder.createExpression(selbegin.value[0], this);

		if (node.children.statementCase) {
			for (const each of node.children.statementCase) {
				this._cases.push(new ContextSelectCase(each, this));
			}
		}

		if (node.children.statementSelectElse) {
			this._elsestatements = new ContextStatements(node.children.statementSelectElse[0].children.statements[0], this);
		}
	}

	public dispose(): void {
		super.dispose();
		this._value.dispose();
		for (const each of this._cases) {
			each.dispose();
		}
		this._elsestatements?.dispose();
	}


	public get node(): StatementSelectCstNode {
		return this._node;
	}

	public get condition(): Context {
		return this._value;
	}

	public get cases(): ContextSelectCase[] {
		return this._cases;
	}

	public get elsestatements(): ContextStatements | undefined {
		return this._elsestatements;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Select`);
		this.logChild(this._value, console, prefixLines, "Value: ");
		for (const each of this._cases) {
			each.log(console, prefixLines);
		}
		if (this._elsestatements) {
			console.log(`${prefixLines}- Else`);
			this.logChild(this._elsestatements, console, `${prefixLines}  `);
		}
	}
}
