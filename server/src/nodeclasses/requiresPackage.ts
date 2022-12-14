import { CstNode, IToken } from "chevrotain";


export interface RequiresPackageCstNode extends CstNode {
	name: "requiresPackage";
	children: RequiresPackageCstChildren;
}

export type RequiresPackageCstChildren = {
	name: IToken[];
};
