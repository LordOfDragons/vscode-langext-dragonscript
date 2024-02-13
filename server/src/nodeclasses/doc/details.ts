import { CstNode, IToken } from "chevrotain";


export interface DocumentationDetailsCstNode extends CstNode {
	name: "ruleDetails";
	children: DocumentationDetailsCstChildren;
}

export type DocumentationDetailsCstChildren = {
	details: IToken[];
};
