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
import { ExpressionConstantCstNode } from "../nodeclasses/expressionObject";
import { Identifier } from "./identifier";


export class ContextConstant extends Context{
	protected _node: ExpressionConstantCstNode;
	protected _name: Identifier;


	constructor(node: ExpressionConstantCstNode, parent: Context) {
		super(Context.ContextType.Constant, parent);
		this._node = node;

		let c = node.children;
		if (c.literalByte) {
			this._name = new Identifier(c.literalByte[0]);
		} else if (c.literalIntByte) {
			this._name = new Identifier(c.literalIntByte[0]);
		} else if (c.literalIntHex) {
			this._name = new Identifier(c.literalIntHex[0]);
		} else if (c.literalIntOct) {
			this._name = new Identifier(c.literalIntOct[0]);
		} else if (c.literalInt) {
			this._name = new Identifier(c.literalInt[0]);
		} else if (c.literalFloat) {
			this._name = new Identifier(c.literalFloat[0]);
		} else if (c.string) {
			this._name = new Identifier(c.string[0]);
		} else if (c.true) {
			this._name = new Identifier(c.true[0]);
		} else if (c.false) {
			this._name = new Identifier(c.false[0]);
		} else if (c.null) {
			this._name = new Identifier(c.null[0]);
		} else if (c.this) {
			this._name = new Identifier(c.this[0]);
		} else if (c.super) {
			this._name = new Identifier(c.super[0]);
		} else {
			this._name = new Identifier(undefined, "??");
		}
	}


	public get node(): ExpressionConstantCstNode {
		return this._node;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Constant ${this._name}`);
	}
}
