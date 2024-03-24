import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementsCstNode } from "./statement";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface StatementWhileCstNode extends CstNode {
	name: "statementWhile";
	children: StatementWhileCstChildren;
}

export type StatementWhileCstChildren = {
	statementWhileBegin: StatementWhileBeginCstNode[];
	statements?: StatementsCstNode[];
	statementWhileEnd?: StatementWhileEndCstNode[];
};


export interface StatementWhileBeginCstNode extends CstNode {
	name: "statementWhileBegin";
	children: StatementWhileBeginCstChildren;
}

export type StatementWhileBeginCstChildren = {
	while: IToken[];
	condition?: ExpressionCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
};


export interface StatementWhileEndCstNode extends CstNode {
	name: "statementWhileEnd";
	children: StatementWhileEndCstChildren;
}

export type StatementWhileEndCstChildren = {
	end: IToken[];
};

