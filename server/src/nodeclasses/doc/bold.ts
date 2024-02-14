import { CstNode, IToken } from "chevrotain";
import { DocumentationWordCstNode } from "./word";


export interface DocumentationBoldCstNode extends CstNode {
	name: "ruleBold";
	children: DocumentationBoldCstChildren;
}

export type DocumentationBoldCstChildren = {
	bold: IToken[];
	docWord: DocumentationWordCstNode[];
};
