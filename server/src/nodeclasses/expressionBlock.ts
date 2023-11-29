import { CstNode, IToken } from "chevrotain";
import { FunctionArgumentCstNode } from "./declareFunction";
import { StatementsCstNode } from "./statement";


export interface ExpressionBlockCstNode extends CstNode {
	name: "expressionBlock";
	children: ExpressionBlockCstChildren;
}

export type ExpressionBlockCstChildren = {
	expressionBlockBegin: ExpressionBlockBeginCstNode[];
	statements: StatementsCstNode[];
	expressionBlockEnd: ExpressionBlockEndCstNode[];
};


export interface ExpressionBlockBeginCstNode extends CstNode {
	name: "expressionBlockBegin";
	children: ExpressionBlockBeginCstChildren;
}

export type ExpressionBlockBeginCstChildren = {
	block: IToken[];
	functionArgument?: FunctionArgumentCstNode[];
};


export interface ExpressionBlockEndCstNode extends CstNode {
	name: "expressionBlockEnd";
	children: ExpressionBlockEndCstChildren;
}

export type ExpressionBlockEndCstChildren = {
	end: IToken[];
};
