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

import { ResolveFunction } from './function';
import { Resolved } from './resolved';
import { ResolveSignature } from './signature';


/** Group of functions in a class or interface sharing the same name. */
export class ResolveFunctionGroup extends Resolved{
	protected _functions: ResolveFunction[] = [];
	
	
	constructor (name: string) {
		super(name, Resolved.Type.FunctionGroup);
	}
	
	public dispose(): void {
		for (const each of this._functions) {
			each.parent = undefined;
			each.functionGroup = undefined;
			each.dispose();
		}
		super.dispose();
	}
	
	
	public get displayName(): string {
		return this.fullyQualifiedName;
	}
	
	
	public get functions(): ResolveFunction[] {
		return this._functions;
	}
	
	public addFunction(func: ResolveFunction): void {
		this._functions.push(func);
		func.functionGroup = this;
	}
	
	public findFunction(signature: ResolveSignature): ResolveFunction | undefined {
		for (const each of this._functions) {
			if (each.signature.matchesExactly(signature)) {
				return each;
			}
		}
		return undefined;
	}
	
	public hasFunctionWithSignature(func: ResolveFunction): boolean {
		return this.findFunction(func.signature) !== undefined;
	}
	
	public removeFunction(func: ResolveFunction): void {
		const i = this._functions.indexOf(func);
		if (i != -1) {
			this._functions.splice(i, 1);
		}
		func.parent = undefined;
	}
}
