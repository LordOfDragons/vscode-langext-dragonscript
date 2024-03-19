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
import { PinNamespaceCstNode } from "../nodeclasses/pinNamespace";
import { CompletionItem, Definition, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { TypeName } from "./typename";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { ResolveType } from "../resolve/type";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { TextDocument } from "vscode-languageserver-textdocument";


export class ContextPinNamespace extends Context{
	protected _node: PinNamespaceCstNode;
	protected _typename: TypeName;


	constructor(node: PinNamespaceCstNode, parent: Context) {
		super(Context.ContextType.PinNamespace, parent);
		this._node = node;
		this._typename = new TypeName(node.children.name[0]);

		let tokPin = node.children.pin[0];
		let tokName = this._typename.lastToken || tokPin;
		
		this.range = Helpers.rangeFrom(tokPin, tokName, true, false);
		
		const name = this._typename.lastPart?.name.name;
		if (name) {
			this.documentSymbol = DocumentSymbol.create(name,
				this._typename.name, SymbolKind.Namespace, this.range,
				Helpers.rangeFrom(tokPin, tokName, true, true));
		}
	}

	dispose(): void {
		super.dispose();
		this._typename?.dispose();
	}


	public get node(): PinNamespaceCstNode {
		return this._node;
	}

	public get typename(): TypeName {
		return this._typename;
	}

	public get fullyQualifiedName(): string {
		return this._typename.name;
	}

	public get simpleName(): string {
		return this._typename.name;
	}

	public resolveClasses(state: ResolveState): void {
		this._typename.resolveNamespace(state, this);
	}

	public resolveInheritance(state: ResolveState): void {
		this.addPinToState(state);
	}

	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		this.addPinToState(state);
	}

	public resolveStatements(state: ResolveState): void {
		this.addPinToState(state);
	}

	protected addPinToState(state: ResolveState): void {
		const ns = this._typename.lastPart?.resolve?.resolved as ResolveNamespace;
		if (ns?.type === ResolveType.Type.Namespace) {
			state.pins.push(ns);
		}
	}
	
	public searchExpression(search: ResolveSearch, moveUp: boolean, before: Context): void {
		super.searchExpression(search, moveUp, before);
		const ns = this._typename.lastPart?.resolve?.resolved as ResolveNamespace;
		if (ns?.type === ResolveType.Type.Namespace) {
			ns.search(search);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this;
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
	
	public definition(position: Position): Definition {
		return this._typename.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		for (const each of this._typename.parts) {
			if (each.name.isPositionInside(position)) {
				return each.resolve?.resolved;
			}
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		var r: Location | undefined;
		for (const each of this._typename.parts) {
			if (each.resolve === usage) {
				return each.name.location(this);
			}
		}
		return r ?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._typename.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._typename) {
			return this._typename.completion(document, position, this);
		}
		return [];
	}
	

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Pin: ${this._typename.name}`);
	}
}
