import { CstNode, IToken } from "chevrotain";


export interface StatementBreakCstNode extends CstNode {
	name: "statementBreak";
	children: StatementBreakCstChildren;
}

export type StatementBreakCstChildren = {
	break: IToken[];
};
