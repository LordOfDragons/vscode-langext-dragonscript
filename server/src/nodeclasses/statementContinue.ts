import { CstNode, IToken } from "chevrotain";


export interface StatementContinueCstNode extends CstNode {
	name: "statementContinue";
	children: StatementContinueCstChildren;
}

export type StatementContinueCstChildren = {
	Continue: IToken[];
};
