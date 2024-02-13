import { CstNode, IToken } from "chevrotain";


export interface DocumentationBriefCstNode extends CstNode {
	name: "ruleBrief";
	children: DocumentationBriefCstChildren;
}

export type DocumentationBriefCstChildren = {
	brief: IToken[];
};
