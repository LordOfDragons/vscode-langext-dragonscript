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
			this.addClass(new ResolveClass(undefined, "void"));
		}
	}

	public dispose(): void {
		super.dispose();
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
		if (search.onlyVariables || search.onlyFunctions || !search.name) {
			return;
		}
		
		super.search(search);
		
		let ns = this.namespace(search.name);
		if (ns) {
			search.addType(ns);
		}
		
		this.parent?.search(search);
	}


	public static get root(): ResolveNamespace {
		rootNamespace.validate();
		return rootNamespace;
	}


	public static get classBool(): ResolveClass {
		return rootNamespace.class('bool')!;
	}

	public static get classByte(): ResolveClass {
		let c = rootNamespace.class('byte')!;
		c.autoCast = Context.AutoCast.ValueByte;
		return c;
	}

	public static get classInt(): ResolveClass {
		let c = rootNamespace.class('int')!;
		c.autoCast = Context.AutoCast.ValueInt;
		return c;
	}

	public static get classFloat(): ResolveClass {
		return rootNamespace.class('float')!;
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


	protected onInvalidate(): void {
		super.onInvalidate();

		for (const each of this._namespaces.values()) {
			each.invalidate();
		}
	}

	protected onValidate(): void {
		super.onValidate();

		for (const context of this._contexts) {
			for (const statement of context.statements) {

			}
		}
	}
}

const rootNamespace: ResolveNamespace = new ResolveNamespace("");
