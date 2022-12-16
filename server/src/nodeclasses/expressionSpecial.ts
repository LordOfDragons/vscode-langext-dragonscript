import { CstNode, IToken } from "chevrotain";
import { ExpressionObjectCstNode } from "./expressionObject";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";


export interface ExpressionSpecialCstNode extends CstNode {
	name: "expressionSpecial";
	children: ExpressionSpecialCstChildren;
}

export type ExpressionSpecialCstChildren = {
	left: ExpressionObjectCstNode[];
	more?: ExpressionSpecialMoreCstNode[];
};


export interface ExpressionSpecialMoreCstNode extends CstNode {
	name: "expressionSpecialMore";
	children: ExpressionSpecialMoreCstChildren;
}

export type ExpressionSpecialMoreCstChildren = {
	operator: ExpressionSpecialOpCstNode[];
	type: FullyQualifiedClassNameCstNode[];
};


export interface ExpressionSpecialOpCstNode extends CstNode {
	name: "expressionSpecialOp";
	children: ExpressionSpecialOpCstChildren;
}

export type ExpressionSpecialOpCstChildren = {
	cast?: IToken[];
	castable?: IToken[];
	typeof?: IToken[];
};
