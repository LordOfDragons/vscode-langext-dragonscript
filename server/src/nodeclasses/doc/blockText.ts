import { CstNode, IToken } from "chevrotain";
import { DocumentationWordCstNode } from "./word";


export interface DocumentationBlockTextCstNode extends CstNode {
	name: "docBlockText";
	children: DocumentationBlockTextCstChildren;
}

export type DocumentationBlockTextCstChildren = {
	docBlockTextWord?: DocumentationBlockTextWordCstNode[];
};


export interface DocumentationBlockTextWordCstNode extends CstNode {
	name: "docBlockTextWord";
	children: DocumentationBlockTextWordCstChildren;
}

export type DocumentationBlockTextWordCstChildren = {
	docWord?: DocumentationWordCstNode[];
	newline?: IToken[];
};
