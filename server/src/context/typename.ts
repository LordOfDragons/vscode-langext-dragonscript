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
import { FullyQualifiedClassNameCstNode } from "../nodeclasses/fullyQualifiedClassName"
import { Identifier } from "./identifier"


export class TypeNamePart {
	protected _name: Identifier;
	protected _target?: any


	constructor(token?: IToken, name?: string) {
		this._name = new Identifier(token, name);
	}

	dispose(): void {
		this._target = undefined
	}


	public static named(name: string): TypeNamePart {
		return new TypeNamePart(undefined, name);
	}

	public get name(): Identifier {
		return this._name
	}

	public get target(): any | undefined {
		return this._target
	}
}


export class TypeName {
	protected _node?: FullyQualifiedClassNameCstNode
	protected _parts: TypeNamePart[]
	protected _name: string


	constructor(node?: FullyQualifiedClassNameCstNode) {
		this._node = node
		this._parts = []

		if (!node) {
			this._name = "";
			return;
		}

		node.children.identifier.forEach(each => {
			this._parts.push(new TypeNamePart(each))
		})
		
		this._name = this._parts.map(x => x.name.name).reduce((a, b) => `${a}.${b}`)
	}

	dispose(): void {
		this._parts.forEach(each => each.dispose())
	}


	public static typeNamed(name: string): TypeName {
		var tn = new TypeName();
		tn._name = name;
		name.split('.').forEach(each => {
			tn._parts.push(TypeNamePart.named(each));
		})
		return tn;
	}

	public static typeVoid(): TypeName {
		return this.typeNamed("void");
	}

	public get node(): FullyQualifiedClassNameCstNode | undefined {
		return this._node
	}

	public get name(): string {
		return this._name
	}

	public get parts(): TypeNamePart[] {
		return this._parts
	}

	
	toString() : string {
		return this._name;
	}
}
