import { CstNode, IToken } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface OpenNamespaceCstNode extends CstNode {
	name: "openNamespace";
	children: OpenNamespaceCstChildren;
}

export type OpenNamespaceCstChildren = {
	namespace: IToken[];
	name: FullyQualifiedClassNameCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
};
