import { CstNode } from "chevrotain";
import { ExpressionCstNode } from "./expression";


export interface StatementReturnCstNode extends CstNode {
	name: "statementReturn";
	children: StatementReturnCstChildren;
}

export type StatementReturnCstChildren = {
	value?: ExpressionCstNode[];
};
