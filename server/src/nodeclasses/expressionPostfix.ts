import { CstNode, IToken } from "chevrotain";
import { ExpressionUnaryCstNode } from "./expressionUnary";


export interface ExpressionPostfixCstNode extends CstNode {
	name: "expressionPostfix";
	children: ExpressionPostfixCstChildren;
}

export type ExpressionPostfixCstChildren = {
	left: ExpressionUnaryCstNode[];
	operator: ExpressionPostfixOpCstNode[];
};


export interface ExpressionPostfixOpCstNode extends CstNode {
	name: "expressionPostfixOp";
	children: ExpressionPostfixOpCstChildren;
}

export type ExpressionPostfixOpCstChildren = {
	increment?: IToken[];
	decrement?: IToken[];
};
