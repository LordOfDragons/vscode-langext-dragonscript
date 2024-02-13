import { CstNode, IToken } from "chevrotain";


export interface DocumentationWarningCstNode extends CstNode {
	name: "ruleWarning";
	children: DocumentationWarningCstChildren;
}

export type DocumentationWarningCstChildren = {
	warning: IToken[];
};
