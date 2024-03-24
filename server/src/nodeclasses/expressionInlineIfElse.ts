import { CstNode, IToken } from "chevrotain";
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
	if: IToken[];
	expressionIf: ExpressionLogicCstNode[];
	else?: IToken[];
	expressionElse?: ExpressionLogicCstNode[];
};
