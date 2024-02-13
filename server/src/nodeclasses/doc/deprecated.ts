import { CstNode, IToken } from "chevrotain";


export interface DocumentationDeprecatedCstNode extends CstNode {
	name: "ruleDeprecated";
	children: DocumentationDeprecatedCstChildren;
}

export type DocumentationDeprecatedCstChildren = {
	deprecated: IToken[];
};
