/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { Position, Range, RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../../helpers";
import { DocumentationReturnValueCstNode } from "../../nodeclasses/doc/returnValue";
import { Context } from "../context";


export class ContextDocumentationReturnValue extends Context{
	protected _node: DocumentationReturnValueCstNode;
	
	
	constructor(node: DocumentationReturnValueCstNode, parent: Context) {
		super(Context.ContextType.DocumentationReturnValue, parent);
		this._node = node;
	}
	
	
	public get node(): DocumentationReturnValueCstNode {
		return this._node;
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this;
	}
	
	
	log(console: RemoteConsole, prefix: string = "", _prefixLines: string = "") {
		console.log(`${prefix}ReturnValue`);
	}
}