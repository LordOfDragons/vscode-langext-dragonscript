import { CstNode, IToken } from "chevrotain";


export interface FullyQualifiedClassNameCstNode extends CstNode {
	name: "fullyQualifiedClassName";
	children: FullyQualifiedClassNameCstChildren;
}

export type FullyQualifiedClassNameCstChildren = {
	fullyQualifiedClassNamePart?: FullyQualifiedClassNamePartCstNode[];
};


export interface FullyQualifiedClassNamePartCstNode extends CstNode {
	name: "fullyQualifiedClassNamePart";
	children: FullyQualifiedClassNamePartCstChildren;
}

export type FullyQualifiedClassNamePartCstChildren = {
	identifier?: IToken[];
};
