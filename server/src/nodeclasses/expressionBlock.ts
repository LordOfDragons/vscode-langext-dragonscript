import { CstNode } from "chevrotain";
import { FunctionArgumentCstNode } from "./declareFunction";
import { StatementsCstNode } from "./statement";


export interface ExpressionBlockCstNode extends CstNode {
	name: "expressionBlock";
	children: ExpressionBlockCstChildren;
}

export type ExpressionBlockCstChildren = {
	expressionBlockBegin: ExpressionBlockBeginCstNode[];
	statements: StatementsCstNode[];
};


export interface ExpressionBlockBeginCstNode extends CstNode {
	name: "expressionBlockBegin";
	children: ExpressionBlockBeginCstChildren;
}

export type ExpressionBlockBeginCstChildren = {
	functionArgument?: FunctionArgumentCstNode[];
};
