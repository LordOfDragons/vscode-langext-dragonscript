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
import { DeclareInterfaceCstNode, TypeModifiersCstNode } from "../nodeclasses"
import { RemoteConsole } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextClass } from "./scriptClass";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";

export class ContextInterface extends Context{
	protected _node: DeclareInterfaceCstNode;
	protected _name: string;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;

	constructor(node: DeclareInterfaceCstNode, typemodNode: TypeModifiersCstNode | undefined) {
		super(Context.ContextType.Interface);

		let idecl = node.children;
		let ideclBegin = idecl.interfaceBegin[0].children;

		this._node = node;
		this._name = ideclBegin.name[0].image;
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);

		if (ideclBegin.baseInterfaceName) {
			this._extends = new TypeName(ideclBegin.baseInterfaceName[0]);
		}

		if (idecl.interfaceBody) {
			let nodeBody = idecl.interfaceBody[0].children.interfaceBodyDeclaration;
			if (nodeBody) {
				nodeBody.forEach(each => {
					let typemod = each.children.typeModifiers ? each.children.typeModifiers[0] : undefined;
					if (each.children.declareClass) {
						this._children.push(new ContextClass(each.children.declareClass[0], typemod));
					} else if (each.children.declareInterface) {
						this._children.push(new ContextInterface(each.children.declareInterface[0], typemod));
					} else if (each.children.declareEnumeration) {
						this._children.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod));
					} else if (each.children.interfaceFunction) {
						var f = new ContextFunction(each.children.interfaceFunction[0], typemod, this._name);
						f.typeModifiers.add(Context.TypeModifier.Abstract);
						this._children.push(f);
					}
				});
			}
		}
	}

	dispose(): void {
		super.dispose()
		this._extends?.dispose()
	}

	public get node(): DeclareInterfaceCstNode {
		return this._node;
	}

	public get name(): string {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get extends(): TypeName | undefined {
		return this._extends;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Interface: ${this._typeModifiers} ${this._name}`);
		if (this._extends) {
			console.log(`${prefixLines}- Extend ${this._extends.name}`);
		}
		this.logChildren(console, prefixLines);
	}
}
