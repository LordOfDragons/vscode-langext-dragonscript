import { CstNode, IToken } from "chevrotain";
import { DocumentationBlockCstNode } from "./block";


export interface DocumentationDocCstNode extends CstNode {
	name: "documentation";
	children: DocumentationCstChildren;
}

export type DocumentationCstChildren = {
	newline?: IToken[];
	docBlock: DocumentationBlockCstNode[];
};
