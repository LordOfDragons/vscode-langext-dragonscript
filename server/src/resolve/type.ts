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

import { ResolveClass } from './class';
import { ResolveInterface } from './interface'
import { ResolveEnumeration } from './enumeration'
import { ResolveFunctionGroup } from './functionGroup'
import { ResolveFunction } from './function';


/**
 * Base class for types (namespace, class, interface, enumeration) potentially
 * containing inner classes, interfaces and enumerations.
 */
export class ResolveType{
	protected _type: ResolveType.Type;
	protected _name: string;
	protected _classes: Map<string, ResolveClass> = new Map();
	protected _interfaces: Map<string, ResolveInterface> = new Map();
	protected _enumerations: Map<string, ResolveEnumeration> = new Map();
	protected _functionGroups: Map<string, ResolveFunctionGroup> = new Map();
	protected _valid: boolean = true;
	protected _fullyQualifiedName?: string
	protected _displayName?: string


	constructor (name: string, type: ResolveType.Type) {
		this._name = name;
		this._type = type;
	}

	public dispose(): void {
		this.invalidate();
		for (const each of this._classes.values()) {
			each.dispose();
		}
		for (const each of this._interfaces.values()) {
			each.dispose();
		}
		for (const each of this._enumerations.values()) {
			each.dispose();
		}
		for (const each of this._functionGroups.values()) {
			each.dispose();
		}
		this.removeFromParent();
	}


	public get type(): ResolveType.Type {
		return this._type;
	}


	public get name(): string {
		return this._name;
	}

	public get fullyQualifiedName(): string {
		if (!this._fullyQualifiedName) {
			if (this.parent) {
				const pfqn = this.parent.fullyQualifiedName;
				this._fullyQualifiedName = pfqn != "" ? `${pfqn}.${this._name}` : this._name;
			} else {
				this._fullyQualifiedName = this._name;
			}
		}
		return this._fullyQualifiedName;
	}

	public get displayName(): string {
		if (!this._displayName) {
			this._displayName = this.parent ? this.fullyQualifiedName : "(root)";
		}
		return this._displayName;
	}


	public parent?: ResolveType;

	public removeFromParent(): void {
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


	public get interfaces(): Map<string, ResolveInterface> {
		this.validate();
		return this._interfaces;
	}

	public interface(name: string): ResolveInterface | undefined {
		let i = this._interfaces.get(name);
		i?.validate();
		return i;
	}

	public addInterface(iface: ResolveInterface): void {
		this.removeInterface(iface);
		iface.parent = this;
		this._interfaces.set(iface.name, iface);
	}

	public removeInterface(iface: ResolveInterface): void {
		if (this._interfaces.delete(iface.name)) {
			iface.parent = undefined;
		}
	}


	public get enumerations(): Map<string, ResolveEnumeration> {
		this.validate();
		return this._enumerations;
	}

	public enumeration(name: string): ResolveEnumeration | undefined {
		let i = this._enumerations.get(name);
		i?.validate();
		return i;
	}

	public addEnumeration(enumeration: ResolveEnumeration): void {
		this.removeEnumeration(enumeration);
		enumeration.parent = this;
		this._enumerations.set(enumeration.name, enumeration);
	}

	public removeEnumeration(enumeration: ResolveEnumeration): void {
		if (this._enumerations.delete(enumeration.name)) {
			enumeration.parent = undefined;
		}
	}


	public get functionGroups(): Map<string, ResolveFunctionGroup> {
		this.validate();
		return this._functionGroups;
	}

	public functionGroup(name: string): ResolveFunctionGroup | undefined {
		return this._functionGroups.get(name);
	}

	public functionGroupOrAdd(name: string): ResolveFunctionGroup {
		var fg = this._functionGroups.get(name);
		if (!fg) {
			fg = new ResolveFunctionGroup(name);
			this._functionGroups.set(name, fg);
		}
		return fg;
	}

	public addFunction(func: ResolveFunction): boolean {
		this.removeFunction(func);
		func.parent = this;
		let fg = this.functionGroupOrAdd(func.name);
		if (fg.hasFunctionWithSignature(func)) {
			return false;
		}
		fg.addFunction(func);
		return true;
	}

	public removeFunction(func: ResolveFunction): void {
		let fg = this.functionGroup(func.name);
		if (fg) {
			fg.removeFunction(func);
			
			if (fg.functions.length == 0) {
				this._functionGroups.delete(fg.name);
				fg.dispose();
			}
		}
		func.parent = undefined;
	}


	public findType(name: string): ResolveType | undefined {
		return this.class(name) || this.interface(name) || this.enumeration(name);
	}


	public invalidate(): void {
		this._valid = false;

		for (const each of this._classes.values()) {
			each.invalidate();
		}
		for (const each of this._interfaces.values()) {
			each.invalidate();
		}
		for (const each of this._enumerations.values()) {
			each.invalidate();
		}

		this.onInvalidate();
	}

	public validate(): void {
		if (this._valid) {
			return;
		}

		this._valid = true;
		this.onValidate();
	}


	protected onInvalidate(): void {
	}

	protected onValidate(): void {
	}
}


export namespace ResolveType {
	/** Container type. */
	export enum Type {
		Namespace,
		Class,
		Interface,
		Enumeration
	}
}
