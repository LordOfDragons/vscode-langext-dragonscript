import { CstNode, IToken } from "chevrotain";
import { DocumentationBoldCstNode } from "./bold";
import { DocumentationEmbossCstNode } from "./emboss";
import { DocumentationReferenceCstNode } from "./reference";


export interface DocumentationWordCstNode extends CstNode {
	name: "docWord";
	children: DocumentationWordCstChildren;
}

export type DocumentationWordCstChildren = {
	ruleEmboss: DocumentationEmbossCstNode[];
	ruleReference: DocumentationReferenceCstNode[];
	ruleBold: DocumentationBoldCstNode[];
	string: IToken[];
	word: IToken[];
};
