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

import { CompletionItem, CompletionItemKind, InsertTextFormat, Position, Range, TextEdit } from "vscode-languageserver"
import { ContextFunctionArgument } from "./context/classFunctionArgument";
import { Context } from "./context/context";
import { ContextClass } from "./context/scriptClass";
import { ContextIf } from "./context/statementIf";
import { ContextSelect } from "./context/statementSelect";
import { ContextTryCatch } from "./context/statementTry";
import { ContextVariable } from "./context/statementVariable";
import { RefactoringHelper } from "./refactoringHelper";
import { ResolveNamespace } from "./resolve/namespace";
import { Resolved } from "./resolve/resolved";
import { ResolveSearch } from "./resolve/search";
import { ResolveType } from "./resolve/type";
import { debugLogMessage } from "./server";


export class CompletionHelper {
	static sortPrefixSnippet = `${String.fromCodePoint(255)}:`;
	static sortPrefixPrefer = ` :`;
	
	/** Create completion item for 'this' and 'super' keyword. */
	public static createThisSuper(context: Context, range: Range, castable?: ResolveType[]): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		const parent = ContextClass.thisContext(context);
		const tp = parent?.resolveClass;
		if (tp && (!castable || castable.find(t => tp.castable(t)))) {
			items.push(parent.resolveClass.createCompletionItemThis(range));
			
			const parent2 = ContextClass.superContext(context);
			const tp2 = parent2?.resolveClass;
			if (tp2 && (!castable || castable.find(t => tp2.castable(t)))) {
				items.push(parent2?.resolveClass.createCompletionItemSuper(range));
			}
		}
		
