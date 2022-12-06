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

import { FullyQualifiedClassNameCstNode } from "../nodeclasses"

export class TypeName{
	protected _node: FullyQualifiedClassNameCstNode
	protected _parts: String[]
	protected _targets: (any | undefined)[]
	protected _name: String

	constructor(node: FullyQualifiedClassNameCstNode) {
		this._node = node
		this._parts = []
		this._targets = []

		node.children.identifier.forEach(each => {
			this._parts.push(each.image)
		})

		this._name = this._parts.reduce((a, b) => `${a}.${b}`)
	}

	dispose(): void {
		this._targets = []
	}

	public get node(): FullyQualifiedClassNameCstNode {
		return this._node
	}

	public get name(): String {
		return this._name
	}

	public get parts(): String[] {
		return this._parts
	}

	public get targets(): (any | undefined)[] {
		return this._targets
	}
}
