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
import { Diagnostic, DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { ContextVariable } from "./classVariable";
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";
import { ResolveClass } from "../resolve/class";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveState } from "../resolve/state";
import { ContextScript } from "./script";


export class ContextClass extends Context{
	protected _node: DeclareClassCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;
	protected _implements: TypeName[] = [];
	protected _declarations: Context[] = [];
	protected _resolveClass?: ResolveClass;


	constructor(node: DeclareClassCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Class, parent);

		let cdecl = node.children;
		let cdeclBegin = cdecl.classBegin[0].children;
		
		this._node = node;
		this._name = new Identifier(cdeclBegin.name[0]);
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		
		let tokEnd = cdecl.classEnd[0].children.end[0];
		let tokClass = cdeclBegin.class[0];
		this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
			SymbolKind.Class, this.rangeFrom(tokClass, tokEnd, true, false),
			this.rangeFrom(cdeclBegin.name[0], tokEnd, true, true));
		
		if (cdeclBegin.baseClassName) {
			this._extends = new TypeName(cdeclBegin.baseClassName[0]);
		}

		if (cdeclBegin.interfaceName) {
			for (const each of cdeclBegin.interfaceName) {
				this._implements.push(new TypeName(each));
			}
		}

		const decls = cdecl.classBody[0].children.classBodyDeclaration;
		if (decls) {
			for (const each of decls) {
				let typemod = each.children.typeModifiers ? each.children.typeModifiers[0] : undefined;

				if (each.children.declareClass) {
					this._declarations.push(new ContextClass(each.children.declareClass[0], typemod, this));

				} else if (each.children.declareInterface) {
					this._declarations.push(new ContextInterface(each.children.declareInterface[0], typemod, this));

				} else if (each.children.declareEnumeration) {
					this._declarations.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod, this));

				} else if (each.children.classFunction) {
					this._declarations.push(new ContextFunction(each.children.classFunction[0], typemod, this._name.name, this));

				} else if (each.children.classVariables) {
					let vdecls = each.children.classVariables[0].children;
					if (vdecls.classVariable) {
						let typeNode = vdecls.type[0];
						let count = vdecls.classVariable.length;
						let commaCount = vdecls.comma?.length || 0;
						let declEnd = vdecls.endOfCommand[0].children;
						let tokEnd = (declEnd.newline || declEnd.commandSeparator)![0];

						for (let i = 0; i < count; i++) {
							this._declarations.push(new ContextVariable(vdecls.classVariable[i],
								typemod, typeNode, i == 0, i < commaCount ? vdecls.comma![i] : tokEnd, this));
						}
					}
				}
			}
		}

		this.addChildDocumentSymbols(this._declarations);
	}

	public dispose(): void {
		this._resolveClass?.dispose();
		this._resolveClass = undefined;

		super.dispose()
		this._extends?.dispose();
		if (this._implements) {
			for (const each of this._implements) {
				each.dispose();
			}
		}
		for (const each of this._declarations) {
			each.dispose();
		}
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
	
	public get resolveClass(): ResolveClass | undefined {
		return this._resolveClass;
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

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveClass?.dispose();
		this._resolveClass = undefined;

		this._resolveClass = new ResolveClass(this._name.name);
		if (this.parent) {
			if (this.parent instanceof ContextClass) {
				(this.parent as ContextClass).resolveClass?.addClass(this._resolveClass);
			} else if (this.parent instanceof ContextNamespace) {
				(this.parent as ContextNamespace).resolveNamespace?.addClass(this._resolveClass);
			} else if (this.parent instanceof ContextScript) {
				ResolveNamespace.root.addClass(this._resolveClass);
			}
		}
		
		for (const each of this._declarations) {
			each.resolveClasses(state);
		}
	}

	public resolveStatements(state: ResolveState): void {
		state.parentClass = this;
		for (const each of this._declarations) {
			each.resolveStatements(state);
		}
		state.parentClass = undefined;
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._name.token || !this.isPositionInsideToken(this._name.token, position)) {
			return null;
		}

		let content = [];
		//content.push("```dragonscript");
		content.push(`${this._typeModifiers.typestring} **class** *${this.parent!.fullyQualifiedName}*.**${this.name}**`);
		//content.push("```");
		/*content.push(...[
			"___",
			"This is a test"]);*/
		return new HoverInfo(content, this.rangeFrom(this._name.token));
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Class: ${this._typeModifiers} ${this._name}`);
		if (this._extends) {
			console.log(`${prefixLines}- Extend ${this._extends.name}`);
		}
		for (const each of this._implements) {
			console.log(`${prefixLines}- Implements ${each.name}`);
		}
		this.logChildren(this._declarations, console, prefixLines);
	}
}
