import { CstNode } from "chevrotain";
import { ExpressionAssignCstNode } from "./expressionAssign";


export interface ExpressionCstNode extends CstNode {
	name: "expression";
	children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
	expressionAssign: ExpressionAssignCstNode[];
};
