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
import { DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { ContextClassVariable } from "./classVariable";
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";
import { ResolveClass } from "../resolve/class";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveState } from "../resolve/state";
import { ResolveType } from "../resolve/type";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";


export class ContextClass extends Context{
	protected _node: DeclareClassCstNode;
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;
	protected _implements: TypeName[] = [];
	protected _declarations: Context[] = [];
	protected _resolveClass?: ResolveClass;
	protected _inheritanceResolved: boolean = false;


	constructor(node: DeclareClassCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Class, parent);

		let cdecl = node.children;
		let cdeclBegin = cdecl.classBegin[0].children;
		
		this._node = node;
		this._name = new Identifier(cdeclBegin.name[0]);
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);
		
		let tokEnd = cdecl.classEnd[0].children.end[0];
		let tokClass = cdeclBegin.class[0];
		this.range = Helpers.rangeFrom(tokClass, tokEnd, true, false);
		this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
			SymbolKind.Class, this.range, Helpers.rangeFrom(cdeclBegin.name[0], tokEnd, true, true));
		
		if (cdeclBegin.baseClassName) {
			this._extends = new TypeName(cdeclBegin.baseClassName[0]);

		} else if (this.fullyQualifiedName != 'Object') {
			this._extends = TypeName.typeObject;
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
						var firstVar: ContextClassVariable | undefined = undefined;

						for (let i = 0; i < count; i++) {
							const v: ContextClassVariable = new ContextClassVariable(vdecls.classVariable[i], typemod, typeNode,
								firstVar, i < commaCount ? vdecls.comma![i] : tokEnd, this);
							this._declarations.push(v);
							
							if (i == 0) {
								firstVar = v;
							}
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

	public get inheritanceResolved(): boolean {
		return this._inheritanceResolved;
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (Helpers.isPositionInsideRange(this.range, position)) {
			if (this._name.isPositionInside(position)) {
				return this;
			} else if (this._extends?.isPositionInside(position)) {
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

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public get simpleName(): string {
		return this._name.name;
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveClass?.dispose();
		this._resolveClass = undefined;

		this._resolveClass = new ResolveClass(this);

		switch (this._name.name) {
			case "byte":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Byte;
				break;

			case "bool":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Bool;
				break;

			case "int":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Int;
				break;

			case "float":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Float;
				break;

			default:
				break; // default is object primitive type
		}

		if (this.parent) {
			var container: ResolveType | undefined;
			if (this.parent.type == Context.ContextType.Class) {
				container = (this.parent as ContextClass).resolveClass;
			} else if (this.parent.type == Context.ContextType.Interface) {
				container = (this.parent as ContextInterface).resolveInterface;
			} else if (this.parent.type == Context.ContextType.Namespace) {
				container = (this.parent as ContextNamespace).resolveNamespace;
			} else {
				container = ResolveNamespace.root;
			}

			if (container) {
				if (container.findType(this._name.name)) {
					state.reportError(this._name.range, `Duplicate class ${this._name}`);
				} else {
					container.addClass(this._resolveClass);
				}
			}
		}
		
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveClasses(state);
			}
		});
	}

	public resolveInheritance(state: ResolveState): void {
		this._inheritanceResolved = true;

		if (this._extends) {
			const t = this._extends.resolveType(state);
			if (t?.type != ResolveType.Type.Class) {
				const r = this._extends.range;
				if (r) {
					state.reportError(r, `${this._extends.name} is not a class.`);
				}
			}
		}
		
		for (const each of this._implements) {
			const t = each.resolveType(state);
			if (t?.type != ResolveType.Type.Interface) {
				const r = each.range;
				if (r) {
					state.reportError(r, `${each.name} is not an interface.`);
				}
			}
		}
		
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveInheritance(state);
			}
		});
	}

	public resolveMembers(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveMembers(state);
			}
		});
	}

	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveStatements(state);
			}
		});
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
			let content = [];
			//content.push("```dragonscript");
			content.push(`${this._typeModifiers.typestring} **class** `);
			if (this.parent) {
				content.push(`*${this.parent.fullyQualifiedName}*.`);
			}
			content.push(`**${this.name}**`);
			//content.push("```");
			/*content.push(...[
				"___",
				"This is a test"]);*/
			return new HoverInfo(content, this._name.range);

		} else if (this._extends?.isPositionInside(position)) {
			return this._extends.hover(position);

		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.hover(position);
				}
			}
		}

		return null;
	}

	public search(search: ResolveSearch, before: Context | undefined = undefined): void {
		this._resolveClass?.search(search);
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
