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
import { DocumentSymbol, Hover, integer, Position, Range, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { ExpressionAdditionCstNode } from "../nodeclasses/expressionAddition";
import { ExpressionBitOperationCstNode } from "../nodeclasses/expressionBitOperation";
import { ExpressionCompareCstNode } from "../nodeclasses/expressionCompare";
import { ExpressionLogicCstNode } from "../nodeclasses/expressionLogic";
import { ExpressionMultiplyCstNode } from "../nodeclasses/expressionMultiply";
import { ExpressionPostfixCstNode } from "../nodeclasses/expressionPostfix";
import { ExpressionUnaryCstNode } from "../nodeclasses/expressionUnary";
import { ExpressionMemberCstNode, ExpressionObjectCstNode } from "../nodeclasses/expressionObject";
import { ExpressionAssignCstNode } from "../nodeclasses/expressionAssign";
import { ExpressionSpecialCstNode } from "../nodeclasses/expressionSpecial";
import { TypeName } from "./typename";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { FunctionCallCstNode } from "../nodeclasses/declareFunction";
import { IToken } from "chevrotain";
import { Helpers } from "../helpers";
import { ResolveNamespace } from "../resolve/namespace";


export class ContextFunctionCall extends Context{
	protected _node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
		| ExpressionCompareCstNode | ExpressionLogicCstNode
		| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
		| ExpressionUnaryCstNode | ExpressionObjectCstNode
		| ExpressionAssignCstNode | ExpressionSpecialCstNode
		| ExpressionMemberCstNode | FunctionCallCstNode;
	protected _moreIndex: integer;
	protected _object?: Context;
	protected _operator: boolean;
	protected _name?: Identifier;
	protected _arguments: Context[];
	protected _castType?: TypeName;
	protected _functionType: ContextFunctionCall.FunctionType = ContextFunctionCall.FunctionType.function;


	protected constructor(node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
			| ExpressionCompareCstNode | ExpressionLogicCstNode
			| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
			| ExpressionUnaryCstNode | ExpressionObjectCstNode
			| ExpressionAssignCstNode | ExpressionSpecialCstNode
			| ExpressionMemberCstNode | FunctionCallCstNode,
			moreIndex: integer, parent: Context) {
		super(Context.ContextType.FunctionCall, parent);
		this._node = node;
		this._moreIndex = moreIndex;
		this._operator = false;
		this._arguments = [];
	}

	public static newAddition(node: ExpressionAdditionCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionMultiply(node.children.left[0], cfc);
	
			let oper = each.children.operator[0].children;
			if (oper.add) {
				cfc._name = new Identifier(oper.add[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.add;
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.subtract;
			}
			cfc._operator = true;
			
			cfc._arguments.push(ContextBuilder.createExpressionMultiply(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newBitOperation(node: ExpressionBitOperationCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionAddition(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.shiftLeft) {
				cfc._name = new Identifier(oper.shiftLeft[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.shiftLeft;
			} else if(oper.shiftRight) {
				cfc._name = new Identifier(oper.shiftRight[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.shiftRight;
			} else if(oper.and) {
				cfc._name = new Identifier(oper.and[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.and;
			} else if(oper.or) {
				cfc._name = new Identifier(oper.or[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.or;
			} else if(oper.xor) {
				cfc._name = new Identifier(oper.xor[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.xor;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionAddition(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newCompare(node: ExpressionCompareCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionBitOperation(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.less) {
				cfc._name = new Identifier(oper.less[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.less;
			} else if(oper.greater) {
				cfc._name = new Identifier(oper.greater[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.greater;
			} else if(oper.lessEqual) {
				cfc._name = new Identifier(oper.lessEqual[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.lessEqual;
			} else if(oper.greaterEqual) {
				cfc._name = new Identifier(oper.greaterEqual[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.greaterEqual;
			} else if(oper.equals) {
				cfc._name = new Identifier(oper.equals[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.equals;
			} else if(oper.notEquals) {
				cfc._name = new Identifier(oper.notEquals[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.notEquals;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionBitOperation(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newLogic(node: ExpressionLogicCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionCompare(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.logicalAnd) {
				cfc._name = new Identifier(oper.logicalAnd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.logicalAnd;
			} else if(oper.logicalOr) {
				cfc._name = new Identifier(oper.logicalOr[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.logicalOr;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionCompare(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newMultiply(node: ExpressionMultiplyCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionPostfix(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.multiply) {
				cfc._name = new Identifier(oper.multiply[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.multiply;
			} else if(oper.divide) {
				cfc._name = new Identifier(oper.divide[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.divide;
			} else if(oper.modulus) {
				cfc._name = new Identifier(oper.modulus[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.modulus;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionPostfix(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newPostfix(node: ExpressionPostfixCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.operator!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionUnary(node.children.left[0], cfc);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.increment;
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.decrement;
			}
			cfc._operator = true;
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newUnary(node: ExpressionUnaryCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.operator!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionSpecial(node.children.right[0], cfc);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.increment;
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.decrement;
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.subtract;
			} else if(oper.inverse) {
				cfc._name = new Identifier(oper.inverse[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.inverse;
			} else if(oper.not) {
				cfc._name = new Identifier(oper.not[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.not;
			}
			cfc._operator = true;
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newFunctionCall(node: ExpressionObjectCstNode,
			memberIndex: integer, object: Context | undefined, parent: Context): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, memberIndex, parent);
		cfc._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0], cfc);

		let member = node.children.member![memberIndex].children;
		cfc._name = new Identifier(member.name[0]);
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.function;

		const args = member.functionCall![0].children.argument;
		if (args) {
			for (const each of args) {
				cfc._arguments.push(ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc));
			}
		}
		cfc.updateRange();
		return cfc;
	}

	public static newFunctionCallDirect(node: ExpressionMemberCstNode, parent: Context): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, -1, parent);

		cfc._name = new Identifier(node.children.name[0]);
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.function;

		const args = node.children.functionCall![0].children.argument;
		if (args) {
			for (const each of args) {
				cfc._arguments.push(ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc));
			}
		}
		cfc.updateRange();
		return cfc;
	}

	public static newAssign(node: ExpressionAssignCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionInlineIfElse(node.children.left[0], cfc);
			
			let oper = each.children.operator[0].children;
			if (oper.assign) {
				cfc._name = new Identifier(oper.assign[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assign;
			} else if(oper.assignMultiply) {
				cfc._name = new Identifier(oper.assignMultiply[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignMultiply;
			} else if(oper.assignDivide) {
				cfc._name = new Identifier(oper.assignDivide[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignDivide;
			} else if(oper.assignModulus) {
				cfc._name = new Identifier(oper.assignModulus[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignModulus;
			} else if(oper.assignAdd) {
				cfc._name = new Identifier(oper.assignAdd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignAdd;
			} else if(oper.assignSubtract) {
				cfc._name = new Identifier(oper.assignSubtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignSubtract;
			} else if(oper.assignShiftLeft) {
				cfc._name = new Identifier(oper.assignShiftLeft[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignShiftLeft;
			} else if(oper.assignShiftRight) {
				cfc._name = new Identifier(oper.assignShiftRight[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignShiftRight;
			} else if(oper.assignAnd) {
				cfc._name = new Identifier(oper.assignAnd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignAnd;
			} else if(oper.assignOr) {
				cfc._name = new Identifier(oper.assignOr[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignOr;
			} else if(oper.assignXor) {
				cfc._name = new Identifier(oper.assignXor[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignXor;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionInlineIfElse(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newSpecial(node: ExpressionSpecialCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionObject(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.cast) {
				cfc._name = new Identifier(oper.cast[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.cast;
			} else if(oper.castable) {
				cfc._name = new Identifier(oper.castable[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.castable;
			} else if(oper.typeof) {
				cfc._name = new Identifier(oper.typeof[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.typeof;
			}
			cfc._operator = true;

			cfc._castType = new TypeName(each.children.type[0]);
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newSuperCall(node: FunctionCallCstNode, parent: Context, name: IToken): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, 0, parent);

		cfc._name = new Identifier(name);
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.function;

		const args = node.children.argument;
		if (args) {
			for (const each of args) {
				cfc._arguments.push(ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc));
			}
		}
		cfc.updateRange();
		return cfc;
	}

	public dispose(): void {
		super.dispose();
		this._object?.dispose();
		for (const each of this._arguments) {
			each.dispose();
		}
		this._castType?.dispose();
	}


	public get node(): ExpressionAdditionCstNode | ExpressionBitOperationCstNode
	| ExpressionCompareCstNode | ExpressionLogicCstNode
	| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
	| ExpressionUnaryCstNode | ExpressionObjectCstNode
	| ExpressionAssignCstNode | ExpressionSpecialCstNode
	| ExpressionMemberCstNode | FunctionCallCstNode {
		return this._node;
	}

	public get moreIndex(): integer {
		return this._moreIndex;
	}

	public get object(): Context {
		return this._object!;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	public get operator(): boolean {
		return this._operator;
	}

	public get arguments(): Context[] {
		return this._arguments;
	}

	public get functionType(): ContextFunctionCall.FunctionType {
		return this._functionType;
	}


	public resolveStatements(state: ResolveState): void {
		this._object?.resolveStatements(state);
		for (const each of this._arguments) {
			each.resolveStatements(state);
		}
		this._castType?.resolveType(state);

		// resolve expressioon type
		if (!this._name) {
			return;
		}

		// TODO find matching function

		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.function:
				// TODO use found function return value as expression type
				break;

			case ContextFunctionCall.FunctionType.assignMultiply:
			case ContextFunctionCall.FunctionType.assignDivide:
			case ContextFunctionCall.FunctionType.assignModulus:
			case ContextFunctionCall.FunctionType.assignAdd:
			case ContextFunctionCall.FunctionType.assignSubtract:
			case ContextFunctionCall.FunctionType.assignShiftLeft:
			case ContextFunctionCall.FunctionType.assignShiftRight:
			case ContextFunctionCall.FunctionType.assignAnd:
			case ContextFunctionCall.FunctionType.assignOr:
			case ContextFunctionCall.FunctionType.assignXor:
			case ContextFunctionCall.FunctionType.and:
			case ContextFunctionCall.FunctionType.or:
			case ContextFunctionCall.FunctionType.xor:
			case ContextFunctionCall.FunctionType.shiftLeft:
			case ContextFunctionCall.FunctionType.shiftRight:
			case ContextFunctionCall.FunctionType.assign:
			case ContextFunctionCall.FunctionType.multiply:
			case ContextFunctionCall.FunctionType.divide:
			case ContextFunctionCall.FunctionType.modulus:
			case ContextFunctionCall.FunctionType.add:
			case ContextFunctionCall.FunctionType.subtract:
			case ContextFunctionCall.FunctionType.increment:
			case ContextFunctionCall.FunctionType.decrement:
			case ContextFunctionCall.FunctionType.inverse:
				if (this._object) {
					this.expressionType = this._object.expressionType;
				} else {
					this.expressionType = state.topScopeClass?.resolveClass;
				}
				break;
		
			case ContextFunctionCall.FunctionType.less:
			case ContextFunctionCall.FunctionType.greater:
			case ContextFunctionCall.FunctionType.lessEqual:
			case ContextFunctionCall.FunctionType.greaterEqual:
			case ContextFunctionCall.FunctionType.equals:
			case ContextFunctionCall.FunctionType.notEquals:
			case ContextFunctionCall.FunctionType.logicalAnd:
			case ContextFunctionCall.FunctionType.logicalOr:
			case ContextFunctionCall.FunctionType.not:
			case ContextFunctionCall.FunctionType.castable:
			case ContextFunctionCall.FunctionType.typeof:
				this.expressionType = ResolveNamespace.classBool;
				break;

			case ContextFunctionCall.FunctionType.cast:
				this.expressionType = this._castType?.resolve;
				break;
		}
	}


	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}

		if (this._name?.isPositionInside(position)) {
			return this;
		}

		const c = this._object?.contextAtPosition(position);
		if (c) {
			return c;
		}

		if (this._castType?.isPositionInside(position)) {
			return this;
		}

		return this.contextAtPositionList(this._arguments, position);
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name?.isPositionInside(position)) {
			let content = [];
			if (this._operator) {
				content.push(`**operator**`);
			} else {
				content.push(`**function**`);
			}
			return new HoverInfo(content, this._name.range);

		} else if (this._castType?.isPositionInside(position)) {
			return this._castType.hover(position);
		}

		return null;
	}


	protected updateRange(): void {
		if (!this._name?.range) {
			return;
		}

		var rangeBegin: Position | undefined;
		var rangeEnd: Position | undefined;

		if (this._object?.range) {
			rangeBegin = this._object.range.start;
		}
		if (this._arguments.length > 0) {
			rangeEnd = this._arguments[this._arguments.length - 1].range?.end;
		}

		if (!rangeBegin) {
			rangeBegin = this._name.range.start;
		}
		if (!rangeEnd) {
			rangeEnd = this._name.range.end;
		}

		this.range = Range.create(rangeBegin, rangeEnd);
	}

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Call ${this._name}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
		for (const each of this._arguments) {
			each.log(console, `${prefixLines}- Arg: `, `${prefixLines}  `);
		}
		if (this._castType) {
			console.log(`${prefixLines}- CastType ${this._castType}`);
		}
	}
}

export namespace ContextFunctionCall {
	/** Function type. */
	export enum FunctionType {
		function,

		assignMultiply,
		assignDivide,
		assignModulus,
		assignAdd,
		assignSubtract,
		assignShiftLeft,
		assignShiftRight,
		assignAnd,
		assignOr,
		assignXor,
		and,
		or,
		xor,
		shiftLeft,
		shiftRight,
		less,
		greater,
		lessEqual,
		greaterEqual,
		multiply,
		divide,
		modulus,
		add,
		subtract,
		increment,
		decrement,
		inverse,

		equals,
		notEquals,

		logicalAnd,
		logicalOr,
		not,

		cast,
		castable,
		typeof,

		assign
	}
}