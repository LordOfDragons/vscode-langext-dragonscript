import { CstNode } from "chevrotain";
import { ExpressionLogicCstNode } from "./expressionLogic";


export interface ExpressionInlineIfElseCstNode extends CstNode {
	name: "expressionInlineIfElse";
	children: ExpressionInlineIfElseCstChildren;
}

export type ExpressionInlineIfElseCstChildren = {
	condition: ExpressionLogicCstNode[];
	more?: ExpressionInlineIfElseMoreCstNode[];
};


export interface ExpressionInlineIfElseMoreCstNode extends CstNode {
	name: "expressionInlineIfElseMore";
	children: ExpressionInlineIfElseMoreCstChildren;
}

export type ExpressionInlineIfElseMoreCstChildren = {
	expressionIf: ExpressionLogicCstNode[];
	expressionElse: ExpressionLogicCstNode[];
};
