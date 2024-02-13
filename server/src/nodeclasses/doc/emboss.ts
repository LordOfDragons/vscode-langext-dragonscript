import { CstNode, IToken } from "chevrotain";


export interface DocumentationEmbossCstNode extends CstNode {
	name: "ruleEmboss";
	children: DocumentationEmbossCstChildren;
}

export type DocumentationEmbossCstChildren = {
	emboss: IToken[];
};
