import { CstNode, IToken } from "chevrotain";


export interface DocumentationReturnValueCstNode extends CstNode {
	name: "ruleReturnValue";
	children: DocumentationReturnValueCstChildren;
}

export type DocumentationReturnValueCstChildren = {
	returnValue: IToken[];
	value: IToken[];
};
