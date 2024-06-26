import { CstNode, IToken } from "chevrotain";
import { FunctionCallCstNode } from "./declareFunction";
import { ExpressionCstNode } from "./expression";
import { ExpressionBlockCstNode } from "./expressionBlock";


export interface ExpressionObjectCstNode extends CstNode {
	name: "expressionObject";
	children: ExpressionObjectCstChildren;
}

export type ExpressionObjectCstChildren = {
	object: ExpressionBaseObjectCstNode[];
	period?: IToken[];
	member?: ExpressionMemberCstNode[];
};


export interface ExpressionBaseObjectCstNode extends CstNode {
	name: "expressionBaseObject";
	children: ExpressionBaseObjectCstChildren;
}

export type ExpressionBaseObjectCstChildren = {
	expressionGroup?: ExpressionGroupCstNode[];
	expressionConstant?: ExpressionConstantCstNode[];
	expressionMember?: ExpressionMemberCstNode[];
	expressionBlock?: ExpressionBlockCstNode[];
};


export interface ExpressionGroupCstNode extends CstNode {
	name: "expressionGroup";
	children: ExpressionGroupCstChildren;
}

export type ExpressionGroupCstChildren = {
	leftParanthesis: IToken[];
	expression: ExpressionCstNode[];
	rightParanthesis?: IToken[];
};


export interface ExpressionConstantCstNode extends CstNode {
	name: "expressionConstant";
	children: ExpressionConstantCstChildren;
}

export type ExpressionConstantCstChildren = {
	literalByte?: IToken[];
	literalIntByte?: IToken[];
	literalIntHex?: IToken[];
	literalIntOct?: IToken[];
	literalInt?: IToken[];
	literalFloat?: IToken[];
	string?: IToken[];
	true?: IToken[];
	false?: IToken[];
	null?: IToken[];
	this?: IToken[];
	super?: IToken[];
};


export interface ExpressionMemberCstNode extends CstNode {
	name: "expressionMember";
	children: ExpressionMemberCstChildren;
}

export type ExpressionMemberCstChildren = {
	name?: IToken[];
	functionCall?: FunctionCallCstNode[];
};
