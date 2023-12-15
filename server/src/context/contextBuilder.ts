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

import { StatementCstNode } from "../nodeclasses/statement";
import { ExpressionCstNode } from "../nodeclasses/expression";
import { Context } from "./context";
import { ContextIf } from "./statementIf";
import { ContextReturn } from "./statementReturn";
import { ContextSelect } from "./statementSelect";
import { ContextWhile } from "./statementWhile";
import { ContextFor } from "./statementFor";
import { ContextTry } from "./statementTry";
import { ContextThrow } from "./statementThrow";
import { ContextBreak } from "./statementBreak";
import { ContextContinue } from "./statementContinue";
import { ContextVariable } from "./statementVariable";
import { ExpressionMultiplyCstNode } from "../nodeclasses/expressionMultiply";
import { ExpressionAdditionCstNode } from "../nodeclasses/expressionAddition";
import { ExpressionBitOperationCstNode } from "../nodeclasses/expressionBitOperation";
import { ExpressionCompareCstNode } from "../nodeclasses/expressionCompare";
import { ExpressionPostfixCstNode } from "../nodeclasses/expressionPostfix";
import { ExpressionUnaryCstNode } from "../nodeclasses/expressionUnary";
import { ExpressionSpecialCstNode } from "../nodeclasses/expressionSpecial";
import { ExpressionBaseObjectCstNode, ExpressionGroupCstNode, ExpressionObjectCstNode } from "../nodeclasses/expressionObject";
import { ExpressionAssignCstNode } from "../nodeclasses/expressionAssign";
import { ContextFunctionCall } from "./expressionCall";
import { ExpressionInlineIfElseCstNode } from "../nodeclasses/expressionInlineIfElse";
import { ExpressionLogicCstNode } from "../nodeclasses/expressionLogic";
import { ContextInlineIfElse } from "./expressionInlineIfElse";
import { ContextMember } from "./expressionMember";
import { ContextConstant } from "./expressionConstant";
import { ContextBlock } from "./expressionBlock";
import { integer } from "vscode-languageserver";


/** Context builder. */
export class ContextBuilder{
	/** Create statement from node. */
	public static createStatement(node: StatementCstNode, parent: Context): Context[] {
		let c = node.children;

		if (c.statementIf) {
			return [new ContextIf(c.statementIf[0], parent)];

		} else if (c.statementReturn) {
			return [new ContextReturn(c.statementReturn[0], parent)];

		} else if (c.statementSelect) {
			return [new ContextSelect(c.statementSelect[0], parent)];

		} else if (c.statementWhile) {
			return [new ContextWhile(c.statementWhile[0], parent)];

		} else if (c.statementFor) {
			return [new ContextFor(c.statementFor[0], parent)];

		} else if (c.statementBreak) {
			return [new ContextBreak(c.statementBreak[0], parent)];

		} else if (c.statementContinue) {
			return [new ContextContinue(c.statementContinue[0], parent)];

		} else if (c.statementThrow) {
			return [new ContextThrow(c.statementThrow[0], parent)];

		} else if (c.statementTry) {
			return [new ContextTry(c.statementTry[0], parent)];

		} else if (c.statementVariables) {
			let vdecls = c.statementVariables[0].children;
			if (vdecls.statementVariable) {
				let typeNode = vdecls.type[0];
				let count = vdecls.statementVariable.length;
				let commaCount = vdecls.comma?.length || 0;
				let declEnd = vdecls.endOfCommand[0].children;
				let tokEnd = (declEnd.newline || declEnd.commandSeparator)![0];
				var firstVar: ContextVariable | undefined = undefined;
				let stalist: Context[] = [];

				for (let i = 0; i < count; i++) {
					const v: ContextVariable = new ContextVariable(vdecls.statementVariable[i], typeNode,
						firstVar, i < commaCount ? vdecls.comma![i] : tokEnd, parent);
					stalist.push(v);
					
					if (i == 0) {
						firstVar = v;
					}
				}

				return stalist;
			}

		} else if (c.expression) {
			return [this.createExpression(c.expression[0], parent)];
		}
		return [];
	}

