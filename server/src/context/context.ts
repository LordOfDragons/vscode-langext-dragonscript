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

import { RemoteConsole } from "vscode-languageserver"

/** Base context. */
export class Context{
	protected _type: Context.ContextType
	public parent: Context | undefined
	protected _children: Array<Context>

	constructor(type: Context.ContextType){
		this._type = type
		this.parent = undefined
		this._children = []
	}

	/** Dispose of context. */
	dispose(){
		this._children?.forEach(each => each.dispose());
		this._children?.splice(0)
		this.parent = undefined
	}

	/** Type. */
	public get type(): Context.ContextType{
		return this._type
	}

	/** Child contexts. */
	public get children(): Array<Context>{
		return this._children
	}

	/** Debug. */
	log(console: RemoteConsole, prefix: String = "", prefixLines: String = "") {
		console.log(`${prefix}Context: ${this._type}`)
	}

	/** Debug log children. */
	protected logChildren(console: RemoteConsole, prefix: String) {
		let prefixChild = `${prefix}- `
		let prefixLinesChild = `${prefix}  `
		this._children.forEach(each => {
			each.log(console, prefixChild, prefixLinesChild)
		})
	}
}

export namespace Context{
	/** Context type. */
	export enum ContextType{
		Script,
		Namespace,
		PinNamespace,
		Class,
		Interface,
		Enumeration,
		Function,
		Generic
	}
}
