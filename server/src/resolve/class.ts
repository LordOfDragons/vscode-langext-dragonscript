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

import { CompletionItemKind, DiagnosticRelatedInformation, Location, MarkupContent } from 'vscode-languageserver';
import { ContextDocumentation } from '../context/documentation';
import { ContextClass } from '../context/scriptClass';
import { ResolveSearch } from './search';
import { ResolveType } from './type'


export class ResolveClass extends ResolveType {
	protected _context?: ContextClass;
	
	
	constructor (context?: ContextClass, name?: string) {
		super(context?.name?.name || name || "??", ResolveType.Type.Class);
		this._context = context;
		this._resolveTextType = 'class';
	}
	
	public dispose(): void {
		super.dispose();
		this._context = undefined;
	}
	
	
	public primitiveType: ResolveClass.PrimitiveType = ResolveClass.PrimitiveType.Object;
	
	public get context(): ContextClass | undefined {
		return this._context;
	}
	
	public set context(context: ContextClass | undefined) {
		this._context = context;
	}
	
	public removeFromParent(): void {
		(this.parent as ResolveType)?.removeClass(this);
		super.removeFromParent();
	}
	
	public createReportInfo(message: string): DiagnosticRelatedInformation | undefined {
		return this._context?.createReportInfo(message);
	}
	
	public search(search: ResolveSearch): void {
		super.search(search);
		if (search.stopSearching) {
			return;
		}
		
		if (this.context) {
			const ignoreConstructors = search.ignoreConstructors;
			search.ignoreConstructors = true;
			
			try {
				if (search.searchSuperClasses) {
					(this.context.extends?.resolve?.resolved as ResolveType)?.search(search);
					if (search.stopSearching) {
						return;
					}
				}
				
				for (const each of this.context.implements) {
					(each.resolve?.resolved as ResolveType)?.search(search);
					if (search.stopSearching) {
						return;
					}
				}
				
			} finally {
				search.ignoreConstructors = ignoreConstructors;
			}
		}
	}
	
	public isSuperclass(cls: ResolveClass): boolean {
		return cls.isSubclass(this);
	}
	
	public isSubclass(cls: ResolveClass): boolean {
		const pc = this._context?.extends?.resolve?.resolved as ResolveClass;
		return pc && (pc === cls || pc.isSubclass(cls));
	}
	
	public castable(type: ResolveType): boolean {
		if (type === this) {
			return true;
		}
		if (!this.context) {
			return false;
		}
		
		if (type.type === ResolveType.Type.Interface) {
			for (const each of this.context.implements) {
				if ((each.resolve?.resolved as ResolveType)?.castable(type)) {
					return true;
				}
			}
		}
		
		const r = this.context.extends?.resolve?.resolved as ResolveType;
		if (r && r.castable(type)) {
			return true;
		}
		
		return (this.parent as ResolveType)?.castable(type) ?? false;
	}
	
	public get resolveLocation(): Location[] {
		const l = this._context?.resolveLocationSelf;
		return l ? [l] : [];
	}
	
	public get references(): Location[] {
		const r = this._context?.referenceSelf;
		return r ? [r] : [];
	}
	
	protected get completionItemTitle(): string {
		return 'class';
	}
	
	protected get completionItemKind(): CompletionItemKind {
		return CompletionItemKind.Class;
	}
	
	protected get completionItemMarkup(): MarkupContent | undefined {
		return this.context?.documentation?.markup;
	}
	
	public get documentation(): ContextDocumentation | undefined {
		return this._context?.documentation;
	}
	
	protected updateResolveTextLong(): string[] {
		return this._context?.resolveTextLong ?? super.updateResolveTextLong();
	}
}

export namespace ResolveClass {
	export enum PrimitiveType {
		Byte,
		Bool,
		Int,
		Float,
		Object
	}
}