	/** Create expression from node. */
	public static createExpression(node: ExpressionCstNode, parent: Context): Context {
		return this.createExpressionAssign(node.children.expressionAssign[0], parent);
	}
	
	public static createExpressionGroup(node: ExpressionGroupCstNode, parent: Context): Context {
		return this.createExpression(node.children.expression[0], parent);
	}
	
	public static createExpressionAssign(node: ExpressionAssignCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return ContextFunctionCall.newAssign(node, parent);
		} else {
			return this.createExpressionInlineIfElse(c.left[0], parent);
		}
	}

	public static createExpressionInlineIfElse(node: ExpressionInlineIfElseCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return new ContextInlineIfElse(node, parent);
		} else {
			return this.createExpressionLogic(c.condition[0], parent);
		}
	}

	public static createExpressionLogic(node: ExpressionLogicCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return ContextFunctionCall.newLogic(node, parent);
		} else {
			return this.createExpressionCompare(c.left[0], parent);
		}
	}

	public static createExpressionCompare(node: ExpressionCompareCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return ContextFunctionCall.newCompare(node, parent);
		} else {
			return this.createExpressionBitOperation(c.left[0], parent);
		}
	}

	public static createExpressionBitOperation(node: ExpressionBitOperationCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return ContextFunctionCall.newBitOperation(node, parent);
		} else {
			return this.createExpressionAddition(c.left[0], parent);
		}
	}

	public static createExpressionAddition(node: ExpressionAdditionCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more) {
			return ContextFunctionCall.newAddition(node, parent);
		} else {
			return this.createExpressionMultiply(c.left[0], parent);
		}
	}

	public static createExpressionMultiply(node: ExpressionMultiplyCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more){
			return ContextFunctionCall.newMultiply(node, parent);
		}else{
			return this.createExpressionPostfix(c.left[0], parent);
		}
	}

	public static createExpressionPostfix(node: ExpressionPostfixCstNode, parent: Context): Context {
		let c = node.children;
		if (c.operator){
			return ContextFunctionCall.newPostfix(node, parent);
		}else{
			return this.createExpressionUnary(c.left[0], parent);
		}
	}

	public static createExpressionUnary(node: ExpressionUnaryCstNode, parent: Context): Context {
		let c = node.children;
		if (c.operator){
			return ContextFunctionCall.newUnary(node, parent);
		}else{
			return this.createExpressionSpecial(c.right[0], parent);
		}
	}

	public static createExpressionSpecial(node: ExpressionSpecialCstNode, parent: Context): Context {
		let c = node.children;
		if (c.more){
			return ContextFunctionCall.newSpecial(node, parent);
		}else{
			return this.createExpressionObject(c.left[0], parent);
		}
	}

	public static createExpressionObject(node: ExpressionObjectCstNode, parent: Context): Context {
		let c = node.children;
		if (c.member) {
			let last: ContextMember | ContextFunctionCall | undefined;
			let memberIndex: integer = 0;
			for (const each of c.member) {
				if (each.children.functionCall) {
					last = ContextFunctionCall.newFunctionCall(node, memberIndex++, last, parent);
				} else {
					last = ContextMember.newObject(node, memberIndex++, last, parent);
				}
			}
			return last!;
		} else {
			return this.createExpressionBaseObject(c.object[0], parent);
		}
	}

	public static createExpressionBaseObject(node: ExpressionBaseObjectCstNode, parent: Context): Context {
		let c = node.children;
		if (c.expressionGroup) {
			return this.createExpressionGroup(c.expressionGroup[0], parent);
		} else if (c.expressionConstant) {
			return new ContextConstant(c.expressionConstant[0], parent);
		} else if (c.expressionMember) {
			let cem = c.expressionMember[0];
			if (cem.children.functionCall) {
				return ContextFunctionCall.newFunctionCallDirect(cem, parent);
			} else {
				return ContextMember.newMember(cem, parent);
			}
		} else if (c.expressionBlock) {
			return new ContextBlock(c.expressionBlock[0], parent);
		} else {
			throw Error("Empty expression base object!");
		}
	}
}
