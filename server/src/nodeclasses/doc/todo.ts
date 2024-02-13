import { CstNode, IToken } from "chevrotain";


export interface DocumentationTodoCstNode extends CstNode {
	name: "ruleTodo";
	children: DocumentationTodoCstChildren;
}

export type DocumentationTodoCstChildren = {
	todo: IToken[];
};
