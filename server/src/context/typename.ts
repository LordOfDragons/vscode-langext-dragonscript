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
import { CompletionItem, Hover, Location, Position, Range } from "vscode-languageserver";
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
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { CompletionHelper } from "../completionHelper";
import { CodeActionUnknownMember } from "../codeactions/unknownMember";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DebugSettings } from "../debugSettings";
import { debugLogMessage } from "../server";
import { semtokens } from "../semanticTokens";
import { debug } from "console";


export class TypeNamePart {
	protected _name: Identifier;
	protected _tokenPeriod?: IToken;
	protected _resolve?: ResolveUsage;
	
	constructor(token?: IToken, name?: string, tokenPeriod?: IToken) {
		this._name = new Identifier(token, name);
		this._tokenPeriod = tokenPeriod;
	}
	
	dispose(): void {
		this._resolve?.dispose();
		this._resolve = undefined;
	}
	
	
	public static named(name: string): TypeNamePart {
		return new TypeNamePart(undefined, name);
	}
	
	public get name(): Identifier {
		return this._name
	}
	
	public get tokenPeriod(): IToken | undefined {
		return this._tokenPeriod;
	}
	
	public get resolve(): ResolveUsage | undefined {
		return this._resolve;
	}
	
	public setResolve(resolved: Resolved | undefined, context: Context): ResolveUsage | undefined {
		this._resolve?.dispose();
		this._resolve = undefined;
		
		if (resolved) {
			this._resolve = new ResolveUsage(resolved, context);
			this._resolve.range = this._name.range;
		}
		
		return this._resolve;
	}
	
	public dropResolved(): void {
		this._resolve?.dispose();
		this._resolve = undefined;
	}
	
	public addSemanticTokens(builder: semtokens.Builder): void {
		semtokens.addReferenceToken(builder, this._name.range, this._resolve)
	}
}


export class TypeName {
	protected _parts: TypeNamePart[]
	protected _name: string
	public resolve?: ResolveUsage;
	protected _range: Range | null | undefined = null;
	
	
	constructor(node?: FullyQualifiedClassNameCstNode) {
		this._parts = []
		
		const children = node?.children;
		if (!children?.fullyQualifiedClassNamePart?.at(0)?.children.identifier?.at(0)) {
			this._name = "";
			return;
		}
		
		const count = children.fullyQualifiedClassNamePart.length;
		for (var i=0; i<count; i++) {
			const nodePart = children.fullyQualifiedClassNamePart[i];
			const nodePartIdentifier = nodePart.children.identifier?.at(0);
			const tokenPeriod = children.period?.at(i - 1);
			
			if (nodePartIdentifier) {
				this._parts.push(new TypeNamePart(nodePartIdentifier, undefined, tokenPeriod));
			} else {
				this._parts.push(new TypeNamePart(undefined, ""));
			}
		}
		
		this._name = this._parts.map(x => x.name.name).reduce((a, b) => `${a}.${b}`)
	}
	
	dispose(): void {
		for (const each of this._parts) {
			each.dispose();
		}
		
		this.resolve?.dispose();
		this.resolve = undefined;
	}
	
	
	public static typeNamed(name: string): TypeName {
		var tn = new TypeName();
		tn._name = name;
		for (const each of name.split('.')) {
			tn._parts.push(TypeNamePart.named(each));
		};
		return tn;
	}
	
	/*
	public static typeToken(token: IToken): TypeName {
		var tn = new TypeName();
		tn._name = token.image;
		tn._parts.push(new TypeNamePart(token));
		return tn;
	}
	*/
	
	public static get typeVoid(): TypeName {
		return this.typeNamed('void');
	}
	
	public static get typeObject(): TypeName {
		return this.typeNamed('Object');
	}
	
	public get name(): string {
		return this._name
	}
	
	public get parts(): TypeNamePart[] {
		return this._parts
	}
	
	public get lastPart(): TypeNamePart | undefined {
		return this._parts.at(this._parts.length - 1);
	}
	
	public get firstToken(): IToken | undefined {
		return this._parts.at(0)?.name.token;
	}
	
	public get lastToken(): IToken | undefined {
		return this.lastPart?.name.token;
	}
	
	
	public dropResolved(): void {
		for (const each of this._parts) {
			each.dropResolved();
		}
		
		this.resolve?.dispose();
		this.resolve = undefined;
	}
	
	public resolveNamespace(state: ResolveState, context: Context): ResolveUsage | undefined {
		var ns = ResolveNamespace.root;
		this.dropResolved();
		
		for (const each of this._parts) {
			if (!ns.isNamespace(each.name.name)) {
				state.reportError(each.name.range, `"${each.name.name}" in "${ns.name}" is not a namespace`);
				return undefined;
			}
			
			ns = ns.namespaceOrAdd(each.name.name);
			this.resolve = each.setResolve(ns, context);
		}
		
		return this.resolve;
	}
	
