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
import { ContextVariablesVariable } from "../context/statementVariables";
import { ResolveFunction } from "./function";
import { ResolveType } from "./type";
import { ResolveVariable } from "./variable";

export class ResolveSearch {
	protected _arguments: ContextFunctionArgument[] = [];
	protected _localVariables: ContextVariablesVariable[] = [];
	protected _variables: ResolveVariable[] = [];
	protected _functions: ResolveFunction[] = [];
	protected _types: ResolveType[] = [];


	constructor () {
	}


	/** Exact name to search for. */
	public name: string = "";

	/** Search only types. */
	public onlyTypes: boolean = false;

	/** Search only variables. */
	public onlyVariables: boolean = false;

	/** Ignore functions. */
	public ignoreFunctions: boolean = false;
	


	/** Clear search result. */
	public clearResults(): void {
		this._localVariables.splice(0)
		this._arguments.splice(0)
		this._variables.splice(0)
		this._functions.splice(0)
		this._types.splice(0)
	}

	/** Local variables. */
	public get localVariables(): ContextVariablesVariable[] {
		return this._localVariables;
	}

	/** Function or block arguments. */
	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}

	public get variables(): ResolveVariable[] {
		return this._variables;
	}
	
	public get functions(): ResolveFunction[] {
		return this._functions;
	}

	public get types(): ResolveType[] {
		return this._types;
	}


	/** Count of matches found. */
	public get matchCount(): integer {
		return this._localVariables.length + this._arguments.length
			+ this._variables.length + this._functions.length + this._types.length;
	}

	/** Count of match type group found. */
	public get matchTypeCount(): integer {
		var count = 0;
		if (this._localVariables.length > 0) count++;
		if (this._arguments.length > 0) count++;
		if (this._variables.length > 0) count++;
		count += this._functions.length;
		count += this._types.length;
		return count;
	}
}
