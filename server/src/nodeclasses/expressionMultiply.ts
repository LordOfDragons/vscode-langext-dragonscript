import { CstNode, IToken } from "chevrotain";
import { ExpressionPostfixCstNode } from "./expressionPostfix";


export interface ExpressionMultiplyCstNode extends CstNode {
	name: "expressionMultiply";
	children: ExpressionMultiplyCstChildren;
}

export type ExpressionMultiplyCstChildren = {
	left: ExpressionPostfixCstNode[];
	more?: ExpressionMultiplyMoreCstNode[];
};


export interface ExpressionMultiplyMoreCstNode extends CstNode {
	name: "expressionMultiplyMore";
	children: ExpressionMultiplyMoreCstChildren;
}

export type ExpressionMultiplyMoreCstChildren = {
	operator: ExpressionMultiplyOpCstNode[];
	right: ExpressionPostfixCstNode[];
};


export interface ExpressionMultiplyOpCstNode extends CstNode {
	name: "expressionMultiplyOp";
	children: ExpressionMultiplyOpCstChildren;
}

export type ExpressionMultiplyOpCstChildren = {
	multiply?: IToken[];
	divide?: IToken[];
	modulus?: IToken[];
};
