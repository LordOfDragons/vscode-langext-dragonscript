import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { StatementForCstNode } from "./statementFor";
import { StatementIfCstNode } from "./statementIf";
import { StatementReturnCstNode } from "./statementReturn";
import { StatementSelectCstNode } from "./statementSelect";
import { StatementThrowCstNode } from "./statementThrow";
import { StatementTryCstNode } from "./statementTry";
import { StatementVariablesCstNode } from "./statementVariables";
import { StatementWhileCstNode } from "./statementWhile";


export interface StatementsCstNode extends CstNode {
	name: "statements";
	children: StatementsCstChildren;
}

export type StatementsCstChildren = {
	statement?: StatementCstNode[];
};


export interface StatementCstNode extends CstNode {
	name: "statement";
	children: StatementCstChildren;
}

export type StatementCstChildren = {
	statementIf?: StatementIfCstNode[];
	statementReturn?: StatementReturnCstNode[];
	statementSelect?: StatementSelectCstNode[];
	statementWhile?: StatementWhileCstNode[];
	statementFor?: StatementForCstNode[];
	break?: IToken[];
	continue?: IToken[];
	statementThrow?: StatementThrowCstNode[];
	statementTry?: StatementTryCstNode[];
	statementVariables?: StatementVariablesCstNode[];
	expression?: ExpressionCstNode[];
};
