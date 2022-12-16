import { CstNode, IToken } from "chevrotain";
import { ExpressionBitOperationCstNode } from "./expressionBitOperation";


export interface ExpressionCompareCstNode extends CstNode {
	name: "expressionCompare";
	children: ExpressionCompareCstChildren;
}

export type ExpressionCompareCstChildren = {
	left: ExpressionBitOperationCstNode[];
	more?: ExpressionCompareMoreCstNode[];
};


export interface ExpressionCompareMoreCstNode extends CstNode {
	name: "expressionCompareMore";
	children: ExpressionCompareMoreCstChildren;
}

export type ExpressionCompareMoreCstChildren = {
	operator: ExpressionCompareOpCstNode[];
	right: ExpressionBitOperationCstNode[];
};


export interface ExpressionCompareOpCstNode extends CstNode {
	name: "expressionCompareOp";
	children: ExpressionCompareOpCstChildren;
}

export type ExpressionCompareOpCstChildren = {
	less?: IToken[];
	greater?: IToken[];
	lessEqual?: IToken[];
	greaterEqual?: IToken[];
	equals?: IToken[];
	notEquals?: IToken[];
};
