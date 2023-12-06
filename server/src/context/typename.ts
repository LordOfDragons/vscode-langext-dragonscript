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
import { Hover, Position, Range } from "vscode-languageserver";
import { HoverInfo } from "../hoverinfo";
import { FullyQualifiedClassNameCstNode } from "../nodeclasses/fullyQualifiedClassName"
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveClass } from "../resolve/class";
import { ResolveState } from "../resolve/state";
import { Identifier } from "./identifier"
import { ResolveType } from "../resolve/type";
import { ResolveInterface } from "../resolve/interface";
import { ResolveEnumeration } from "../resolve/enumeration";
import { Context } from "./context";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextNamespace } from "./namespace";
import { Helpers } from "../helpers";


export class TypeNamePart {
	protected _name: Identifier;
	
	
	constructor(token?: IToken, name?: string) {
		this._name = new Identifier(token, name);
	}
	
	dispose(): void {
		this.resolve = undefined
	}
	
	
	public static named(name: string): TypeNamePart {
		return new TypeNamePart(undefined, name);
	}
	
	public get name(): Identifier {
		return this._name
	}

	public resolve?: any
}


export class TypeName {
	protected _node?: FullyQualifiedClassNameCstNode
	protected _parts: TypeNamePart[]
	protected _name: string
	public resolve?: any


	constructor(node?: FullyQualifiedClassNameCstNode) {
		this._node = node
		this._parts = []

		if (!node) {
			this._name = "";
			return;
		}

		for (const each of node.children.identifier) {
			this._parts.push(new TypeNamePart(each));
		}
		
		this._name = this._parts.map(x => x.name.name).reduce((a, b) => `${a}.${b}`)
	}

	dispose(): void {
		for (const each of this._parts) {
			each.dispose();
		}
	}


	public static typeNamed(name: string): TypeName {
		var tn = new TypeName();
		tn._name = name;
		for (const each of name.split('.')) {
			tn._parts.push(TypeNamePart.named(each));
		};
		return tn;
	}

	public static typeToken(token: IToken): TypeName {
		var tn = new TypeName();
		tn._name = token.image;
		tn._parts.push(new TypeNamePart(token));
		return tn;
	}

	public static get typeVoid(): TypeName {
		return this.typeNamed('void');
	}

