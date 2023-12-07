import { CstNode, IToken } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { StatementsCstNode } from "./statement";


export interface StatementTryCstNode extends CstNode {
	name: "statementTry";
	children: StatementTryCstChildren;
}

export type StatementTryCstChildren = {
	statementTryBegin: StatementTryBeginCstNode[];
	statements: StatementsCstNode[];
	statementCatch?: StatementCatchCstNode[];
	statementTryEnd: StatementTryEndCstNode[];
};


export interface StatementTryBeginCstNode extends CstNode {
	name: "statementTryBegin";
	children: StatementTryBeginCstChildren;
}

export type StatementTryBeginCstChildren = {
	try: IToken[];
};


export interface StatementCatchCstNode extends CstNode {
	name: "statementCatch";
	children: StatementCatchCstChildren;
}

export type StatementCatchCstChildren = {
	catch: IToken[];
	type: FullyQualifiedClassNameCstNode[];
	variable: IToken[];
	statements: StatementsCstNode[];
};


export interface StatementTryEndCstNode extends CstNode {
	name: "statementTryEnd";
	children: StatementTryEndCstChildren;
}

export type StatementTryEndCstChildren = {
	end: IToken[];
};
