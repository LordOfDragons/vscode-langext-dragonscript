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

import { ContextNamespace } from '../context/namespace';
import { ResolveClass } from './class';


export class ResolveNamespace{
	protected _name: string;
	protected _contexts: ContextNamespace[] = [];
	protected _namespaces: Map<string, ResolveNamespace> = new Map();
	protected _classes: Map<string, ResolveClass> = new Map();
	protected _interfaces: any[] = [];
	protected _enumerations: any[] = [];
	protected _valid: boolean = true;
	protected _fullyQualifiedName?: string
	protected _displayName?: string


	constructor (name: string) {
		this._name = name;
	}

	public dispose(): void {
		this.invalidate();
		for (const each of this._namespaces.values()) {
			each.dispose();
		}
		for (const each of this._classes.values()) {
			each.dispose();
		}
		this.parent = undefined;
	}


	public get name(): string {
		return this._name;
	}

	public parent?: ResolveNamespace;


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


	public get classes(): Map<string, ResolveClass> {
		this.validate();
		return this._classes;
	}

	public class(name: string): ResolveClass | undefined {
		let c = this._classes.get(name);
		c?.validate();
		return c;
	}

	public addClass(rclass: ResolveClass): void {
		this.removeClass(rclass);
		rclass.parent = this;
		this._classes.set(rclass.name, rclass);
	}

	public removeClass(rclass: ResolveClass): void {
		if (this._classes.delete(rclass.name)) {
			rclass.parent = undefined;
		}
	}


	public isNamespace(name: string): boolean {
		// TODO also check interface and enumerations once done
		return !this._classes.has(name);
	}

	public get fullyQualifiedName(): string {
		if (!this._fullyQualifiedName) {
			if (this.parent) {
				const pfqn = this.parent.fullyQualifiedName;
				if (pfqn != "") {
					this._fullyQualifiedName = `${this.parent.fullyQualifiedName}.${this._name}`;
				} else {
					this._fullyQualifiedName = this._name;
				}
			} else {
				this._fullyQualifiedName = this._name;
			}
		}
		return this._fullyQualifiedName;
	}

	public get displayName(): string {
		if (!this._displayName) {
			if (this.parent) {
				this._displayName = this.fullyQualifiedName;
			} else {
				this._displayName = "(root)";
			}
		}
		return this._displayName;
	}


	public static get root(): ResolveNamespace {
		rootNamespace.validate();
		return rootNamespace;
	}


	public invalidate(): void {
		this._valid = false;
		for (const each of this._namespaces.values()) {
			each.invalidate();
		}

		for (const each of this._classes.values()) {
			each.invalidate();
		}
		this._classes.clear();

		for (const each of this._interfaces) {
			
		}
		this._interfaces = [];

		for (const each of this._enumerations) {

		}
		this._enumerations = [];
	}

	protected validate(): void {
		if (this._valid) {
			return;
		}

		for (const context of this._contexts) {
			for (const statement of context.statements) {

			}
		}
	}
}

const rootNamespace: ResolveNamespace = new ResolveNamespace("");
