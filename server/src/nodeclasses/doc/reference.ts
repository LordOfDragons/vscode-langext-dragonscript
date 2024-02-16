import { CstNode, IToken } from "chevrotain";


export interface DocumentationReferenceCstNode extends CstNode {
	name: "ruleReference";
	children: DocumentationReferenceCstChildren;
}

export type DocumentationReferenceCstChildren = {
	reference: IToken[];
	target: IToken[];
};
