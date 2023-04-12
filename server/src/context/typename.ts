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
import { Diagnostic, DiagnosticSeverity, Hover, Position, Range } from "vscode-languageserver";
import { HoverInfo } from "../hoverinfo";
import { FullyQualifiedClassNameCstNode } from "../nodeclasses/fullyQualifiedClassName"
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveClass } from "../resolve/class";
import { ResolveState } from "../resolve/state";
import { capabilities, debugLogMessage } from "../server";
import { Identifier } from "./identifier"


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
				if (each.name.token) {
					state.reportError(state.rangeFrom(each.name.token),
						`"${each.name.name}" in "${ns.name}" is not a namespace`);
				}
				return undefined;
			}
			
			ns = ns.namespaceOrAdd(each.name.name);
			each.resolve = ns;
		}
		return ns;
	}

	public resolveType(state: ResolveState): ResolveClass | ResolveNamespace | undefined {
		if (this._parts.length == 0) {
			return undefined;
		}

		var ns: ResolveNamespace | undefined;
		var c: ResolveClass | undefined;
		var first = true;

		for (const each of this._parts) {
			// first entry has to resolve to a basic class
			if (first) {
				const bt = this.resolveBaseType(state);
				if (!bt) {
					if (each.name.token) {
						state.reportError(state.rangeFrom(each.name.token), `"${each.name.name}" not found.`);
					}
					return undefined;
				}

				if (bt instanceof ResolveClass) {
					c = bt as ResolveClass;
				} else if (bt instanceof ResolveNamespace) {
					ns = bt as ResolveNamespace;
				} else {
					return undefined;
				}
				first = false;

			// all other parts have to be direct children
			} else {
				if (c) {
					const nextC = c.class(each.name.name);
					if (!nextC) {
						if (each.name.token) {
							state.reportError(state.rangeFrom(each.name.token),
								`Class "${each.name.name}" not found in "${c.name}".`);
						}
						return undefined;
					}
	
					each.resolve = nextC;
					c = nextC;
					continue;
					
				} else if (ns) {
					c = ns.class(each.name.name);
					if (c) {
						each.resolve = c;
						continue;
					}
					
					const nextNS = ns.namespace(each.name.name);
					if (!nextNS) {
						if (each.name.token) {
							state.reportError(state.rangeFrom(each.name.token),
								`Namespace "${each.name.name}" not found in "${ns.name}".`);
						}
						return undefined;
					}
	
					each.resolve = nextNS;
					ns = nextNS;
	
				} else {
					return undefined;
				}
			}
		}		

		return c ?? ns;
	}

	protected resolveBaseType(state: ResolveState): ResolveClass | ResolveNamespace | undefined {
		const dodebug = ["Math"].includes(state.parentClass?.name.name || "");
		if (dodebug) {
			/*
			debugLogMessage(`resolveBaseType: IN ${state.parentClass?.name.name}`);
			const ns = state.parentNamespace?.resolveNamespace;
			if (ns) {
				debugLogMessage(`- namespace "${ns.name}" (${ns.classes.size}) "${ns.parent?.name}" (${ns.parent?.classes.size})`);
			}
			for (const each of state.pins) {
				debugLogMessage(`- pin "${each.name}"`);
			}
			*/
		}

		// first part has to be:
		var part = this._parts[0];
		const name = part.name.name;
		
		const pc = state.parentClass?.resolveClass;
		if (pc) {
			// 1) an inner class of the parent class
			// 2) an inner class of the super class chain
			const t = this.resolveClassChain(state, pc, name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}	
		
		// - a class of the parent namespace chain
		var ns = state.parentNamespace ? state.parentNamespace.resolveNamespace : ResolveNamespace.root;
		if (ns) {
			var t = this.resolveNamespaceChain(state, ns, name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}

		// - a class of a pinned namespace chain
		for (const pin of state.pins) {
			var t = this.resolveNamespaceChain(state, pin, name);
			if (t) {
				part.resolve = t;
				return t;
			}
		}

		return undefined;
	}

	protected resolveClassChain(state: ResolveState, cls: ResolveClass, name: string):
			ResolveClass | undefined {
		const c = cls.class(name);
		if (c) {
			return c;
		}
	
		// TODO: interface, enumeration

		// TODO: if variable or function fail

		return undefined;
	}

	protected resolveNamespaceChain(state: ResolveState, ns: ResolveNamespace, name: string):
			ResolveClass | ResolveNamespace | undefined {
		const c = ns.class(name)
		if (c) {
			return c;
		}

		// TODO: interface, enumeration

		if (ns.parent) {
			return this.resolveNamespaceChain(state, ns.parent, name);
		}

		return undefined;
	}

	public isPositionInside(position: Position): boolean {
		let ft = this.firstToken;
		let lt = this.lastToken;
		return ft !== undefined && lt !== undefined
			&& this.isPositionInsideRange(this.rangeFrom(ft, lt), position);
	}

	public hover(position: Position): Hover | null {
		let i, plen = this._parts.length;
		for (i=0; i<plen; i++) {
			let part = this._parts[i];
			if (part.name.token && this.isPositionInsideToken(part.name.token, position)) {
				let content = [];

				if (part.resolve) {
					if (part.resolve instanceof ResolveClass) {
						const c = part.resolve as ResolveClass;
						content.push(`**class ${c.name}**`);
						if (c.parent) {
							if (c.parent instanceof ResolveClass) {
								const cc = (c.parent as ResolveClass).context;
								if (cc) {
									content.push(`\nparent class *${cc.fullyQualifiedName}*`);
								}

							} else if (c.parent instanceof ResolveNamespace) {
								content.push(`\nnamespace *${(c.parent as ResolveNamespace).displayName}*`);
							}
						}

					} else if (part.resolve instanceof ResolveNamespace) {
						const ns = part.resolve as ResolveNamespace;
						content.push(`**namespace ${ns.name}**`);
						content.push(`\nparent namespace *${ns.displayName}*`);
					}

				} else {
					content.push(`**type** **${part.name}**`);
				}

				return new HoverInfo(content, this.rangeFrom(part.name.token));
			}
		};

		return null;
	}

	toString() : string {
		return this._name;
	}

	protected isPositionInsideToken(token: IToken, position: Position): boolean {
		return this.isPositionInsideRange(this.rangeFrom(token), position);
	}

	protected isPositionInsideRange(range: Range, position: Position): boolean {
		if (position.line < range.start.line) {
			return false;
		} else if (position.line == range.start.line) {
			if (position.character < range.start.character) {
				return false;
			}
		}

		if (position.line > range.end.line) {
			return false;
		} else if (position.line == range.end.line) {
			if (position.character > range.end.character) {
				return false;
			}
		}

		return true;
	}

	public rangeFrom(start: IToken, end?: IToken, startAtLeft: boolean = true, endAtLeft: boolean = false): Range {
		// note: end column ist at the left side of the last character hence (+1 -1) cancels out
		let a = start;
		let b = end || start;
		
		let startLine = a.startLine || 1;
		let endLine = b.endLine || startLine;
		
		let startColumn = startAtLeft ? (a.startColumn || 1) : (a.endColumn || 1) + 1;
		let endColumn = endAtLeft ? (b.startColumn || 1) : (b.endColumn || 1) + 1;
		
		// note: line/column in chevrotain is base-1 and in vs base-0
		return Range.create(startLine - 1, startColumn - 1, endLine - 1, endColumn - 1);
	}
}
