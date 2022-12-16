import { CstNode, IToken } from "chevrotain";
import { ExpressionMultiplyCstNode } from "./expressionMultiply";


export interface ExpressionAdditionCstNode extends CstNode {
	name: "expressionAddition";
	children: ExpressionAdditionCstChildren;
}

export type ExpressionAdditionCstChildren = {
	left: ExpressionMultiplyCstNode[];
	more?: ExpressionAdditionMoreCstNode[];
};


export interface ExpressionAdditionMoreCstNode extends CstNode {
	name: "expressionAdditionMore";
	children: ExpressionAdditionMoreCstChildren;
}

export type ExpressionAdditionMoreCstChildren = {
	operator: ExpressionAdditionOpCstNode[];
	right: ExpressionMultiplyCstNode[];
};


export interface ExpressionAdditionOpCstNode extends CstNode {
	name: "expressionAdditionOp";
	children: ExpressionAdditionOpCstChildren;
}

export type ExpressionAdditionOpCstChildren = {
	add?: IToken[];
	subtract?: IToken[];
};
