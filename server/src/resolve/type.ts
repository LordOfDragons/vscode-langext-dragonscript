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
import { CompletionItem, CompletionItemKind, DiagnosticRelatedInformation, InsertTextFormat, Location, MarkupKind, Position, Range, TextEdit } from 'vscode-languageserver';
import { Context } from '../context/context';
import { MatchableName } from '../matchableName';
import { TextDocument } from 'vscode-languageserver-textdocument';


/**
 * Base class for types (namespace, class, interface, enumeration) potentially
 * containing inner classes, interfaces and enumerations.
 */
export class ResolveType{
	protected _type: ResolveType.Type;
	protected _name: string;
	protected _matchableName?: MatchableName;
	protected _classes: Map<string, ResolveClass> = new Map();
	protected _interfaces: Map<string, ResolveInterface> = new Map();
	protected _enumerations: Map<string, ResolveEnumeration> = new Map();
	protected _functionGroups: Map<string, ResolveFunctionGroup> = new Map();
	protected _variables: Map<string, ResolveVariable> = new Map();
	protected _valid: boolean = true;
	protected _fullyQualifiedName?: string
	protected _displayName?: string
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];
	protected _reportInfoText?: string;
	protected _childTypesBeforeSelf = false;
	protected _resolveTextType = 'type ';
	public autoCast: Context.AutoCast = Context.AutoCast.No;


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
		for (const each of this._variables.values()) {
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
	
	public get matchableName(): MatchableName {
		if (!this._matchableName) {
			this._matchableName = new MatchableName(this._name);
		}
		return this._matchableName;
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

	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		return `${this._resolveTextType} ${this._name}`;
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
	}

	protected updateResolveTextLong(): string[] {
		return [`**${this._resolveTextType}** ${this.fullyQualifiedName}`];
	}

	public get reportInfoText(): string {
		if (!this._reportInfoText) {
			this._reportInfoText = this.updateReportInfoText();
		}
		return this._reportInfoText ?? "?";
	}

	protected updateReportInfoText(): string {
		return `${this._resolveTextType} ${this._name}`;
	}
	
	public createReportInfo(message: string): DiagnosticRelatedInformation | undefined {
		return undefined;
	}
	
	public addReportInfo(relatedInformation: DiagnosticRelatedInformation[], message: string) {
		var info = this.createReportInfo(message);
		if (info) {
			relatedInformation.push(info);
		}
	}
	
	public resolveLocation(): Location[] {
		return [];
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
			kind: this.completionItemKind,
			documentation: {kind: MarkupKind.Markdown, value: documentation.join('  \n')},
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, this._name),
			additionalTextEdits: extraEdits};
	}
	
	protected get completionItemTitle(): string {
		return 'type';
	}
	
	protected get completionItemKind(): CompletionItemKind {
		return CompletionItemKind.Module;
	}
	
	protected get pinNamespace(): string | undefined {
		if (this.type == ResolveType.Type.Namespace) {
			return undefined;
		}
		if (this.parent?.type != ResolveType.Type.Namespace) {
			return undefined;
		}
		return this.parent?.fullyQualifiedName;
	}
	
	public createCompletionItemThis(range: Range): CompletionItem {
		return {label: 'this',
			detail: `${this.completionItemTitle} ${this.fullyQualifiedName}`,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'this')};
	}
	
	public createCompletionItemSuper(range: Range): CompletionItem {
		return {label: 'super',
			detail: `${this.completionItemTitle} ${this.fullyQualifiedName}`,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'super')};
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


	public get variables(): Map<string, ResolveVariable> {
		this.validate();
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
		if (!search.onlyTypes) {
			if (!search.onlyFunctions && !search.ignoreVariables) {
				if (search.matchableName) {
					for (const [,v] of this.variables) {
						if (!search.matchableName.matches(v.matchableName)) {
							continue;
						}
						search.addVariable(v);
					}
					
				} else if (search.name) {
					let v = this.variable(search.name);
					if (v) {
						search.addVariable(v);
					}
					
				} else {
					for (const [,v] of this.variables) {
						search.addVariable(v);
					}
				}
			}
			
			if (!search.onlyVariables && !search.ignoreFunctions) {
				if (search.functionsFull.length == 0 || !search.stopAfterFirstFullMatch) {
					if (search.matchableName) {
						for (const [,fg] of this.functionGroups) {
							if (search.matchableName.matches(fg.matchableName)) {
								for (const each of fg.functions) {
									search.addFunction(each);
								}
							}
						}
						
					} else if (search.name) {
						let fg = this.functionGroup(search.name);
						if (fg) {
							for (const each of fg.functions) {
								search.addFunction(each);
							}
						}
						
					} else {
						for (const [,fg] of this.functionGroups) {
							for (const each of fg.functions) {
								search.addFunction(each);
							}
						}
					}
				}
			}
		}
		
		const ignoreConstructors = search.ignoreConstructors;
		search.ignoreConstructors = true;
		
		if (this._childTypesBeforeSelf) {
			this.searchChildTypes(search);
			this.searchSelf(search);
			
		} else {
			this.searchSelf(search);
			this.searchChildTypes(search);
		}
		
		search.ignoreConstructors = ignoreConstructors;
	}
	
	protected searchSelf(search: ResolveSearch): void {
		if (search.onlyVariables || search.onlyFunctions || search.ignoreTypes) {
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
		if (search.onlyVariables || search.onlyFunctions || search.ignoreTypes) {
			return;
		}
		
		if (search.matchableName) {
			for (const [,c] of this.classes) {
				if (search.matchableName.matches(c.matchableName)) {
					search.addType(c);
				}
			}
			
			for (const [,i] of this.interfaces) {
				if (search.matchableName.matches(i.matchableName)) {
					search.addType(i);
				}
			}
			
			for (const [,e] of this.enumerations) {
				if (search.matchableName.matches(e.matchableName)) {
					search.addType(e);
				}
			}
			
		} else if (search.name) {
			let c = this.class(search.name);
			if (c) {
				search.addType(c);
			}
			
			let i = this.interface(search.name);
			if (i) {
				search.addType(i);
			}
			
			let e = this.enumeration(search.name);
			if (e) {
				search.addType(e);
			}
			
		} else {
			for (const [,c] of this.classes) {
				search.addType(c);
			}
			
			for (const [,i] of this.interfaces) {
				search.addType(i);
			}
			
			for (const [,e] of this.enumerations) {
				search.addType(e);
			}
		}
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