	public static get typeObject(): TypeName {
		return this.typeNamed('Object');
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

	public get lastPart(): TypeNamePart {
		return this._parts[this._parts.length - 1];
	}

	public get firstToken(): IToken | undefined {
		return this._parts[0].name.token;
	}

	public get lastToken(): IToken | undefined {
		return this.lastPart.name.token;
	}

	
	public resolveNamespace(state: ResolveState): ResolveNamespace | undefined {
		var ns = ResolveNamespace.root;
		for (const each of this._parts) {
			if (!ns.isNamespace(each.name.name)) {
				state.reportError(each.name.range, `"${each.name.name}" in "${ns.name}" is not a namespace`);
				return undefined;
			}
			
			ns = ns.namespaceOrAdd(each.name.name);
			each.resolve = ns;
		}

		return this.resolve = ns;
	}

	public resolveType(state: ResolveState): ResolveType | undefined {
		if (this._parts.length == 0) {
			return undefined;
		}

		var type: ResolveType | undefined;
		var first = true;

		for (const each of this._parts) {
			// first entry has to resolve to a basic class
			if (first) {
				const nextType = this.resolveBaseType(state);
				if (!nextType) {
					state.reportError(each.name.range, `"${each.name.name}" not found.`);
					return undefined;
				}

				type = nextType;
				first = false;

			// all other parts have to be direct children
			} else {
				const nextType = type!.findType(each.name.name);
				if (nextType) {
					each.resolve = nextType;
					type = nextType;
					continue;
				}
				
				state.reportError(each.name.range, `Type "${each.name.name}" not found in "${type!.name}".`);
				return undefined;
			}
		}		

		return this.resolve = type;
	}

	protected resolveBaseType(state: ResolveState): ResolveType | undefined {
		var scopeNS: ResolveNamespace | undefined;

		// first part has to be:
		var part = this._parts[0];
		const name = part.name.name;
		
		const sostack = state.scopeContextStack;
		
		for (let i = sostack.length - 1; i >= 0; --i) {
			const scope = sostack[i];
			if (!scope) {
				continue;
			}
			
			switch (scope.type) {
				case Context.ContextType.Class:
					const pc = (scope as ContextClass).resolveClass;
					if (pc) {
						// - an inner type of the parent class
						const t = this.resolveTypeInClassChain(state, pc, name, true, false);
						if (t) {
							part.resolve = t;
							return t;
						}
					}
					break;
					
				case Context.ContextType.Interface:
					const pi = (scope as ContextInterface).resolveInterface;
					if (pi) {
						// - an inner type of the parent interface
						const t = this.resolveTypeInInterfaceChain(state, pi, name, false);
						if (t) {
							part.resolve = t;
							return t;
						}
					}
					break;
					
				case Context.ContextType.Namespace:
					i == 0;
					break;
			}
		}
		
		for (let i = sostack.length - 1; i >= 0; --i) {
			const scope = sostack[i];
			if (!scope) {
				continue;
			}

			switch (scope.type) {
				case Context.ContextType.Class:
					const pc = (scope as ContextClass).resolveClass;
					if (pc) {
						// - an inner type of the super class chain
						const t = this.resolveTypeInClassChain(state, pc, name, false, true);
						if (t) {
							part.resolve = t;
							return t;
						}
					}
					break;

				case Context.ContextType.Interface:
					const pi = (scope as ContextInterface).resolveInterface;
					if (pi) {
						// - an inner type of the super interface chain
						const t = this.resolveTypeInInterfaceChain(state, pi, name, true);
						if (t) {
							part.resolve = t;
							return t;
						}
					}
					break;
				
				case Context.ContextType.Namespace:
					i == 0;
					break;
			}
		}
		
		for (let i = sostack.length - 1; i >= 0; --i) {
			const scope = sostack[i];
			if (!scope) {
				continue;
			}
			
			switch (scope.type) {
				case Context.ContextType.Namespace:
					// - a type of the parent namespace chain
					scopeNS = (scope as ContextNamespace).resolveNamespace;
					if (scopeNS) {
						const t = this.resolveTypeInNamespaceChain(state, scopeNS, name);
						if (t) {
							part.resolve = t;
							return t;
						}
					}
					break;
			}
		}
		
		{
			const t = ResolveNamespace.root.findType(name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}

		// - a type of a pinned namespace chain
		for (const pin of state.pins) {
			const t = this.resolveTypeInNamespaceChain(state, pin, name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}

		// - a namespace of the parent namespace chain
		for (let i = sostack.length - 1; i >= 0; --i) {
			const scope = sostack[i];
			if (scope?.type == Context.ContextType.Namespace) {
				const ns = (scope as ContextNamespace).resolveNamespace;
				if (ns) {
					const t = this.resolveNamespaceInNamespaceChain(state, ns, name);
					if (t) {
						part.resolve = t;
						return t;
					}
				}
			}
		}

		// - a namespace of a pinned namespace chain
		for (const pin of state.pins) {
			const t = this.resolveNamespaceInNamespaceChain(state, pin, name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}

		return undefined;
	}

	protected resolveTypeInClassChain(state: ResolveState, rclass: ResolveClass, name: string,
			withParent: boolean, withChain: boolean): ResolveType | undefined {
		const t = rclass.findType(name);
		if (t) {
			return t;
		}
		
		// TODO: if variable or function fail
		
		if (withChain && rclass.context) {
			if (!rclass.context.inheritanceResolved) {
				state.requiresAnotherTurn = true;
			}

			const t2 = rclass.context.extends?.resolve;
			if (t2?.type == ResolveType.Type.Class) {
				const t3 = this.resolveTypeInClassChain(state, t2 as ResolveClass, name, true, true);
				if (t3) {
					return t3;
				}
			}

			for (const each of rclass.context.implements) {
				const t2 = each.resolve;
				if (t2?.type == ResolveType.Type.Interface) {
					const t3 = this.resolveTypeInInterfaceChain(state, t2 as ResolveInterface, name, true);
					if (t3) {
						return t3;
					}
				}
			}
		}

		if (withParent && rclass.parent) {
			switch (rclass.parent.type) {
				case ResolveType.Type.Class:
					return this.resolveTypeInClassChain(state, rclass.parent as ResolveClass, name, true, withChain);
				case ResolveType.Type.Interface:
					return this.resolveTypeInInterfaceChain(state, rclass.parent as ResolveInterface, name, withChain);
			}
		}

		return undefined;
	}

	protected resolveTypeInInterfaceChain(state: ResolveState, iface: ResolveInterface,
			name: string, withChain: boolean): ResolveType | undefined {
		const t = iface.findType(name);
		if (t) {
			return t;
		}
		
		// TODO: if variable or function fail
		
		if (withChain && iface.context) {
			if (!iface.context.inheritanceResolved) {
				state.requiresAnotherTurn = true;
			}
			
			for (const each of iface.context.implements) {
				const t2 = each.resolve;
				if (t2?.type == ResolveType.Type.Interface) {
					const t3 = this.resolveTypeInInterfaceChain(state, t2 as ResolveInterface, name, true);
					if (t3) {
						return t3;
					}
				}
			}
		}
		
		return undefined;
	}

	protected resolveTypeInNamespaceChain(state: ResolveState, ns: ResolveNamespace, name: string):
			ResolveType | undefined {
		const t = ns.findType(name);
		if (t) {
			return t;
		}

		// TODO: interface, enumeration

		if (ns.parent?.type == ResolveType.Type.Namespace) {
			return this.resolveTypeInNamespaceChain(state, ns.parent as ResolveNamespace, name);
		}

		return undefined;
	}

	protected resolveNamespaceInNamespaceChain(state: ResolveState, ns: ResolveNamespace, name: string):
			ResolveNamespace | undefined {
		const ns2 = ns.namespace(name);
		if (ns2) {
			return ns2;
		}

		if (ns.parent?.type == ResolveType.Type.Namespace) {
			return this.resolveNamespaceInNamespaceChain(state, ns.parent as ResolveNamespace, name);
		}

		return undefined;
	}

	public get range(): Range | undefined {
		let ft = this.firstToken;
		let lt = this.lastToken;
		if (ft !== undefined && lt !== undefined) {
			return Helpers.rangeFrom(ft, lt);
		}
		return undefined;
	}
	
	public isPositionInside(position: Position): boolean {
		return Helpers.isPositionInsideRange(this.range, position);
	}

	public hover(position: Position): Hover | null {
		let i, plen = this._parts.length;
		for (i=0; i<plen; i++) {
			let part = this._parts[i];
			if (part.name.isPositionInside(position)) {
				let content = [];

				if (part.resolve) {
					if (part.resolve.type == ResolveType.Type.Class) {
						const c = part.resolve as ResolveClass;
						content.push(`**class ${c.name}**`);
						this.hoverAddParent(content, c.parent);

					} else if (part.resolve.type == ResolveType.Type.Interface) {
						const i = part.resolve as ResolveInterface;
						content.push(`**interface ${i.name}**`);
						this.hoverAddParent(content, i.parent);

					} else if (part.resolve.type == ResolveType.Type.Enumeration) {
						const e = part.resolve as ResolveEnumeration;
						content.push(`**enumeration ${e.name}**`);
						this.hoverAddParent(content, e.parent);

					} else if (part.resolve.type == ResolveType.Type.Namespace) {
						const ns = part.resolve as ResolveNamespace;
						content.push(`**namespace ${ns.name}**`);
						this.hoverAddParent(content, ns);
					}

				} else {
					content.push(`**type** **${part.name}**`);
				}

				return new HoverInfo(content, part.name.range);
			}
		};

		return null;
	}

	protected hoverAddParent(content: string[], type?: ResolveType) {
		if (type) {
			content.push(`parent class *${type.displayName}*`);
		}
	}

	toString() : string {
		return this._name;
	}
}
