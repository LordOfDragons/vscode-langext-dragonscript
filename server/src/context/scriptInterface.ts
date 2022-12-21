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
import { DeclareInterfaceCstNode } from "../nodeclasses/declareInterface";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextClass } from "./scriptClass";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";


export class ContextInterface extends Context{
	protected _node: DeclareInterfaceCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;
	protected _declarations: Context[] = [];


	constructor(node: DeclareInterfaceCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Interface, parent);

		let idecl = node.children;
		let ideclBegin = idecl.interfaceBegin[0].children;

		this._node = node;
		this._name = new Identifier(ideclBegin.name[0]);
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);

		let tokIf = ideclBegin.interface[0];
		let tokEnd = idecl.interfaceEnd[0].children.end[0];
		this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
			SymbolKind.Interface, this.rangeFrom(tokIf, tokEnd, true, false),
			this.rangeFrom(ideclBegin.name[0], tokEnd, true, true));
		
		if (ideclBegin.baseInterfaceName) {
			this._extends = new TypeName(ideclBegin.baseInterfaceName[0]);
		}

		idecl.interfaceBody[0].children.interfaceBodyDeclaration?.forEach(each => {
			let typemod = each.children.typeModifiers?.at(0);

			if (each.children.declareClass) {
				this._declarations.push(new ContextClass(each.children.declareClass[0], typemod, this));

			} else if (each.children.declareInterface) {
				this._declarations.push(new ContextInterface(each.children.declareInterface[0], typemod, this));

			} else if (each.children.declareEnumeration) {
				this._declarations.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod, this));
				
			} else if (each.children.interfaceFunction) {
				var f = new ContextFunction(each.children.interfaceFunction[0], typemod, this._name.name, this);
				f.typeModifiers.add(Context.TypeModifier.Abstract);
				this._declarations.push(f);
			}
		});

		this.addChildDocumentSymbols(this._declarations);
	}

	public dispose(): void {
		super.dispose()
		this._extends?.dispose()
		this._declarations.forEach(each => each.dispose());
	}


	public get node(): DeclareInterfaceCstNode {
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

	public get declarations(): Context[] {
		return this._declarations;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (this.isPositionInsideRange(this.documentSymbol!.range, position)) {
			if (this._name.token && this.isPositionInsideRange(this.rangeFrom(this._name.token), position)) {
				return this;
			} else {
				return this.contextAtPositionList(this._declarations, position);
			}
		}
		return undefined;
	}

	protected updateHover(): Hover | null {
		if (!this._name.token) {
			return null;
		}

		let content = [];
		content.push(`${this._typeModifiers.typestring} **interface** *${this.parent!.fullyQualifiedName}*.**${this.name}**`);
		return new HoverInfo(content, this.rangeFrom(this._name.token));
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Interface: ${this._typeModifiers} ${this._name}`);
		if (this._extends) {
			console.log(`${prefixLines}- Extend ${this._extends.name}`);
		}
		this.logChildren(this._declarations, console, prefixLines);
	}
}
