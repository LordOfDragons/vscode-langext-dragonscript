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

import { IToken } from "chevrotain"
import { FullyQualifiedClassNameCstNode } from "../nodeclasses"

export class TypeNamePart {
	protected _token: IToken
	protected _name: String
	protected _target?: any

	constructor(token: IToken) {
		this._token = token
		this._name = token.image
	}

	dispose(): void {
		this._target = undefined
	}

	public get token(): IToken {
		return this._token
	}

	public get name(): String {
		return this._name
	}

	public get target(): any | undefined {
		return this._target
	}
}

export class TypeName {
	protected _node: FullyQualifiedClassNameCstNode
	protected _parts: TypeNamePart[]
	protected _name: String

	constructor(node: FullyQualifiedClassNameCstNode) {
		this._node = node
		this._parts = []

		node.children.identifier.forEach(each => {
			this._parts.push(new TypeNamePart(each))
		})

		this._name = this._parts.map(x => x.name).reduce((a, b) => `${a}.${b}`)
	}

	dispose(): void {
		this._parts.forEach(each => each.dispose())
	}

	public get node(): FullyQualifiedClassNameCstNode {
		return this._node
	}

	public get name(): String {
		return this._name
	}

	public get parts(): TypeNamePart[] {
		return this._parts
	}
}
