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
import { ExpressionBlockCstNode } from "../nodeclasses/expressionBlock";
import { ContextFunctionArgument } from "./classFunctionArgument";
import { ContextStatements } from "./statements";


export class ContextBlock extends Context{
	protected _node: ExpressionBlockCstNode;
	protected _arguments: ContextFunctionArgument[];
	protected _statements: ContextStatements;


	constructor(node: ExpressionBlockCstNode) {
		super(Context.ContextType.FunctionCall);
		this._node = node;
		this._arguments = [];

		node.children.expressionBlockBegin[0].children.functionArgument?.forEach(each => {
			this._arguments.push(new ContextFunctionArgument(each));
		});

		this._statements = new ContextStatements(node.children.statements[0]);
	}

	public dispose(): void {
		super.dispose();
		this._arguments.forEach(each => each.dispose());
		this._statements?.dispose();
	}


	public get node(): ExpressionBlockCstNode {
		return this._node;
	}

	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}

	public get statements(): ContextStatements | undefined {
		return this.statements;
	}

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		var s = `${prefix}Block (`;
		var delimiter = "";
		this._arguments.forEach(each => {
			s = `${s}${delimiter}${each.typename.name} ${each.name}`;
			delimiter = ", ";
		});
		s = `${s})`;
		console.log(s);

		this.logChild(this._statements, console, prefixLines);
	}
}
