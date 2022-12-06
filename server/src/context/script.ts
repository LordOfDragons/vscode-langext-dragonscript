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
import {  RequiresPackageCstNode, ScriptCstNode, ScriptStatementCstNode } from "../nodeclasses"
import { RemoteConsole } from "vscode-languageserver"
import { ContextPinNamespace } from "./pinNamespace"
import { ContextNamespace } from "./namespace"
import { IToken } from "chevrotain"

/** Top level script context. */
export class ContextScript extends Context{
	protected _node: ScriptCstNode
	protected _requiresPackage: IToken[]

	constructor(node: ScriptCstNode) {
		super(Context.ContextType.Script)
		this._node = node
		this._requiresPackage = []

		var openNamespace: ContextNamespace | undefined = undefined

		node.children.scriptStatement.forEach(each => {
			let c = (each as ScriptStatementCstNode).children

			if (c.requiresPackage) {
				this._requiresPackage.push((c.requiresPackage[0] as RequiresPackageCstNode).children.name[0])
			} else if(c.pinNamespace) {
				(openNamespace ? openNamespace.children : this._children).push(new ContextPinNamespace(c.pinNamespace[0]))
			} else if (c.openNamespace) {
				openNamespace = new ContextNamespace(c.openNamespace[0])
				this._children.push(openNamespace)
			} else if (c.scriptDeclaration) {
				(openNamespace ? openNamespace.children : this._children).push(new Context(Context.ContextType.Class))
			} else {
				(openNamespace ? openNamespace.children : this._children).push(new Context(Context.ContextType.Generic))
			}
		});
	}

	dispose(): void {
		super.dispose()
	}

	public get node(): ScriptCstNode{
		return this._node
	}

	public get requiresPackage(): IToken[] {
		return this._requiresPackage
	}

	log(console: RemoteConsole, prefix: String = "", prefixLines: String = "") {
		console.log(`${prefix}Script:`)
		this._requiresPackage.forEach(each => {
			console.log(`${prefix}- Requires ${each.image}`)
		})
		this.logChildren(console, prefixLines)
	}
}
