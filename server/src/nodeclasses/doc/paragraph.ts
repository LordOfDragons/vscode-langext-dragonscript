import { CstNode, IToken } from "chevrotain";


export interface DocumentationParagraphCstNode extends CstNode {
	name: "ruleParagraph";
	children: DocumentationParagraphCstChildren;
}

export type DocumentationParagraphCstChildren = {
	paragraph: IToken[];
};
