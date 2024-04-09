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
import { DeclareClassCstNode } from "../nodeclasses/declareClass";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { CompletionItem, Definition, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolInformation, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename"
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextFunction } from "./classFunction";
import { ContextClassVariable } from "./classVariable";
import { Identifier } from "./identifier";
import { HoverInfo } from "../hoverinfo";
import { ResolveClass } from "../resolve/class";
import { ContextNamespace } from "./namespace";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveState } from "../resolve/state";
import { ResolveType } from "../resolve/type";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { ContextDocumentationIterator } from "./documentation";


export class ContextClass extends Context{
	protected _name?: Identifier;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _extends?: TypeName;
	protected _implements: TypeName[] = [];
	protected _declarations: Context[] = [];
	protected _resolveClass?: ResolveClass;
	protected _inheritanceResolved: boolean = false;
	protected _tokenExtends?: Range;
	protected _tokenImplements?: Range;
	protected _positionBeginEnd?: Position;


	constructor(node: DeclareClassCstNode, typemodNode: TypeModifiersCstNode | undefined, parent: Context) {
		super(Context.ContextType.Class, parent);

		let cdecl = node.children;
		let cdeclBegin = cdecl.classBegin[0].children;
		
		if (cdeclBegin.name?.at(0)?.image) {
			this._name = new Identifier(cdeclBegin.name[0]);
		}
		
		this._typeModifiers = new Context.TypeModifierSet(typemodNode,
			Context.AccessLevel.Public, [Context.TypeModifier.Public]);
		
		let tokEnd = cdecl.classEnd[0].children.end?.at(0);
		this.blockClosed = tokEnd !== undefined;
		let tokClass = cdeclBegin.class[0];
		this.range = Helpers.rangeFrom(tokClass, tokEnd, true, false);
		if (this._name?.token) {
			this.documentSymbol = DocumentSymbol.create(this._name.name, undefined,
				SymbolKind.Class, this.range, Helpers.rangeFrom(this._name.token, tokEnd, true, true));
		}
		
		const cdeclBeginExt = cdeclBegin.classBeginExtends?.at(0)?.children;
		const tokExtends = cdeclBeginExt?.extends?.at(0);
		if (tokExtends) {
			this._tokenExtends = Helpers.rangeFrom(tokExtends);
		}
		if (cdeclBeginExt?.baseClassName) {
			this._extends = new TypeName(cdeclBeginExt.baseClassName[0]);
		} else if (this.fullyQualifiedName != 'Object') {
			this._extends = TypeName.typeObject;
		}
		
		const cdeclBeginImpl = cdeclBegin.classBeginImplements?.at(0)?.children;
		const tokImplements = cdeclBeginImpl?.implements?.at(0);
		if (tokImplements) {
			this._tokenImplements = Helpers.rangeFrom(tokImplements);
		}
		if (cdeclBeginImpl?.interfaceName) {
			for (const each of cdeclBeginImpl.interfaceName) {
				this._implements.push(new TypeName(each));
			}
		}
		
		this._positionBeginEnd = Helpers.endOfCommandBegin(cdeclBegin.endOfCommand);
		
		const decls = cdecl.classBody[0].children.classBodyDeclaration;
		if (decls) {
			for (const each of decls) {
				let typemod = each.children.typeModifiers ? each.children.typeModifiers[0] : undefined;

				if (each.children.declareClass) {
					this._declarations.push(new ContextClass(each.children.declareClass[0], typemod, this));

				} else if (each.children.declareInterface) {
					this._declarations.push(new ContextInterface(each.children.declareInterface[0], typemod, this));

				} else if (each.children.declareEnumeration) {
					this._declarations.push(new ContextEnumeration(each.children.declareEnumeration[0], typemod, this));

				} else if (each.children.classFunction) {
					this._declarations.push(new ContextFunction(each.children.classFunction[0], typemod, this._name?.name, this));

				} else if (each.children.classVariables) {
					const vdecls = each.children.classVariables[0].children;
					const typeNode = vdecls.type[0];
					
					if (vdecls.classVariable) {
						const count = vdecls.classVariable.length;
						const commaCount = vdecls.comma?.length || 0;
						const tokEnd = Helpers.endOfCommandToken(vdecls.endOfCommand);
						var firstVar: ContextClassVariable | undefined = undefined;
						
						for (let i = 0; i < count; i++) {
							const v: ContextClassVariable = new ContextClassVariable(vdecls.classVariable[i], typemod, typeNode,
								firstVar, i < commaCount ? vdecls.comma![i] : tokEnd, this);
							this._declarations.push(v);
							
							if (i == 0) {
								firstVar = v;
							}
						}
						
					} else {
						this._declarations.push(new ContextClassVariable(undefined, typemod, typeNode, undefined, tokEnd, this));
					}
				}
			}
		}

		this.addChildDocumentSymbols(this._declarations);
	}

