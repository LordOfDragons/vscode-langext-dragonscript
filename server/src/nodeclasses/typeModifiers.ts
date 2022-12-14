import { CstNode, IToken } from "chevrotain";


export interface TypeModifiersCstNode extends CstNode {
	name: "typeModifiers";
	children: TypeModifiersCstChildren;
}

export type TypeModifiersCstChildren = {
	typeModifier: TypeModifierCstNode[];
};


export interface TypeModifierCstNode extends CstNode {
	name: "typeModifier";
	children: TypeModifierCstChildren;
}

export type TypeModifierCstChildren = {
	public?: IToken[];
	protected?: IToken[];
	private?: IToken[];
	abstract?: IToken[];
	fixed?: IToken[];
	static?: IToken[];
	native?: IToken[];
}
