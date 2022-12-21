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
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";
import { StatementForCstNode } from "../nodeclasses/statementFor";


export class ContextFor extends Context{
	protected _node: StatementForCstNode;
	protected _variable: Context;
	protected _from: Context;
	protected _to: Context;
	protected _downto: boolean;
	protected _step?: Context | undefined;
	protected _statements: ContextStatements;
	

	constructor(node: StatementForCstNode, parent: Context) {
		super(Context.ContextType.For, parent);
		this._node = node;

		let forBegin = node.children.statementForBegin[0].children;
		let forTo = forBegin.statementForTo[0].children;

		this._variable = ContextBuilder.createExpressionObject(forBegin.statementForVariable[0].children.variable[0], this);
		this._from = ContextBuilder.createExpression(forBegin.statementForFrom[0].children.value[0], this);
		this._to = ContextBuilder.createExpression(forTo.value[0], this);
		this._downto = forTo.downto !== undefined;

		if (forBegin.statementForStep) {
			this._step = ContextBuilder.createExpression(forBegin.statementForStep[0].children.value[0], this);
		}

		this._statements = new ContextStatements(node.children.statements[0], this);
	}

	public dispose(): void {
		super.dispose();
		this._variable.dispose();
		this._from.dispose();
		this._to.dispose();
		this._step?.dispose();
		this._statements.dispose();
	}


	public get node(): StatementForCstNode {
		return this._node;
	}

	public get variable(): Context {
		return this._variable;
	}

	public get from(): Context {
		return this._from;
	}

	public get to(): Context {
		return this._to;
	}

	public get downto(): boolean {
		return this._downto;
	}

	public get step(): Context | undefined {
		return this._step;
	}

	public get statements(): ContextStatements {
		return this._statements;
	}

	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}For`);
		this.logChild(this._variable, console, prefixLines, "Var: ");
		this.logChild(this._from, console, prefixLines, "From: ");
		this.logChild(this._to, console, prefixLines, this._downto ? "DownTo: " : "To: ");
		this.logChild(this._step, console, prefixLines, "Step: ");
		this.logChild(this._statements, console, prefixLines);
	}
}
