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

import { ContextClass } from '../context/scriptClass';
import { ResolveNamespace } from './namespace';


export class ResolveClass{
	protected _name: string;
	protected _context?: ContextClass;
	protected _classes: Map<string, ResolveClass> = new Map();
	protected _interfaces: any[] = [];
	protected _enumerations: any[] = [];
	protected _valid: boolean = true;


	constructor (name: string) {
		this._name = name;
	}

	public dispose(): void {
		this.invalidate();
		for (const each of this._classes.values()) {
			each.dispose();
		}
		this.removeFromParent();
	}


	public get name(): string {
		return this._name;
	}

	public parent?: ResolveNamespace | ResolveClass;

	public removeFromParent(): void {
		if (this.parent) {
			if (this.parent instanceof ResolveClass) {
				(this.parent as ResolveClass).removeClass(this);
			} else if (this.parent instanceof ResolveNamespace) {
				(this.parent as ResolveNamespace).removeClass(this);
			}
			this.parent = undefined;
		}
	}


	public get context(): ContextClass | undefined {
		return this._context;
	}

	public set context(context: ContextClass | undefined) {
		this._context = context;
		this.invalidate();
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


	public invalidate(): void {
		this._valid = false;

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

	public validate(): void {
		if (this._valid) {
			return;
		}

		if (this._context) {
			for (const each of this._context.declarations) {
				
			}
		}
	}
}
