import { CstNode, IToken } from "chevrotain";
import { EndOfCommandCstNode } from "./endOfCommand";
import { ExpressionCstNode } from "./expression";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";


export interface StatementVariablesCstNode extends CstNode {
	name: "statementVariables";
	children: StatementVariablesCstChildren;
}

export type StatementVariablesCstChildren = {
	var: IToken[];
	type: FullyQualifiedClassNameCstNode[];
	comma?: IToken[];
	statementVariable?: StatementVariableCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
};


export interface StatementVariableCstNode extends CstNode {
	name: "statementVariable";
	children: StatementVariableCstChildren;
}

export type StatementVariableCstChildren = {
	name: IToken[];
	assign?: IToken[];
	value?: ExpressionCstNode[];
};
