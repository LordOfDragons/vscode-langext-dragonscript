import { CstNode, IToken } from "chevrotain";
import { ExpressionInlineIfElseCstNode } from "./expressionInlineIfElse";


export interface ExpressionAssignCstNode extends CstNode {
	name: "expressionAssign";
	children: ExpressionAssignCstChildren;
}

export type ExpressionAssignCstChildren = {
	left: ExpressionInlineIfElseCstNode[];
	more?: ExpressionAssignMoreCstNode[];
};


export interface ExpressionAssignMoreCstNode extends CstNode {
	name: "expressionAssignMore";
	children: ExpressionAssignMoreCstChildren;
}

export type ExpressionAssignMoreCstChildren = {
	operator: ExpressionAssignOpMoreCstNode[];
	right: ExpressionInlineIfElseCstNode[];
};


export interface ExpressionAssignOpMoreCstNode extends CstNode {
	name: "expressionAssignOp";
	children: ExpressionAssignOpCstChildren;
}

export type ExpressionAssignOpCstChildren = {
	assign?: IToken[];
	assignMultiply?: IToken[];
	assignDivide?: IToken[];
	assignModulus?: IToken[];
	assignAdd?: IToken[];
	assignSubtract?: IToken[];
	assignShiftLeft?: IToken[];
	assignShiftRight?: IToken[];
	assignAnd?: IToken[];
	assignOr?: IToken[];
	assignXor?: IToken[];
};
