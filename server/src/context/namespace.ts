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
import { Definition, DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { TypeName } from "./typename";
import { HoverInfo } from "../hoverinfo";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveState } from "../resolve/state";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";


export class ContextNamespace extends Context{
	protected _node: OpenNamespaceCstNode;
	protected _typename: TypeName;
	protected _statements: Context[];
	protected _resolveNamespace?: ResolveNamespace;


	constructor(node: OpenNamespaceCstNode, parent: Context) {
		super(Context.ContextType.Namespace, parent);
		this._node = node;
		this._typename = new TypeName(node.children.name[0]);
		this._statements = [];

		let tokNS = node.children.namespace[0];
		let tokName = this._typename.lastToken || tokNS;

		this.range = Helpers.rangeFrom(tokNS, tokName, true, false);
		this.documentSymbol = DocumentSymbol.create(this._typename.lastPart.name.name,
			this._typename.name, SymbolKind.Namespace, this.range,
			Helpers.rangeFrom(tokName, tokName, true, true));
	}

	dispose(): void {
		this._resolveNamespace?.removeContext(this);
		this._resolveNamespace = undefined;

		super.dispose()

		this._typename?.dispose();
		for (const each of this._statements) {
			each.dispose();
		}
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

	public get parentNamespace(): ContextNamespace | undefined {
		return this;
	}
	
	public get resolveNamespace(): ResolveNamespace | undefined {
		return this._resolveNamespace;
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._statements, position)
			?? this;
	}


	public nextNamespace(namespace: ContextNamespace): void {
		let s = namespace.range?.start;
		if (s) {
			if (this.documentSymbol) {
				this.documentSymbol.range.end = s;
				this.documentSymbol.selectionRange.end = s;
			}
			if (this.range) {
				this.range.end = s;
			}
		}
	}

	public lastNamespace(position: Position) {
		if (this.documentSymbol) {
			this.documentSymbol.range.end = position;
			this.documentSymbol.selectionRange.end = position;
		}
		if (this.range) {
			this.range.end = position;
		}
	}

	public get fullyQualifiedName(): string {
		return this._typename.name;
	}

	public get simpleName(): string {
		return this._typename.name;
	}

	public resolveClasses(state: ResolveState): void {
		this._resolveNamespace?.removeContext(this);
		this._resolveNamespace = this._typename.resolveNamespace(state);
		this._resolveNamespace?.addContext(this);

		state.withScopeContext(this, () => {
			for (const each of this._statements) {
				each.resolveClasses(state);
			}
		});
	}
	
	public resolveInheritance(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._statements) {
				each.resolveInheritance(state);
			}
		});
	}
	
	public resolveMembers(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._statements) {
				each.resolveMembers(state);
			}
		});
	}

	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._statements) {
				each.resolveStatements(state);
			}
		});
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._typename.lastToken) {
			return null;
		}
		
		let parts = this._typename.parts;
		let plen = parts.length;
		if (plen == 0) {
			return null;
		}
		
		let content = [];

		while (plen > 1) {
			plen--;
			let tok = parts[plen].name.token;

			if (!tok || !Helpers.isPositionInsideToken(tok, position)) {
				continue;
			}

			let pn = parts.slice(0, plen).map(x => x.name.name).reduce((a, b) => `${a}.${b}`);
			content.push(`**namespace** *${pn}*.**${parts[plen].name}**`);	
			return new HoverInfo(content, Helpers.rangeFrom(tok));
		}

		let tok = parts[0].name.token;
		if (tok && Helpers.isPositionInsideToken(tok, position)) {
			content.push(`**namespace** **${parts[0].name}**`);
			return new HoverInfo(content, Helpers.rangeFrom(tok));
		}

		return null;
	}

	public search(search: ResolveSearch, before?: Context): void {
		this._resolveNamespace?.search(search);
	}
	
	public searchExpression(search: ResolveSearch, moveUp: boolean, before: Context): void {
		super.searchExpression(search, moveUp, before);
		for (const each of this._statements) {
			if (each === before) {
				break;
			}
			each.searchExpression(search, false, this);
		}
	}
	
	public definition(position: Position): Definition {
		return this._typename.definition(position);
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Namespace: ${this._typename.name}`);
		this.logChildren(this._statements, console, prefixLines);
	}
}
