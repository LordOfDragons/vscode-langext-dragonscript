import { CstNode, IToken } from "chevrotain";


export interface DocumentationThrowCstNode extends CstNode {
	name: "ruleThrow";
	children: DocumentationThrowCstChildren;
}

export type DocumentationThrowCstChildren = {
	throw: IToken[];
	type: IToken[];
};
