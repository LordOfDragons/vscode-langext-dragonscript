import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementsCstNode } from "./statement";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface StatementIfCstNode extends CstNode {
	name: "statementIf";
	children: StatementIfCstChildren;
}

export type StatementIfCstChildren = {
	statementIfBegin: StatementIfBeginCstNode[];
	statementElif?: StatementElifCstNode[];
	statementElse?: StatementElseCstNode[];
	statementIfEnd: StatementIfEndCstNode[];
};


export interface StatementIfBeginCstNode extends CstNode {
	name: "statementIfBegin";
	children: StatementIfBeginCstChildren;
}

export type StatementIfBeginCstChildren = {
	if: IToken[];
	condition: ExpressionCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
	statements?: StatementsCstNode[];
};


export interface StatementElifCstNode extends CstNode {
	name: "statementElif";
	children: StatementElifCstChildren;
}

export type StatementElifCstChildren = {
	elif: IToken[];
	condition?: ExpressionCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
	statements?: StatementsCstNode[];
};


export interface StatementElseCstNode extends CstNode {
	name: "statementElse";
	children: StatementElseCstChildren;
}

export type StatementElseCstChildren = {
	statements: StatementsCstNode[];
};


export interface StatementIfEndCstNode extends CstNode {
	name: "statementIfEnd";
	children: StatementIfEndCstChildren;
}

export type StatementIfEndCstChildren = {
	end?: IToken[];
};
