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
import { Hover, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { StatementReturnCstNode } from "../nodeclasses/statementReturn";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";


export class ContextReturn extends Context{
	protected _node: StatementReturnCstNode;
	private _value?: Context;


	constructor(node: StatementReturnCstNode, parent: Context) {
		super(Context.ContextType.Return, parent);
		this._node = node;

		if (node.children.value) {
			this._value = ContextBuilder.createExpression(node.children.value[0], this);
		}

		const tokBegin = node.children.return[0];
		const tokEnd = this._value?.range?.end;
		if (tokBegin && tokEnd) {
			this.range = Range.create(Helpers.rangeFrom(tokBegin).start, tokEnd);
		}
	}

	public dispose(): void {
		super.dispose();
		this._value?.dispose();
	}


	public get node(): StatementReturnCstNode {
		return this._node;
	}

	protected get value(): Context | undefined {
		return this._value;
	}

	
	public resolveStatements(state: ResolveState): void {
		this._value?.resolveStatements(state);
	}


	public contextAtPosition(position: Position): Context | undefined {
		return this._value?.contextAtPosition(position);
	}

	/*
	protected updateHover(position: Position): Hover | null {
		let content = [];
		content.push(`${this._value?.type} ${this._value?.range}`);
		return new HoverInfo(content, this.range);
	}
	*/


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		if (this._value) {
			this._value.log(console, `${prefix}Return: `, `${prefixLines}  `);
		} else {
			console.log(`${prefix}Return`);
		}
	}
}
