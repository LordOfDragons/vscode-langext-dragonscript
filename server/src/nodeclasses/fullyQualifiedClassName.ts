import { CstNode, IToken } from "chevrotain";


export interface FullyQualifiedClassNameCstNode extends CstNode {
	name: "fullyQualifiedClassName";
	children: FullyQualifiedClassNameCstChildren;
}

export type FullyQualifiedClassNameCstChildren = {
	identifier: IToken[];
};
