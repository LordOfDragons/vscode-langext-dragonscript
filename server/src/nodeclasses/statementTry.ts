import { CstNode, IToken } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { StatementsCstNode } from "./statement";


export interface StatementTryCstNode extends CstNode {
	name: "statementTry";
	children: StatementTryCstChildren;
}

export type StatementTryCstChildren = {
	statements: StatementsCstNode[];
	statementCatch?: StatementCatchCstNode[];
};


export interface StatementCatchCstNode extends CstNode {
	name: "statementCatch";
	children: StatementCatchCstChildren;
}

export type StatementCatchCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	variable: IToken[];
	statements: StatementsCstNode[];
};
