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
import { ResolveInterface } from './interface';
import { ResolveEnumeration } from './enumeration';
import { ResolveFunctionGroup } from './functionGroup';
import { ResolveFunction } from './function';
import { ResolveVariable } from './variable';
import { ResolveSearch } from './search';
import { CompletionItem, CompletionItemKind, InsertTextFormat, MarkupContent, Position, Range, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/context';
import { Resolved } from './resolved';
import { Helpers } from '../helpers';


/**
 * Base class for types (namespace, class, interface, enumeration) potentially
 * containing inner classes, interfaces and enumerations.
 */
export class ResolveType extends Resolved{
	protected _classes: Map<string, ResolveClass> = new Map();
	protected _interfaces: Map<string, ResolveInterface> = new Map();
	protected _enumerations: Map<string, ResolveEnumeration> = new Map();
	protected _functionGroups: Map<string, ResolveFunctionGroup> = new Map();
	protected _variables: Map<string, ResolveVariable> = new Map();
	protected _childTypesBeforeSelf = false;
	protected _resolveTextType = 'type ';
	public autoCast: Context.AutoCast = Context.AutoCast.No;
	public isPrimitive = false;
	public initialValue: string = 'null';
	public completeValue: string = 'null';
	
	
	constructor (name: string, type: Resolved.Type) {
		super(name, type);
	}

	public dispose(): void {
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
		for (const each of this._variables.values()) {
			each.dispose();
		}
		super.dispose();
	}
	
	
	public get resolveTextType(): string {
		return this._resolveTextType;
	}
	
	protected updateResolveTextShort(): string {
		return `${this._resolveTextType} ${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		return [`**${this._resolveTextType}** ${this.fullyQualifiedName}`];
	}
	
	protected updateReportInfoText(): string {
		return `${this._resolveTextType} ${this._name}`;
	}
	
	/**
	 * Create hover link if this.resolveLocationSelf exists using this.simplename as text.
	 * If this.resolveLocationSelf does not exists returns just this.simplename.
	 */
	public get simpleNameLink(): string {
		const l = this.resolveLocation.at(0);
		return l ? Helpers.linkFromLocation(l, this.simpleName) : this.simpleName;
	}
	
	
	public createCompletionItem(range: Range, withPin?: Position): CompletionItem {
		var documentation: string[] = [];
		var extraEdits: TextEdit[] = [];
		
		if (withPin) {
			const pin = this.pinNamespace;
			if (pin) {
				documentation.push('Requires:');
				documentation.push('```dragonscript\n' + `pin ${pin}\n` + '```');
				extraEdits.push(TextEdit.insert(withPin, `\npin ${pin}`));
			}
		}
		
		return {label: this._name,
			sortText: this._name,
			filterText: this._name,
			detail: `${this.completionItemTitle}: ${this.fullyQualifiedName}`,
			documentation: this.completionItemMarkup,
			kind: this.completionItemKind,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, this._name),
			additionalTextEdits: extraEdits,
			commitCharacters: ['.']};
	}
	
	protected get completionItemTitle(): string {
		return 'type';
	}
	
	protected get completionItemKind(): CompletionItemKind {
		return CompletionItemKind.Module;
	}
	
	protected get completionItemMarkup(): MarkupContent | undefined {
		return undefined;
	}
	
	public get pinNamespace(): string | undefined {
		if (this.type === ResolveType.Type.Namespace) {
			return undefined;
		}
		if (this.parent?.type !== ResolveType.Type.Namespace) {
			return undefined;
		}
		return this.parent?.fullyQualifiedName;
	}
	
	public createCompletionItemThis(range: Range): CompletionItem {
		return {label: 'this',
			detail: `${this.completionItemTitle} ${this.fullyQualifiedName}`,
			documentation: this.completionItemMarkup,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'this'),
			commitCharacters: ['.']};
	}
	
	public createCompletionItemSuper(range: Range): CompletionItem {
		return {label: 'super',
			detail: `${this.completionItemTitle} ${this.fullyQualifiedName}`,
			documentation: this.completionItemMarkup,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'super'),
			commitCharacters: ['.']};
	}
	
	
	public get classes(): Map<string, ResolveClass> {
		return this._classes;
	}
	
	public class(name: string): ResolveClass | undefined {
		return this._classes.get(name);
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
		return this._interfaces;
	}
	
	public interface(name: string): ResolveInterface | undefined {
		return this._interfaces.get(name);
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
		return this._enumerations;
	}
	
	public enumeration(name: string): ResolveEnumeration | undefined {
		return this._enumerations.get(name);
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
	
	
	public get variables(): Map<string, ResolveVariable> {
		return this._variables;
	}
	
	public variable(name: string): ResolveVariable | undefined {
		return this._variables.get(name);
	}
	
	public addVariable(variable: ResolveVariable): void {
		this.removeVariable(variable);
		variable.parent = this;
		this._variables.set(variable.name, variable);
	}
	
	public removeVariable(variable: ResolveVariable): void {
		if (this._variables.delete(variable.name)) {
			variable.parent = undefined;
		}
	}
	
	
	public findType(name: string): ResolveType | undefined {
		return this.class(name) || this.interface(name) || this.enumeration(name);
	}
	
	
	public castable(type: ResolveType): boolean {
		return false;
	}
	
	
	public search(search: ResolveSearch): void {
		if (search.stopSearching) {
			return;
		}
		
		if (!search.onlyTypes) {
			if (!search.onlyFunctions && !search.ignoreVariables) {
				if (search.matchableName) {
					for (const [,v] of this.variables) {
						if (search.matchableName.matches(v.matchableName)) {
							search.addVariable(v);
							if (search.stopSearching) {
								return;
							}
						}
					}
					
				} else if (search.name) {
					let v = this.variable(search.name);
					if (v) {
						search.addVariable(v);
						if (search.stopSearching) {
							return;
						}
					}
					
				} else {
					for (const [,v] of this.variables) {
						search.addVariable(v);
						if (search.stopSearching) {
							return;
						}
					}
				}
			}
			
			if (!search.onlyVariables && !search.ignoreFunctions) {
				if (search.matchableName) {
					for (const [,fg] of this.functionGroups) {
						if (search.matchableName.matches(fg.matchableName)) {
							for (const each of fg.functions) {
								search.addFunction(each);
								if (search.stopSearching) {
									return;
								}
							}
						}
					}
					
				} else if (search.name) {
					let fg = this.functionGroup(search.name);
					if (fg) {
						for (const each of fg.functions) {
							search.addFunction(each);
							if (search.stopSearching) {
								return;
							}
						}
					}
					
				} else {
					for (const [,fg] of this.functionGroups) {
						for (const each of fg.functions) {
							search.addFunction(each);
							if (search.stopSearching) {
								return;
							}
						}
					}
				}
			}
		}
		
		const ignoreConstructors = search.ignoreConstructors;
		search.ignoreConstructors = true;
		
		try {
			if (this._childTypesBeforeSelf) {
				this.searchChildTypes(search);
				if (search.stopSearching) {
					return;
				}
				
				this.searchSelf(search);
				
			} else {
				this.searchSelf(search);
				if (search.stopSearching) {
					return;
				}
				
				this.searchChildTypes(search);
			}
			
		} finally {
			search.ignoreConstructors = ignoreConstructors;
		}
	}
	
	protected searchSelf(search: ResolveSearch): void {
		if (search.onlyVariables || search.onlyFunctions || search.ignoreTypes || search.stopSearching) {
			return;
		}
		
		if (search.matchableName) {
			if (search.matchableName.matches(this.matchableName)) {
				search.addType(this);
			}
			
		} else if (this._name == search.name || !search.name) {
			search.addType(this);
		}
	}
	
	protected searchChildTypes(search: ResolveSearch): void {
		if (search.onlyVariables || search.onlyFunctions || search.ignoreTypes || search.stopSearching) {
			return;
		}
		
		if (search.matchableName) {
			for (const [,c] of this.classes) {
				if (search.matchableName.matches(c.matchableName)) {
					search.addType(c);
					if (search.stopSearching) {
						return;
					}
				}
			}
			
			for (const [,i] of this.interfaces) {
				if (search.matchableName.matches(i.matchableName)) {
					search.addType(i);
					if (search.stopSearching) {
						return;
					}
				}
			}
			
			for (const [,e] of this.enumerations) {
				if (search.matchableName.matches(e.matchableName)) {
					search.addType(e);
					if (search.stopSearching) {
						return;
					}
				}
			}
			
		} else if (search.name) {
			let c = this.class(search.name);
			if (c) {
				search.addType(c);
				if (search.stopSearching) {
					return;
				}
			}
			
			let i = this.interface(search.name);
			if (i) {
				search.addType(i);
				if (search.stopSearching) {
					return;
				}
			}
			
			let e = this.enumeration(search.name);
			if (e) {
				search.addType(e);
				if (search.stopSearching) {
					return;
				}
			}
			
		} else {
			for (const [,c] of this.classes) {
				search.addType(c);
				if (search.stopSearching) {
					return;
				}
			}
			
			for (const [,i] of this.interfaces) {
				search.addType(i);
				if (search.stopSearching) {
					return;
				}
			}
			
			for (const [,e] of this.enumerations) {
				search.addType(e);
				if (search.stopSearching) {
					return;
				}
			}
		}
	}
}
