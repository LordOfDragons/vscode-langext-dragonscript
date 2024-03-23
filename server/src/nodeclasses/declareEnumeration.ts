import { CstNode, IToken } from "chevrotain";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface DeclareEnumerationCstNode extends CstNode {
	name: "declareEnumeration";
	children: DeclareEnumerationCstChildren;
}

export type DeclareEnumerationCstChildren = {
	enumerationBegin: EnumerationBeginCstNode[];
	enumerationBody: EnumerationBodyCstNode[];
	enumerationEnd: EnumerationEndCstNode[];
};


export interface EnumerationBeginCstNode extends CstNode {
	name: "enumerationBegin";
	children: EnumerationBeginCstChildren;
}

export type EnumerationBeginCstChildren = {
	enum: IToken[];
	name: IToken[];
	endOfCommand?: EndOfCommandCstNode[];
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
	endOfCommand: EndOfCommandCstNode[];
};


export interface EnumerationEndCstNode extends CstNode {
	name: "enumerationEnd";
	children: EnumerationEndCstChildren;
}

export type EnumerationEndCstChildren = {
	end: IToken[];
};
