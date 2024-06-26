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
import { CompletionItem, Hover, Position, Range, RemoteConsole, SignatureHelp } from "vscode-languageserver";
import { ExpressionConstantCstNode } from "../nodeclasses/expressionObject";
import { Identifier } from "./identifier";
import { ResolveState } from "../resolve/state";
import { ResolveType } from "../resolve/type";
import { ResolveNamespace } from "../resolve/namespace";
import { HoverInfo } from "../hoverinfo";
import { Helpers } from "../helpers";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";


export class ContextConstant extends Context{
	protected _name: Identifier;
	protected _constantType: ContextConstant.ConstantType = ContextConstant.ConstantType.null;
	protected _constantValue?: number | string | boolean | null = null;
	protected _resolveType?: ResolveType;


	constructor(node: ExpressionConstantCstNode, parent: Context) {
		super(Context.ContextType.Constant, parent);
		
		const c = node.children;
		
		if (c.literalByte) {
			this._name = new Identifier(c.literalByte[0]);
			this._constantType = ContextConstant.ConstantType.literalByte;
			
		} else if (c.literalIntByte) {
			this._name = new Identifier(c.literalIntByte[0]);
			this._constantType = ContextConstant.ConstantType.literalIntByte;
			
		} else if (c.literalIntHex) {
			this._name = new Identifier(c.literalIntHex[0]);
			this._constantType = ContextConstant.ConstantType.literalIntHex;
			
		} else if (c.literalIntOct) {
			this._name = new Identifier(c.literalIntOct[0]);
			this._constantType = ContextConstant.ConstantType.literalIntOct;
			
		} else if (c.literalInt) {
			this._name = new Identifier(c.literalInt[0]);
			this._constantType = ContextConstant.ConstantType.literalInt;
			
		} else if (c.literalFloat) {
			this._name = new Identifier(c.literalFloat[0]);
			this._constantType = ContextConstant.ConstantType.literalFloat;
			
		} else if (c.string) {
			this._name = new Identifier(c.string[0]);
			this._constantType = ContextConstant.ConstantType.string;
			
		} else if (c.true) {
			this._name = new Identifier(c.true[0]);
			this._constantType = ContextConstant.ConstantType.true;
			
		} else if (c.false) {
			this._name = new Identifier(c.false[0]);
			this._constantType = ContextConstant.ConstantType.false;
			
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

	
	public get name(): Identifier {
		return this._name!;
	}

	public get constantType(): ContextConstant.ConstantType {
		return this._constantType;
	}
	
	public get constantValue(): number | string | boolean | undefined {
		if (this._constantValue === null) {
			this._constantValue = this.updateConstantValue();
		}
		return this._constantValue;
	}
	
	private updateConstantValue(): number | string | boolean | undefined {
		if (!this._name.name) {
			return undefined;
		}
		
		switch (this._constantType) {
		case ContextConstant.ConstantType.literalByte:
			return Helpers.dsLiteralByteToNum(this._name.name);
			
		case ContextConstant.ConstantType.literalIntByte:
			return Helpers.dsLiteralIntByteToNum(this._name.name);
			
		case ContextConstant.ConstantType.literalIntHex:
			return Helpers.dsLiteralIntHexToNum(this._name.name);
			
		case ContextConstant.ConstantType.literalIntOct:
			return Helpers.dsLiteralOctByteToNum(this._name.name);
			
		case ContextConstant.ConstantType.literalInt:
			return parseInt(this._name.name, 10);
			
		case ContextConstant.ConstantType.literalFloat:
			return parseFloat(this._name.name);
			
		case ContextConstant.ConstantType.string:
			return Helpers.dsLiteralString(this._name.name);
			
		case ContextConstant.ConstantType.true:
			return true;
			
		case ContextConstant.ConstantType.false:
			return false;
			
		default:
			return undefined;
		}
	}
	
	protected updateResolveTextLong(): string[] {
		return [`literal '${this.constantValue?.toString() ?? '?'}'`];
	}
	
	protected updateResolveTextShort(): string {
		return `literal '${this.constantValue?.toString() ?? '?'}'`;
	}
	
	protected updateReportInfoText(): string {
		return `literal '${this.constantValue?.toString() ?? '?'}'`;
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
				this.expressionAutoCast = Context.AutoCast.LiteralBool;
				break;

			case ContextConstant.ConstantType.this:
				this._resolveType = state.topScopeClass?.resolveClass;
				break;

			case ContextConstant.ConstantType.super:
				this._resolveType = state.topScopeClass?.extends?.resolve?.resolved as ResolveType;
				break;
				
			case ContextConstant.ConstantType.null:
				this._resolveType = ResolveNamespace.classObject;
				this.expressionAutoCast = Context.AutoCast.KeywordNull;
		}

		this.expressionType = this._resolveType;
		this.expressionTypeType = Context.ExpressionType.Object;
		
		// find problems
		switch (this._constantType) {
		case ContextConstant.ConstantType.this:
		case ContextConstant.ConstantType.super:
			if (state.topScopeFunction?.isBodyStatic) {
				this._resolveType = undefined;
				this.expressionType = undefined;
				this.expressionTypeType = Context.ExpressionType.Void;
				state.reportError(this._name.range, 'Can not use this/super in static function');
			}
			break;
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
			content.push(` *${this._resolveType.simpleNameLink}* `);
		}
		
		switch (this._constantType) {
			case ContextConstant.ConstantType.literalByte:
			case ContextConstant.ConstantType.literalIntByte:
			case ContextConstant.ConstantType.literalIntOct:
			case ContextConstant.ConstantType.literalIntHex:
			case ContextConstant.ConstantType.literalInt:{
				const v = this.constantValue as number;
				if (v !== undefined) {
					content.push(`: ${v.toFixed(0)}`);

					content.push(` | hex(${v.toString(16)})`);

					if (v < 256) {
						content.push(` | bin(${Helpers.numToBin(v)})`);
						
						if (v >= 32 && v <= 126) {
							try {
								content.push(` | char(${String.fromCodePoint(v)})`);
							} catch {
							}
						}
					}
				}
				}break;

			case ContextConstant.ConstantType.string:
				const v = this.constantValue as string;
				if (v) {
					content.push(`: length ${[...v].length}`);
				}
				break;
		}

		return new HoverInfo([content.join('')], this._name.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const range = this._name?.range ?? CompletionHelper.wordRange(document, position);
		return CompletionHelper.createStatementOrExpression(range, this);
	}
	
	public signatureHelpAtPosition(position: Position): SignatureHelp | undefined {
		return this.parent?.signatureHelpAtPosition(position);
	}
	
	public sameValue(other: Context | undefined): boolean | undefined {
		if (!other || other.type !== this.type) {
			return undefined;
		}
		
		const m2 = other as ContextConstant;
		
		switch (this._constantType) {
		case ContextConstant.ConstantType.literalByte:
		case ContextConstant.ConstantType.literalIntByte:
		case ContextConstant.ConstantType.literalIntHex:
		case ContextConstant.ConstantType.literalIntOct:
		case ContextConstant.ConstantType.literalInt:
		case ContextConstant.ConstantType.literalFloat:
			switch (m2._constantType) {
			case ContextConstant.ConstantType.literalByte:
			case ContextConstant.ConstantType.literalIntByte:
			case ContextConstant.ConstantType.literalIntHex:
			case ContextConstant.ConstantType.literalIntOct:
			case ContextConstant.ConstantType.literalInt:
			case ContextConstant.ConstantType.literalFloat:
				return m2.constantValue == this.constantValue;
				
			default:
				return undefined;
			}
			
		case ContextConstant.ConstantType.string:
			return false;
			
		case ContextConstant.ConstantType.true:
		case ContextConstant.ConstantType.false:
		case ContextConstant.ConstantType.null:
		case ContextConstant.ConstantType.this:
		case ContextConstant.ConstantType.super:
			return m2._constantType === this._constantType && m2.constantValue == this.constantValue;
			
		default:
			return undefined;
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Constant ${this._name} ${this.logRange}`);
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
