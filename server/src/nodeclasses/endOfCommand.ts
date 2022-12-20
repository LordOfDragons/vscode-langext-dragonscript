import { CstNode, IToken } from "chevrotain";


export interface EndOfCommandCstNode extends CstNode {
	name: "endOfCommand";
	children: EndOfCommandCstChildren;
}

export type EndOfCommandCstChildren = {
	commandSeparator?: IToken[];
	newline?: IToken[];
};
