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
import { DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { TypeName } from "./typename";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveNamespace } from "../resolve/namespace";
import { Helpers } from "../helpers";


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
		this.documentSymbol = DocumentSymbol.create(this._typename.lastPart.name.name,
			this._typename.name, SymbolKind.Namespace, this.range,
			Helpers.rangeFrom(tokPin, tokName, true, true));
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
		this._typename.resolveNamespace(state);
	}

	public resolveInheritance(state: ResolveState): void {
		this.addPinToState(state);
	}

	public resolveMembers(state: ResolveState): void {
		this.addPinToState(state);
	}

	public resolveStatements(state: ResolveState): void {
		this.addPinToState(state);
	}

	protected addPinToState(state: ResolveState): void {
		const ns = this._typename.lastPart?.resolve;
		if (ns && ns instanceof ResolveNamespace) {
			state.pins.push(ns);
		}
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}

		let ft = this._typename.firstToken;
		let lt = this._typename.lastToken;
		if (ft && lt && Helpers.isPositionInsideRange(Helpers.rangeFrom(ft, lt), position)) {
			return this;
		}

		return undefined;
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


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Pin: ${this._typename.name}`);
	}
}
