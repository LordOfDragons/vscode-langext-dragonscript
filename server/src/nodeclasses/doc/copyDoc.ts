import { CstNode, IToken } from "chevrotain";


export interface DocumentationCopyDocCstNode extends CstNode {
	name: "ruleCopyDoc";
	children: DocumentationCopyDocCstChildren;
}

export type DocumentationCopyDocCstChildren = {
	copyDoc: IToken[];
};
