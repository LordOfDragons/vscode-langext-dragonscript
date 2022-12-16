import { CstNode, IToken } from "chevrotain";
import { ExpressionAdditionCstNode } from "./expressionAddition";


export interface ExpressionBitOperationCstNode extends CstNode {
	name: "expressionBitOperation";
	children: ExpressionBitOperationCstChildren;
}

export type ExpressionBitOperationCstChildren = {
	left: ExpressionAdditionCstNode[];
	more?: ExpressionBitOperationMoreCstNode[];
};


export interface ExpressionBitOperationMoreCstNode extends CstNode {
	name: "expressionBitOperationMore";
	children: ExpressionBitOperationMoreCstChildren;
}

export type ExpressionBitOperationMoreCstChildren = {
	operator: ExpressionBitOperationOpCstNode[];
	right: ExpressionAdditionCstNode[];
};


export interface ExpressionBitOperationOpCstNode extends CstNode {
	name: "expressionBitOperationOp";
	children: ExpressionBitOperationOpCstChildren;
}

export type ExpressionBitOperationOpCstChildren = {
	shiftLeft?: IToken[];
	shiftRight?: IToken[];
	and?: IToken[];
	or?: IToken[];
	xor?: IToken[];
};
