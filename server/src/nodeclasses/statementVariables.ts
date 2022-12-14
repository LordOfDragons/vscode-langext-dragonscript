import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";


export interface StatementVariablesCstNode extends CstNode {
	name: "statementVariables";
	children: StatementVariablesCstChildren;
}

export type StatementVariablesCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	statementVariable?: StatementVariableCstNode[];
};


export interface StatementVariableCstNode extends CstNode {
	name: "statementVariable";
	children: StatementVariableCstChildren;
}

export type StatementVariableCstChildren = {
	name: IToken[];
	value?: ExpressionCstNode[];
};
