import { CstNode, IToken } from "chevrotain";


export interface DocumentationNoteCstNode extends CstNode {
	name: "ruleNote";
	children: DocumentationNoteCstChildren;
}

export type DocumentationNoteCstChildren = {
	note: IToken[];
};
