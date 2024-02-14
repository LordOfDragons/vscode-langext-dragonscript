import { CstNode, IToken } from "chevrotain";
import { DocumentationWordCstNode } from "./word";


export interface DocumentationParamCstNode extends CstNode {
	name: "ruleParam";
	children: DocumentationParamCstChildren;
}

export type DocumentationParamCstChildren = {
	param: IToken[];
	name: IToken[];
};
