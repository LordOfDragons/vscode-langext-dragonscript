import { CstNode } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";


export interface PinNamespaceCstNode extends CstNode {
	name: "pinNamespace";
	children: PinNamespaceCstChildren;
}

export type PinNamespaceCstChildren = {
	name: FullyQualifiedClassNameCstNode[];
};
