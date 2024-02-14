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
import { ContextFunctionArgument } from '../context/classFunctionArgument';
import { ContextDocumentation } from '../context/documentation';
import { ContextTryCatch } from '../context/statementTry';
import { ContextVariable } from '../context/statementVariable';
import { Resolved } from './resolved';
import { ResolveType } from './type';


/** Local variable in a function. */
export class ResolveLocalVariable extends Resolved{
	protected _context?: ContextVariable;
	protected _variableType?: ResolveType;
	
	
	constructor (context: ContextVariable) {
		super(context.simpleName, Resolved.Type.LocalVariable);
		this._context = context;
		this._variableType = context.typename?.resolve?.resolved as ResolveType;
	}
	
	public dispose(): void {
		this._context = undefined;
		super.dispose();
		this._variableType = undefined;
	}
	
	
	public get displayName(): string {
		return this._name;
	}
	
	protected updateResolveTextShort(): string {
		return `${this._variableType?.name} ${this._name}`;
	}
	
	protected updateResolveTextLong(): string[] {
		const typename = this._variableType?.name;
		return [`**local variable** *${typename}* **${this._name}**`];
	}
	
	protected updateReportInfoText(): string {
		return this._context?.reportInfoText ?? this._name;
	}
	
	
	public get context(): ContextVariable | undefined {
		return this._context;
	}
	
	public get variableType(): ResolveType | undefined {
		return this._variableType;
	}
	
	public get references(): Location[] {
		const r = this._context?.referenceSelf;
		return r ? [r] : [];
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
	
	public createCompletionItem(range: Range): CompletionItem {
		var kind: CompletionItemKind = CompletionItemKind.Variable;
		var title: string = 'local variable';
		var text: string = this._name;
		
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
