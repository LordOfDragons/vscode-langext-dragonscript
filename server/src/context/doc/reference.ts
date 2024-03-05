/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { Position, Range, RemoteConsole } from "vscode-languageserver";
import { Helpers } from "../../helpers";
import { DocumentationReferenceCstNode } from "../../nodeclasses/doc/reference";
import { Resolved } from "../../resolve/resolved";
import { ResolveState } from "../../resolve/state";
import { Context } from "../context";
import { ContextDocBase } from "./contextDoc";
import { ContextDocumentationDocState } from "./docState";


export class ContextDocumentationReference extends ContextDocBase{
	protected _node: DocumentationReferenceCstNode;
	protected _target: string;
	protected _resolved?: Resolved;
	
	
	constructor(node: DocumentationReferenceCstNode, parent: Context) {
		super(Context.ContextType.DocumentationReference, parent);
		this._node = node;
		this._target = node.children.target[0].image;
	}
	
	dispose(): void {
		this._resolved = undefined; // no dispose!
		
		super.dispose();
	}
	
	
	public get node(): DocumentationReferenceCstNode {
		return this._node;
	}
	
	public get target(): string {
		return this._target;
	}
	
	
	public resolveStatements(state: ResolveState): void {
		this._resolved = undefined; // no dispose!
		
		if (this._target) {
			this._resolved = this.resolveSymbol(state, this.parseSymbol(this._target));
		}
	}
	
	
	public buildDoc(state: ContextDocumentationDocState): void {
		if (this._resolved) {
			const l = this._resolved.resolveLocation.at(0);
			if (l) {
				state.addWord(`[${this._resolved.linkName}](${l.uri}#L${l.range.start.line + 1})`);
				return;
			}
		}
		state.addWord(this._target);
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
	
	
	log(console: RemoteConsole, prefix: string = "", _prefixLines: string = "") {
		console.log(`${prefix}Reference`);
	}
}
