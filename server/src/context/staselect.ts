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
import { StatementSelectCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { ContextStatements } from "./statements";

export class ContextSelect extends Context{
	protected _node: StatementSelectCstNode;
	protected _value: Context;
	protected _casevalues: Context[][];
	protected _casestatements: ContextStatements[];
	protected _elsestatements?: ContextStatements;

	constructor(node: StatementSelectCstNode) {
		super(Context.ContextType.IfElse);
		this._node = node;
		this._casevalues = [];
		this._casestatements = [];

		let selbegin = node.children.statementSelectBegin[0].children;
		this._value = ContextBuilder.createExpression(selbegin.value[0]);
		this._children.push(this._value);

		if (node.children.statementCase) {
			node.children.statementCase.forEach(each => {
				var values: Context[] = [];
				if (each.children.value) {
					each.children.value.forEach(each2 => {
						let value = ContextBuilder.createExpression(each2);
						values.push(value);
						this._children.push(value);
					})
				}
				this._casevalues.push(values);
				
				let sta = new ContextStatements(each.children.statements[0]);
				this._casestatements.push(sta);
				this._children.push(sta);
			});
		}

		if (node.children.statementSelectElse) {
			this._elsestatements = new ContextStatements(node.children.statementSelectElse[0].children.statements[0]);
			this._children.push(this._elsestatements);
		}
	}

	public get node(): StatementSelectCstNode {
		return this._node;
	}

	public get condition(): Context {
		return this._value;
	}

	public get casevalues(): Context[][] {
		return this._casevalues;
	}

	public get casestatements(): ContextStatements[] {
		return this._casestatements;
	}

	public get elsestatements(): ContextStatements | undefined {
		return this._elsestatements;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Select`);
		this._value.log(console, `${prefixLines}- Value: `, `${prefixLines}  `);

		let count = this._casevalues.length;
		var i;
		for (i=0; i<count; i++) {
			this._casevalues[i].forEach(each => {
				each.log(console, `${prefixLines}- SelVal: `, `${prefixLines}  `);
			});
			this._casestatements[i].log(console, `${prefixLines}- SelSta: `, `${prefixLines}  `);
		}

		if (this._elsestatements) {
			this._elsestatements.log(console, `${prefixLines}- Else: `, `${prefixLines}  `);
		}
	}
}
