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

import { Context } from "./context"
import { FunctionArgumentCstNode } from "../nodeclasses/declareFunction";
import { DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename";
import { Identifier } from "./identifier";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";
import { ResolveType } from "../resolve/type";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ResolveClass } from "../resolve/class";


export class ContextFunctionArgument extends Context{
	protected _node: FunctionArgumentCstNode;
	protected _name: Identifier;
	protected _typename: TypeName;


	constructor(node: FunctionArgumentCstNode, parent: Context) {
		super(Context.ContextType.FunctionArgument, parent)
		this._node = node
		this._name = new Identifier(node.children.name[0]);
		this._typename = new TypeName(node.children.type[0]);

		let tokBegin = node.children.type[0].children.identifier[0];
		let tokEnd = node.children.name[0];
		this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
		this.documentSymbol = DocumentSymbol.create(this._name.name, this._typename.name,
			SymbolKind.Variable, this.range, Helpers.rangeFrom(tokBegin, tokEnd, true, true));
	}

	dispose(): void {
		super.dispose()
		this._typename.dispose();
	}


	public get node(): FunctionArgumentCstNode {
		return this._node
	}

	public get name(): Identifier {
		return this._name
	}

	public get typename(): TypeName {
		return this._typename
	}

	public get fullyQualifiedName(): string {
		return this._name.name;
	}

	public get simpleName(): string {
		return this._name.name;
	}

	public resolveMembers(state: ResolveState): void {
		if (this._typename) {
			this._typename.resolveType(state);
		}
	}

	public resolveStatements(state: ResolveState): void {
		const parentClass = (this.parent?.parent as ContextClass).resolveClass;
		if (parentClass) {
			let pcr = parentClass;
			while (pcr) {
				const v = pcr.variable(this._name.name);
				if (v) {
					if (v.canAccess(parentClass)) {
						state.reportWarning(this._name.range, `Parameter shadows variable ${this._name.name} in ${pcr.fullyQualifiedName}`);
					}
					break;
				}
				pcr = (pcr.parent as ResolveClass)?.context?.extends?.resolve as ResolveClass;
			}
		}
	}

	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}

		if (this._name.isPositionInside(position)) {
			return this;
		}
		if (this._typename.isPositionInside(position)) {
			return this;
		}
		return undefined;
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
			return new HoverInfo(this.resolveTextLong, this._name.range);
		}
		if (this._typename.isPositionInside(position)) {
			return this._typename.hover(position);
		}
		return null;
	}

	protected updateResolveTextShort(): string {
		return `${this._typename} ${this._name}`;
	}

	protected updateResolveTextLong(): string[] {
		let content = [];
		content.push(`**parameter** *${this._typename}* **${this._name}**`);
		return content;
	}

	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Argument ${this._typename.name} ${this._name}`)
	}
}
