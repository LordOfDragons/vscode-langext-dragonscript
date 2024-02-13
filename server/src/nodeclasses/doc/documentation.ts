import { CstNode, IToken } from "chevrotain";
import { DocumentationBlockCstNode } from "./block";
import { DocumentationNewlineCstNode } from "./newline";


export interface DocumentationDocCstNode extends CstNode {
	name: "documentation";
	children: DocumentationCstChildren;
}

export type DocumentationCstChildren = {
	ruleDocBegin: DocumentationDocBeginCstNode[];
	ruleDocBody: DocumentationDocBodyCstNode[];
	ruleDocEnd: DocumentationDocEndCstNode[];
};


export interface DocumentationDocBeginCstNode extends CstNode {
	name: "ruleDocBegin";
	children: RuleDocBeginCstChildren;
}

export type RuleDocBeginCstChildren = {
	docBegin?: IToken[];
	docBegin2?: IToken[];
	newline?: DocumentationNewlineCstNode[];
};


export interface DocumentationDocBodyCstNode extends CstNode {
	name: "ruleDocBody";
	children: RuleDocBodyCstChildren;
}

export type RuleDocBodyCstChildren = {
	docBlock: DocumentationBlockCstNode[];
};


export interface DocumentationDocEndCstNode extends CstNode {
	name: "ruleDocEnd";
	children: RuleDocEndCstChildren;
}

export type RuleDocEndCstChildren = {
	docEnd: IToken[];
};
