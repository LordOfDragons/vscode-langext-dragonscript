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
import { ScriptCstNode } from "../nodeclasses/script";
import { DocumentSymbol, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { ContextPinNamespace } from "./pinNamespace";
import { ContextNamespace } from "./namespace";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextRequiresPackage } from "./requiresPackage";
import { TextDocument } from "vscode-languageserver-textdocument";


/** Top level script context. */
export class ContextScript extends Context{
	protected _node: ScriptCstNode;
	protected _statements: Context[] = [];
	protected _requires: ContextRequiresPackage[] = [];
	protected _namespaces: ContextNamespace[] = [];
	public documentSymbols: DocumentSymbol[] = [];


	constructor(node: ScriptCstNode, textDocument?: TextDocument, lineCount?: number) {
		super(Context.ContextType.Script);
		this._node = node;

		let lastPosition = textDocument
			? textDocument.positionAt(textDocument.getText().length)
			: Position.create(lineCount ?? 1, 1);
		
		var openNamespace: ContextNamespace | undefined = undefined;
		var statements = this._statements;
		var parentContext: Context = this;

		node.children.scriptStatement.forEach(each => {
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

		this._namespaces.forEach(each => each.addChildDocumentSymbols(each.statements));

		this._statements.forEach(each => {
			if (each.documentSymbol) {
				this.documentSymbols.push(each.documentSymbol);
			}
		});
	}

	public dispose(): void {
		super.dispose();
		this._statements.forEach(each => each.dispose());
	}


	public get node(): ScriptCstNode{
		return this._node;
	}

	public get requires(): ContextRequiresPackage[] {
		return this._requires;
	}

	public get statements(): Context[] {
		return this._statements;
	}

	public contextAtPosition(position: Position): Context | undefined {
		return this.contextAtPositionList(this._statements, position);
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Script`);
		this.logChildren(this._requires, console, prefixLines);
		this.logChildren(this._statements, console, prefixLines);
	}
}
