/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { Resolved } from "../../resolve/resolved";
import { ResolveSearch } from "../../resolve/search";
import { ResolveSignature } from "../../resolve/signature";
import { ResolveState } from "../../resolve/state";
import { ResolveType } from "../../resolve/type";
import { Context } from "../context";
import { ContextNamespace } from "../namespace";
import { ContextClass } from "../scriptClass";
import { ContextEnumeration } from "../scriptEnum";
import { ContextInterface } from "../scriptInterface";
import { TypeName } from "../typename";
import { ContextDocumentationDocState } from "./docState";


export interface ContextDocBaseSymbol {
	nameClass?: string,
	nameSymbol?: string,
	arguments?: string[],
	trailingText?: string
}


export class ContextDocBase extends Context{
	constructor(type: Context.ContextType, parent: Context) {
		super(type, parent);
	}
	
	
	public prepareRange(state: ContextDocumentationDocState): void {
	}
	
	public buildDoc(state: ContextDocumentationDocState): void {
	}
	
	
	public static regexWordEndsWithPunctuation = /[.,:;!?]$/;
	
	protected static regexSymbolTrailingText = /\W+$/;
	
	protected parseSymbol(word: string): ContextDocBaseSymbol | undefined {
		const deliHash = word.indexOf('#');
		const deliLParam = word.indexOf('(');
		const deliRParam = word.indexOf(')');
		
		var nameClass: string | undefined;
		var nameSymbol: string | undefined;
		var args: string[] | undefined;
		var trailingText: string | undefined;
		
		if ((deliLParam != -1 && deliHash > deliLParam) || deliLParam > deliRParam) {
			return undefined;
		}
		
		if (deliLParam != -1) {
			trailingText = word.substring(deliRParam + 1);
			const s = word.substring(deliLParam + 1, deliRParam);
			args = s != '' ? s.split(',') : [];
			word = word.substring(0, deliLParam);
			
		} else {
			const matches = ContextDocBase.regexSymbolTrailingText.exec(word);
			if (matches) {
				trailingText = matches[0];
				word = word.substring(0, matches.index);
			}
		}
		
		if (deliHash != -1) {
			nameSymbol = word.substring(deliHash + 1);
			word = word.substring(0, deliHash);
		}
		
		if (word.length > 0 || deliHash != -1) {
			nameClass = word;
		}
		
		return {
			nameClass: nameClass,
			nameSymbol: nameSymbol,
			arguments: args,
			trailingText: trailingText
		}
	}
	
	protected resolveSymbol(state: ResolveState, symbol?: ContextDocBaseSymbol): Resolved | undefined {
		if (!symbol) {
			return undefined;
		}
		
		var context: Context | undefined;
		var contextType: ResolveType | undefined;
		
		for (let i=state.scopeContextStack.length - 1; i >= 0; i--) {
			const c = state.scopeContextStack[i];
			
			switch (c.type) {
			case Context.ContextType.Class:
				context = c;
				contextType = (c as ContextClass).resolveClass;
				break;
				
			case Context.ContextType.Interface:
				context = c;
				contextType = (c as ContextInterface).resolveInterface;
				break;
				
			case Context.ContextType.Enumeration:
				context = c;
				contextType = (c as ContextEnumeration).resolveEnumeration;
				break;
				
			case Context.ContextType.Namespace:
				context = c;
				contextType = (c as ContextNamespace).resolveNamespace;
				break;
			}
			
			if (context) {
				break;
			}
		}
		
		if (!context || !contextType) {
			return undefined;
		}
		
		var type: ResolveType | undefined;
		
		if (symbol.nameClass == '') {
			type = contextType;
			
		} else if (symbol.nameClass) {
			var typeName: TypeName;
			try {
				typeName = TypeName.typeNamed(symbol.nameClass);
			} catch {
				return undefined;
			}
			
			const usage = typeName.resolveType(state, this);
			if (usage?.resolved) {
				switch (usage.resolved.type) {
				case Resolved.Type.Class:
				case Resolved.Type.Interface:
				case Resolved.Type.Enumeration:
				case Resolved.Type.Namespace:
					type = usage.resolved as ResolveType;
					break;
				}
				usage.dispose();
			}
			
			if (!type) {
				return undefined;
			}
		}
		
		if (!symbol.nameSymbol) {
			return type;
		}
		
		let matches = new ResolveSearch();
		matches.name = symbol.nameSymbol;
		matches.searchSuperClasses = symbol.nameSymbol != 'new';
		
		if (symbol.arguments) {
			let resolveSignature = new ResolveSignature();
			for (const each of symbol.arguments) {
				/*
				let matches2 = new ResolveSearch();
				matches2.name = each;
				matches2.onlyTypes = true;
				state.search(matches2, context);
				if (matches2.types.size == 0) {
					return undefined;
				}
				resolveSignature.addArgument(matches2.types.values().next().value, undefined, Context.AutoCast.No);
				*/
				
				var typeName: TypeName;
				try {
					typeName = TypeName.typeNamed(each);
				} catch {
					return undefined;
				}
				
				const usage = typeName.resolveType(state, this);
				var argType: ResolveType | undefined;
				if (usage?.resolved) {
					switch (usage.resolved.type) {
					case Resolved.Type.Class:
					case Resolved.Type.Interface:
					case Resolved.Type.Enumeration:
					case Resolved.Type.Namespace:
						argType = usage.resolved as ResolveType;
						break;
					}
					usage.dispose();
				}
				
				if (!argType) {
					return undefined;
				}
				
				resolveSignature.addArgument(argType, undefined, Context.AutoCast.No);
			}
			
			matches.ignoreVariables = true;
			matches.signature = resolveSignature;
		}
		
		if (type) {
			type.search(matches);
		} else {
			state.search(matches, context);
		}
		
		if (matches.functionsFull.length > 0) {
			return matches.functionsFull[0];
			
		} else if (matches.variables.length > 0) {
			return matches.variables[0];
			
		} else if (matches.types.size > 0) {
			return matches.types.values().next().value;
			
		} else {
			// if no match is found and no arguments is provided try to find the
			// first function with the matching name disregarding argument
			if (matches.signature?.arguments.length === 0) {
				matches.signature = undefined;
				if (type) {
					type.search(matches);
				} else {
					state.search(matches, context);
				}
				
				return matches.functionsAll.at(0);
			}
			
			return undefined;
		}
	}
}
