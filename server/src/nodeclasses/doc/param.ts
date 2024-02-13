import { CstNode, IToken } from "chevrotain";


export interface DocumentationParamCstNode extends CstNode {
	name: "ruleParam";
	children: DocumentationParamCstChildren;
}

export type DocumentationParamCstChildren = {
	param: IToken[];
};
