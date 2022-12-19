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
import { DocumentSymbol, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { ContextPinNamespace } from "./pinNamespace";
import { ContextNamespace } from "./namespace";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextEnumeration } from "./scriptEnum";
import { ContextRequiresPackage } from "./requiresPackage";
import { TextDocument } from "vscode-languageserver-textdocument";
import { debugLogMessage } from "../server";


/** Top level script context. */
export class ContextScript extends Context{
	protected _node: ScriptCstNode;
	protected _statements: Context[];
	protected _requires: ContextRequiresPackage[];


	constructor(node: ScriptCstNode, textDocument: TextDocument) {
		super(Context.ContextType.Script);
		this._node = node;
		this._statements = [];
		this._requires = [];

		let lastPosition = textDocument.positionAt(textDocument.getText().length);
		var openNamespace: ContextNamespace | undefined = undefined;

		node.children.scriptStatement.forEach(each => {
			let c = each.children;
			let statements = openNamespace ? openNamespace.statements : this._statements;

			if (c.requiresPackage) {
				let reqpack = new ContextRequiresPackage(c.requiresPackage[0]);
				this._requires.push(reqpack);
				statements.push(reqpack);
			} else if(c.pinNamespace) {
				statements.push(new ContextPinNamespace(c.pinNamespace[0]));
			} else if (c.openNamespace) {
				let prevNamespace = openNamespace;
				openNamespace = new ContextNamespace(c.openNamespace[0]);
				openNamespace.lastNamespace(lastPosition);
				this._statements.push(openNamespace);
				if (prevNamespace) {
					prevNamespace.nextNamespace(openNamespace);
				}
			} else if (c.scriptDeclaration) {
				let declNode = c.scriptDeclaration[0].children;
				let typemod = declNode.typeModifiers?.at(0);
				if (declNode.declareClass) {
					statements.push(new ContextClass(declNode.declareClass[0], typemod));
				} else if (declNode.declareInterface) {
					statements.push(new ContextInterface(declNode.declareInterface[0], typemod));
				} else if (declNode.declareEnumeration) {
					statements.push(new ContextEnumeration(declNode.declareEnumeration[0], typemod));
				}
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

	/** Get document symbols. */
	public get documentSymbols(): DocumentSymbol[] {
		let list: DocumentSymbol[] = [];
		this._statements.forEach(each => {
			let s = each.documentSymbol;
			if (s) {
				list.push(s);
			}
		});
		return list;
	}


	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Script`);
		this.logChildren(this._requires, console, prefixLines);
		this.logChildren(this._statements, console, prefixLines);
	}
}
