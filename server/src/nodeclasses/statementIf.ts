import { CstNode } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementsCstNode } from "./statement";


export interface StatementIfCstNode extends CstNode {
	name: "statementIf";
	children: StatementIfCstChildren;
}

export type StatementIfCstChildren = {
	statementIfBegin: StatementIfBeginCstNode[];
	statementElif?: StatementElifCstNode[];
	statementElse?: StatementElseCstNode[];
};


export interface StatementIfBeginCstNode extends CstNode {
	name: "statementIfBegin";
	children: StatementIfBeginCstChildren;
}

export type StatementIfBeginCstChildren = {
	condition: ExpressionCstNode[];
	statements: StatementsCstNode[];
};


export interface StatementElifCstNode extends CstNode {
	name: "statementElif";
	children: StatementElifCstChildren;
}

export type StatementElifCstChildren = {
	condition: ExpressionCstNode[];
	statements: StatementsCstNode[];
};


export interface StatementElseCstNode extends CstNode {
	name: "statementElse";
	children: StatementElseCstChildren;
}

export type StatementElseCstChildren = {
	statements: StatementsCstNode[];
};
