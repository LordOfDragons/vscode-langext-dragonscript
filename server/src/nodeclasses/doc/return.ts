import { CstNode, IToken } from "chevrotain";


export interface DocumentationReturnCstNode extends CstNode {
	name: "ruleReturn";
	children: DocumentationReturnCstChildren;
}

export type DocumentationReturnCstChildren = {
	return: IToken[];
};
