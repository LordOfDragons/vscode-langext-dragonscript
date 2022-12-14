import { CstNode } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementsCstNode } from "./statement";


export interface StatementSelectCstNode extends CstNode {
	name: "statementSelect";
	children: StatementSelectCstChildren;
}

export type StatementSelectCstChildren = {
	statementSelectBegin: StatementSelectBeginCstNode[];
	statementCase?: StatementCaseCstNode[];
	statementSelectElse?: StatementSelectElseCstNode[];
};


export interface StatementSelectBeginCstNode extends CstNode {
	name: "statementSelectBegin";
	children: StatementSelectBeginCstChildren;
}

export type StatementSelectBeginCstChildren = {
	value: ExpressionCstNode[];
};


export interface StatementCaseCstNode extends CstNode {
	name: "statementCase";
	children: StatementCaseCstChildren;
}

export type StatementCaseCstChildren = {
	value?: ExpressionCstNode[];
	statements: StatementsCstNode[];
};


export interface StatementSelectElseCstNode extends CstNode {
	name: "statementSelectElse";
	children: StatementSelectElseCstChildren;
}

export type StatementSelectElseCstChildren = {
	statements: StatementsCstNode[];
};
