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

import { CompletionItemKind, Location, MarkupContent } from 'vscode-languageserver';
import { Context } from '../context/context';
import { ContextDocumentation } from '../context/documentation';
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
	}
	
	public removeContext(context: ContextNamespace) {
		let index = this._contexts.indexOf(context);
		if (index != -1) {
			this._contexts.splice(index, 1);
		}
	}
	
	
	public get namespaces(): Map<string, ResolveNamespace> {
		return this._namespaces;
	}
	
	public namespace(name: string): ResolveNamespace | undefined {
		return this._namespaces.get(name);
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
		return !this._classes.has(name) && !this.interfaces.has(name) && !this._enumerations.has(name);
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
		return rootNamespace;
	}
	
	
	public static get classBool(): ResolveClass {
		let c = rootNamespace.class('bool')!;
		c.isPrimitive = true;
		c.initialValue = 'false';
		c.completeValue = 'false';
		return c;
	}
	
	public static get classByte(): ResolveClass {
		let c = rootNamespace.class('byte')!;
		c.autoCast = Context.AutoCast.ValueByte;
		c.isPrimitive = true;
		c.initialValue = '0';
		c.completeValue = "' '";
		return c;
	}
	
	public static get classInt(): ResolveClass {
		let c = rootNamespace.class('int')!;
		c.autoCast = Context.AutoCast.ValueInt;
		c.isPrimitive = true;
		c.initialValue = '0';
		c.completeValue = '0';
		return c;
	}
	
	public static get classFloat(): ResolveClass {
		let c = rootNamespace.class('float')!;
		c.isPrimitive = true;
		c.initialValue = '0.0';
		c.completeValue = '0.0';
		return c;
	}
	
	public static get classString(): ResolveClass {
		let c = rootNamespace.class('String')!;
		c.completeValue = '""';
		return c;
	}
	
	public static get classBlock(): ResolveClass {
		let c = rootNamespace.class('Block')!;
		c.completeValue = 'block:end';
		return c;
	}
	
	public static get classEnumeration(): ResolveClass {
		return rootNamespace.class('Enumeration')!;
	}
	
	public static get classObject(): ResolveClass {
		return rootNamespace.class('Object')!;
	}
	
	public static get classException(): ResolveClass {
		let c = rootNamespace.class('Exception')!;
		c.completeValue = 'Exception.new("message")';
		return c;
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
	
	protected get completionItemMarkup(): MarkupContent | undefined {
		return this._contexts.find(c => c.documentation?.markup !== undefined)?.documentation?.markup;
	}
	
	public get documentation(): ContextDocumentation | undefined {
		return this._contexts.find(c => c.documentation !== undefined)?.documentation;
	}
}

const rootNamespace: ResolveNamespace = new ResolveNamespace("");
