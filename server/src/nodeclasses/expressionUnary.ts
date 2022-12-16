import { CstNode, IToken } from "chevrotain";
import { ExpressionSpecialCstNode } from "./expressionSpecial";


export interface ExpressionUnaryCstNode extends CstNode {
	name: "expressionUnary";
	children: ExpressionUnaryCstChildren;
}

export type ExpressionUnaryCstChildren = {
	left: ExpressionSpecialCstNode[];
	operator: ExpressionUnaryOpCstNode[];
};


export interface ExpressionUnaryOpCstNode extends CstNode {
	name: "expressionUnaryOp";
	children: ExpressionUnaryOpCstChildren;
}

export type ExpressionUnaryOpCstChildren = {
	increment?: IToken[];
	decrement?: IToken[];
	subtract?: IToken[];
	inverse?: IToken[];
	not?: IToken[];
};
