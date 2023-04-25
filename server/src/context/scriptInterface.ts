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
import { ResolveState } from "../resolve/state";
import { ResolveInterface } from "../resolve/interface";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveType } from "../resolve/type";


export class ContextInterface extends Context{
	protected _node: DeclareInterfaceCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _implements: TypeName[] = [];
	protected _declarations: Context[] = [];
	protected _resolveInterface?: ResolveInterface;


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
			for (const each of ideclBegin.baseInterfaceName) {
				this._implements.push(new TypeName(each));
			}
		}

		const decls = idecl.interfaceBody[0].children.interfaceBodyDeclaration;
		if (decls) {
			for (const each of decls) {
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
			}
		}

		this.addChildDocumentSymbols(this._declarations);
	}

	public dispose(): void {
		this._resolveInterface?.dispose();
		this._resolveInterface = undefined;

		super.dispose();
		for (const each of this._implements) {
			each.dispose();
		}
		for (const each of this._declarations) {
			each.dispose();
		}
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

	public get implements(): TypeName[] {
		return this._implements;
	}

	public get declarations(): Context[] {
		return this._declarations;
	}
	
	public get resolveInterface(): ResolveInterface | undefined {
		return this._resolveInterface;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveInterface?.dispose();
		this._resolveInterface = undefined;

		this._resolveInterface = new ResolveInterface(this);
		if (this.parent) {
			var container: ResolveType | undefined;
			if (this.parent.type == Context.ContextType.Class) {
				container = (this.parent as ContextClass).resolveClass;
			} else if (this.parent.type == Context.ContextType.Interface) {
				container = (this.parent as ContextInterface).resolveInterface;
			} else if (this.parent.type == Context.ContextType.Namespace) {
				container = (this.parent as ContextNamespace).resolveNamespace;
			} else if (this.parent.type == Context.ContextType.Script) {
				container = ResolveNamespace.root;
			}

			if (container) {
				if (container.findType(this._name.name)) {
					if (this._name.token) {
						state.reportError(state.rangeFrom(this._name.token), `Duplicate interface ${this._name}`);
					}
				} else {
					container.addInterface(this._resolveInterface);
				}
			}
		}
		
		const ppi = state.parentInterface;
		state.parentInterface = this;
		
		for (const each of this._declarations) {
			each.resolveClasses(state);
		}

		state.parentInterface = ppi;
	}

	public resolveInheritance(state: ResolveState): void {
		for (const each of this._implements) {
			const t = each.resolveType(state);
			if (t && !(t.type == ResolveType.Type.Interface)) {
				const r = each.range;
				if (r) {
					state.reportError(r, `${each.name} is not an interface.`);
				}
			}
		}
		
		const ppi = state.parentInterface;
		state.parentInterface = this;

		for (const each of this._declarations) {
			each.resolveInheritance(state);
		}

		state.parentInterface = ppi;
	}

	public resolveMembers(state: ResolveState): void {
		state.parentInterface = this;
		for (const each of this._declarations) {
			each.resolveMembers(state);
		}
		state.parentInterface = undefined;
	}

	public resolveStatements(state: ResolveState): void {
		state.parentInterface = this;
		for (const each of this._declarations) {
			each.resolveStatements(state);
		}
		state.parentInterface = undefined;
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (this.isPositionInsideRange(this.documentSymbol!.range, position)) {
			if (this._name.token && this.isPositionInsideRange(this.rangeFrom(this._name.token), position)) {
				return this;
			} else {
				for (const each of this._implements) {
					if (each.isPositionInside(position)) {
						return this;
					}
				}
				return this.contextAtPositionList(this._declarations, position);
			}
		}
		return undefined;
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name.token && this.isPositionInsideRange(this.rangeFrom(this._name.token), position)) {
			let content = [];
			content.push(`${this._typeModifiers.typestring} **interface** `);
			if (this.parent) {
				content.push(`*${this.parent.fullyQualifiedName}*.`);
			}
			content.push(`**${this.name}**`);
			return new HoverInfo(content, this.rangeFrom(this._name.token));

		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.hover(position);
				}
			}
		}

		return null;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Interface: ${this._typeModifiers} ${this._name}`);
		for (const each of this._implements) {
			console.log(`${prefixLines}- Implements ${each.name}`);
		}
		this.logChildren(this._declarations, console, prefixLines);
	}
}