		return items;
	}
	
	/** Create completion items for 'true' and 'false' keyword. */
	public static createBooleans(range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		for (const each of ['true', 'false']) {
			items.push({label: each,
				sortText: `${CompletionHelper.sortPrefixSnippet}${each}`,
				kind: CompletionItemKind.Keyword,
				insertTextFormat: InsertTextFormat.PlainText,
				textEdit: TextEdit.replace(range, each),
				commitCharacters: ['.']});
		};
		return items;
	}
	
	/** Create completion item for 'null' keyword. */
	public static createNull(range: Range): CompletionItem {
		return {label: 'null',
			sortText: `${CompletionHelper.sortPrefixSnippet}null`,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'null')};
	}
	
	/** Create completion item for 'cast' keyword. */
	public static createCast(range: Range): CompletionItem {
		return {label: 'cast',
			sortText: `${CompletionHelper.sortPrefixSnippet}cast`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'cast ${1:type}')};
	}
	
	/** Create completion item for 'castable' keyword. */
	public static createCastable(range: Range): CompletionItem {
		return {label: 'castable',
			sortText: `${CompletionHelper.sortPrefixSnippet}castable`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'castable ${1:type}')};
	}
	
	/** Create completion item for 'typeof' keyword. */
	public static createTypeof(range: Range): CompletionItem {
		return {label: 'typeof',
			sortText: `${CompletionHelper.sortPrefixSnippet}typeof`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'typeof ${1:type}')};
	}
	
	/** Create completion items for 'block' keyword. */
	public static createBlock(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '🅱 block',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: '🅱 block: 1 argument',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: '🅱 block: 2 arguments',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument1}, \${3:Object} \${4: argument2}\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion item for inline if-else keyword. */
	public static createInlineIfElse(range: Range): CompletionItem {
		return {label: 'inline if-else',
			sortText: `${CompletionHelper.sortPrefixSnippet}if`,
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'if ${1:trueValue} else ${2:falseValue}')};
	}
	
	/** Create completion items for 'if' keyword. */
	public static createIf(range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'if',
			sortText: `${CompletionHelper.sortPrefixSnippet}if`,
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'if \${1:condition}\n' + 
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'if else',
			sortText: `${CompletionHelper.sortPrefixSnippet}if`,
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'if \${1:condition}\n' +
				'\t\${0}\n' +
				'else\n' +
				'\t\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion item for 'elif' keyword. */
	public static createElif(range: Range): CompletionItem {
		range = Range.create(Position.create(range.start.line, Math.max(range.start.character - 1, 0)), range.end);
		
		return {label: 'elif',
			sortText: `${CompletionHelper.sortPrefixSnippet}elif`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'elif \${1:condition}\n' + 
				'\t\${0}')};
	}
	
	/** Create completion item for 'case' keyword. */
	public static createSelectCase(range: Range): CompletionItem {
		range = Range.create(Position.create(range.start.line, Math.max(range.start.character - 1, 0)), range.end);
		
		return {label: 'case',
			sortText: `${CompletionHelper.sortPrefixSnippet}case`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'case \${1:constant}\n' + 
				'\t\${0}')};
	}
	
	/** Create completion item for 'else' keyword. */
	public static createSelectElse(range: Range): CompletionItem {
		range = Range.create(Position.create(range.start.line, Math.max(range.start.character - 1, 0)), range.end);
		
		return {label: 'else',
			sortText: `${CompletionHelper.sortPrefixSnippet}else`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'else\n' + 
				'\t\${0}')};
	}
	
	/** Create completion items for 'for' keyword. */
	public static createFor(range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'for',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} to ${3:toIndex}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for step',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} to ${3:toIndex} step ${4:stepSize}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for downto',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} downto ${3:toIndex}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for downto step',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} downto ${3:toIndex} step ${5:stepSize}\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion item for 'select' keyword. */
	public static createSelect(range: Range): CompletionItem {
		return {label: 'select',
			sortText: `${CompletionHelper.sortPrefixSnippet}select`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'select \${1:expression}\n' +
				'case \${2:constant}\n' +
				'\t\${0}\n' +
				'else\n' +
				'\t\n' +
				'end')};
	}
	
	/** Create completion item for 'while' keyword. */
	public static createWhile(range: Range): CompletionItem {
		return {label: 'while',
			sortText: `${CompletionHelper.sortPrefixSnippet}while`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'while \${1:condition}\n' +
				'\t\${0}\n' +
				'end')};
	}
	
	/** Create completion item for 'try' keyword. */
	public static createTry(range: Range): CompletionItem {
		return {label: 'try',
			sortText: `${CompletionHelper.sortPrefixSnippet}try`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'try\n' +
				'\t\${0}\n' +
				'catch \${1:Exception} \${2:exception}\n' +
				'\t\n' +
				'end')};
	}
	
	/** Create completion item for 'return' keyword. */
	public static createReturn(range: Range): CompletionItem {
		return {label: 'return',
			sortText: `${CompletionHelper.sortPrefixSnippet}return`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'return\n\${0}')};
	}
	
	/** Create completion item for 'break' keyword. */
	public static createBreak(range: Range): CompletionItem {
		return {label: 'break',
			sortText: `${CompletionHelper.sortPrefixSnippet}break`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'break\n\${0}')};
	}
	
	/** Create completion item for 'continue' keyword. */
	public static createContinue(range: Range): CompletionItem {
		return {label: 'continue',
			sortText: `${CompletionHelper.sortPrefixSnippet}continue`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'continue\n\${0}')};
	}
	
	/** Create completion items for 'class' keyword. */
	public static createClass(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'class',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				'class \${1:Name}\n' +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'class extends',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			filterText: 'class',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				'class \${1:Name} extends \${2:Subclass}\n' +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'class extends implements',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			filterText: 'class',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				'class \${1:Name} extends \${2:BaseClass} implements \${3:Interface}\n' +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion items for 'interface' keyword. */
	public static createInterface(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'interface',
			sortText: `${CompletionHelper.sortPrefixSnippet}interface`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Interface $\{1}.\n' +
				' */\n' +
				'interface \${1:Name}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'interface implements',
			sortText: `${CompletionHelper.sortPrefixSnippet}interface`,
			filterText: 'interface',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Interface $\{1}.\n' +
				' */\n' +
				'interface \${1:Name} implements \${2:Interface}\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion items for 'enum' keyword. */
	public static createEnum(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'enum',
			sortText: `${CompletionHelper.sortPrefixSnippet}enum`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Enumeration $\{1}.\n' +
				' */\n' +
				'enum \${1:Name}\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion items for 'func' keyword. */
	public static createFunction(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'func',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}()\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'func(arg)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}(\${3:int} \${4:arg})\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'func(arg1, arg2)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' * \\param $\{6} Argument.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2})\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion items for override 'func' keyword. */
	public static createFunctionOverrides(context: ContextClass, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			var search = CompletionHelper.searchExpressionType(context);
			const visibleTypes = new Set(search.types);
			
			search = new ResolveSearch();
			search.onlyFunctions = true;
			search.ignoreShadowedFunctions = true;
			search.ignoreStatic = true;
			search.stopAfterFirstFullMatch = false;
			search.ignoreConstructors = true;
			objtype.search(search);
			
			const beforeContext = context.declarationBefore(range.start) ?? context;
			for (const each of search.functionsAll) {
				if (each.parent == objtype) {
					continue;
				}
				
				let item = each.createCompletionOverride(range,
					`${CompletionHelper.sortPrefixPrefer}func:`, visibleTypes, beforeContext);
				if (item) {
					items.push(item);
				}
			}
		}
		
		return items;
	}
	
	/** Create completion items for class 'var' keyword. */
	public static createClassVariable(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'var',
			sortText: `${CompletionHelper.sortPrefixSnippet}var`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Variable $\{2}.\n' +
				' */\n' +
				'var \${1:void} \${2:Name}\n' +
				'\${0}')});
		
		items.push({label: 'var constant',
			sortText: `${CompletionHelper.sortPrefixSnippet}var`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Variable $\{2}.\n' +
				' */\n' +
				'static fixed var \${1:int} \${2:Name} = \${0:0}')});
			
		return items;
	}
	
	/** Create completion items for 'func' keyword in interfaces. */
	public static createFunctionInterface(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'func',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}()\n' +
				'\${0}')});
		
		items.push({label: 'func(arg)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}(\${3:int} \${4:arg})\n' +
				'\${0}')});
		
		items.push({label: 'func(arg1, arg2)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' * \\param $\{6} Argument.\n' +
				' */\n' +
				'func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2})\n' +
				'\${0}')});
		
		return items;
	}
	
	/** Create completion items for 'namespace' keyword. */
	public static createNamespace(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📂 namespace',
			sortText: `${CompletionHelper.sortPrefixSnippet}namespace`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'namespace \${0:Name}')});
		
		return items;
	}
	
	/** Create completion items for 'pin' keyword. */
	public static createPin(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📌 pin',
			sortText: `${CompletionHelper.sortPrefixSnippet}pin`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'pin \${0:Namespace}')});
		
		return items;
	}
	
	/** Create completion items for 'requires' keyword. */
	public static createRequires(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📦 requires',
			sortText: `${CompletionHelper.sortPrefixSnippet}requires`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'requires "\${0:Package Name}"')});
		
		return items;
	}
	
	/** Create completion item for '=', '==' and '!=' operators. */
	public static createBaseOperators(range: Range, type: ResolveType): CompletionItem[] {
		return [
			{label: '=',
				detail: `operator: public ${type.name} =(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '=')},
			{label: '==',
				detail: `operator: public bool ==(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '==')},
			{label: '!=',
				detail: `operator: public bool !=(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '!=')},
		];
	}
	
	/** Create completion items for keywords usable inside expressions. */
	public static createExpressionKeywords(context: Context, range: Range, castable?: ResolveType[]): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push(CompletionHelper.createInlineIfElse(range));
		items.push(...CompletionHelper.createThisSuper(context, range, castable));
		
		if (!castable || castable.includes(ResolveNamespace.classBool)) {
			items.push(...CompletionHelper.createBooleans(range));
			items.push(CompletionHelper.createCast(range));
			items.push(CompletionHelper.createCastable(range));
			items.push(CompletionHelper.createTypeof(range));
		}
		
		if (!castable || castable.includes(ResolveNamespace.classBlock)) {
			items.push(...CompletionHelper.createBlock(context, range));
		}
		
		if (!castable || castable.find(t => !t.isPrimitive)) {
			items.push(CompletionHelper.createNull(range));
		}
		
		return items;
	}
	
	/** Create completion items for keywords only usable inside statements. */
	public static createStatementKeywords(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push(...CompletionHelper.createIf(range));
		items.push(...CompletionHelper.createFor(range));
		items.push(CompletionHelper.createSelect(range));
		items.push(CompletionHelper.createWhile(range));
		items.push(CompletionHelper.createTry(range));
		items.push(CompletionHelper.createReturn(range));
		
		const p = context.parent;
		if (p?.type === Context.ContextType.Statements && p.parent) {
			switch (p.parent.type) {
			case Context.ContextType.If:
				if ((p.parent as ContextIf).elsestatements != p) {
					items.push(CompletionHelper.createElif(range));
				}
				break;
				
			case Context.ContextType.IfElif:
				items.push(CompletionHelper.createElif(range));
				break;
				
			case Context.ContextType.Select:
				if ((p.parent as ContextSelect).elsestatements != p) {
					items.push(CompletionHelper.createSelectCase(range));
					if (!(p.parent as ContextSelect).elsestatements) {
						items.push(CompletionHelper.createSelectElse(range));
					}
				}
				break;
				
			case Context.ContextType.SelectCase:
				items.push(CompletionHelper.createSelectCase(range));
				if (!(p.parent as ContextSelect).elsestatements) {
					items.push(CompletionHelper.createSelectElse(range));
				}
				break;
			}
		}
		
		if (context.selfOrParentWithType(Context.ContextType.For)
		|| context.selfOrParentWithType(Context.ContextType.While)) {
			items.push(CompletionHelper.createBreak(range));
			items.push(CompletionHelper.createContinue(range));
			
		} else if (context.selfOrParentWithType(Context.ContextType.Select)
		|| context.selfOrParentWithType(Context.ContextType.SelectCase)) {
			items.push(CompletionHelper.createBreak(range));
		}
		
		return items;
	}
	
	
	
	/** Create completion item for local variable. */
	public static createLocalVariable(variable: ContextVariable, range: Range): CompletionItem {
		const name = variable.name.name;
		return {label: name,
			kind: CompletionItemKind.Variable,
			detail: `local variable ${variable.resolveTextShort}`,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, name),
			commitCharacters: ['.']};
	}
	
	/** Create completion item for function or catch argument. */
	public static createArgument(argument: ContextFunctionArgument | ContextTryCatch, range: Range): CompletionItem {
		const name = argument.simpleName;
		return {
			label: name,
			kind: CompletionItemKind.Variable,
			detail: `argument ${argument.resolveTextShort}`,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, name),
			commitCharacters: ['.']}
	}
	
	
	
	/** Create items for search result. */
	public static createFromSearch(range: Range, context: Context, search: ResolveSearch,
			visibleTypes: Set<ResolveType> | undefined): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		for (const each of search.localVariables) {
			items.push(CompletionHelper.createLocalVariable(each, range));
		}
		
		for (const each of search.arguments) {
			items.push(CompletionHelper.createArgument(each, range));
		}
		
		for (const each of search.functionsAll) {
			if (each.context) {
				const tfrc = (context.selfOrParentWithType(Context.ContextType.Class) as ContextClass)?.resolveClass;
				if (tfrc && each.canAccess(tfrc)) {
					items.push(each.createCompletionItem(range));
				}
			}
		}
		
		for (const each of search.variables) {
			if (each.context) {
				const tfrc = (context.selfOrParentWithType(Context.ContextType.Class) as ContextClass)?.resolveClass;
				if (tfrc && each.canAccess(tfrc)) {
					items.push(each.createCompletionItem(range));
				}
			}
		}
		
		var insertPinPosition: Position | undefined;
		
		for (const each of search.types) {
			if (visibleTypes?.has(each) === false) {
				if (!insertPinPosition) {
					insertPinPosition = RefactoringHelper.insertPinPosition(context);
				}
				items.push(each.createCompletionItem(range, insertPinPosition));
				
			} else {
				items.push(each.createCompletionItem(range));
			}
		}
		
		return items;
	}
	
	
	/** Create statement completions. */
	public static createStatement(range: Range, context: Context): CompletionItem[] {
		let search = CompletionHelper.searchExpression(context);
		const visibleTypes = new Set(search.types);
		
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createExpressionKeywords(context, range));
		items.push(...CompletionHelper.createStatementKeywords(context, range));
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
	
	/** Create expression completions. */
	public static createExpression(range: Range, context: Context, castable?: ResolveType[]): CompletionItem[] {
		if (!castable) {
			castable = context.parent?.expectTypes(context);
			debugLogMessage(`createExpression castable ${castable?.at(0)?.resolveTextShort}`);
		}
		
		let search = CompletionHelper.searchExpression(context, castable);
		const visibleTypes = new Set(search.types);
		
		search.onlyCastable = undefined;
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createExpressionKeywords(context, range, castable));
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
	
	/** Create statement or expression completions. */
	public static createStatementOrExpression(range: Range, context: Context, castable?: ResolveType[]): CompletionItem[] {
		if (context.parent?.type === Context.ContextType.Statements) {
			return CompletionHelper.createStatement(range, context);
		} else {
			return CompletionHelper.createExpression(range, context, castable);
		}
	}
	
	private static searchExpression(context: Context, castable?: ResolveType[]): ResolveSearch {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		if (castable && castable?.length > 0) {
			//search.onlyCastable = castable;
		}
		
		context.searchExpression(search, true, context);
		
		search.onlyTypes = true;
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		
		return search;
	}
	
	private static searchExpressionType(context: Context, castable?: ResolveType[],
			restrictType?: Resolved.Type): ResolveSearch {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.onlyTypes = true;
		search.restrictTypeType = restrictType;
		if (castable && castable?.length > 0) {
			//search.onlyCastable = castable;
		}
		
		context.searchExpression(search, true, context);
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		
		return search;
	}
	
	/** Create object completions. */
	public static createObject(range: Range, context: Context, object: Context): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		//search.onlyCastable = context.parent?.expectTypes(context);
		
		var objtype = object.expressionType;
		if (objtype) {
			search.ignoreNamespaceParents = true;
			
			switch (object.expressionTypeType) {
			case Context.ExpressionType.Object:
				search.ignoreStatic = true;
				objtype.search(search);
				break;
				
			case Context.ExpressionType.Type:
				search.onlyStatic = true;
				objtype.search(search);
				break;
			}
			
			search.removeType(objtype);
		}
		
		items.push(...CompletionHelper.createFromSearch(range, context, search, undefined));
		
		return items;
	}
	
	/** Create object operators completions. */
	public static createObjectOperators(range: Range, context: Context, object: Context): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		search.onlyOperators = true;
		
		var objtype = object.expressionType;
		if (objtype) {
			search.ignoreNamespaceParents = true;
			
			if (object.expressionTypeType === Context.ExpressionType.Object) {
				search.ignoreStatic = true;
				objtype.search(search);
			}
			
			search.removeType(objtype);
		}
		
		items.push(...CompletionHelper.createFromSearch(range, context, search, undefined));
		if (objtype) {
			items.push(...CompletionHelper.createBaseOperators(range, objtype));
		}
		items.push(CompletionHelper.createCast(range));
		items.push(CompletionHelper.createCastable(range));
		items.push(CompletionHelper.createTypeof(range));
		
		return items;
	}
	
	/** Create type completions. */
	public static createType(range: Range, context: Context, castable?: ResolveType[],
			restrictType?: Resolved.Type): CompletionItem[] {
		let search = CompletionHelper.searchExpressionType(context, castable, restrictType);
		const visibleTypes = new Set(search.types);
		
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
}
