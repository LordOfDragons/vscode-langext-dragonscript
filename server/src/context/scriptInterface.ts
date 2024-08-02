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
import { DeclareInterfaceCstNode } from "../nodeclasses/declareInterface";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { CompletionItem, Definition, DiagnosticRelatedInformation, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolInformation, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextClass } from "./scriptClass";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveInterface } from "../resolve/interface";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveType } from "../resolve/type";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { ContextDocumentationIterator } from "./documentation";
import { debugLogMessage } from "../server";
import { DebugSettings } from "../debugSettings";


export class ContextInterface extends Context{
	protected _name: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _implements: TypeName[] = [];
	protected _declarations: Context[] = [];
	protected _resolveInterface?: ResolveInterface;
	protected _inheritanceResolved: boolean = false;
	protected _tokenImplements?: Range;
	protected _positionBeginEnd?: Position;


	constructor(node: DeclareInterfaceCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Interface, parent);

		let idecl = node.children;
		let ideclBegin = idecl.interfaceBegin[0].children;

		this._name = new Identifier(ideclBegin.name[0]);
		
		this._typeModifiers = new Context.TypeModifierSet(typemodNode,
			Context.AccessLevel.Public, [Context.TypeModifier.Public]);

		let tokIf = ideclBegin.interface[0];
		let tokEnd = idecl.interfaceEnd?.at(0)?.children.end?.at(0);
		this.blockClosed = tokEnd !== undefined;
		this.range = Helpers.rangeFrom(tokIf, tokEnd, true, false);
		this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
			SymbolKind.Interface, this.range, Helpers.rangeFrom(ideclBegin.name[0], tokEnd, true, true));
		
		const ideclBeginExt = ideclBegin.interfaceBeginImplements?.at(0)?.children;
		const tokImplements = ideclBeginExt?.implements?.at(0);
		if (tokImplements) {
			this._tokenImplements = Helpers.rangeFrom(tokImplements);
		}
		
		if (ideclBeginExt?.baseInterfaceName) {
			for (const each of ideclBeginExt?.baseInterfaceName) {
				this._implements.push(new TypeName(each));
			}
		}
		
		this._positionBeginEnd = Helpers.endOfCommandBegin(ideclBegin.endOfCommand);
		
		const decls = idecl.interfaceBody[0].children.interfaceBodyDeclaration;
		if (decls) {
			for (const each of decls) {
				let typemod = each.children.typeModifiers?.at(0);

				if (each.children.declareClass) {
					this._declarations.push(new ContextClass(each.children.declareClass[0], typemod, this));

				} else if (each.children.declareInterface) {
					this._declarations.push(new ContextInterface(each.children.declareInterface[0], typemod, this));

				} else if (each.children.declareEnumeration) {
					this._declarations.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod, this));
					
				} else if (each.children.interfaceFunction) {
					var f = new ContextFunction(each.children.interfaceFunction[0], typemod, this._name.name, this);
					f.typeModifiers.add(Context.TypeModifier.Abstract);
					f.blockClosed = true;
					this._declarations.push(f);
				}
			}
		}

		this.addChildDocumentSymbols(this._declarations);
	}

	public dispose(): void {
		this._resolveInterface?.dispose();
		this._resolveInterface = undefined;

		super.dispose();
		for (const each of this._implements) {
			each.dispose();
		}
		for (const each of this._declarations) {
			each.dispose();
		}
	}

	
	public get name(): Identifier {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get implements(): TypeName[] {
		return this._implements;
	}

	public get declarations(): Context[] {
		return this._declarations;
	}
	
	public get resolveInterface(): ResolveInterface | undefined {
		return this._resolveInterface;
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
		for (const each of this._declarations) {
			each.collectWorkspaceSymbols(list);
		}
	}

	public get inheritanceResolved(): boolean {
		return this._inheritanceResolved;
	}
	
	public declarationBefore(position: Position): Context | undefined {
		var declaration: Context | undefined;
		for (const each of this._declarations) {
			const stapos = each.range?.end;
			if (stapos && Helpers.isPositionBefore(position, stapos)) {
				break;
			}
			declaration = each;
		}
		return declaration;
	}
	
	public resolveClasses(state: ResolveState): void {
		this._resolveInterface?.dispose();
		this._resolveInterface = undefined;

		this._resolveInterface = new ResolveInterface(this);
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
					state.reportError(this._name.range, `Duplicate interface ${this._name}`);
				} else {
					container.addInterface(this._resolveInterface);
				}
			}
		}
		
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveClasses(state);
			}
		});
	}

	public resolveInheritance(state: ResolveState): void {
		this._inheritanceResolved = true;
		
		for (const each of this._implements) {
			const t = each.resolveType(state, this);
			
			if (t?.resolved?.type === ResolveType.Type.Interface) {
				if (each.resolve) {
					if (each.resolve.resolved === this._resolveInterface) {
						const r = each.range;
						if (r) {
							state.reportError(r, `interface can not implement itself.`);
						}
						
						each.resolve?.dispose();
						each.resolve = undefined;
					}
				}
			} else {
				const r = each.range;
				if (r) {
					const ri: DiagnosticRelatedInformation[] = [];
					each.resolve?.resolved?.addReportInfo(ri, each.resolve?.resolved.reportInfoText);
					state.reportError(r, `${each.name} is not an interface.`, ri);
				}
				
				each.resolve?.dispose();
				each.resolve = undefined;
			}
		}
		
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveInheritance(state);
			}
		});
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveMembers(state);
			}
		});
	}

	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveStatements(state);
			}
			
			this.documentation?.resolveStatements(state);
		});
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._declarations, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this.contextAtRangeList(this._declarations, range)
			?? this;
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
			let content = [];
			
			content.push(`${this._typeModifiers.typestring} **interface** ${this.simpleNameLink}`);
			
			for (const each of this._implements) {
				content.push(`*implements*: ${each.resolve?.resolved?.resolveTextLong.at(0) ?? each.simpleNameLink}`);
			}
			
			this.addHoverParent(content);
			
			if (this.documentation) {
				content.push('___');
				content.push(...this.documentation.resolveTextLong);
			}
			return new HoverInfo(content, this._name.range);

		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.hover(position);
				}
			}
		}

		return null;
	}
	
	protected updateResolveTextShort(): string {
		return `${this._typeModifiers.typestring} interface ${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		let lines = [];
		lines.push(`${this._typeModifiers.typestring} **interface** ${this.simpleNameLink}`);
		this.addHoverParent(lines);
		return lines;
	}
	
	public search(search: ResolveSearch, before?: Context): void {
		this._resolveInterface?.search(search);
	}
	
	public definition(position: Position): Location[] {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.definition(position);
				}
			}
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
			return this._resolveInterface;
		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.resolve?.resolved;
				}
			}
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		var r: Location | undefined;
		for (const each of this._implements) {
			if (each.resolve === usage) {
				r = each.location(this);
			}
		}
		return r ?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (DebugSettings.debugCompletion) {
			debugLogMessage('ContextInterface.completion');
		}
		
		if (this._positionBeginEnd && Helpers.isPositionAfter(position, this._positionBeginEnd)) {
			const declaration = this.declarationBefore(position);
			if (declaration && (Helpers.isPositionInsideRange(declaration.range, position) || !declaration.blockClosed)) {
				return declaration.completion(document, position);
			}
			
			const range = CompletionHelper.wordRange(document, position);
			let items: CompletionItem[] = [];
			
			items.push(...CompletionHelper.createClass(this, range));
			items.push(...CompletionHelper.createInterface(this, range));
			items.push(...CompletionHelper.createEnum(this, range));
			items.push(...CompletionHelper.createFunctionInterface(this, range));
			
			return items;
		}
		
		if (this._tokenImplements && Helpers.isPositionAfter(position, this._tokenImplements.end)) {
			const implement = this._implements.find(c => c.isPositionInside(position));
			const restype = [Resolved.Type.Interface, Resolved.Type.Class, Resolved.Type.Namespace];
			const range = CompletionHelper.wordRange(document, position);
			
			return implement?.completion(document, position, this, restype)
				?? CompletionHelper.createType(range, this, undefined, restype);
		}
		
		let items: CompletionItem[] = [];
		const range = CompletionHelper.wordRange(document, position);
		
		if (!this._tokenImplements) {
			items.push(...CompletionHelper.createImplements(this, range));
		}
		
		// TODO propose class names
		
		return items;
	}
	
	public consumeDocumentation(iterator: ContextDocumentationIterator): void {
		if (!this.range) {
			return;
		}
		
		this.consumeDocumentationDescent(iterator);
		this.consumeDocumentationList(iterator, this._declarations);
		iterator.firstAfter(this.range.end);
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Interface: ${this._typeModifiers} ${this._name} ${this.logRange}`);
		for (const each of this._implements) {
			console.log(`${prefixLines}- Implements ${each.name}`);
		}
		this.logChildren(this._declarations, console, prefixLines);
	}
}
