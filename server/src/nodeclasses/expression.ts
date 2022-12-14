import { CstNode } from "chevrotain";


export interface ExpressionCstNode extends CstNode {
	name: "expression";
	children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
	
};
