import { CstNode } from "chevrotain";
import { ExpressionCstNode } from "./expression";


export interface StatementThrowCstNode extends CstNode {
	name: "statementThrow";
	children: StatementThrowCstChildren;
}

export type StatementThrowCstChildren = {
	exception?: ExpressionCstNode[];
};
