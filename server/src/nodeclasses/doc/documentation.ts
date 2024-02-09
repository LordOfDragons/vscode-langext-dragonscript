import { CstNode } from "chevrotain";


export interface DocumentationCstNode extends CstNode {
	name: "documentation";
	children: DocumentationCstChildren;
}

export type DocumentationCstChildren = {
	//scriptStatement?: ScriptStatementCstNode[];
};
