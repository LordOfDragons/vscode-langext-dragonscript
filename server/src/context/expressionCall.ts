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
import { integer, RemoteConsole } from "vscode-languageserver";
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


export class ContextFunctionCall extends Context{
	protected _node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
		| ExpressionCompareCstNode | ExpressionLogicCstNode
		| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
		| ExpressionUnaryCstNode | ExpressionObjectCstNode
		| ExpressionAssignCstNode | ExpressionSpecialCstNode
		| ExpressionMemberCstNode;
	protected _moreIndex: integer;
	protected _object?: Context;
	protected _operator: boolean;
	protected _name?: Identifier;
	protected _arguments: Context[];
	protected _typename?: TypeName;


	protected constructor(node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
			| ExpressionCompareCstNode | ExpressionLogicCstNode
			| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
			| ExpressionUnaryCstNode | ExpressionObjectCstNode
			| ExpressionAssignCstNode | ExpressionSpecialCstNode
			| ExpressionMemberCstNode,
			moreIndex: integer) {
		super(Context.ContextType.FunctionCall);
		this._node = node;
		this._moreIndex = moreIndex;
		this._operator = false;
		this._arguments = [];
	}

	public static newAddition(node: ExpressionAdditionCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionMultiply(node.children.left[0]);
	
			let oper = each.children.operator[0].children;
			if (oper.add) {
				cfc._name = new Identifier(oper.add[0]);
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
			}
			cfc._operator = true;
			
			cfc._arguments.push(ContextBuilder.createExpressionMultiply(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newBitOperation(node: ExpressionBitOperationCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionAddition(node.children.left[0]);

			let oper = each.children.operator[0].children;
			if (oper.shiftLeft) {
				cfc._name = new Identifier(oper.shiftLeft[0]);
			} else if(oper.shiftRight) {
				cfc._name = new Identifier(oper.shiftRight[0]);
			} else if(oper.and) {
				cfc._name = new Identifier(oper.and[0]);
			} else if(oper.or) {
				cfc._name = new Identifier(oper.or[0]);
			} else if(oper.xor) {
				cfc._name = new Identifier(oper.xor[0]);
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionAddition(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newCompare(node: ExpressionCompareCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionBitOperation(node.children.left[0]);

			let oper = each.children.operator[0].children;
			if (oper.less) {
				cfc._name = new Identifier(oper.less[0]);
			} else if(oper.greater) {
				cfc._name = new Identifier(oper.greater[0]);
			} else if(oper.lessEqual) {
				cfc._name = new Identifier(oper.lessEqual[0]);
			} else if(oper.greaterEqual) {
				cfc._name = new Identifier(oper.greaterEqual[0]);
			} else if(oper.equals) {
				cfc._name = new Identifier(oper.equals[0]);
			} else if(oper.notEquals) {
				cfc._name = new Identifier(oper.notEquals[0]);
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionBitOperation(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newLogic(node: ExpressionLogicCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionCompare(node.children.left[0]);

			let oper = each.children.operator[0].children;
			if (oper.logicalAnd) {
				cfc._name = new Identifier(oper.logicalAnd[0]);
			} else if(oper.logicalOr) {
				cfc._name = new Identifier(oper.logicalOr[0]);
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionCompare(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newMultiply(node: ExpressionMultiplyCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionPostfix(node.children.left[0]);

			let oper = each.children.operator[0].children;
			if (oper.multiply) {
				cfc._name = new Identifier(oper.multiply[0]);
			} else if(oper.divide) {
				cfc._name = new Identifier(oper.divide[0]);
			} else if(oper.modulus) {
				cfc._name = new Identifier(oper.modulus[0]);
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionPostfix(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newPostfix(node: ExpressionPostfixCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.operator!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionUnary(node.children.left[0]);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
			}
			cfc._operator = true;
			last = cfc;
		});
		return last!;
	}

	public static newUnary(node: ExpressionUnaryCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.operator!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionSpecial(node.children.right[0]);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
			} else if(oper.inverse) {
				cfc._name = new Identifier(oper.inverse[0]);
			} else if(oper.not) {
				cfc._name = new Identifier(oper.not[0]);
			}
			cfc._operator = true;
			last = cfc;
		});
		return last!;
	}

	public static newFunctionCall(node: ExpressionObjectCstNode, memberIndex: integer, object?: Context): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, memberIndex);
		cfc._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0]);

		let member = node.children.member![memberIndex].children;
		cfc._name = new Identifier(member.name[0]);
		cfc._operator = false;

		member.functionCall![0].children.argument?.forEach(each => {
			cfc._arguments.push(ContextBuilder.createExpressionAssign(each.children.expressionAssign[0]));
		});
		return cfc;
	}

	public static newFunctionCallDirect(node: ExpressionMemberCstNode): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, -1);

		cfc._name = new Identifier(node.children.name[0]);
		cfc._operator = false;

		node.children.functionCall![0].children.argument?.forEach(each => {
			cfc._arguments.push(ContextBuilder.createExpressionAssign(each.children.expressionAssign[0]));
		});
		return cfc;
	}

	public static newAssign(node: ExpressionAssignCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionInlineIfElse(node.children.left[0]);
			
			let oper = each.children.operator[0].children;
			if (oper.assign) {
				cfc._name = new Identifier(oper.assign[0]);
			} else if(oper.assignMultiply) {
				cfc._name = new Identifier(oper.assignMultiply[0]);
			} else if(oper.assignDivide) {
				cfc._name = new Identifier(oper.assignDivide[0]);
			} else if(oper.assignModulus) {
				cfc._name = new Identifier(oper.assignModulus[0]);
			} else if(oper.assignAdd) {
				cfc._name = new Identifier(oper.assignAdd[0]);
			} else if(oper.assignSubtract) {
				cfc._name = new Identifier(oper.assignSubtract[0]);
			} else if(oper.assignShiftLeft) {
				cfc._name = new Identifier(oper.assignShiftLeft[0]);
			} else if(oper.assignShiftRight) {
				cfc._name = new Identifier(oper.assignShiftRight[0]);
			} else if(oper.assignAnd) {
				cfc._name = new Identifier(oper.assignAnd[0]);
			} else if(oper.assignOr) {
				cfc._name = new Identifier(oper.assignOr[0]);
			} else if(oper.assignXor) {
				cfc._name = new Identifier(oper.assignXor[0]);
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionInlineIfElse(each.children.right[0]));
			last = cfc;
		});
		return last!;
	}

	public static newSpecial(node: ExpressionSpecialCstNode): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		node.children.more!.forEach(each => {
			let cfc = new ContextFunctionCall(node, moreIndex++);
			cfc._object = last ? last : ContextBuilder.createExpressionObject(node.children.left[0]);

			let oper = each.children.operator[0].children;
			if (oper.cast) {
				cfc._name = new Identifier(oper.cast[0]);
			} else if(oper.castable) {
				cfc._name = new Identifier(oper.castable[0]);
			} else if(oper.typeof) {
				cfc._name = new Identifier(oper.typeof[0]);
			}
			cfc._operator = true;

			cfc._typename = new TypeName(each.children.type[0]);
			last = cfc;
		});
		return last!;
	}

	public dispose(): void {
		super.dispose();
		this._object?.dispose();
		this._arguments.forEach(each => each.dispose());
		this._typename?.dispose();
	}


	public get node(): ExpressionAdditionCstNode | ExpressionBitOperationCstNode
	| ExpressionCompareCstNode | ExpressionLogicCstNode
	| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
	| ExpressionUnaryCstNode | ExpressionObjectCstNode
	| ExpressionAssignCstNode | ExpressionSpecialCstNode
	| ExpressionMemberCstNode {
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

	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Call ${this._name}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
		this._arguments.forEach(each => each.log(console, `${prefixLines}- Arg: `, `${prefixLines}  `));
		if (this._typename) {
			console.log(`${prefixLines}- Type ${this._typename}`);
		}
	}
}
