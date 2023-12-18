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

import { DiagnosticRelatedInformation } from 'vscode-languageserver';
import { ContextClassVariable } from '../context/classVariable';
import { Context } from '../context/context';
import { ContextEnumEntry, ContextEnumeration } from '../context/scriptEnum';
import { MatchableName } from '../matchableName';
import { ResolveClass } from './class';
import { ResolveType } from './type';


/**
 * Variable in a class or enumeration.
 */
export class ResolveVariable{
	protected _name: string;
	protected _matchableName?: MatchableName;
	protected _context?: ContextClassVariable | ContextEnumEntry;
	protected _fullyQualifiedName?: string
	protected _variableType?: ResolveType;
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];
	protected _reportInfoText?: string;


	constructor (context: ContextClassVariable | ContextEnumEntry) {
		this._name = context.name.name;
		this._context = context;

		if (context.type == Context.ContextType.ClassVariable) {
			this._variableType = (context as ContextClassVariable).typename?.resolve;
		} else {
			this._variableType = (context.parent as ContextEnumeration).resolveEnumeration;
		}
	}

	public dispose(): void {
		this._context = undefined;
		this.removeFromParent();
		this._variableType = undefined;
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
		return this.fullyQualifiedName;
	}

	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		return `${this._variableType?.name} ${this.parent?.name}.${this._name}`;
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
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
			} else if (this.context.type == Context.ContextType.EnumerationEntry) {
				return ContextEnumEntry.typeModifiers;
			} else {
				return Context.defaultTypeModifiers;
			}
		}
		return undefined;
	}

	public get reportInfoText(): string {
		if (!this._reportInfoText) {
			this._reportInfoText = this.updateReportInfoText();
		}
		return this._reportInfoText ?? "?";
	}

	protected updateReportInfoText(): string {
		return this._context?.reportInfoText ?? this._name;
	}


	public parent?: ResolveType;


	public get context(): ContextClassVariable | ContextEnumEntry | undefined {
		return this._context;
	}

	public get variableType(): ResolveType | undefined {
		return this._variableType;
	}

	public removeFromParent(): void {
		this.parent?.removeVariable(this);
		this.parent = undefined;
	}

	/** Determine if class 'cls' can access variable. */
	public canAccess(cls: ResolveClass) {
		const pc = this.parent as ResolveClass;
		if (!pc || !this.context) {
			return false;
		}
		if (cls == pc) {
			return true;
		}

		if (this.context.type == Context.ContextType.ClassVariable) {
			const v = this.context as ContextClassVariable;
			
			if (cls.isSubclass(pc)) {
				return v.typeModifiers.isPublicOrProtected;
			} else {
				return v.typeModifiers.isPublic;
			}
			
		} else if (this.context.type == Context.ContextType.EnumerationEntry) {
			return true;
			
		} else {
			return true;
		}
	}
	
	public addReportInfo(relatedInformation: DiagnosticRelatedInformation[], message: string) {
		var info = this._context?.createReportInfo(message);
		if (info) {
			relatedInformation.push(info);
		}
	}
}
