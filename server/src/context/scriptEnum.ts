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

import { Context } from "./context"
import { DeclareEnumerationCstNode, EnumerationEntryCstNode } from "../nodeclasses/declareEnumeration";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { CompletionItem, Definition, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolInformation, SymbolKind } from "vscode-languageserver"
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveEnumeration } from "../resolve/enumeration";
import { ResolveType } from "../resolve/type";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { ResolveVariable } from "../resolve/variable";
import { TypeName } from "./typename";
import { ResolveFunction } from "../resolve/function";
import { Resolved } from "../resolve/resolved";
import { ContextDocumentationIterator } from "./documentation";
import { TextDocument } from "vscode-languageserver-textdocument";


export class ContextEnumEntry extends Context{
	protected _name: Identifier;
	protected _resolveVariable?: ResolveVariable;
	private static _typeModifiers?: Context.TypeModifierSet;


	constructor(node: EnumerationEntryCstNode, docTextExt: string | undefined, parent: Context) {
		super(Context.ContextType.EnumerationEntry, parent)
		this._name = new Identifier(node.children.name[0]);

		const tokBegin = this._name.token;
		if (tokBegin) {
			const tokEnd = Helpers.endOfCommandToken(node.children.endOfCommand);
			this.range = Helpers.rangeFrom(tokBegin, tokEnd);
			this.documentSymbol = DocumentSymbol.create(this._name.name,
				docTextExt, SymbolKind.EnumMember, this.range, this.range);
		}
	}

	dispose(): void {
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;

		super.dispose()
	}


	public get name(): Identifier {
		return this._name
	}
	
	public get resolveVariable(): ResolveVariable | undefined {
		return this._resolveVariable;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}
	
	public get simpleName(): string {
		return this._name.name;
	}
	
	public static get typeModifiers(): Context.TypeModifierSet {
		if (!ContextEnumEntry._typeModifiers) {
			ContextEnumEntry._typeModifiers = new Context.TypeModifierSet(
				undefined, Context.AccessLevel.Public, [
					Context.TypeModifier.Public,
					Context.TypeModifier.Static,
					Context.TypeModifier.Fixed]);
		}
		return ContextEnumEntry._typeModifiers;
	}

	protected updateResolveTextShort(): string {
		return `${this.parent?.simpleName} ${this.parent!.simpleName}.${this._name}`;
	}

	protected updateResolveTextLong(): string[] {
		const lines: string[] = [];
		lines.push(`${ContextEnumEntry.typeModifiers.typestring} **constant** ${this.simpleNameLink}`);
		this.addHoverParent(lines);
		return lines;
	}
	
	protected updateReportInfoText(): string {
		return `${ContextEnumEntry.typeModifiers.typestring} ${this.parent?.simpleName} ${this.parent!.simpleName}.${this._name}`;
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._resolveVariable?.dispose();
		this._resolveVariable = undefined;
		
		this._resolveVariable = new ResolveVariable(this);
		var container = (this.parent as ContextEnumeration)?.resolveEnumeration;
		if (container) {
			if (container.variable(this._name.name)) {
				state.reportError(this._name.range, `Duplicate variable ${this._name}`);
			} else {
				container.addVariable(this._resolveVariable);
			}
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		super.resolveStatements(state);
		
		this.documentation?.resolveStatements(state);
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this;
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._name.isPositionInside(position)) {
			return null;
		}

		let content = [];
		content.push(`static fixed public **variable** *${this.parent!.fullyQualifiedName}*.**${this.name}**`);
		if (this.documentation) {
			content.push('___');
			content.push(...this.documentation.resolveTextLong);
		}
		return new HoverInfo(content, this._name.range);
	}
	
