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
import { ScriptCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { ContextPinNamespace } from "./pinNamespace";
import { ContextNamespace } from "./namespace";
import { IToken } from "chevrotain";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";

/** Top level script context. */
export class ContextScript extends Context{
	protected _node: ScriptCstNode;
	protected _requiresPackage: IToken[];

	constructor(node: ScriptCstNode) {
		super(Context.ContextType.Script);
		this._node = node;
		this._requiresPackage = [];

		var openNamespace: ContextNamespace | undefined = undefined;

		node.children.scriptStatement.forEach(each => {
			let c = each.children;

			if (c.requiresPackage) {
				this._requiresPackage.push(c.requiresPackage[0].children.name[0]);
			} else if(c.pinNamespace) {
				(openNamespace ? openNamespace.children : this._children).push(new ContextPinNamespace(c.pinNamespace[0]));
			} else if (c.openNamespace) {
				openNamespace = new ContextNamespace(c.openNamespace[0]);
				this._children.push(openNamespace);
			} else if (c.scriptDeclaration) {
				let declNode = c.scriptDeclaration[0].children;
				let typemod = declNode.typeModifiers ? declNode.typeModifiers[0] : undefined;
				if (declNode.declareClass) {
					(openNamespace ? openNamespace.children : this._children).push(new ContextClass(declNode.declareClass[0], typemod));
				} else if (declNode.declareInterface) {
					(openNamespace ? openNamespace.children : this._children).push(new ContextInterface(declNode.declareInterface[0], typemod));
				} else if (declNode.declareEnumeration) {
					(openNamespace ? openNamespace.children : this._children).push(new ContextEnumeration(declNode.declareEnumeration[0], typemod));
				}
			}
		});
	}

	dispose(): void {
		super.dispose();
	}

	public get node(): ScriptCstNode{
		return this._node;
	}

	public get requiresPackage(): IToken[] {
		return this._requiresPackage;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Script:`);
		this._requiresPackage.forEach(each => {
			console.log(`${prefix}- Requires ${each.image}`);
		})
		this.logChildren(console, prefixLines);
	}
}
