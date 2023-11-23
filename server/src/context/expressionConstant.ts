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
import { Hover, Position, RemoteConsole } from "vscode-languageserver";
import { ExpressionConstantCstNode } from "../nodeclasses/expressionObject";
import { Identifier } from "./identifier";
import { ResolveState } from "../resolve/state";
import { ResolveType } from "../resolve/type";
import { ResolveNamespace } from "../resolve/namespace";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";


export class ContextConstant extends Context{
	protected _node: ExpressionConstantCstNode;
	protected _name: Identifier;
	protected _constantType: ContextConstant.ConstantType = ContextConstant.ConstantType.null;
	protected _constantValue?: number | string | boolean;
	protected _resolveType?: ResolveType;


	constructor(node: ExpressionConstantCstNode, parent: Context) {
		super(Context.ContextType.Constant, parent);
		this._node = node;

		let c = node.children;

		if (c.literalByte) {
			this._name = new Identifier(c.literalByte[0]);
			this._constantType = ContextConstant.ConstantType.literalByte;
			this._constantValue = Helpers.dsLiteralByteToNum(this._name.name);

		} else if (c.literalIntByte) {
			this._name = new Identifier(c.literalIntByte[0]);
			this._constantType = ContextConstant.ConstantType.literalIntByte;
			this._constantValue = Helpers.dsLiteralIntByteToNum(this._name.name);

		} else if (c.literalIntHex) {
			this._name = new Identifier(c.literalIntHex[0]);
			this._constantType = ContextConstant.ConstantType.literalIntHex;
			this._constantValue = Helpers.dsLiteralIntHexToNum(this._name.name);

		} else if (c.literalIntOct) {
			this._name = new Identifier(c.literalIntOct[0]);
			this._constantType = ContextConstant.ConstantType.literalIntOct;
			this._constantValue = Helpers.dsLiteralOctByteToNum(this._name.name);

		} else if (c.literalInt) {
			this._name = new Identifier(c.literalInt[0]);
			this._constantType = ContextConstant.ConstantType.literalInt;
			this._constantValue = parseInt(this._name.name, 10);

		} else if (c.literalFloat) {
			this._name = new Identifier(c.literalFloat[0]);
			this._constantType = ContextConstant.ConstantType.literalFloat;
			this._constantValue = parseFloat(this._name.name);

		} else if (c.string) {
			this._name = new Identifier(c.string[0]);
			this._constantType = ContextConstant.ConstantType.string;
			this._constantValue = this._name.name;

		} else if (c.true) {
			this._name = new Identifier(c.true[0]);
			this._constantType = ContextConstant.ConstantType.true;
			this._constantValue = true;

		} else if (c.false) {
			this._name = new Identifier(c.false[0]);
			this._constantType = ContextConstant.ConstantType.false;
			this._constantValue = false;

		} else if (c.null) {
			this._name = new Identifier(c.null[0]);
			this._constantType = ContextConstant.ConstantType.null;

		} else if (c.this) {
			this._name = new Identifier(c.this[0]);
			this._constantType = ContextConstant.ConstantType.this;

		} else if (c.super) {
			this._name = new Identifier(c.super[0]);
			this._constantType = ContextConstant.ConstantType.super;

		} else {
			this._name = new Identifier(undefined, "??");
		}

		this.range = this._name.range;
	}


	public get node(): ExpressionConstantCstNode {
		return this._node;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	public get constantType(): ContextConstant.ConstantType {
		return this._constantType;
	}

	
	public resolveStatements(state: ResolveState): void {
		switch (this._constantType) {
			case ContextConstant.ConstantType.literalByte:
				if (this._name.name.startsWith("'\\u")) {
					this._resolveType = ResolveNamespace.classInt;
					this.expressionAutoCast = Context.AutoCast.LiteralInt;
				} else {
					this._resolveType = ResolveNamespace.classByte;
					this.expressionAutoCast = Context.AutoCast.LiteralByte;
				}
				break;

			case ContextConstant.ConstantType.literalIntByte:
			case ContextConstant.ConstantType.literalIntOct:
				this._resolveType = ResolveNamespace.classByte;
				this.expressionAutoCast = Context.AutoCast.LiteralByte;
				break;
		
			case ContextConstant.ConstantType.literalIntHex:
			case ContextConstant.ConstantType.literalInt:
				this._resolveType = ResolveNamespace.classInt;
				this.expressionAutoCast = Context.AutoCast.LiteralInt;
				break;

			case ContextConstant.ConstantType.literalFloat:
				this._resolveType = ResolveNamespace.classFloat;
				break;

			case ContextConstant.ConstantType.string:
				this._resolveType = ResolveNamespace.classString;
				break;

			case ContextConstant.ConstantType.true:
			case ContextConstant.ConstantType.false:
				this._resolveType = ResolveNamespace.classBool;
				break;

			case ContextConstant.ConstantType.this:
				this._resolveType = state.topScopeClass?.resolveClass;
				break;

			case ContextConstant.ConstantType.super:
				this._resolveType = state.topScopeClass?.extends?.resolve;
				break;
		}

		this.expressionType = this._resolveType;
	}


	public contextAtPosition(position: Position): Context | undefined {
		return Helpers.isPositionInsideRange(this.range, position) ? this : undefined;
	}

	protected updateHover(position: Position): Hover | null {
		if (!this._name.range) {
			return null;
		}

		let content = [];
		
		switch (this._constantType) {
			case ContextConstant.ConstantType.this:
				content.push(`**this**`);
				break;
				
			case ContextConstant.ConstantType.super:
				content.push(`**super**`);
				break;

			case ContextConstant.ConstantType.null:
			case ContextConstant.ConstantType.true:
			case ContextConstant.ConstantType.false:
				return null;

			default:
				content.push(`**constant**`);
		}

		if (this._resolveType) {
			content.push(` *${this._resolveType.fullyQualifiedName}* `);
		}

		switch (this._constantType) {
			case ContextConstant.ConstantType.literalByte:
			case ContextConstant.ConstantType.literalIntByte:
			case ContextConstant.ConstantType.literalIntOct:
			case ContextConstant.ConstantType.literalIntHex:
			case ContextConstant.ConstantType.literalInt:{
				const v = this._constantValue as number;
				if (v) {
					content.push(`: ${v.toFixed(0)}`);

					content.push(` hex(${v.toString(16)})`);

					if (v < 256) {
						content.push(` bin(${Helpers.numToBin(v)})`);
					}
					
					/*
					try {
						const c = String.fromCodePoint(v);
						if (c && c.length > 0) {
							content.push(` char(${c})`);
						}
					} catch {
					}
					*/
				}
				}break;

			case ContextConstant.ConstantType.string:
				const v = this._constantValue as string;
				if (v) {
					content.push(`: length ${v.length}`);
				}
				break;
		}

		return new HoverInfo(content, this._name.range);
	}

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Constant ${this._name}`);
	}
}

export namespace ContextConstant {
	/** Function type. */
	export enum ConstantType {
		literalByte,
		literalIntByte,
		literalIntHex,
		literalIntOct,
		literalInt,
		literalFloat,
		string,
		true,
		false,
		null,
		this,
		super
	}
}
