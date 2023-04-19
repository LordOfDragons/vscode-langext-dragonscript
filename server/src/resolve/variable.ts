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

import { ContextVariable } from '../context/classVariable';
import { ResolveType } from './type';


/**
 * Variable in a class or enumeration.
 */
export class ResolveVariable{
	protected _name: string;
	protected _context?: ContextVariable;
	protected _fullyQualifiedName?: string
	protected _variableType?: ResolveType;


	constructor (context: ContextVariable) {
		this._name = context.name.name;
		this._context = context;
		this._variableType = context.typename?.resolve;
	}

	public dispose(): void {
		this._context = undefined;
		this.removeFromParent();
		this._variableType = undefined;
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
		return this.fullyQualifiedName;
	}


	public parent?: ResolveType;


	public get context(): ContextVariable | undefined {
		return this._context;
	}

	public get variableType(): ResolveType | undefined {
		return this._variableType;
	}

	public removeFromParent(): void {
		this.parent?.removeVariable(this);
		this.parent = undefined;
	}
}
