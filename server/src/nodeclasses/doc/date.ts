import { CstNode, IToken } from "chevrotain";


export interface DocumentationDateCstNode extends CstNode {
	name: "ruleDate";
	children: DocumentationDateCstChildren;
}

export type DocumentationDateCstChildren = {
	date: IToken[];
};
