import { CstNode } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementsCstNode } from "./statement";


export interface StatementWhileCstNode extends CstNode {
	name: "statementWhile";
	children: StatementWhileCstChildren;
}

export type StatementWhileCstChildren = {
	statementWhileBegin: StatementWhileBeginCstNode[];
	statements: StatementsCstNode[];
};


export interface StatementWhileBeginCstNode extends CstNode {
	name: "statementWhileBegin";
	children: StatementWhileBeginCstChildren;
}

export type StatementWhileBeginCstChildren = {
	condition: ExpressionCstNode[];
};