	public dispose(): void {
		for (const each of this._declarations) {
			each.dispose();
		}
		
		this._extends?.dispose();
		this._extends = undefined;
		
		for (const each of this._implements) {
			each.dispose();
		}
		this._implements.splice(0);
		
		super.dispose()
		
		this._resolveClass?.dispose();
		this._resolveClass = undefined;
	}


	public get name(): Identifier | undefined {
		return this._name;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}
	
	public get extends(): TypeName | undefined {
		return this._extends;
	}
	
	public get implements(): TypeName[] {
		return this._implements;
	}

	public get declarations(): Context[] {
		return this._declarations;
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
	
	public get resolveClass(): ResolveClass | undefined {
		return this._resolveClass;
	}

	public get inheritanceResolved(): boolean {
		return this._inheritanceResolved;
	}
	
	public collectWorkspaceSymbols(list: SymbolInformation[]): void {
		super.collectWorkspaceSymbols(list);
		for (const each of this._declarations) {
			each.collectWorkspaceSymbols(list);
		}
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

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this.simpleName}` : this.simpleName;
	}

	public get simpleName(): string {
		return this._name?.name ?? "??";
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveClass?.dispose();
		this._resolveClass = undefined;
		
		this._resolveClass = new ResolveClass(this);
		
		switch (this._name?.name) {
			case "byte":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Byte;
				this._resolveClass.autoCast = Context.AutoCast.ValueByte;
				break;
				
			case "bool":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Bool;
				break;
				
			case "int":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Int;
				this._resolveClass.autoCast = Context.AutoCast.ValueInt;
				break;
				
			case "float":
				this._resolveClass.primitiveType = ResolveClass.PrimitiveType.Float;
				break;
				
			default:
				break; // default is object primitive type
		}

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

			if (container && this._name) {
				if (container.findType(this._name.name)) {
					state.reportError(this._name.range, `Duplicate type name ${this._name}`);
				} else {
					container.addClass(this._resolveClass);
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
		
		if (this._extends) {
			const t = this._extends.resolveType(state, this);
			if (t?.resolved?.type === ResolveType.Type.Class) {
				if (this._extends?.resolve) {
					this._extends.resolve.inherited = true;
				}
			} else {
				const r = this._extends.range;
				if (r) {
					state.reportError(r, `${this._extends.name} is not a class.`);
				}
			}
		}
		
		for (const each of this._implements) {
			const t = each.resolveType(state, this);
			if (t?.resolved?.type === ResolveType.Type.Interface) {
				if (each.resolve) {
					each.resolve.inherited = true;
				}
			} else {
				const r = each.range;
				if (r) {
					state.reportError(r, `${each.name} is not an interface.`);
				}
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
		
		// TODO check for unimplemented interface methods and abstract base class methods
	}

	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._declarations) {
				each.resolveStatements(state);
			}
		});
		
		this.documentation?.resolveStatements(state);
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name?.isPositionInside(position)) {
			let content = [];
			
			content.push(`${this._typeModifiers.typestring} **class** ${this.simpleNameLink}`);
			
			if (this._extends && this._extends.resolve?.resolved !== ResolveNamespace.classObject) {
				content.push(`*extends*: ${this._extends.resolve?.resolved?.resolveTextLong.at(0) ?? this._extends.simpleNameLink}`);
			}
			
			for (const each of this._implements) {
				content.push(`*implements*: ${each.resolve?.resolved?.resolveTextLong.at(0) ?? each.simpleNameLink}`);
			}
			
			this.addHoverParent(content);
			
			if (this.documentation) {
				content.push('___');
				content.push(...this.documentation.resolveTextLong);
			}
			return new HoverInfo(content, this._name.range);

		} else if (this._extends?.isPositionInside(position)) {
			return this._extends.hover(position);

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
		return `${this._typeModifiers.typestring} class ${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		let lines = [];
		lines.push(`${this._typeModifiers.typestring} **class** ${this.simpleNameLink}`);
		this.addHoverParent(lines);
		return lines;
	}
	
	public search(search: ResolveSearch, before?: Context): void {
		this._resolveClass?.search(search);
	}
	
	public definition(position: Position): Location[] {
		if (this._name?.isPositionInside(position)) {
			return this.definitionSelf();
		} else if (this._extends?.isPositionInside(position)) {
			return this._extends.definition(position);
		} else {
			for (const each of this._implements) {
				if (each.isPositionInside(position)) {
					return each.definition(position);
				}
			}
		}
		return super.definition(position);
	}
	
	
	public static thisContext(context: Context): ContextClass | undefined {
		const parent = context.selfOrParentWithType(Context.ContextType.Class) as ContextClass;
		return parent?.type === Context.ContextType.Class ? parent : undefined;
	}
	
	public static superContext(context: Context): ContextClass | undefined {
		const parent = ContextClass.thisContext(context)?.extends?.resolve?.resolved as ResolveClass;
		return parent?.type === ResolveType.Type.Class ? parent.context : undefined;
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name?.isPositionInside(position)) {
			return this._resolveClass;
		} else if (this._extends?.isPositionInside(position)) {
			return this._extends.resolve?.resolved;
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
		if (this._extends?.resolve === usage) {
			r = this._extends.location(this);
		} else {
			for (const each of this._implements) {
				if (each.resolve === usage) {
					r = each.location(this);
				}
			}
		}
		return r ?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name?.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._positionBeginEnd && Helpers.isPositionAfter(position, this._positionBeginEnd)) {
			const declaration = this.declarationBefore(position);
			if (declaration && (Helpers.isPositionInsideRange(declaration.range, position) || !declaration.blockClosed)) {
				return declaration.completion(document, position);
			}
			
			const range = Range.create(position, position);
			let items: CompletionItem[] = [];
			
			items.push(...CompletionHelper.createClass(this, range));
			items.push(...CompletionHelper.createInterface(this, range));
			items.push(...CompletionHelper.createEnum(this, range));
			items.push(...CompletionHelper.createClassVariable(this, range));
			items.push(...CompletionHelper.createFunction(this, range));
			items.push(...CompletionHelper.createFunctionOverrides(this, range));
			
			return items;
		}
		
		if (this._tokenImplements && Helpers.isPositionAfter(position, this._tokenImplements.end)) {
			const implement = this._implements.find(c => c.isPositionInside(position));
			const restype = [Resolved.Type.Interface, Resolved.Type.Namespace];
			const range = Range.create(position, position);
			
			return implement?.completion(document, position, this, restype)
				?? CompletionHelper.createType(range, this, undefined, restype);
		}
		
		if (this._tokenExtends && Helpers.isPositionAfter(position, this._tokenExtends.end)) {
			const restype = [Resolved.Type.Class, Resolved.Type.Namespace];
			const range = Range.create(position, position);
			
			if (!this._tokenImplements && this._extends?.range
			&& Helpers.isPositionAfter(position, this._extends.range?.end)) {
				return CompletionHelper.createImplements(this, range);
			}
			
			return this._extends?.completion(document, position, this, restype)
				?? CompletionHelper.createType(range, this, undefined, restype);
		}
		
		let items: CompletionItem[] = [];
		const range = Range.create(position, position);
		
		if (!this._tokenExtends) {
			items.push(...CompletionHelper.createExtends(this, range));
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
		console.log(`${prefix}Class: ${this._typeModifiers} ${this._name} ${this.logRange}`);
		if (this._extends) {
			console.log(`${prefixLines}- Extend ${this._extends.name} ${Helpers.logRange(this._extends.range)}`);
		}
		for (const each of this._implements) {
			console.log(`${prefixLines}- Implements ${each.name} ${Helpers.logRange(each.range)}`);
		}
		this.logChildren(this._declarations, console, prefixLines);
	}
}
