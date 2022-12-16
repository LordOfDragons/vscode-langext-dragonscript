import { CstNode } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";


export interface OpenNamespaceCstNode extends CstNode {
	name: "openNamespace";
	children: OpenNamespaceCstChildren;
}

export type OpenNamespaceCstChildren = {
	name: FullyQualifiedClassNameCstNode[];
};