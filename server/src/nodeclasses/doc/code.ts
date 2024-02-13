import { CstNode, IToken } from "chevrotain";


export interface DocumentationCodeCstNode extends CstNode {
	name: "ruleCode";
	children: DocumentationCodeCstChildren;
}

export type DocumentationCodeCstChildren = {
	code: IToken[];
};
