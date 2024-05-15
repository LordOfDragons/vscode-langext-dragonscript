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

import { CompletionItem, CompletionItemKind, InsertTextFormat, MarkupContent, MarkupKind, Position, Range, TextEdit } from "vscode-languageserver"
import { TextDocument } from "vscode-languageserver-textdocument";
import { ContextFunction } from "./context/classFunction";
import { ContextFunctionArgument } from "./context/classFunctionArgument";
import { Context } from "./context/context";
import { ContextClass } from "./context/scriptClass";
import { ContextIf, ContextIfElif } from "./context/statementIf";
import { ContextSelect } from "./context/statementSelect";
import { ContextTryCatch } from "./context/statementTry";
import { ContextVariable } from "./context/statementVariable";
import { RefactoringHelper } from "./refactoringHelper";
import { ResolveNamespace } from "./resolve/namespace";
import { Resolved } from "./resolve/resolved";
import { ResolveSearch } from "./resolve/search";
import { ResolveType } from "./resolve/type";
import { documents } from "./server";


export class CompletionHelper {
	static sortPrefixSnippet = `${String.fromCodePoint(255)}:`;
	static sortPrefixPrefer = ` :`;
	
	/** Create completion item for 'this' and 'super' keyword. */
	public static createThisSuper(context: Context, range: Range, castable?: ResolveType[]): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		const parent = ContextClass.thisContext(context);
		const tp = parent?.resolveClass;
		if (tp /*&& (!castable || castable.find(t => tp.castable(t)))*/) {
			items.push(parent.resolveClass.createCompletionItemThis(range));
			
			const parent2 = ContextClass.superContext(context);
			const tp2 = parent2?.resolveClass;
			if (tp2 /*&& (!castable || castable.find(t => tp2.castable(t)))*/) {
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
				commitCharacters: ['.'],
				documentation: this.createMarkup(['Create boolean literal.'])
			});
		};
		return items;
	}
	
	/** Create completion item for 'null' keyword. */
	public static createNull(range: Range): CompletionItem {
		return {label: 'null',
			sortText: `${CompletionHelper.sortPrefixSnippet}null`,
			kind: CompletionItemKind.Keyword,
			insertTextFormat: InsertTextFormat.PlainText,
			textEdit: TextEdit.replace(range, 'null'),
			documentation: this.createMarkup(['Create null literal representing no object instance.'])
			};
	}
	
	/** Create completion item for 'cast' keyword. */
	public static createCast(range: Range): CompletionItem {
		return {label: 'cast',
			sortText: `${CompletionHelper.sortPrefixSnippet}cast`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'cast ${1:type}'),
			documentation: this.createMarkup([
				['Cast object to another type.',
				`If object type is not a subclass of __type__ a ${ResolveNamespace.classException.simpleNameLink} is thrown`
				].join(' ')])
			};
	}
	
	/** Create completion item for 'castable' keyword. */
	public static createCastable(range: Range): CompletionItem {
		return {label: 'castable',
			sortText: `${CompletionHelper.sortPrefixSnippet}castable`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'castable ${1:type}'),
			documentation: this.createMarkup([
				['Object is castable to another type.',
				'Returns _true_ if object type is subclass of __type__ or _false_ otherwise'
				].join(' ')])
			};
	}
	
	/** Create completion item for 'typeof' keyword. */
	public static createTypeof(range: Range): CompletionItem {
		return {label: 'typeof',
			sortText: `${CompletionHelper.sortPrefixSnippet}typeof`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'typeof ${1:type}'),
			documentation: this.createMarkup([
				['Object is instance of type.',
				'Returns _true_ if object is instance of __type__ or _false_ otherwise'
				].join(' ')])
			};
	}
	
	/** Create completion items for 'block' keyword. */
	public static createBlock(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '🅱 block',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create code block with no argument.'])
			});
		
		items.push({label: '🅱 block: 1 argument',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create code block with one argument.'])
			});
		
		items.push({label: '🅱 block: 2 arguments',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument1}, \${3:Object} \${4: argument2}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create code block with two arguments.'])
			});
		
		items.push({label: '🅱 block: 3 arguments',
			sortText: `${CompletionHelper.sortPrefixSnippet}block`,
			filterText: 'block',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'block \${1:Object} \${2:argument1}, \${3:Object} \${4: argument2}, \${5:Object} \${6: argument3}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create code block with three arguments.'])
			});
		
		return items;
	}
	
	/** Create completion item for inline if-else keyword. */
	public static createInlineIfElse(range: Range): CompletionItem {
		return {label: 'inline if-else',
			sortText: `${CompletionHelper.sortPrefixSnippet}if`,
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'if ${1:trueValue} else ${2:falseValue}'),
			documentation: this.createMarkup(['Create inline if-else expression.'])
		};
	}
	
	/** Create completion items for 'if' keyword. */
	public static createIf(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'if',
			sortText: `${CompletionHelper.sortPrefixSnippet}if`,
			filterText: 'if',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'if \${1:condition}\n' + 
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create if statement.'])
			});
		
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
				'end'),
			documentation: this.createMarkup(['Create if statement with else block.'])
			});
		
		return items;
	}
	
	/** Create completion item for 'elif' keyword. */
	public static createElif(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes(
			[Context.ContextType.If, Context.ContextType.IfElif])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'elif',
			sortText: `${CompletionHelper.sortPrefixSnippet}elif`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'elif \${1:condition}\n' + 
				'\t\${0}'),
			documentation: this.createMarkup(['Create elif block which is another condition inside an if statement.'])
			};
	}
	
	/** Create completion item for 'else' keyword. */
	public static createElse(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes(
			[Context.ContextType.If, Context.ContextType.IfElif])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'else',
			sortText: `${CompletionHelper.sortPrefixSnippet}else`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'else\n' + 
				'\t\${0}'),
			documentation: this.createMarkup(['Create else block inside if statement.'])
			};
	}
	
	/** Create completion item for 'case' keyword. */
	public static createSelectCase(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes(
			[Context.ContextType.Select, Context.ContextType.SelectCase])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'case',
			sortText: `${CompletionHelper.sortPrefixSnippet}case`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'case \${1:constant}\n' + 
				'\t\${0}'),
			documentation: this.createMarkup(['Create case statement.',
				'',
				`If value tested in the _select_ statement is of type ${ResolveNamespace.classInt.simpleNameLink} the match values have to be integer literals.`,
				'',
				[`If the value tested is of type ${ResolveNamespace.classEnumeration.simpleNameLink} the match values have to be enumeration constants.`,
				'Technically any object can be tested but matching is done using the == operator not the equals() function.',
				`In particular this means a ${ResolveNamespace.classString.simpleNameLink} does not match string literals since they are different objects.`].join(' ')])
			};
	}
	
	/** Create completion item for 'else' keyword. */
	public static createSelectElse(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes([Context.ContextType.Select, Context.ContextType.SelectCase])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'else',
			sortText: `${CompletionHelper.sortPrefixSnippet}else`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'else\n' + 
				'\t\${0}'),
			documentation: this.createMarkup(['Create else block inside if statement.'])
			};
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
				'end'),
			documentation: this.createMarkup(['Create for loop.'])
			});
		
		items.push({label: 'for step',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} to ${3:toIndex} step ${4:stepSize}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create for loop using custom step size.'])
			});
		
		items.push({label: 'for downto',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} downto ${3:toIndex}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create for loop counting down instead of up.'])
			});
		
		items.push({label: 'for downto step',
			sortText: `${CompletionHelper.sortPrefixSnippet}for`,
			filterText: 'for',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'for \${1:variable} = ${2:fromIndex} downto ${3:toIndex} step ${5:stepSize}\n' +
				'\t\${0}\n' +
				'end'),
			documentation: this.createMarkup(['Create for loop counting down instead of up using custom step size.'])
			});
		
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
				'end'),
			documentation: this.createMarkup(['Create select case statement.',
				'',
				`Matches the value of an ${ResolveNamespace.classInt.simpleNameLink} or ${ResolveNamespace.classEnumeration.simpleNameLink} against a list of literals or static constants.`])
			};
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
				'end'),
			documentation: this.createMarkup(['Create while loop.'])
			};
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
				'end'),
			documentation: this.createMarkup(['Create try statement catching certain thrown exceptions.'])
			};
	}
	
	/** Create completion item for 'catch' keyword. */
	public static createCatch(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes([Context.ContextType.Try, Context.ContextType.TryCatch])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'catch',
			sortText: `${CompletionHelper.sortPrefixSnippet}catch`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'catch \${1:Exception} \${2:exception}\n' +
				'\t${0}'),
			documentation: this.createMarkup(['Create catch block inside try statement.',
				'',
				'Catches only exceptions castable to type'])};
	}
	
	/** Create completion item for 'return' keyword. */
	public static createReturn(range: Range): CompletionItem {
		return {label: 'return',
			sortText: `${CompletionHelper.sortPrefixSnippet}return`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'return\n\${0}'),
			documentation: this.createMarkup(['Create return statement.'])
			};
	}
	
	/** Create completion item for 'break' keyword. */
	public static createBreak(range: Range): CompletionItem {
		return {label: 'break',
			sortText: `${CompletionHelper.sortPrefixSnippet}break`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'break\n\${0}'),
			documentation: this.createMarkup(['Create break statement.',
				'',
				['Exits the inner most for loop, while loop or select statement.',
				'Does not exit for loop, while loop or select statement outside the inner most one.'].join(' ')])
			};
	}
	
	/** Create completion item for 'continue' keyword. */
	public static createContinue(range: Range): CompletionItem {
		return {label: 'continue',
			sortText: `${CompletionHelper.sortPrefixSnippet}continue`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'continue\n\${0}'),
			documentation: this.createMarkup(['Create continue statement.',
				'',
				['Jumps to the end of the current for or while loop.',
				'In case of for loop the counter is increment or decrement.',
				'Afterwards the loop condition is re-evaluated'].join(' ')])
			};
	}
	
	/** Create completion item for 'end' keyword. */
	public static createEnd(context: Context, range: Range): CompletionItem {
		const lspos = context.selfOrParentWithTypes([
			Context.ContextType.If, Context.ContextType.IfElif,
			Context.ContextType.Select, Context.ContextType.SelectCase,
			Context.ContextType.Try, Context.ContextType.TryCatch,
			Context.ContextType.Block,
			Context.ContextType.Function,
			Context.ContextType.Class,
			Context.ContextType.Interface,
			Context.ContextType.Enumeration])?.range?.start;
		range = Range.create(lspos ? Position.create(range.start.line, lspos.character) : range.start, range.end);
		
		return {label: 'end',
			sortText: `${CompletionHelper.sortPrefixSnippet}end`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'end\n\${0}'),
			documentation: this.createMarkup(['Create end statement.',
				'',
				'Ends the code body of these language constructs:',
				'- if / elif / else',
				'- select / case',
				'- try / catch',
				'- block',
				'- function',
				'- class',
				'- interface',
				'- enum'])
			};
	}
	
	/** Create completion items for 'class' keyword. */
	public static createClass(context: Context, range: Range): CompletionItem[] {
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'class',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				`${prefix}class \${1:Name}\n` +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class.'])
			});
		
		items.push({label: 'class extends',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			filterText: 'class',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				`${prefix}class \${1:Name} extends \${2:Subclass}\n` +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class extending another class.'])
			});
		
		items.push({label: 'class extends implements',
			sortText: `${CompletionHelper.sortPrefixSnippet}class`,
			filterText: 'class',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Class $\{1}.\n' +
				' */\n' +
				`${prefix}class \${1:Name} extends \${2:BaseClass} implements \${3:Interface}\n` +
				'\t/**\n' +
				'\t * Create new instance of class \${1}.\n' +
				'\t */\n' +
				'\tfunc new()\n' +
				'\tend\n' +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class extending another class and implementing interfaces.'])
			});
		
		return items;
	}
	
	/** Create completion items for 'extends' keyword. */
	public static createExtends(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'extends',
			sortText: `${CompletionHelper.sortPrefixSnippet}extends`,
			filterText: 'extends',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'extends \${0}'),
		documentation: this.createMarkup(['Extend supper class.'])
		});
		
		return items;
	}
	
	/** Create completion items for 'implements' keyword. */
	public static createImplements(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: 'implements',
			sortText: `${CompletionHelper.sortPrefixSnippet}implements`,
			filterText: 'implements',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'implements \${0}'),
		documentation: this.createMarkup(['Implement interfaces.'])
		});
		
		return items;
	}
	
	/** Create completion items for 'interface' keyword. */
	public static createInterface(context: Context, range: Range): CompletionItem[] {
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'interface',
			sortText: `${CompletionHelper.sortPrefixSnippet}interface`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Interface $\{1}.\n' +
				' */\n' +
				`${prefix}interface \${1:Name}\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create interface.'])
			});
		
		items.push({label: 'interface implements',
			sortText: `${CompletionHelper.sortPrefixSnippet}interface`,
			filterText: 'interface',
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Interface $\{1}.\n' +
				' */\n' +
				`${prefix}interface \${1:Name} implements \${2:Interface}\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create interface extending other interfaces.'])
			});
		
		return items;
	}
	
	/** Create completion items for 'enum' keyword. */
	public static createEnum(context: Context, range: Range): CompletionItem[] {
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'enum',
			sortText: `${CompletionHelper.sortPrefixSnippet}enum`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Enumeration $\{1}.\n' +
				' */\n' +
				`${prefix}enum \${1:Name}\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create enumeration.'])
			});
		
		return items;
	}
	
	/** Create completion items for 'func' keyword. */
	public static createFunction(context: Context, range: Range): CompletionItem[] {
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'func',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}()\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class function with no argument.'])
			});
		
		items.push({label: 'func(arg)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg})\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class function with one argument.'])
			});
		
		items.push({label: 'func(arg1, arg2)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} First argument.\n' +
				' * \\param $\{6} Second argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2})\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class function with two arguments.'])
			});
		
		items.push({label: 'func(arg1, arg2, arg3)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} First argument.\n' +
				' * \\param $\{6} Second argument.\n' +
				' * \\param $\{8} Third argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2}, \${7:int} \${8:arg3})\n` +
				'\t\${0}\n' +
				'end\n'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create class function with three arguments.'])
			});
		
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
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'var',
			sortText: `${CompletionHelper.sortPrefixSnippet}var`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Variable $\{2}.\n' +
				' */\n' +
				`${prefix}var \${1:void} \${2:Name}\n` +
				'\${0}'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create variable.'])
			});
		
		items.push({label: 'var constant',
			sortText: `${CompletionHelper.sortPrefixSnippet}var`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Variable $\{2}.\n' +
				' */\n' +
				`${prefix}static fixed var \${1:int} \${2:Name} = \${0:0}`),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create constant class variable.'])
			});
			
		return items;
	}
	
	/** Create completion items for 'func' keyword in interfaces. */
	public static createFunctionInterface(context: Context, range: Range): CompletionItem[] {
		const prefix = this.lineContentBefore(this.getDocument(context), range.start);
		const additionalEdits = this.createEditRemoveBefore(range.start, prefix);
		const items: CompletionItem[] = [];
		
		items.push({label: 'func',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}()\n` +
				'\${0}'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create interface function with no argument.'])
			});
		
		items.push({label: 'func(arg)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} Argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg})\n` +
				'\${0}'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create interface function with one argument.'])
			});
		
		items.push({label: 'func(arg1, arg2)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} First argument.\n' +
				' * \\param $\{6} Second argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2})\n` +
				'\${0}'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create interface function with two arguments.'])
			});
			
		items.push({label: 'func(arg1, arg2, arg3)',
			sortText: `${CompletionHelper.sortPrefixSnippet}func`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range,
				'/**\n' +
				' * Function $\{2}.\n' +
				' * \\param $\{4} First argument.\n' +
				' * \\param $\{6} Second argument.\n' +
				' * \\param $\{8} Second argument.\n' +
				' */\n' +
				`${prefix}func \${1:void} \${2:Name}(\${3:int} \${4:arg1}, \${5:int} \${6:arg2}, \${7:int} \${8:arg2})\n` +
				'\${0}'),
			additionalTextEdits: additionalEdits,
			documentation: this.createMarkup(['Create function with three arguments.'])
			});
		
		return items;
	}
	
	/** Create completion items for 'namespace' keyword. */
	public static createNamespace(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📂 namespace',
			sortText: `${CompletionHelper.sortPrefixSnippet}namespace`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'namespace \${0:Name}'),
			documentation: this.createMarkup(['Create namespace.',
				'',
				'Namespace continues until the end of the script or the next _namespace_ statement.'])
			});
		
		return items;
	}
	
	/** Create completion items for 'pin' keyword. */
	public static createPin(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📌 pin',
			sortText: `${CompletionHelper.sortPrefixSnippet}pin`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'pin \${0:Namespace}'),
			documentation: this.createMarkup(['Pin namespace for type resolving.',
				'',
				['Pinned namespaces are search in the order they are defined.',
				'Each pinned namespace is search up the entire parent chain.',
				'Hence the namespace NamespaceA.NamespaceB.NamespaceC would be searched NamespaceC then NamespaceB then NamespaceA before continuing to the next pinned namespace.'].join(' ')])
			});
		
		return items;
	}
	
	/** Create completion items for 'requires' keyword. */
	public static createRequires(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push({label: '📦 requires',
			sortText: `${CompletionHelper.sortPrefixSnippet}requires`,
			kind: CompletionItemKind.Snippet,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(range, 'requires "\${0:Package Name}"'),
			documentation: this.createMarkup(['Requires script package.',
				'',
				['Script packages contain classes required by this script.',
				'All required packages in all scripts have to be present otherwise running fails'].join(' '),
				'',
				[`The package name is a ${ResolveNamespace.classString.simpleNameLink} literal.`,
				'See the main application for the definition of supported package names and source prefixes.'].join(' ')])
			});
		
		return items;
	}
	
	/** Create completion items for type modifier keyword. */
	public static createTypeModifiers(context: Context, range: Range,
			allowed: Set<Context.TypeModifier>, modifiers: Set<Context.TypeModifier>): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		const hasPublic = modifiers.has(Context.TypeModifier.Public);
		const hasProtected = modifiers.has(Context.TypeModifier.Protected);
		const hasPrivate = modifiers.has(Context.TypeModifier.Private);
		const hasStatic = modifiers.has(Context.TypeModifier.Static);
		const hasFixed = modifiers.has(Context.TypeModifier.Fixed);
		const hasAbstract = modifiers.has(Context.TypeModifier.Abstract);
		
		if (!(hasPublic || hasProtected || hasPrivate) && allowed.has(Context.TypeModifier.Public)) {
			items.push({label: 'public',
				sortText: `${CompletionHelper.sortPrefixSnippet}public`,
				filterText: 'public',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'public \${0}'),
				documentation: this.createMarkup([
					'Public access type modifier',
					'',
					'Member is accessible from anywhere.'])
				});
		}
		
		if (!(hasPublic || hasProtected || hasPrivate) && allowed.has(Context.TypeModifier.Protected)) {
			items.push({label: 'protected',
				sortText: `${CompletionHelper.sortPrefixSnippet}protected`,
				filterText: 'protected',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'protected \${0}'),
				documentation: this.createMarkup([
					'Protected access type modifier',
					'',
					'Member is accessible only from inside class and from inside direct and indirect subclasses.'])
				});
		}
		
		if (!(hasPublic || hasProtected || hasPrivate) && allowed.has(Context.TypeModifier.Private)) {
			items.push({label: 'private',
				sortText: `${CompletionHelper.sortPrefixSnippet}private`,
				filterText: 'private',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'private \${0}'),
				documentation: this.createMarkup([
					'Private access type modifier',
					'',
					'Member is accessible only from inside class.'])
				});
		}
		
		if (!(hasStatic || hasAbstract) && allowed.has(Context.TypeModifier.Static)) {
			items.push({label: 'static',
				sortText: `${CompletionHelper.sortPrefixSnippet}static`,
				filterText: 'static',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'static \${0}'),
				documentation: this.createMarkup([
					'Static access type modifier',
					'',
					'Member is a static class member accessible using class type name outside function calls.'])
				});
		}
		
		if (!hasFixed && allowed.has(Context.TypeModifier.Fixed)) {
			items.push({label: 'fixed',
				sortText: `${CompletionHelper.sortPrefixSnippet}fixed`,
				filterText: 'fixed',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'fixed \${0}'),
				documentation: this.createMarkup([
					'Fixed access type modifier',
					'',
					['Member is fixed and can not be assigned after initialization.',
					'Only allowed for static class members'].join(' ')])
				});
		}
		
		if (!(hasAbstract || hasStatic) && allowed.has(Context.TypeModifier.Abstract)) {
			items.push({label: 'abstract',
				sortText: `${CompletionHelper.sortPrefixSnippet}abstract`,
				filterText: 'abstract',
				kind: CompletionItemKind.Snippet,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, 'abstract \${0}'),
				documentation: this.createMarkup([
					'Abstract access type modifier',
					'',
					['Abstract functions are abstract and and have no implementation in the base class.',
					'Classes with abstract functions have to be abstract too.'].join(' '),
					'',
					['Abstract classes are not required to implement all abstract functions or interface functions.',
					'Abstract functions can not be instantiated using new() method.'].join(' ')])
				});
		}
		
		return items;
	}
	
	/** Create completion item for '=', '==' and '!=' operators. */
	public static createBaseOperators(range: Range, type: ResolveType): CompletionItem[] {
		return [
			{label: '=',
				detail: `operator: public ${type.name} =(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '='),
				documentation: this.createMarkup(['Assign operator.'])},
			{label: '==',
				detail: `operator: public bool ==(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '=='),
				documentation: this.createMarkup(['Equals operator.',
					'',
					'Returns _true_ if the object on both sides of the operator are the same object instance.'])},
			{label: '!=',
				detail: `operator: public bool !=(${type.name} value)`,
				kind: CompletionItemKind.Operator,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(range, '!='),
				documentation: this.createMarkup(['Not equals operator.',
					'',
					'Returns _true_ if the object on both sides of the operator are not the same object instance.'])},
		];
	}
	
	/** Create completion items for keywords usable inside expressions. */
	public static createExpressionKeywords(context: Context, range: Range, castable?: ResolveType[]): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push(CompletionHelper.createInlineIfElse(range));
		items.push(...CompletionHelper.createThisSuper(context, range, castable));
		
		//if (!castable || castable.includes(ResolveNamespace.classBool)) {
			items.push(...CompletionHelper.createBooleans(range));
			items.push(CompletionHelper.createCast(range));
			items.push(CompletionHelper.createCastable(range));
			items.push(CompletionHelper.createTypeof(range));
		//}
		
		//if (!castable || castable.includes(ResolveNamespace.classBlock)) {
			items.push(...CompletionHelper.createBlock(context, range));
		//}
		
		//if (!castable || castable.find(t => !t.isPrimitive)) {
			items.push(CompletionHelper.createNull(range));
		//}
		
		return items;
	}
	
	/** Create completion items for keywords only usable inside statements. */
	public static createStatementKeywords(context: Context, range: Range): CompletionItem[] {
		let items: CompletionItem[] = [];
		
		items.push(...CompletionHelper.createIf(context, range));
		items.push(...CompletionHelper.createFor(range));
		items.push(CompletionHelper.createSelect(range));
		items.push(CompletionHelper.createWhile(range));
		items.push(CompletionHelper.createTry(range));
		items.push(CompletionHelper.createReturn(range));
		
		var p: Context | undefined = context;
		if (p.type !== Context.ContextType.Statements) {
			p = context.parent;
			if (p?.type !== Context.ContextType.Statements) {
				p = undefined;
			}
		}
		
		if (p?.parent) {
			switch (p.parent.type) {
			case Context.ContextType.If:{
				const ctxelse = (p.parent as ContextIf).elsestatements;
				if (ctxelse != p) {
					items.push(CompletionHelper.createElif(context, range));
					if (!ctxelse) {
						items.push(CompletionHelper.createElse(context, range));
					}
				}
				}break;
				
			case Context.ContextType.IfElif:
				items.push(CompletionHelper.createElif(context, range));
				if (!((p.parent as ContextIfElif).parent as ContextIf).elsestatements) {
					items.push(CompletionHelper.createElse(context, range));
				}
				break;
				
			case Context.ContextType.Select:
				if ((p.parent as ContextSelect).elsestatements != p) {
					items.push(CompletionHelper.createSelectCase(context, range));
					if (!(p.parent as ContextSelect).elsestatements) {
						items.push(CompletionHelper.createSelectElse(context, range));
					}
				}
				break;
				
			case Context.ContextType.SelectCase:
				items.push(CompletionHelper.createSelectCase(context, range));
				if (!(p.parent as ContextSelect).elsestatements) {
					items.push(CompletionHelper.createSelectElse(context, range));
				}
				break;
				
			case Context.ContextType.Try:
			case Context.ContextType.TryCatch:
				items.push(CompletionHelper.createCatch(context, range));
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
		
		items.push(CompletionHelper.createEnd(context, range));
		
		return items;
	}
	
	
	
	/** Create completion item for local variable. */
	public static createLocalVariable(variable: ContextVariable, range: Range): CompletionItem | undefined {
		if (!variable.name) {
			return undefined;
		}
		
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
			const item = CompletionHelper.createLocalVariable(each, range);
			if (item) {
				items.push(item);
			}
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
		}
		
		const expectVariable = context.parent?.expectVariable(context) ?? Context.ExpectVariable.None;
		var search: ResolveSearch;
		
		switch (expectVariable) {
		case Context.ExpectVariable.Write:
			search = this.searchVariable(context, true, castable);
			break;
			
		case Context.ExpectVariable.Read:
			search = this.searchVariable(context, false, castable);
			break;
			
		case Context.ExpectVariable.None:
			castable = [];
			search = CompletionHelper.searchExpression(context);
		}
		const visibleTypes = new Set(search.types);
		
		if (expectVariable === Context.ExpectVariable.None) {
			search.onlyCastable = undefined;
			ResolveNamespace.root.searchGlobalTypes(search);
		}
		
		let items: CompletionItem[] = [];
		if (expectVariable === Context.ExpectVariable.None) {
			items.push(...CompletionHelper.createExpressionKeywords(context, range, castable));
		}
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
			search.onlyCastable = castable;
		}
		
		const topFunc = context.selfOrParentWithType(Context.ContextType.Function);
		if ((topFunc as ContextFunction | undefined)?.isBodyStatic) {
			search.onlyStatic = true;
		}
		
		context.searchExpression(search, true, context);
		
		search.onlyTypes = true;
		search.onlyStatic = false;
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		
		return search;
	}
	
	private static searchVariable(context: Context, writeable: boolean, castable?: ResolveType[]): ResolveSearch {
		let search = new ResolveSearch();
		search.onlyVariables = true;
		search.onlyWriteableVariables = writeable;
		if (castable && castable?.length > 0) {
			search.onlyCastable = castable;
		}
		
		const topFunc = context.selfOrParentWithType(Context.ContextType.Function);
		if ((topFunc as ContextFunction | undefined)?.isBodyStatic) {
			search.onlyStatic = true;
		}
		
		context.searchExpression(search, true, context);
		
		/*
		search.onlyVariables = false;
		search.onlyTypes = true;
		search.onlyStatic = false;
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		*/
		
		return search;
	}
	
	public static searchExpressionType(context: Context, castable?: ResolveType[],
			restrictType?: Resolved.Type[]): ResolveSearch {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.onlyTypes = true;
		search.restrictTypeType = restrictType;
		search.inheritedIgnoreSelf = true;
		if (castable && castable?.length > 0) {
			search.onlyCastable = castable;
		}
		
		const topFunc = context.selfOrParentWithType(Context.ContextType.Function);
		if ((topFunc as ContextFunction | undefined)?.isBodyStatic) {
			search.onlyStatic = true;
		}
		
		context.searchExpression(search, true, context);
		
		search.onlyStatic = false;
		
		const objtype = ContextClass.thisContext(context)?.resolveClass;
		if (objtype) {
			objtype.search(search);
		}
		
		return search;
	}
	
	/** Create object completions. */
	public static createObject(range: Range, context: Context, object: Context): CompletionItem[] {
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
		
		return CompletionHelper.createFromSearch(range, context, search, undefined);
	}
	
	/** Create sub type completions. */
	public static createSubType(range: Range, context: Context, type: ResolveType,
			restrictType?: Resolved.Type[], castable?: ResolveType[]): CompletionItem[] {
		let search = new ResolveSearch();
		search.allMatchingTypes = true;
		search.ignoreShadowedFunctions = true;
		search.ignoreNamespaceParents = true;
		search.onlyTypes = true;
		search.restrictTypeType = restrictType;
		if (castable && castable?.length > 0) {
			search.onlyCastable = castable;
		}
		type.search(search);
		search.removeType(type);
		return CompletionHelper.createFromSearch(range, context, search, undefined);
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
			restrictType?: Resolved.Type[]): CompletionItem[] {
		let search = CompletionHelper.searchExpressionType(context, castable, restrictType);
		const visibleTypes = new Set(search.types);
		
		ResolveNamespace.root.searchGlobalTypes(search);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
	
	/** Create variable. */
	public static createVariable(range: Range, context: Context, writeable: boolean, castable?: ResolveType[]): CompletionItem[] {
		if (!castable) {
			castable = context.parent?.expectTypes(context);
		}
		
		const search = this.searchVariable(context, writeable, castable)
		const visibleTypes = new Set(search.types);
		
		let items: CompletionItem[] = [];
		items.push(...CompletionHelper.createFromSearch(range, context, search, visibleTypes));
		return items;
	}
	
	private static regexWord = RegExp(/^\p{L}/, 'u');
	
	/** Range of word containing position. */
	public static wordRange(document: TextDocument, position: Position): Range {
		const offset = document.offsetAt(position);
		const text = document.getText();
		const length = text.length;
		
		var offsetBegin = offset, offsetEnd = offset;
		
		while (offsetBegin > 0) {
			if (this.regexWord.test(text[offsetBegin - 1])) {
				offsetBegin--;
			} else {
				break;
			}
		}
		
		while (offsetEnd < length) {
			if (this.regexWord.test(text[offset])) {
				offsetEnd++;
			} else {
				break;
			}
		}
		
		return Range.create(document.positionAt(offsetBegin), document.positionAt(offsetEnd));
	}
	
	/** Create markup content from lines. */
	public static createMarkup(content: string[]): MarkupContent {
		return {
			kind: MarkupKind.Markdown,
			value: content.join('  \n')
		};
	}
	
	public static getDocument(context: Context): TextDocument | undefined {
		const uri = context.documentUri;
		return uri ? documents.get(uri) : undefined;
	}
	
	/** Line content before position trimmed on the start. */
	public static lineContentBefore(document: TextDocument | undefined, position: Position): string {
		return document?.getText(Range.create(position.line, 0, position.line, position.character))?.trimStart() ?? '';
	}
	
	/** Create array with edit to remove content before position if not empty. */
	public static createEditRemoveBefore(position: Position, prefix: string): TextEdit[] | undefined {
		if (prefix.length == 0) {
			return undefined;
		}
		
		return [
			TextEdit.del(Range.create(
				position.line, position.character - prefix.length,
				position.line, position.character))
		]
	}
}
