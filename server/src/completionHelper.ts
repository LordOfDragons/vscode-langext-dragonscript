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
import { ContextTryCatch } from "./context/statementTry";
import { ContextVariable } from "./context/statementVariable";
import { RefactoringHelper } from "./refactoringHelper";
import { ResolveNamespace } from "./resolve/namespace";
import { ResolveSearch } from "./resolve/search";
import { ResolveType } from "./resolve/type";


export class CompletionHelper {
	/** Create completion item for 'this' and 'super' keyword. */
	public static createThisSuper(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		const parent = ContextClass.thisContext(context);
		if (parent?.resolveClass) {
			items.push(parent.resolveClass.createCompletionItemThis(range));
			
			const parent2 = ContextClass.superContext(context);
			if (parent2?.resolveClass) {
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
				kind: CompletionItemKind.Keyword,
				insertTextFormat: InsertTextFormat.PlainText,
				textEdit: TextEdit.replace(range, each),
				commitCharacters: ['.', ' ', ')', ':', '/', '\\']});
		};
		return items;
	}
	
	/** Create completion item for 'null' keyword. */
	public static createNull(range: Range): CompletionItem {
		return {label: 'null',
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'null')};
	}
	
	/** Create completion item for 'cast' keyword. */
	public static createCast(range: Range): CompletionItem {
		return {label: 'cast',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'cast ${1:type}')};
	}
	
	/** Create completion item for 'castable' keyword. */
	public static createCastable(range: Range): CompletionItem {
		return {label: 'castable',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'castable ${1:type}')};
	}
	
	/** Create completion item for 'typeof' keyword. */
	public static createTypeof(range: Range): CompletionItem {
		return {label: 'typeof',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'typeof ${1:type}')};
	}
	
	/** Create completion items for 'block' keyword. */
	public static createBlock(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'block: 1 argument',
			sortText: 'block',
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'block: 2 arguments',
			sortText: 'block',
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument1}, \${3:Object} \${4: argument2}\n' +
				'\t\${0}\n' +
				'end')});
		
		return items;
	}
	
	/** Create completion items for 'if' keyword. */
	public static createIf(range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'if',
			sortText: 'if',
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'if \${1:condition}\n' + 
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'if else',
			sortText: 'if',
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
	
	/** Create completion items for 'for' keyword. */
	public static createFor(range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'for',
			sortText: 'for',
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} to ${3:toIndex}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for step',
			sortText: 'for',
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} to ${3:toIndex} step ${4:stepSize}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for downto',
			sortText: 'for',
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} downto ${3:toIndex}\n' +
				'\t\${0}\n' +
				'end')});
		
		items.push({label: 'for downto step',
			sortText: 'for',
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
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'try\n' +
				'\t\${0}\n' +
				'catch \${1:Exception} \${2:exception}\n' +
				'\t\n' +
				'end')};
	}
	
	/** Create completion items for keywords usable inside expressions. */
	public static createExpressionKeywords(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createThisSuper(context, range));
		items.push(...CompletionHelper.createBooleans(range));
		items.push(CompletionHelper.createNull(range));
		items.push(...CompletionHelper.createBlock(context, range));
		items.push(CompletionHelper.createCast(range));
		items.push(CompletionHelper.createCastable(range));
		items.push(CompletionHelper.createTypeof(range));
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
			commitCharacters: ['.', ' ', ')', ':', '/', '\\']};
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
			commitCharacters: ['.', ' ', ')', ':', '/', '\\']}
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
		let search = CompletionHelper.searchExpression(context, castable);
		const visibleTypes = new Set(search.types);
		
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createExpressionKeywords(context, range));
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
	
	/** Create statement or expression completions. */
	public static createStatementOrExpression(range: Range, context: Context): CompletionItem[] {
		if (context.parent?.type == Context.ContextType.Statements) {
			return CompletionHelper.createStatement(range, context);
		} else {
			return CompletionHelper.createExpression(range, context);
		}
	}
	
	private static searchExpression(context: Context, castable?: ResolveType[]): ResolveSearch {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		if (castable && castable?.length > 0) {
			search.onlyCastable = castable;
		}
		
		context.searchExpression(search, true, context);
		
		search.onlyTypes = true;
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		
		return search;
	}
	
	private static searchExpressionType(context: Context, castable?: ResolveType[]): ResolveSearch {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.onlyTypes = true;
		if (castable && castable?.length > 0) {
			search.onlyCastable = castable;
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
			
			if (object.expressionTypeType == Context.ExpressionType.Object) {
				search.ignoreStatic = true;
				objtype.search(search);
			}
			
			search.removeType(objtype);
		}
		
		items.push(...CompletionHelper.createFromSearch(range, context, search, undefined));
		items.push(CompletionHelper.createCast(range));
		items.push(CompletionHelper.createCastable(range));
		items.push(CompletionHelper.createTypeof(range));
		
		return items;
	}
	
	/** Create type completions. */
	public static createType(range: Range, context: Context, castable?: ResolveType[]): CompletionItem[] {
		let search = CompletionHelper.searchExpressionType(context, castable);
		const visibleTypes = new Set(search.types);
		
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
}
