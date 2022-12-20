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
import { OpenNamespaceCstNode } from "../nodeclasses/openNamespace";
import { DocumentSymbol, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { TypeName } from "./typename";


export class ContextNamespace extends Context{
	protected _node: OpenNamespaceCstNode;
	protected _typename: TypeName;
	protected _statements: Context[];


	constructor(node: OpenNamespaceCstNode) {
		super(Context.ContextType.Namespace);
		this._node = node;
		this._typename = new TypeName(node.children.name[0]);
		this._statements = [];

		let tokNS = node.children.namespace[0];
		let tokName = this._typename.lastToken || tokNS;

		this.documentSymbol = DocumentSymbol.create(this._typename.lastPart.name.name,
			this._typename.name, SymbolKind.Namespace, this.rangeFrom(tokNS, tokName, true, false),
			this.rangeFrom(tokName, tokName, true, true));
	}

	dispose(): void {
		super.dispose()
		this._typename?.dispose();
		this._statements.forEach(each => each.dispose());
	}


	public get node(): OpenNamespaceCstNode {
		return this._node;
	}

	public get typename(): TypeName {
		return this._typename;
	}

	public get statements(): Context[] {
		return this._statements;
	}


	public nextNamespace(namespace: ContextNamespace): void {
		let s = namespace.documentSymbol?.range.start;
		if (this.documentSymbol && s) {
			this.documentSymbol.range.end = s;
			this.documentSymbol.selectionRange.end = s;
		}
	}

	public lastNamespace(position: Position) {
		if (this.documentSymbol) {
			this.documentSymbol.range.end = position;
			this.documentSymbol.selectionRange.end = position;
		}
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Namespace: ${this._typename.name}`);
		this.logChildren(this._statements, console, prefixLines);
	}
}
