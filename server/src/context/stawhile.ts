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
import { StatementWhileCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";

export class ContextWhile extends Context{
	protected _node: StatementWhileCstNode;
	protected _condition: Context;
	protected _statements: ContextStatements;
	
	constructor(node: StatementWhileCstNode) {
		super(Context.ContextType.IfElse);
		this._node = node;

		this._condition = ContextBuilder.createExpression(node.children.statementWhileBegin[0].children.condition[0]);
		this._children.push(this._condition);

		this._statements = new ContextStatements(node.children.statements[0]);
		this._children.push(this._statements);
	}

	public get node(): StatementWhileCstNode {
		return this._node;
	}

	public get condition(): Context {
		return this._condition;
	}

	public get statements(): ContextStatements {
		return this._statements;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}While`);
		this._condition.log(console, `${prefixLines}- Cond: `, `${prefixLines}  `);
		this._statements.log(console, `${prefixLines}- Sta: `, `${prefixLines}  `);
	}
}
