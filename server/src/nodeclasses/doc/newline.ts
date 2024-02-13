import { CstNode, IToken } from "chevrotain";


export interface DocumentationNewlineCstNode extends CstNode {
	name: "ruleNewline";
	children: DocumentationNewlineCstChildren;
}

export type DocumentationNewlineCstChildren = {
	newline: IToken[];
	docLine?: IToken[];
};
