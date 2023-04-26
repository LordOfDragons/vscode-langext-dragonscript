import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";


export interface StatementReturnCstNode extends CstNode {
	name: "statementReturn";
	children: StatementReturnCstChildren;
}

export type StatementReturnCstChildren = {
	return: IToken[];
	value?: ExpressionCstNode[];
};
