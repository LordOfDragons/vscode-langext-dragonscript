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
import { ContextFunction } from "../context/classFunction";
import { ContextFunctionArgument } from "../context/classFunctionArgument";
import { Context } from "../context/context";
import { ContextTryCatch } from "../context/statementTry";
import { ContextVariable } from "../context/statementVariable";
import { MatchableName } from "../matchableName";
import { ResolveFunction } from "./function";
import { ResolveSignature } from "./signature";
import { ResolveType } from "./type";
import { ResolveVariable } from "./variable";

export class ResolveSearch {
	protected _arguments: (ContextFunctionArgument | ContextTryCatch)[] = [];
	protected _localVariables: ContextVariable[] = [];
	protected _variables: ResolveVariable[] = [];
	protected _functionsFull: ResolveFunction[] = [];
	protected _functionsPartial: ResolveFunction[] = [];
	protected _functionsWildcard: ResolveFunction[] = [];
	protected _functionsAll: ResolveFunction[] = [];
	protected _types: Set<ResolveType> = new Set();


	constructor (copy?: ResolveSearch) {
		if (copy) {
			this.name = copy.name;
			this.matchableName = copy.matchableName;
			this.onlyTypes = copy.onlyTypes;
			this.ignoreTypes = copy.ignoreTypes;
			this.onlyVariables = copy.onlyVariables;
			this.onlyFunctions = copy.onlyFunctions;
			this.ignoreVariables = copy.ignoreVariables;
			this.ignoreFunctions = copy.ignoreFunctions;
			this.ignoreShadowedFunctions = copy.ignoreShadowedFunctions;
			this.onlyStatic = copy.onlyStatic;
			this.ignoreStatic = copy.ignoreStatic;
			this.allMatchingTypes = copy.allMatchingTypes;
			this.signature = copy.signature;
			this.allowPartialMatch = copy.allowPartialMatch;
			this.allowWildcardMatch = copy.allowWildcardMatch;
			this.stopAfterFirstFullMatch = copy.stopAfterFirstFullMatch;
			this.searchSuperClasses = copy.searchSuperClasses;
		}
	}
	
	
	/** Exact name to search for or empty string to find all. */
	public name: string = "";
	
	/** Matchable name. If not undefined used instead of name. */
	public matchableName?: MatchableName;
	
	/** Search only types. */
	public onlyTypes: boolean = false;
	
	/** Ignore types. */
	public ignoreTypes: boolean = false;
	
	/** Search only variables. */
	public onlyVariables: boolean = false;
	
	/** Search only functions. */
	public onlyFunctions: boolean = false;
	
	/** Ignore variables. */
	public ignoreVariables: boolean = false;
	
	/** Ignore functions. */
	public ignoreFunctions: boolean = false;
	
	/** Ignore shadowed functions. */
	public ignoreShadowedFunctions: boolean = false;
	
	/** Only static members. */
	public onlyStatic: boolean = false;
	
	/** Ignore static members. */
	public ignoreStatic: boolean = false;
	
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
	
	/** Search in super classes. */
	public searchSuperClasses: boolean = true;
	
	/** Ignore constructors. Internal use. */
	public ignoreConstructors = false;
	
	
	
	/** Clear search result. */
	public clearResults(): void {
		this._localVariables.splice(0);
		this._arguments.splice(0);
		this._variables.splice(0);
		this._functionsFull.splice(0);
		this._functionsPartial.splice(0);
		this._functionsWildcard.splice(0);
		this._functionsAll.splice(0);
		this._types.clear();
		this.signature = undefined;
	}
	
	/** Local variables. */
	public get localVariables(): ContextVariable[] {
		return this._localVariables;
	}
	
	/** Function, block or catch arguments. */
	public get arguments(): (ContextFunctionArgument | ContextTryCatch)[] {
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
	
	/** All functions. Used if signature is undefined. */
	public get functionsAll(): ResolveFunction[] {
		return this._functionsAll;
	}
	
	public get types(): Set<ResolveType> {
		return this._types;
	}
	
	
	public addVariable(variable: ResolveVariable): void {
		if (!this.acceptVariable(variable)) {
			return;
		}
		
		this._variables.push(variable);
	}
	
	public addFunction(rfunction: ResolveFunction): void {
		if (!this.acceptFunction(rfunction)) {
			return;
		}
		
		if (this.signature) {
			const match = this.signature.matches(rfunction.signature);
			switch (match) {
				case ResolveSignature.Match.Full:
					this._functionsFull.push(rfunction);
					break;
					
				case ResolveSignature.Match.Partial:
					if (this.allowPartialMatch && !this._functionsPartial.find(
						f => rfunction.signature.matchesExactly(f.signature))) {
							this._functionsPartial.push(rfunction);
					}
					break;
					
				case ResolveSignature.Match.Wildcard:
					if (this.allowWildcardMatch) {
						this._functionsWildcard.push(rfunction);
					}
					break;
			}
		} else {
			this._functionsAll.push(rfunction);
		}
	}
	
	public addType(type: ResolveType): void {
		if (!this.acceptType(type)) {
			return;
		}
		
		this._types.add(type);
	}
	
	
	/** Remove all shadows functions. */
	public removeShadowedFunctions(): void {
		const found = this._functionsAll;
		this._functionsAll = [];
		
		for (const each of found) {
			if (!this._functionsAll.find(f => f.name == each.name && f.signature.matchesExactly(each.signature))) {
				this._functionsAll.push(each);
			}
		}
	}
	
	/** Remove all non-constructor functions. */
	public removeNonConstructorFunctions(): void {
		this._functionsAll = this._functionsAll.filter(f => {
			const c = f.context as ContextFunction;
			return c?.type == Context.ContextType.Function && c.functionType == ContextFunction.Type.Constructor;
		});
	}
	
	/** Remove type if present. */
	public removeType(type: ResolveType): void {
		this._types.delete(type);
	}
	
	
	/** Accept variable using non-name related filters. */
	public acceptVariable(variable: ResolveVariable): boolean {
		if (this.onlyStatic) {
			if (!variable.typeModifiers?.isStatic) {
				return false;
			}
		} else if (this.ignoreStatic) {
			if (variable.typeModifiers?.isStatic) {
				return false;
			}
		}
		return true;
	}
	
	/** Accept function using non-name related filters. */
	public acceptFunction(rfunction: ResolveFunction): boolean {
		if (this.onlyStatic) {
			if (!rfunction.typeModifiers?.isStatic) {
				return false;
			}
		} else if (this.ignoreStatic) {
			if (rfunction.typeModifiers?.isStatic) {
				return false;
			}
		}
		if (this.ignoreConstructors
			&& rfunction.context?.type == Context.ContextType.Function
			&& (rfunction.context as ContextFunction).functionType == ContextFunction.Type.Constructor) {
				return false;
		}
		if (this.ignoreShadowedFunctions) {
			if (this._functionsAll.find(f => f.name == rfunction.name
			&& f.signature.matchesExactly(rfunction.signature))) {
				return false;
			}
		}
		return true;
	}
	
	/** Accept type using non-name related filters. */
	public acceptType(type: ResolveType): boolean {
		if (!this.allMatchingTypes && this._types.size > 0) {
			return false;
		}
		return true;
	}
	
	
	/** Count of matches found. */
	public get matchCount(): integer {
		return this._localVariables.length + this._arguments.length
			+ this._variables.length + this._functionsFull.length
			+ this._functionsPartial.length + this._types.size
			+ this._functionsWildcard.length + this._types.size
			+ this._functionsAll.length + this._types.size;
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
		count += this._functionsAll.length;
		count += this._types.size;
		return count;
	}
}
