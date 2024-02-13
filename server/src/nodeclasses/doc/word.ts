import { CstNode, IToken } from "chevrotain";
import { DocumentationEmbossCstNode } from "./emboss";
import { DocumentationReferenceCstNode } from "./reference";
import { DocumentationSeeCstNode } from "./see";


export interface DocumentationWordCstNode extends CstNode {
	name: "docWord";
	children: DocumentationWordCstChildren;
}

export type DocumentationWordCstChildren = {
	ruleEmboss: DocumentationEmbossCstNode[];
	ruleReference: DocumentationReferenceCstNode[];
	ruleSee: DocumentationSeeCstNode[];
	word: IToken[];
};
