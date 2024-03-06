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

import { CompletionItem, CompletionItemKind, DiagnosticRelatedInformation, InsertTextFormat, Location, Range, TextEdit } from 'vscode-languageserver';
import { ContextClassVariable } from '../context/classVariable';
import { Context } from '../context/context';
import { ContextDocumentation } from '../context/documentation';
import { ContextEnumEntry, ContextEnumeration } from '../context/scriptEnum';
import { ResolveClass } from './class';
import { Resolved } from './resolved';
import { ResolveType } from './type';


/** Variable in a class or enumeration. */
export class ResolveVariable extends Resolved{
	protected _context?: ContextClassVariable | ContextEnumEntry;
	protected _variableType?: ResolveType;
	
	
	constructor (context: ContextClassVariable | ContextEnumEntry) {
		super(context.name.name, Resolved.Type.Variable);
		this._context = context;
		
		if (context.type === Context.ContextType.ClassVariable) {
			this._variableType = (context as ContextClassVariable).typename?.resolve?.resolved as ResolveType;
		} else {
			this._variableType = (context.parent as ContextEnumeration).resolveEnumeration;
		}
	}
	
	public dispose(): void {
		this._context = undefined;
		super.dispose();
		this._variableType = undefined;
	}
	
	
	public get displayName(): string {
		return this.fullyQualifiedName;
	}
	
	protected updateResolveTextShort(): string {
		return `${this._variableType?.name} ${this.parent?.name}.${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		const typemods = this.typeModifiers?.typestring ?? "public";
		const typename = this._variableType?.name;
		const fqn = this.parent?.fullyQualifiedName;
		return [`${typemods} **variable** *${typename}* *${fqn}*.**${this._name}**`];
	}
	
	public get typeModifiers(): Context.TypeModifierSet | undefined {
		if (this.context) {
			if (this.context.type == Context.ContextType.ClassVariable) {
				return (this.context as ContextClassVariable).typeModifiers;
			} else if (this.context.type === Context.ContextType.EnumerationEntry) {
				return ContextEnumEntry.typeModifiers;
			} else {
				return Context.defaultTypeModifiers;
			}
		}
		return undefined;
	}
	
	protected updateReportInfoText(): string {
		return this._context?.reportInfoText ?? this._name;
	}
	
	
	public get context(): ContextClassVariable | ContextEnumEntry | undefined {
		return this._context;
	}
	
	public get variableType(): ResolveType | undefined {
		return this._variableType;
	}
	
	public removeFromParent(): void {
		(this.parent as ResolveType)?.removeVariable(this);
		super.removeFromParent();
	}
	
	public get references(): Location[] {
		const r = this._context?.referenceSelf;
		return r ? [r] : [];
	}
	
	/** Determine if class 'cls' can access variable. */
	public canAccess(cls: ResolveClass) {
		const pc = this.parent as ResolveClass;
		if (!pc || !this.context) {
			return false;
		}
		if (cls === pc) {
			return true;
		}
		
		if (this.context.type === Context.ContextType.ClassVariable) {
			const v = this.context as ContextClassVariable;
			
			if (cls.isSubclass(pc)) {
				return v.typeModifiers.isPublicOrProtected;
			} else {
				return v.typeModifiers.isPublic;
			}
			
		} else if (this.context.type === Context.ContextType.EnumerationEntry) {
			return true;
			
		} else {
			return true;
		}
	}
	
	public get documentation(): ContextDocumentation | undefined {
		return this._context?.documentation;
	}
	
	public addReportInfo(relatedInformation: DiagnosticRelatedInformation[], message: string) {
		var info = this._context?.createReportInfo(message);
		if (info) {
			relatedInformation.push(info);
		}
	}
	
	public get resolveLocation(): Location[] {
		const l = this._context?.resolveLocationSelf;
		return l ? [l] : [];
	}
	
	public createCompletionItem(range: Range): CompletionItem {
		var kind: CompletionItemKind = CompletionItemKind.Field;
		var title: string = 'variable';
		var text: string = this._name;
		
		const typemods = this.typeModifiers;
		if (typemods) {
			if (typemods.isStatic && typemods.isFixed) {
				title = 'constant';
				
				if (this.parent?.type === ResolveType.Type.Enumeration) {
					kind = CompletionItemKind.EnumMember;
				}
			}
		}
		
		return {label: this._name,
			sortText: this._name,
			filterText: this._name,
			detail: `${title}: ${this.resolveTextShort}`,
			documentation: this.context?.documentation?.markup,
			kind: kind,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, text),
			commitCharacters: ['.']};
	}
}
