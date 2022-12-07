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
import { PinNamespaceCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { TypeName } from "./typename";

export class ContextPinNamespace extends Context{
	protected _node: PinNamespaceCstNode;
	protected _typename: TypeName;

	constructor(node: PinNamespaceCstNode) {
		super(Context.ContextType.PinNamespace);
		this._node = node;
		this._typename = new TypeName(node.children.name[0]);
	}

	dispose(): void {
		super.dispose();
		this._typename?.dispose();
	}

	public get node(): PinNamespaceCstNode {
		return this._node;
	}

	public get typename(): TypeName {
		return this._typename;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Pin Namespace: ${this._typename.name}`);
	}
}
