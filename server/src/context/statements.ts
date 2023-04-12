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
import { StatementsCstNode } from "../nodeclasses/statement";


export class ContextStatements extends Context{
	protected _node?: StatementsCstNode;
	protected _statements: Context[];


	constructor(node: StatementsCstNode | undefined, parent: Context) {
		super(Context.ContextType.Statements, parent);
		this._node = node;
		this._statements = [];

		const stas = node?.children.statement;
		if (stas) {
			for (const each of stas) {
				let statement = ContextBuilder.createStatement(each, this);
				if (statement) {
					this._statements.push(statement);
				}
			}
		}
	}
	
	public dispose(): void {
		super.dispose();
		for (const each of this._statements) {
			each.dispose();
		}
	}


	public get node(): StatementsCstNode | undefined {
		return this._node;
	}

	public get statements(): Context[] {
		return this._statements;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		for (const each of this._statements) {
			each.log(console, prefix, prefixLines);
		}
	}
}
