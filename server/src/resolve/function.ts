/**
 * MIT License
 *
 * Copyright (c) 2023 DragonDreams (info@dragondreams.ch)
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

import { ContextFunction } from '../context/classFunction';
import { ResolveFunctionGroup } from './functionGroup';
import { ResolveNamespace } from './namespace';
import { ResolveType } from './type';


/**
 * Function in a class or interface.
 */
export class ResolveFunction{
	protected _name: string;
	protected _context?: ContextFunction;
	protected _fullyQualifiedName?: string
	protected _returnType?: ResolveType;
	protected _signature: ResolveType[] = [];


	constructor (context: ContextFunction) {
		this._name = context.name.name;
		this._context = context;
		
		this._returnType = context.returnType?.resolve;
		for (const each of context.arguments) {
			var type = each.typename.resolve;
			if (!type) {
				type = ResolveNamespace.root.class('void');
			}
			this._signature.push(type);
		}
	}

	public dispose(): void {
		this._context = undefined;
		this.removeFromParent();
		this._returnType = undefined;
		this._signature = [];
		this.functionGroup = undefined;
	}


	public functionGroup?: ResolveFunctionGroup


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
		return this.fullyQualifiedName;
	}


	public parent?: ResolveType;


	public get context(): ContextFunction | undefined {
		return this._context;
	}

	public get returnType(): ResolveType | undefined {
		return this._returnType;
	}

	public get signature(): ResolveType[] {
		return this._signature;
	}

	public matches(signature: ResolveType[]): boolean {
		const len = this._signature.length;
		if (len != signature.length) {
			return false;
		}
		for (var i=0; i<len; i++) {
			if (this._signature[i] != signature[i]) {
				return false;
			}
		}
		return true;
	}

	public removeFromParent(): void {
		this.parent?.removeFunction(this);
		this.parent = undefined;
	}
}
