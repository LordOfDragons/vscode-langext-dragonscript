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

import { CompletionItemKind, Location } from 'vscode-languageserver';
import { Context } from '../context/context';
import { ContextNamespace } from '../context/namespace';
import { ResolveClass } from './class';
import { ResolveSearch } from './search';
import { ResolveType } from './type';


export class ResolveNamespace extends ResolveType {
	protected _contexts: ContextNamespace[] = [];
	protected _namespaces: Map<string, ResolveNamespace> = new Map();
	
	
	constructor (name: string) {
		super(name, ResolveType.Type.Namespace);
		
		this._childTypesBeforeSelf = true;
		this._resolveTextType = 'namespace';
		
		if (name == "") {
			// for the root namespace add some special classes
			let c = new ResolveClass(undefined, "void");
			c.canUsage = false;
			this.addClass(c);
		}
	}
	
	
	public get contexts(): ContextNamespace[] {
		return this._contexts;
	}
	
	public addContext(context: ContextNamespace) {
		this._contexts.push(context);
		this.invalidate();
	}
	
	public removeContext(context: ContextNamespace) {
		let index = this._contexts.indexOf(context);
		if (index != -1) {
			this._contexts.splice(index, 1);
			this.invalidate();
		}
	}
	
	
	public get namespaces(): Map<string, ResolveNamespace> {
		this.validate();
		return this._namespaces;
	}
	
	public namespace(name: string): ResolveNamespace | undefined {
		let ns = this._namespaces.get(name);
		ns?.validate();
		return ns;
	}
	
	public namespaceOrAdd(name: string): ResolveNamespace {
		let ns = this._namespaces.get(name);
		if (!ns) {
			ns = new ResolveNamespace(name);
			ns.parent = this;
			this._namespaces.set(name, ns);
		}
		return ns;
	}
	
	
	public isNamespace(name: string): boolean {
		// TODO also check interface and enumerations once done
		return !this._classes.has(name);
	}
	
	
	public search(search: ResolveSearch): void {
		if (search.onlyVariables || search.onlyFunctions || search.ignoreTypes) {
			return;
		}
		
		this.searchNamespace(search);
		if (!search.ignoreNamespaceParents) {
			(this.parent as ResolveType)?.search(search);
		}
	}
	
	/** Search all namespaces and all global classes. */
	public searchGlobalTypes(search: ResolveSearch): void {
		this.searchNamespace(search);
		for (const [,ns] of this._namespaces) {
			ns.searchGlobalTypes(search);
		}
	}
	
	protected searchNamespace(search: ResolveSearch): void {
		super.search(search);
		
		if (search.matchableName) {
			for (const [,ns] of this.namespaces) {
				if (search.matchableName.matches(ns.matchableName)) {
					search.addType(ns);
				}
			}
			
		} else if (search.name) {
			const ns = this.namespace(search.name);
			if (ns) {
				search.addType(ns);
			}
			
		} else {
			for (const [,ns] of this.namespaces) {
				search.addType(ns);
			}
		}
	}
	
	public static get root(): ResolveNamespace {
		rootNamespace.validate();
		return rootNamespace;
	}
	
	
	public static get classBool(): ResolveClass {
		let c = rootNamespace.class('bool')!;
		c.isPrimitive = true;
		return c;
	}
	
	public static get classByte(): ResolveClass {
		let c = rootNamespace.class('byte')!;
		c.autoCast = Context.AutoCast.ValueByte;
		c.isPrimitive = true;
		return c;
	}
	
	public static get classInt(): ResolveClass {
		let c = rootNamespace.class('int')!;
		c.autoCast = Context.AutoCast.ValueInt;
		c.isPrimitive = true;
		return c;
	}
	
	public static get classFloat(): ResolveClass {
		let c = rootNamespace.class('float')!;
		c.isPrimitive = true;
		return c;
	}
	
	public static get classString(): ResolveClass {
		return rootNamespace.class('String')!;
	}
	
	public static get classBlock(): ResolveClass {
		return rootNamespace.class('Block')!;
	}
	
	public static get classEnumeration(): ResolveClass {
		return rootNamespace.class('Enumeration')!;
	}
	
	public static get classObject(): ResolveClass {
		return rootNamespace.class('Object')!;
	}
	
	public static get classException(): ResolveClass {
		return rootNamespace.class('Exception')!;
	}
	
	public static get classVoid(): ResolveClass {
		return rootNamespace.class('void')!;
	}
	
	
	public get resolveLocation(): Location[] {
		let list: Location[] = [];
		for (const each of this._contexts) {
			const l = each.resolveLocationSelf;
			if (l) {
				list.push(l);
			}
		}
		return list;
	}
	
	public get references(): Location[] {
		let list: Location[] = [];
		for (const each of this._contexts) {
			const r = each.referenceSelf;
			if (r) {
				list.push(r);
			}
		}
		return list;
	}
	
	protected get completionItemTitle(): string {
		return 'namespace';
	}
	
	protected get completionItemKind(): CompletionItemKind {
		return CompletionItemKind.Module;
	}
	
	
	protected onInvalidate(): void {
		super.onInvalidate();
		
		for (const each of this._namespaces.values()) {
			each.invalidate();
		}
	}
}

const rootNamespace: ResolveNamespace = new ResolveNamespace("");
