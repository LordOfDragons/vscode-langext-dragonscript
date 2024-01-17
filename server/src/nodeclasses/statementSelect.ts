import { CstNode, IToken } from "chevrotain";
import { EndOfCommandCstNode } from "./endOfCommand";
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
	statementSelectEnd?: StatementSelectEndCstNode[];
};


export interface StatementSelectBeginCstNode extends CstNode {
	name: "statementSelectBegin";
	children: StatementSelectBeginCstChildren;
}

export type StatementSelectBeginCstChildren = {
	select: IToken[];
	value: ExpressionCstNode[];
};


export interface StatementCaseCstNode extends CstNode {
	name: "statementCase";
	children: StatementCaseCstChildren;
}

export type StatementCaseCstChildren = {
	case: IToken[];
	statementCaseValues?: StatementCaseValuesCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
	statements?: StatementsCstNode[];
};


export interface StatementCaseValuesCstNode extends CstNode {
	name: "statementCaseValues";
	children: StatementCaseValuesCstChildren;
}

export type StatementCaseValuesCstChildren = {
	value?: ExpressionCstNode[];
};


export interface StatementSelectElseCstNode extends CstNode {
	name: "statementSelectElse";
	children: StatementSelectElseCstChildren;
}

export type StatementSelectElseCstChildren = {
	statements: StatementsCstNode[];
};


export interface StatementSelectEndCstNode extends CstNode {
	name: "statementSelectEnd";
	children: StatementSelectEndCstChildren;
}

export type StatementSelectEndCstChildren = {
	end?: IToken[];
	endOfCommand?: EndOfCommandCstNode[];
};
