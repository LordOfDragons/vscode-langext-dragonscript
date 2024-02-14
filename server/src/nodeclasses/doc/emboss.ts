import { CstNode, IToken } from "chevrotain";
import { DocumentationWordCstNode } from "./word";


export interface DocumentationEmbossCstNode extends CstNode {
	name: "ruleEmboss";
	children: DocumentationEmbossCstChildren;
}

export type DocumentationEmbossCstChildren = {
	emboss: IToken[];
	docWord: DocumentationWordCstNode[];
};
