import { CstNode, IToken } from "chevrotain";


export interface DocumentationSeeCstNode extends CstNode {
	name: "ruleSee";
	children: DocumentationSeeCstChildren;
}

export type DocumentationSeeCstChildren = {
	see: IToken[];
};
