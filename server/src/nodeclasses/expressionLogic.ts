import { CstNode, IToken } from "chevrotain";
import { ExpressionCompareCstNode } from "./expressionCompare";


export interface ExpressionLogicCstNode extends CstNode {
	name: "expressionLogic";
	children: ExpressionLogicCstChildren;
}

export type ExpressionLogicCstChildren = {
	left: ExpressionCompareCstNode[];
	more?: ExpressionLogicMoreCstNode[];
};


export interface ExpressionLogicMoreCstNode extends CstNode {
	name: "expressionLogicMore";
	children: ExpressionLogicMoreCstChildren;
}

export type ExpressionLogicMoreCstChildren = {
	operator: ExpressionLogicOpCstNode[];
	right: ExpressionCompareCstNode[];
};


export interface ExpressionLogicOpCstNode extends CstNode {
	name: "expressionLogicOp";
	children: ExpressionLogicOpCstChildren;
}

export type ExpressionLogicOpCstChildren = {
	logicalAnd?: IToken[];
	logicalOr?: IToken[];
};
