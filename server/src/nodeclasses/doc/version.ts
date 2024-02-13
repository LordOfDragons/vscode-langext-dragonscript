import { CstNode, IToken } from "chevrotain";


export interface DocumentationVersionCstNode extends CstNode {
	name: "ruleVersion";
	children: DocumentationVersionCstChildren;
}

export type DocumentationVersionCstChildren = {
	version: IToken[];
};
