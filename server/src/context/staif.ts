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
import { StatementIfCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";

export class ContextIf extends Context{
	protected _node: StatementIfCstNode;
	protected _condition: Context;
	protected _ifstatements: ContextStatements;
	protected _elifconditions: Context[];
	protected _elifstatements: ContextStatements[];
	protected _elsestatements?: ContextStatements;

	constructor(node: StatementIfCstNode) {
		super(Context.ContextType.IfElse);
		this._node = node;
		this._elifconditions = [];
		this._elifstatements = [];

		let ifbegin = node.children.statementIfBegin[0].children;
		this._condition = ContextBuilder.createExpression(ifbegin.condition[0]);
		this._children.push(this._condition);
		this._ifstatements = new ContextStatements(ifbegin.statements[0]);
		this._children.push(this._ifstatements);

		if (node.children.statementElif) {
			node.children.statementElif.forEach(each => {
				let cond = ContextBuilder.createExpression(each.children.condition[0]);
				this._elifconditions.push(cond);
				this._children.push(cond);
				
				let sta = new ContextStatements(each.children.statements[0]);
				this._elifstatements.push(sta);
				this._children.push(sta);
			});
		}

		if (node.children.statementElse) {
			this._elsestatements = new ContextStatements(node.children.statementElse[0].children.statements[0]);
			this._children.push(this._elsestatements);
		}
	}

	public get node(): StatementIfCstNode {
		return this._node;
	}

	public get condition(): Context {
		return this._condition;
	}

	public get ifstatements(): ContextStatements {
		return this._ifstatements;
	}

	public get elifconditions(): Context[] {
		return this._elifconditions;
	}

	public get elifstatements(): ContextStatements[] {
		return this._elifstatements;
	}

	public get elsestatements(): ContextStatements | undefined {
		return this._elsestatements;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}If-Else`);
		this._condition.log(console, `${prefixLines}- Cond: `, `${prefixLines}  `);
		this._ifstatements.log(console, `${prefixLines}- If: `, `${prefixLines}  `);

		let count = this._elifconditions.length;
		var i;
		for (i=0; i<count; i++) {
			this._elifconditions[i].log(console, `${prefixLines}- ElifCond: `, `${prefixLines}  `);
			this._elifstatements[i].log(console, `${prefixLines}- ElifSta: `, `${prefixLines}  `);
		}

		if (this._elsestatements) {
			this._elsestatements.log(console, `${prefixLines}- Else: `, `${prefixLines}  `);
		}
	}
}
