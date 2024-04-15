import { CstNode, IToken } from "chevrotain";
import { FunctionArgumentCstNode } from "./declareFunction";
import { StatementsCstNode } from "./statement";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface ExpressionBlockCstNode extends CstNode {
	name: "expressionBlock";
	children: ExpressionBlockCstChildren;
}

export type ExpressionBlockCstChildren = {
	expressionBlockBegin: ExpressionBlockBeginCstNode[];
	statements?: StatementsCstNode[];
	expressionBlockEnd?: ExpressionBlockEndCstNode[];
};


export interface ExpressionBlockBeginCstNode extends CstNode {
	name: "expressionBlockBegin";
	children: ExpressionBlockBeginCstChildren;
}

export type ExpressionBlockBeginCstChildren = {
	block: IToken[];
	comma?: IToken[];
	functionArgument?: FunctionArgumentCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
};


export interface ExpressionBlockEndCstNode extends CstNode {
	name: "expressionBlockEnd";
	children: ExpressionBlockEndCstChildren;
}

export type ExpressionBlockEndCstChildren = {
	end?: IToken[];
};
