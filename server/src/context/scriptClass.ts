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
import { DeclareClassCstNode } from "../nodeclasses/declareClass";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { DocumentSymbol, Range, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { ContextVariable } from "./classVariable";
import { Identifier } from "./identifier";


export class ContextClass extends Context{
	protected _node: DeclareClassCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;
	protected _implements: TypeName[];
	protected _declarations: Context[];
	protected _documentSymbolRange: Range;
	protected _documentSymbolRangeSelection: Range;


	constructor(node: DeclareClassCstNode, typemodNode: TypeModifiersCstNode | undefined) {
		super(Context.ContextType.Class);

		let cdecl = node.children;
		let cdeclBegin = cdecl.classBegin[0].children;
		let cdeclEnd = cdecl.classEnd[0].children.end[0];
		let tokClass = cdeclBegin.class[0]

		this._node = node;
		this._name = new Identifier(cdeclBegin.name[0]);
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		this._declarations = [];
		this._implements = [];
		this._documentSymbolRange = this.rangeFrom(tokClass, cdeclEnd, true, false);
		this._documentSymbolRangeSelection = this.rangeFrom(tokClass, cdeclEnd, false, true);

		if (cdeclBegin.baseClassName) {
			this._extends = new TypeName(cdeclBegin.baseClassName[0]);
		}

		if (cdeclBegin.interfaceName) {
			cdeclBegin.interfaceName.forEach(each => this._implements.push(new TypeName(each)));
		}

		cdecl.classBody[0].children.classBodyDeclaration?.forEach(each => {
			let typemod = each.children.typeModifiers ? each.children.typeModifiers[0] : undefined;
			if (each.children.declareClass) {
				this._declarations.push(new ContextClass(each.children.declareClass[0], typemod));
			} else if (each.children.declareInterface) {
				this._declarations.push(new ContextInterface(each.children.declareInterface[0], typemod));
			} else if (each.children.declareEnumeration) {
				this._declarations.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod));
			} else if (each.children.classFunction) {
				this._declarations.push(new ContextFunction(each.children.classFunction[0], typemod, this._name.name));
			} else if (each.children.classVariables) {
				let vdecls = each.children.classVariables[0].children;
				if (vdecls.classVariable) {
					let typeNode = vdecls.type[0];
					vdecls.classVariable.forEach(each => {
						this._declarations.push(new ContextVariable(each, typemod, typeNode));
					});
				}
			}
		});
	}

	public dispose(): void {
		super.dispose()
		this._extends?.dispose();
		this._implements?.forEach(each => each.dispose());
		this._declarations.forEach(each => each.dispose());
	}


	public get node(): DeclareClassCstNode {
		return this._node;
	}

	public get name(): Identifier {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get extends(): TypeName | undefined {
		return this._extends;
	}

	public get implements(): TypeName[] {
		return this._implements;
	}

	public get declarations(): Context[] {
		return this._declarations;
	}

	/** Get document symbol. */
	public get documentSymbol(): DocumentSymbol | undefined {
		return DocumentSymbol.create(this._name.name, undefined, SymbolKind.Class,
			this._documentSymbolRange, this._documentSymbolRangeSelection, []);
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Class: ${this._typeModifiers} ${this._name}`);
		if (this._extends) {
			console.log(`${prefixLines}- Extend ${this._extends.name}`);
		}
		this._implements.forEach(each => {
			console.log(`${prefixLines}- Implements ${each.name}`);
		})
		this.logChildren(this._declarations, console, prefixLines);
	}
}
