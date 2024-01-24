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
import { ContextFunction } from '../context/classFunction';
import { Context } from '../context/context';
import { ContextBlock } from '../context/expressionBlock';
import { ResolveClass } from './class';
import { ResolveFunctionGroup } from './functionGroup';
import { ResolveNamespace } from './namespace';
import { Resolved } from './resolved';
import { ResolveSignature } from './signature';
import { ResolveType } from './type';


/**
 * Function in a class or interface.
 */
export class ResolveFunction extends Resolved{
	protected _context?: ContextFunction | ContextBlock;
	protected _returnType?: ResolveType;
	protected _signature: ResolveSignature = new ResolveSignature();
	
	
	constructor (context: ContextFunction | ContextBlock) {
		super(context.simpleName, Resolved.Type.Function);
		this._context = context;
		
		switch (context.type) {
		case Context.ContextType.Function:
			let cxtfunc = context as ContextFunction;
			this._returnType = cxtfunc.returnType?.resolve?.resolved as ResolveType;
			break;
			
		case Context.ContextType.Block:
			this._returnType = ResolveNamespace.classObject;
			break;
			
		default:
			throw Error("Invalid object type");
		}
		
		for (const each of context.arguments) {
			const type = (each.typename.resolve?.resolved as ResolveType) ?? ResolveNamespace.classVoid;
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
	
	
	public get displayName(): string {
		return this.fullyQualifiedName;
	}
	
	
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
	
	public get typeModifiers(): Context.TypeModifierSet | undefined {
		if (this.context) {
			if (this.context.type === Context.ContextType.Function) {
				return (this.context as ContextFunction).typeModifiers;
			} else {
				return Context.defaultTypeModifiers;
			}
		}
		return undefined;
	}
	
	public removeFromParent(): void {
		(this.parent as ResolveType)?.removeFunction(this);
		super.removeFromParent();
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
		
		if (this.context.type === Context.ContextType.Function) {
			const f = this.context as ContextFunction;
			
			if (cls.isSubclass(pc)) {
				return f.typeModifiers.isPublicOrProtected;
			} else {
				return f.typeModifiers.isPublic;
			}
			
		} else if (this.context.type === Context.ContextType.Block) {
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
	
	public get references(): Location[] {
		const r = this._context?.referenceSelf;
		return r ? [r] : [];
	}
	
	public createCompletionItem(range: Range): CompletionItem {
		let commitCharacters: string[] = [];
		var text: string = this._name;
		var title: string;
		
		if (this._context) {
			switch (this._context.type) {
			case Context.ContextType.Function:{
				const ct = this._context as ContextFunction;
				switch (ct.functionType) {
				case ContextFunction.Type.Constructor:
					title = 'constructor';
					text = text + this.createSnippetSignature();
					break;
					
				case ContextFunction.Type.Destructor:
					title = 'destructor';
					text = text + '()';
					break;
					
				case ContextFunction.Type.Operator:
					title = 'operator';
					commitCharacters.push('.');
					break;
					
				default:
					title = 'function';
					text = text + this.createSnippetSignature();
					commitCharacters.push('.');
					break;
				}
				}break;
				
			case Context.ContextType.Block:
				title = 'block';
				text = text + this.createSnippetSignature();
				break;
				
			default:
				title = 'function';
				commitCharacters.push('.');
			}
		} else {
			title = 'function';
			commitCharacters.push('.');
		}
		
		// idea:
		// use '★ ' as prefix for 'label' to mark best matches
		// use 'a:', 'b:' and so forth as prefix for 'sortText'
		// to enfore a sorting. sorting seems to be ignored once
		// filtering is used but at last it helps a bit
		// note ' ' filters first
		return {label: this._name,
			sortText: this._name,
			filterText: this._name,
			detail: `${title}: ${this.context?.resolveTextShort}`,
			kind: CompletionItemKind.Function,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, text),
			commitCharacters: commitCharacters};
	}
	
	public createSnippetSignature(): string {
		var snippet: string[] = ['('];
		var tabIndex: number = 1;
		
		for (const each of this._signature.arguments) {
			if (tabIndex > 1) {
				snippet.push(', ');
			}
			snippet.push(`\${${tabIndex}:${each.name}}`);
			tabIndex++;
		}
		snippet.push(')');
		return snippet.join('');
	}
	
	public static filterTypemodOverride: Set<Context.TypeModifier> = new Set<Context.TypeModifier>([
		Context.TypeModifier.Protected, Context.TypeModifier.Private
	]);
	
	public createCompletionOverride(range: Range, sortPrefix: string): CompletionItem | undefined {
		if (!this._context || this._context.type != Context.ContextType.Function ) {
			return undefined;
		}
		
		const parent = this.context?.resolveFunction?.parent as ResolveType;
		if (!parent) {
			return undefined;
		}
		
		const implement = parent.type == Resolved.Type.Interface || this.typeModifiers?.has(Context.TypeModifier.Abstract);
		const hasReturn = this._returnType != ResolveNamespace.classVoid;
		
		var parts: string[] = [];
		var argIndex: number = 0;
		var title: string;
		
		const ct = this._context as ContextFunction;
		switch (ct.functionType) {
		case ContextFunction.Type.Operator:
			title = 'operator';
			break;
			
		default:
			title = 'function';
			break;
		}
		
		parts.push('/**\n');
		if (implement) {
			parts.push(` * Implement ${parent.fullyQualifiedName}.${this.name}().\n`);
		} else {
			parts.push(` * Override ${parent.fullyQualifiedName}.${this.name}().\n`);
		}
		parts.push(' */\n');
		
		const tms = this.typeModifiers?.filter(ResolveFunction.filterTypemodOverride).typestring;
		if (tms) {
			parts.push(`${tms} `);
		}
		
		parts.push(`func ${this._returnType?.name ?? 'void'} ${this.name}(`);
		for (const each of this._signature.arguments) {
			if (argIndex > 0) {
				parts.push(', ');
			}
			parts.push(`${each.type?.name} ${each.name}`);
			argIndex++;
		}
		parts.push(')\n');
		
		parts.push('\t');
		if (hasReturn) {
			parts.push('return ');
		}
		
		if (!hasReturn && !implement) {
			parts.push(`super.${this._name}(`);
			argIndex = 0;
			for (const each of this._signature.arguments) {
				if (argIndex > 0) {
					parts.push(', ');
				}
				parts.push(`${each.name}`);
				argIndex++;
			}
			parts.push(')\n');
			parts.push('\t\${0}\n');
		} else if (hasReturn) {
			let defval = this._returnType?.completeValue ?? 'null';
			defval.replace(':', '\:');
			parts.push(`\${0:${defval}}\n`);
		} else {
			parts.push('\${0}\n');
		}
		
		parts.push('end\n');
		
		return {label: `${implement ? 'implement' : 'override'} ${this._name}`,
			sortText: `${sortPrefix}${this._name}`,
			filterText: this._name,
			detail: `${title}: ${this.context?.resolveTextShort}`,
			kind: CompletionItemKind.Function,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, parts.join(''))};
	}
}
