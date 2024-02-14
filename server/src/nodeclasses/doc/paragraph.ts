import { CstNode, IToken } from "chevrotain";
import { DocumentationWordCstNode } from "./word";


export interface DocumentationParagraphCstNode extends CstNode {
	name: "ruleParagraph";
	children: DocumentationParagraphCstChildren;
}

export type DocumentationParagraphCstChildren = {
	paragraph: IToken[];
	docWord?: DocumentationWordCstNode[];
};
