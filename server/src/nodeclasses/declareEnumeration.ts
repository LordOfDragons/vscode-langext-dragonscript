import { CstNode, IToken } from "chevrotain";


export interface DeclareEnumerationCstNode extends CstNode {
	name: "declareEnumeration";
	children: DeclareEnumerationCstChildren;
}

export type DeclareEnumerationCstChildren = {
	enumerationBegin: EnumerationBeginCstNode[];
	enumerationBody: EnumerationBodyCstNode[];
};


export interface EnumerationBeginCstNode extends CstNode {
	name: "enumerationBegin";
	children: EnumerationBeginCstChildren;
}

export type EnumerationBeginCstChildren = {
	name: IToken[];
};


export interface EnumerationBodyCstNode extends CstNode {
	name: "enumerationBody";
	children: EnumerationBodyCstChildren;
}

export type EnumerationBodyCstChildren = {
	enumerationEntry?: EnumerationEntryCstNode[];
};


export interface EnumerationEntryCstNode extends CstNode {
	name: "enumerationEntry";
	children: EnumerationEntryCstChildren;
}

export type EnumerationEntryCstChildren = {
	name: IToken[];
};