	public definition(position: Position): Location[] {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
			return this._resolveVariable;
		}
		return super.resolvedAtPosition(position);
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Entry ${this._name}`)
	}
}


export class ContextEnumeration extends Context{
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _entries: ContextEnumEntry[] = [];
	protected _resolveEnum?: ResolveEnumeration;
	protected _positionBeginEnd?: Position;


	constructor(node: DeclareEnumerationCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Interface, parent);

		let edecl = node.children;
		let edeclBegin = edecl.enumerationBegin[0].children;

		this._name = new Identifier(edeclBegin.name[0]);
		
		this._typeModifiers = new Context.TypeModifierSet(typemodNode,
			Context.AccessLevel.Public, [Context.TypeModifier.Public]);
		
		this._positionBeginEnd = Helpers.endOfCommandBegin(edeclBegin.endOfCommand);

		let tokEnd = edecl.enumerationEnd?.at(0)?.children.end[0];
		this.blockClosed = tokEnd !== undefined;
		let tokEnum = edeclBegin.enum[0];
		this.range = Helpers.rangeFrom(tokEnum, tokEnd, true, false);
		this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
			SymbolKind.Enum, this.range, Helpers.rangeFrom(edeclBegin.name[0], tokEnd, true, true));

		let docTextExt = this._name.name;
		const entries = edecl.enumerationBody[0].children.enumerationEntry;
		if (entries) {
			for (const each of entries) {
				this._entries.push(new ContextEnumEntry(each, docTextExt, this));
			}
		}

		this.addChildDocumentSymbols(this._entries);
	}

	public dispose(): void {
		for (const each of this._entries) {
			each.dispose();
		}
		
		this._resolveEnum?.dispose();
		this._resolveEnum = undefined;
		
		super.dispose();
	}


	public get name(): Identifier {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get entries(): ContextEnumEntry[] {
		return this._entries;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public get simpleName(): string {
		return this._name.name;
	}
	
	public collectWorkspaceSymbols(list: SymbolInformation[]): void {
		super.collectWorkspaceSymbols(list);
		for (const each of this._entries) {
			each.collectWorkspaceSymbols(list);
		}
	}
	
	public get resolveEnumeration(): ResolveEnumeration | undefined {
		return this._resolveEnum;
	}
	
	public entryBefore(position: Position): Context | undefined {
		var entry: Context | undefined;
		for (const each of this._entries) {
			const stapos = each.range?.end;
			if (stapos && Helpers.isPositionBefore(position, stapos)) {
				break;
			}
			entry = each;
		}
		return entry;
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveEnum?.dispose();
		this._resolveEnum = undefined;

		this._resolveEnum = new ResolveEnumeration(this);
		if (this.parent) {
			var container: ResolveType | undefined;
			if (this.parent.type === Context.ContextType.Class) {
				container = (this.parent as ContextClass).resolveClass;
			} else if (this.parent.type === Context.ContextType.Interface) {
				container = (this.parent as ContextInterface).resolveInterface;
			} else if (this.parent.type === Context.ContextType.Namespace) {
				container = (this.parent as ContextNamespace).resolveNamespace;
			} else {
				container = ResolveNamespace.root;
			}

			if (container) {
				if (container.findType(this._name.name)) {
					state.reportError(this._name.range, `Duplicate enumeration ${this._name}`);
				} else {
					container.addEnumeration(this._resolveEnum);
				}
			}
		}
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		if (this._resolveEnum) {
			// enumerations are a bit special. their script class receives a copy of each
			// function in Enumeration class but with the type replace to the enum class
			const ownerTypeName = this._name.name;
			const ownerType = TypeName.typeNamed(ownerTypeName);
			
			ResolveNamespace.classEnumeration.functionGroups.forEach((group, name) => {
				group.functions.forEach((func) => {
					if (this._resolveEnum && func.context) {
						let rf = new ResolveFunction(func.context);
						
						if (rf.returnType?.name == 'Enumeration') {
							rf.replaceReturnType(this._resolveEnum);
						}
						
						this._resolveEnum.addFunction(rf);
					}
				});
			});
		}
		
		state.withScopeContext(this, () => {
			for (const each of this._entries) {
				each.resolveMembers(state);
			}
		});
	}

	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._entries) {
				each.resolveStatements(state);
			}
		});
		
		this.documentation?.resolveStatements(state);
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._entries, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this.contextAtRangeList(this._entries, range)
			?? this;
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._name.isPositionInside(position)) {
			return null;
		}
		
		let content = [];
		content.push(...this.resolveTextLong);
		if (this.documentation) {
			content.push('___');
			content.push(...this.documentation.resolveTextLong);
		}
		return new HoverInfo(content, this._name.range);
	}
	
	protected updateResolveTextShort(): string {
		return `${this._typeModifiers.typestring} enumeration ${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		let lines = [];
		lines.push(`${this._typeModifiers.typestring} **enumeration** ${this.simpleNameLink}`);
		this.addHoverParent(lines);
		return lines;
	}
	
	public search(search: ResolveSearch, before?: Context): void {
		this._resolveEnum?.search(search);
	}
	
	public definition(position: Position): Location[] {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
			return this._resolveEnum;
		}
		return super.resolvedAtPosition(position);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name.range);
	}
	
	public consumeDocumentation(iterator: ContextDocumentationIterator): void {
		if (!this.range) {
			return;
		}
		
		this.consumeDocumentationDescent(iterator);
		this.consumeDocumentationList(iterator, this._entries);
		iterator.firstAfter(this.range.end);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._positionBeginEnd && Helpers.isPositionAfter(position, this._positionBeginEnd)) {
			const entry = this.entryBefore(position);
			if (entry) {
				return entry.completion(document, position);
			}
			
			//const range = Range.create(position, position);
			let items: CompletionItem[] = [];
			
			// TODO propose names?
			
			return items;
		}
		
		// TODO propose class names
		return [];
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Enumeration: ${this._name} ${this._typeModifiers} ${this.logRange}`);
		this.logChildren(this._entries, console, prefixLines);
	}
}
