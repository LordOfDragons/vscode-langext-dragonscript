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
import { Hover, integer, Position, Range, RemoteConsole } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { ExpressionMemberCstNode, ExpressionObjectCstNode } from "../nodeclasses/expressionObject";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";


export class ContextMember extends Context{
	protected _node: ExpressionObjectCstNode | ExpressionMemberCstNode;
	protected _memberIndex: integer
	protected _object?: Context;
	protected _name?: Identifier;


	protected constructor(node: ExpressionObjectCstNode | ExpressionMemberCstNode,
			memberIndex: integer, parent: Context) {
		super(Context.ContextType.Member, parent);
		this._node = node;
		this._memberIndex = memberIndex;
	}

	public static newObject(node: ExpressionObjectCstNode, memberIndex: integer,
			object: Context | undefined, parent: Context) {
		let cm = new ContextMember(node, memberIndex, parent);
		cm._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0], cm);
		cm._name = new Identifier(node.children.member![memberIndex].children.name[0]);
		cm.updateRange();
		return cm;
	}

	public static newMember(node: ExpressionMemberCstNode, parent: Context) {
		let cm = new ContextMember(node, 0, parent);
		cm._name = new Identifier(node.children.name[0]);
		cm.updateRange();
		return cm;
	}

	public dispose(): void {
		super.dispose();
		this._object?.dispose();
	}


	public get node(): ExpressionObjectCstNode | ExpressionMemberCstNode {
		return this._node;
	}

	public get memberIndex(): integer {
		return this._memberIndex;
	}

	public get object(): Context {
		return this._object!;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	
	public resolveStatements(state: ResolveState): void {
		this._object?.resolveStatements(state);
	}


	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}

		if (this._name?.isPositionInside(position)) {
			return this;
		}

		return this._object?.contextAtPosition(position);
	}


	protected updateRange(): void {
		if (!this._name?.range) {
			return;
		}

		const rangeBegin = this.object?.range?.start || this._name.range.start;
		const rangeEnd = this._name.range.end;

		this.range = Range.create(rangeBegin, rangeEnd);
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._name?.range) {
			return null;
		}

		let content = [];
		if (this._object) {
			content.push(`**member** ${this._name.name}`);
		} else {
			content.push(`**member** ${this._name.name}`);
		}
		return new HoverInfo(content, this._name.range);
	}

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Member ${this._name}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
	}
}