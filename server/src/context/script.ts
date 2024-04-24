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

import { Context } from "./context";
import { CompletionItem, DocumentSymbol, Position, Range, RemoteConsole, SymbolInformation, URI } from "vscode-languageserver";
import { ContextPinNamespace } from "./pinNamespace";
import { ContextNamespace } from "./namespace";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextRequiresPackage } from "./requiresPackage";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ResolveState } from "../resolve/state";
import { CompletionHelper } from "../completionHelper";
import { ContextDocumentation, ContextDocumentationIterator } from "./documentation";
import { ScriptDocument } from "../scriptDocument";
import { ContextComment } from "./comment";
import { DSSettings } from "../settings";
import { DebugSettings } from "../debugSettings";
import { debugLogMessage } from "../server";
import { Helpers } from "../helpers";


/** Top level script context. */
export class ContextScript extends Context{
	protected _settings: DSSettings;
	protected _statements: Context[] = [];
	protected _documentations: ContextDocumentation[] = [];
	protected _comments: ContextComment[] = [];
	protected _requires: ContextRequiresPackage[] = [];
	protected _namespaces: ContextNamespace[] = [];
	public documentSymbols: DocumentSymbol[] = [];
	public workspaceSymbols: SymbolInformation[] = [];
	public uri?: URI;


	constructor(document: ScriptDocument, textDocument?: TextDocument, lineCount?: number) {
		super(Context.ContextType.Script);
		const node = document.node!;
		
		this._settings = document.settings;
		
		let lastPosition = textDocument
			? textDocument.positionAt(textDocument.getText().length)
			: Position.create(lineCount ?? 1, 1);
		
		var openNamespace: ContextNamespace | undefined = undefined;
		var statements = this._statements;
		var parentContext: Context = this;

		if (node.children.scriptStatement) {
			for (const each of node.children.scriptStatement) {
				this.ignoreException(() => {
					let c = each.children;

					if (c.requiresPackage) {
						let reqpack = new ContextRequiresPackage(c.requiresPackage[0], parentContext);
						this._requires.push(reqpack);
						statements.push(reqpack);

					} else if(c.pinNamespace) {
						statements.push(new ContextPinNamespace(c.pinNamespace[0], parentContext));

					} else if (c.openNamespace) {
						let prevNamespace = openNamespace;

						openNamespace = new ContextNamespace(c.openNamespace[0], this);
						openNamespace.lastNamespace(lastPosition);
						this._statements.push(openNamespace);
						this._namespaces.push(openNamespace);

						if (prevNamespace) {
							prevNamespace.nextNamespace(openNamespace);
						}

						statements = openNamespace.statements;
						parentContext = openNamespace;

					} else if (c.scriptDeclaration) {
						let declNode = c.scriptDeclaration[0].children;
						let typemod = declNode.typeModifiers?.at(0);

						if (declNode.declareClass) {
							statements.push(new ContextClass(declNode.declareClass[0], typemod, parentContext));

						} else if (declNode.declareInterface) {
							statements.push(new ContextInterface(declNode.declareInterface[0], typemod, parentContext));

						} else if (declNode.declareEnumeration) {
							statements.push(new ContextEnumeration(declNode.declareEnumeration[0], typemod, parentContext));
						}
					}
				});
			}
		}
		
		for (const each of document.documentationTokens) {
			this._documentations.push(new ContextDocumentation(each, this));
		}
		
		for (const each of document.commentTokens) {
			this._comments.push(new ContextComment(each, this));
		}
		
		var dociter = new ContextDocumentationIterator(this._documentations);
		for (const each of this._statements) {
			each.consumeDocumentation(dociter);
		}
		
		for (const each of this._namespaces) {
			each.addChildDocumentSymbols(each.statements);
		}
		
		for (const each of this._statements) {
			if (each.documentSymbol) {
				this.documentSymbols.push(each.documentSymbol);
			}
		}
	}
	
	public dispose(): void {
		super.dispose();
		for (const each of this._statements) {
			each.dispose();
		}
		for (const each of this._documentations) {
			each.dispose();
		}
		for (const each of this._comments) {
			each.dispose();
		}
	}


	public get settings(): DSSettings {
		return this._settings;
	}
	
	public get documentUri(): URI | undefined {
		return this.uri;
	}

	public get requires(): ContextRequiresPackage[] {
		return this._requires;
	}

	public get statements(): Context[] {
		return this._statements;
	}
	
	public statementBefore(position: Position): Context | undefined {
		var statement: Context | undefined;
		for (const each of this._statements) {
			const stapos = each.range?.end;
			if (stapos && Helpers.isPositionBefore(position, stapos)) {
				break;
			}
			statement = each;
		}
		return statement;
	}
	
	public lastStatementWithType(type: Context.ContextType, before?: Context): Context | undefined {
		var found: Context | undefined;
		for (const each of this._statements) {
			if (each === before) {
				break;
			}
			if (each.type === type) {
				found = each;
			}
		}
		return found;
	}
	
	public get documentations(): ContextDocumentation[] {
		return this._documentations;
	}
	
	public get comments(): ContextComment[] {
		return this._comments;
	}
	
	public collectWorkspaceSymbols(list: SymbolInformation[]): void {
		super.collectWorkspaceSymbols(list);
		for (const each of this._statements) {
			each.collectWorkspaceSymbols(list);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		return this.contextAtPositionList(this._documentations, position)
			?? this.contextAtPositionList(this._comments, position)
			?? this.contextAtPositionList(this._statements, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		return this.contextAtRangeList(this._documentations, range)
			?? this.contextAtRangeList(this._comments, range)
			?? this.contextAtRangeList(this._statements, range)
			?? this;
	}


	public resolveClasses(state: ResolveState): void {
		for (const each of this._statements) {
			each.resolveClasses(state);
		}
	}

	public resolveInheritance(state: ResolveState): void {
		for (const each of this._statements) {
			each.resolveInheritance(state);
		}
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		for (const each of this._statements) {
			each.resolveMembers(state);
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		for (const each of this._statements) {
			each.resolveStatements(state);
		}
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (DebugSettings.debugCompletion) {
			debugLogMessage('ContextScript.completion');
		}
		
		const range = CompletionHelper.wordRange(document, position);
		let items: CompletionItem[] = [];
		
		items.push(...CompletionHelper.createNamespace(this, range));
		items.push(...CompletionHelper.createClass(this, range));
		items.push(...CompletionHelper.createInterface(this, range));
		items.push(...CompletionHelper.createEnum(this, range));
		items.push(...CompletionHelper.createPin(this, range));
		items.push(...CompletionHelper.createRequires(this, range));
		
		return items;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Script`);
		this.logChildren(this._requires, console, prefixLines);
		this.logChildren(this._statements, console, prefixLines);
	}
}
