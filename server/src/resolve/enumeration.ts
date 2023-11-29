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

import { DiagnosticRelatedInformation } from 'vscode-languageserver';
import { ContextEnumeration } from '../context/scriptEnum';
import { ResolveNamespace } from './namespace';
import { ResolveSearch } from './search';
import { ResolveType } from './type';


export class ResolveEnumeration extends ResolveType {
	protected _context?: ContextEnumeration;


	constructor (context: ContextEnumeration) {
		super(context.name.name, ResolveType.Type.Enumeration);
		this._context = context;
	}

	public dispose(): void {
		super.dispose();
		this._context = undefined;
	}


	public get context(): ContextEnumeration | undefined {
		return this._context;
	}

	public set context(context: ContextEnumeration | undefined) {
		this._context = context;
		this.invalidate();
	}


	public removeFromParent(): void {
		this.parent?.removeEnumeration(this);
		this.parent = undefined;
	}
	
	public createReportInfo(message: string): DiagnosticRelatedInformation | undefined {
		return this._context?.createReportInfo(message);
	}
	
	
	
	public search(search: ResolveSearch): void {
		super.search(search);
		
		if (this.context) {
			if (search.searchSuperClasses) {
				ResolveNamespace.classEnumeration.search(search);
			}
		}
	}
	
	public castable(type: ResolveType): boolean {
		if (type === this) {
			return true;
		}
		if (!this.context) {
			return false;
		}
		
		if (ResolveNamespace.classEnumeration.castable(type)) {
			return true;
		}
		
		if (type.type == ResolveType.Type.Class && type.fullyQualifiedName == 'Object') {
			return true;
		}
		
		return false;
	}
	
	protected onInvalidate(): void {
		super.onInvalidate();
	}

	protected onValidate(): void {
		super.onValidate();
		
		if (this._context) {
			for (const each of this._context.entries) {
				
			}
		}
	}
}
