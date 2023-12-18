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
import { ContextFunction } from '../context/classFunction';
import { Context } from '../context/context';
import { ContextBlock } from '../context/expressionBlock';
import { ResolveClass } from './class';
import { ResolveFunctionGroup } from './functionGroup';
import { ResolveNamespace } from './namespace';
import { ResolveSignature } from './signature';
import { ResolveType } from './type';


/**
 * Function in a class or interface.
 */
export class ResolveFunction{
	protected _name: string;
	protected _context?: ContextFunction | ContextBlock;
	protected _fullyQualifiedName?: string
	protected _returnType?: ResolveType;
	protected _signature: ResolveSignature = new ResolveSignature();
	protected _reportInfoText?: string;


	constructor (context: ContextFunction | ContextBlock) {
		this._context = context;
		
		switch (context.type) {
		case Context.ContextType.Function:
			let cxtfunc = context as ContextFunction;
			this._name = cxtfunc.name.name;
			this._returnType = cxtfunc.returnType?.resolve;
			break;
			
		case Context.ContextType.Block:
			this._name = "run";
			this._returnType = ResolveNamespace.classObject;
			break;
			
		default:
			throw Error("Invalid object type");
		}
		
		for (const each of context.arguments) {
			var type = each.typename.resolve;
			if (!type) {
				type = ResolveNamespace.root.class('void');
			}
			this._signature.addArgument(type, each.name.name);
		}
	}

	public dispose(): void {
		this._context = undefined;
		this.removeFromParent();
		this._returnType = undefined;
		this._signature.dispose();
		this.functionGroup = undefined;
	}


	public functionGroup?: ResolveFunctionGroup


	public get name(): string {
		return this._name;
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


	public parent?: ResolveType;


	public get context(): ContextFunction | ContextBlock | undefined {
		return this._context;
	}

	public get returnType(): ResolveType | undefined {
		return this._returnType;
	}
	
	public replaceReturnType(type: ResolveType): void {
		this._returnType = type;
	}

	public get signature(): ResolveSignature {
		return this._signature;
	}

	public removeFromParent(): void {
		this.parent?.removeFunction(this);
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
		
		if (this.context.type == Context.ContextType.Function) {
			const f = this.context as ContextFunction;
			
			if (cls.isSubclass(pc)) {
				return f.typeModifiers.isPublicOrProtected;
			} else {
				return f.typeModifiers.isPublic;
			}
			
		} else if (this.context.type == Context.ContextType.Block) {
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

	public get reportInfoText(): string {
		if (!this._reportInfoText) {
			this._reportInfoText = this.updateReportInfoText();
		}
		return this._reportInfoText ?? "?";
	}
	
	protected updateReportInfoText(): string {
		return this._context?.reportInfoText ?? this._name;
	}
}
