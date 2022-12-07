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

import { Context } from "./context"
import { DeclareEnumerationCstNode, TypeModifiersCstNode } from "../nodeclasses"
import { RemoteConsole } from "vscode-languageserver"
import { ContextEnumEntry } from "./scriptEnumEntry";

export class ContextEnumeration extends Context{
	protected _node: DeclareEnumerationCstNode;
	protected _name: string;
	protected _typeModifiers: Context.TypeModifierSet;

	constructor(node: DeclareEnumerationCstNode, typemodNode: TypeModifiersCstNode | undefined) {
		super(Context.ContextType.Interface);

		let edecl = node.children;
		let edeclBegin = edecl.enumerationBegin[0].children;

		this._node = node;
		this._name = edeclBegin.name[0].image;
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);

		if (edecl.enumerationBody) {
			let nodeBody = edecl.enumerationBody[0].children.enumerationEntry;
			if (nodeBody) {
				nodeBody.forEach(each => this._children.push(new ContextEnumEntry(each)));
			}
		}
	}

	public get node(): DeclareEnumerationCstNode {
		return this._node;
	}

	public get name(): string {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Enumeration: ${this._name} ${this._typeModifiers}`);
		this.logChildren(console, prefixLines);
	}
}