	public resolveType(state: ResolveState, context: Context): ResolveUsage | undefined {
		if (this._parts.length == 0) {
			return undefined;
		}
		
		var type: ResolveType | undefined;
		var first = true;
		this.dropResolved();
		
		for (const each of this._parts) {
			// first entry has to resolve to a basic class
			if (first) {
				this.resolve = this.resolveBaseType(state, context);
				const nextType = this.resolve?.resolved as ResolveType;
				if (!nextType) {
					const di = state.reportError(each.name.range, `"${each.name.name}" not found.`);
					if (di) {
						let ca = new CodeActionUnknownMember(di, context, each.name);
						ca.includeTypes = true;
						ca.searchTypes = new Set(CompletionHelper.searchExpressionType(context).types);
						context.codeActions.push(ca);
					}
					return undefined;
				}
				
				type = nextType;
				first = false;
				
			// all other parts have to be direct children
			} else {
				var nextType = type!.findType(each.name.name);
				
				if (!nextType && type!.type === Resolved.Type.Namespace) {
					nextType = (type! as ResolveNamespace).namespace(each.name.name);
				}
				
				if (nextType) {
					this.resolve = each.setResolve(nextType, context);
					type = nextType;
					continue;
				}
				
				const di = state.reportError(each.name.range, `Type "${each.name.name}" not found in "${type!.name}".`);
				if (di) {
					let ca = new CodeActionUnknownMember(di, context, each.name);
					ca.includeTypes = true;
					context.codeActions.push(ca);
				}
				return undefined;
			}
		}
		
		return this.resolve;
	}
	
