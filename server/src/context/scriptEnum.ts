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
import { DeclareEnumerationCstNode, EnumerationEntryCstNode } from "../nodeclasses/declareEnumeration";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { RemoteConsole } from "vscode-languageserver"
import { Identifier } from "./identifier";


export class ContextEnumEntry extends Context{
	protected _node: EnumerationEntryCstNode;
	protected _name: Identifier;


	constructor(node: EnumerationEntryCstNode) {
		super(Context.ContextType.EnumerationEntry)
		this._node = node
		this._name = new Identifier(node.children.name[0]);
	}


	public get node(): EnumerationEntryCstNode {
		return this._node
	}

	public get name(): Identifier {
		return this._name
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Entry ${this._name}`)
	}
}


export class ContextEnumeration extends Context{
	protected _node: DeclareEnumerationCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _entries: ContextEnumEntry[];


	constructor(node: DeclareEnumerationCstNode, typemodNode: TypeModifiersCstNode | undefined) {
		super(Context.ContextType.Interface);

		let edecl = node.children;
		let edeclBegin = edecl.enumerationBegin[0].children;

		this._node = node;
		this._name = new Identifier(edeclBegin.name[0]);
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		this._entries = [];

		edecl.enumerationBody[0].children.enumerationEntry?.forEach(each => {
			this._entries.push(new ContextEnumEntry(each));
		});
	}

	public dispose(): void {
		super.dispose();
		this._entries.forEach(each => each.dispose());
	}


	public get node(): DeclareEnumerationCstNode {
		return this._node;
	}

	public get name(): Identifier {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get entries(): ContextEnumEntry[] {
		return this._entries;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Enumeration: ${this._name} ${this._typeModifiers}`);
		this.logChildren(this._entries, console, prefixLines);
	}
}
