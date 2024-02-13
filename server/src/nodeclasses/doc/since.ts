import { CstNode, IToken } from "chevrotain";


export interface DocumentationSinceCstNode extends CstNode {
	name: "ruleSince";
	children: DocumentationSinceCstChildren;
}

export type DocumentationSinceCstChildren = {
	since: IToken[];
};