	protected resolveBaseType(state: ResolveState, context: Context, target?: any): ResolveUsage | undefined {
		var scopeNS: ResolveNamespace | undefined;
		
		// first part has to be:
		var part = this._parts[0];
		const name = part.name.name;
		
		const sostack = state.scopeContextStack;
		this.dropResolved();
		
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
							return part.setResolve(t, context);
						}
					}
					break;
					
				case Context.ContextType.Interface:
					const pi = (scope as ContextInterface).resolveInterface;
					if (pi) {
						// - an inner type of the parent interface
						const t = this.resolveTypeInInterfaceChain(state, pi, name, false);
						if (t) {
							return part.setResolve(t, context);
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
							return part.setResolve(t, context);
						}
					}
					break;

				case Context.ContextType.Interface:
					const pi = (scope as ContextInterface).resolveInterface;
					if (pi) {
						// - an inner type of the super interface chain
						const t = this.resolveTypeInInterfaceChain(state, pi, name, true);
						if (t) {
							return part.setResolve(t, context);
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
							return part.setResolve(t, context);
						}
					}
					break;
			}
		}
		
		{
			const t = ResolveNamespace.root.findType(name);
			if (t) {
				return part.setResolve(t, context);
			}
		}
		
		// - a type of a pinned namespace chain
		for (const pin of state.pins) {
			const t = this.resolveTypeInNamespaceChain(state, pin, name);
			if (t) {
				return part.setResolve(t, context);
			}
		}
		
		// - a namespace of the parent namespace chain
		for (let i = sostack.length - 1; i >= 0; --i) {
			const scope = sostack[i];
			if (scope?.type === Context.ContextType.Namespace) {
				const ns = (scope as ContextNamespace).resolveNamespace;
				if (ns) {
					const t = this.resolveNamespaceInNamespaceChain(state, ns, name);
					if (t) {
						return part.setResolve(t, context);
					}
				}
			}
		}
		
		// - a namespace of a pinned namespace chain
		for (const pin of state.pins) {
			const t = this.resolveNamespaceInNamespaceChain(state, pin, name);
			if (t) {
				return part.setResolve(t, context);
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
			
			const t2 = rclass.context.extends?.resolve?.resolved as ResolveClass;
			if (t2?.type === ResolveType.Type.Class) {
				const t3 = this.resolveTypeInClassChain(state, t2, name, true, true);
				if (t3) {
					return t3;
				}
			}
			
			for (const each of rclass.context.implements) {
				const t2 = each.resolve?.resolved as ResolveInterface;
				if (t2?.type === ResolveType.Type.Interface) {
					const t3 = this.resolveTypeInInterfaceChain(state, t2, name, true);
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
				const t2 = each.resolve?.resolved as ResolveInterface;
				if (t2?.type === ResolveType.Type.Interface) {
					const t3 = this.resolveTypeInInterfaceChain(state, t2, name, true);
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
		
		if (ns.parent?.type === ResolveType.Type.Namespace) {
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
		
		if (ns.parent?.type === ResolveType.Type.Namespace) {
			return this.resolveNamespaceInNamespaceChain(state, ns.parent as ResolveNamespace, name);
		}
		
		return undefined;
	}
	
	public get range(): Range | undefined {
		if (this._range === null) {
			this._range = this._updateRange();
		}
		return this._range;
	}
	
	protected _updateRange(): Range | undefined {
		const count = this._parts.length;
		if (count == 0) {
			return undefined;
		}
		
		const firstToken = this._parts[0].name.token;
		if (!firstToken) {
			return undefined;
		}
		
		const lastPart = this._parts[count - 1];
		const lastToken = lastPart.name.token;
		if (lastToken) {
			if (lastToken.isInsertedInRecovery) {
				if (lastPart.tokenPeriod) {
					return Helpers.rangeFrom(firstToken, lastPart.tokenPeriod);
				}
			} else {
				return Helpers.rangeFrom(firstToken, lastToken);
			}
		}
		
		return undefined;
	}
	
	public location(context: Context): Location | undefined {
		const range = this.range;
		if (!range) {
			return undefined;
		}
		
		const uri = context.documentUri;
		if (!uri) {
			return undefined;
		}
		
		return Location.create(uri, range);
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
				const pr = part.resolve?.resolved;
				
				if (pr) {
					switch (pr.type) {
					case ResolveType.Type.Class: {
						const c = pr as ResolveClass;
						content.push(`**class** ${c.context?.simpleNameLink ?? c.name}`);
						this.hoverAddParent(content, c.parent as ResolveType);
						} break;
						
					case ResolveType.Type.Interface: {
						const i = pr as ResolveInterface;
						content.push(`**interface** ${i.context?.simpleNameLink ?? i.name}`);
						this.hoverAddParent(content, i.parent as ResolveType);
						} break;
						
					case ResolveType.Type.Enumeration: {
						const e = pr as ResolveEnumeration;
						content.push(`**enumeration** ${e.context?.simpleNameLink ?? e.name}`);
						this.hoverAddParent(content, e.parent as ResolveType);
						} break;
						
					case ResolveType.Type.Namespace: {
						const ns = pr as ResolveNamespace;
						content.push(`**namespace** ${ns.name}`);
						this.hoverAddParent(content, ns);
						} break;
					}
					
					const doc = pr.documentation;
					if (doc) {
						content.push('___');
						content.push(...doc.resolveTextLong);
					}
					
				} else {
					content.push(`**type** ${part.resolve?.context?.simpleName ?? part.name}`);
				}
				
				return new HoverInfo(content, part.name.range);
			}
		};

		return null;
	}
	
	protected hoverAddParent(content: string[], type?: ResolveType) {
		const pc = type?.resolveTextLong;
		if (!pc || pc.length == 0) {
			return;
		}
		
		content.push(`parent: ${pc[0]}`);
		content.push(...pc.slice(1));
	}
	
	public definition(position: Position): Location[] {
		let i, plen = this._parts.length;
		for (i=0; i<plen; i++) {
			let part = this._parts[i];
			if (part.name.isPositionInside(position)) {
				return part.resolve?.resolved?.resolveLocation ?? [];
			}
		};
		return [];
	}
	
	public completion(document: TextDocument, position: Position, context: Context,
			restrictType?: Resolved.Type[], castable?: ResolveType[]): CompletionItem[] {
		if (DebugSettings.debugCompletion) {
			debugLogMessage('typename.completion');
		}
		
		let i, plen = this._parts.length;
		var parentType: ResolveType | undefined;
		
		for (i=0; i<plen; i++) {
			let part = this._parts[i];
			//debugLogMessage(`typename.completion: i=${i}/${plen} part=${part.name.name}${Helpers.logRange(part.name.range)} | ${restrictType}`);
			if (part.name.isPositionInside(position) || i == plen - 1) {
				const range = part.name.range ?? CompletionHelper.wordRange(document, position);
				if (parentType) {
					return CompletionHelper.createSubType(range, context, parentType, restrictType, castable);
				} else {
					return CompletionHelper.createType(range, context, castable, restrictType);
				}
			}
			
			const resolved = part.resolve?.resolved;
			if (!resolved) {
				return [];
			}
			
			if (restrictType && !restrictType.includes(resolved.type)) {
				return [];
			}
			
			switch (resolved.type) {
			case Resolved.Type.Class:
			case Resolved.Type.Interface:
			case Resolved.Type.Enumeration:
			case Resolved.Type.Namespace:
				parentType = resolved as ResolveType;
				break;
				
			default:
				return [];
			}
		};
		
		return CompletionHelper.createType(Range.create(position, position), context, undefined, restrictType);
	}
	
	addSemanticTokens(builder: semtokens.Builder): void {
		for (const each of this._parts) {
			each.addSemanticTokens(builder)
		}
	}
	
	/**
	 * Create hover link if resolved context resolveLocationSelf exists using name as text.
	 * If resolved context resolveLocationSelf does not exists returns just name.
	 */
	public get simpleNameLink(): string {
		const l = this.resolve?.resolved?.resolveLocation.at(0);
		return l ? Helpers.linkFromLocation(l, this._name) : this._name;
	}
	
	toString() : string {
		return this._name;
	}
}
