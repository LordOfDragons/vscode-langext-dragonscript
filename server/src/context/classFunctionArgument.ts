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
import { CompletionItem, Definition, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver"
import { TypeName } from "./typename";
import { Identifier } from "./identifier";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { ResolveArgument } from "../resolve/argument";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextFunctionArgument extends Context{
	protected _node: FunctionArgumentCstNode;
	protected _name: Identifier;
	protected _typename: TypeName;
	protected _resolveArgument?: ResolveArgument;
	
	
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
		this._resolveArgument?.dispose();
		this._resolveArgument = undefined;
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
	
	public get resolveArgument(): ResolveArgument | undefined {
		return this._resolveArgument;
	}
	
	public resolveMembers(state: ResolveState): void {
		this._typename?.resolveType(state, this);
		
		this._resolveArgument?.dispose();
		this._resolveArgument = undefined;
		
		this._resolveArgument = new ResolveArgument(this);
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this;
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
		content.push(`**argument** *${this._typename}* **${this._name}**`);
		return content;
	}
	
	protected updateReportInfoText(): string {
		return `argument ${this._typename} ${this._name}`;
	}
	
	public definition(position: Position): Definition {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (this._typename.isPositionInside(position)) {
			return this._typename.definition(position);
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
			return this._resolveArgument;
		} else if (this._typename?.isPositionInside(position)) {
			return this._typename.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._typename?.location(this)
			?? this._name?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const npos = this._name.range?.start;
		if (!npos || Helpers.isPositionBefore(position, npos)) {
			const range = this._typename.range;
			if (range) {
				return CompletionHelper.createType(range, this);
			}
		}
		return super.completion(document, position);
	}
	
	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Argument ${this._typename.name} ${this._name}`)
	}
}
