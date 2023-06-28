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

import { integer } from "vscode-languageserver";
import { ContextFunctionArgument } from "../context/classFunctionArgument";
import { ContextVariable } from "../context/statementVariable";
import { ResolveFunction } from "./function";
import { ResolveSignature } from "./signature";
import { ResolveType } from "./type";
import { ResolveVariable } from "./variable";

export class ResolveSearch {
	protected _arguments: ContextFunctionArgument[] = [];
	protected _localVariables: ContextVariable[] = [];
	protected _variables: ResolveVariable[] = [];
	protected _functionsFull: ResolveFunction[] = [];
	protected _functionsPartial: ResolveFunction[] = [];
	protected _functionsWildcard: ResolveFunction[] = [];
	protected _types: ResolveType[] = [];


	constructor () {
	}


	/** Exact name to search for. */
	public name: string = "";

	/** Search only types. */
	public onlyTypes: boolean = false;

	/** Search only variables. */
	public onlyVariables: boolean = false;

	/** Search only functions. */
	public onlyFunctions: boolean = false;

	/** Ignore variables. */
	public ignoreVariables: boolean = false;

	/** Ignore functions. */
	public ignoreFunctions: boolean = false;

	/** Find all matching types instead of the first one. */
	public allMatchingTypes: boolean = false;

	/** Signature to match. Undefine in argument means anything. */
	public signature?: ResolveSignature;

	/** Allow partial match for functions. */
	public allowPartialMatch: boolean = true;

	/** Allow wildcard/error match for functions. */
	public allowWildcardMatch: boolean = true;

	/** Stop matching after first full match. */
	public stopAfterFirstFullMatch: boolean = true;
	


	/** Clear search result. */
	public clearResults(): void {
		this._localVariables.splice(0);
		this._arguments.splice(0);
		this._variables.splice(0);
		this._functionsFull.splice(0);
		this._functionsPartial.splice(0);
		this._functionsWildcard.splice(0);
		this._types.splice(0);
		this.signature = undefined;
	}

	/** Local variables. */
	public get localVariables(): ContextVariable[] {
		return this._localVariables;
	}

	/** Function or block arguments. */
	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}

	public get variables(): ResolveVariable[] {
		return this._variables;
	}
	
	/** Functions fully matching signature. */
	public get functionsFull(): ResolveFunction[] {
		return this._functionsFull;
	}
	
	/** Functions partially matching signature. */
	public get functionsPartial(): ResolveFunction[] {
		return this._functionsPartial;
	}
	
	/** Functions wildcard or error matching signature. */
	public get functionsWildcard(): ResolveFunction[] {
		return this._functionsWildcard;
	}

	public get types(): ResolveType[] {
		return this._types;
	}

	public addType(type: ResolveType): void {
		if (this.allMatchingTypes) {
			if (!this._types.includes(type)) {
				this._types.push(type);
			}
			
		} else {
			if (this._types.length == 0) {
				this._types.push(type);
			}
		}
	}


	/** Count of matches found. */
	public get matchCount(): integer {
		return this._localVariables.length + this._arguments.length
			+ this._variables.length + this._functionsFull.length
			+ this._functionsPartial.length + this._types.length
			+ this._functionsWildcard.length + this._types.length;
	}

	/** Count of match type group found. */
	public get matchTypeCount(): integer {
		var count = 0;
		if (this._localVariables.length > 0) count++;
		if (this._arguments.length > 0) count++;
		if (this._variables.length > 0) count++;
		if (this._functionsFull.length > 0) count ++;
		count += this._functionsPartial.length;
		count += this._functionsWildcard.length;
		count += this._types.length;
		return count;
	}
}
