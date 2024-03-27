import { CstNode, IToken } from "chevrotain";


export interface DocumentationAuthorCstNode extends CstNode {
	name: "ruleAuthor";
	children: DocumentationAuthorCstChildren;
}

export type DocumentationAuthorCstChildren = {
	author: IToken[];
};
