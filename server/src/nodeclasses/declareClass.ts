import { CstNode, IToken } from "chevrotain";
import { DeclareEnumerationCstNode } from "./declareEnumeration";
import { FunctionBeginCstNode } from "./declareFunction";
import { DeclareInterfaceCstNode } from "./declareInterface";
import { ExpressionCstNode } from "./expression";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { StatementsCstNode } from "./statement";
import { TypeModifiersCstNode } from "./typeModifiers";


export interface DeclareClassCstNode extends CstNode {
	name: "declareClass";
	children: DeclareClassCstChildren;
}

export type DeclareClassCstChildren = {
	classBegin: ClassBeginCstNode[];
	classBody: ClassBodyCstNode[];
	classEnd: ClassEndCstNode[];
};


export interface ClassBeginCstNode extends CstNode {
	name: "classBegin";
	children: ClassBeginCstChildren;
}

export type ClassBeginCstChildren = {
	class: IToken[];
	name: IToken[];
	baseClassName?: FullyQualifiedClassNameCstNode[];
	interfaceName?: FullyQualifiedClassNameCstNode[];
};


export interface ClassBodyCstNode extends CstNode {
	name: "classBody";
	children: ClassBodyCstChildren;
}

export type ClassBodyCstChildren = {
	classBodyDeclaration: ClassBodyDeclarationCstNode[];
};


export interface ClassBodyDeclarationCstNode extends CstNode {
	name: "classBodyDeclaration";
	children: ClassBodyDeclarationCstChildren;
}

export type ClassBodyDeclarationCstChildren = {
	typeModifiers?: TypeModifiersCstNode[];
	declareClass?: DeclareClassCstNode[];
	declareInterface?: DeclareInterfaceCstNode[];
	declareEnumeration?: DeclareEnumerationCstNode[];
	classFunction?: ClassFunctionCstNode[];
	classVariables?: ClassVariablesCstNode[];
};


export interface ClassVariablesCstNode extends CstNode {
	name: "classVariables";
	children: ClassVariablesCstChildren;
}

export type ClassVariablesCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	classVariable?: ClassVariableCstNode[];
};


export interface ClassVariableCstNode extends CstNode {
	name: "classVariable";
	children: ClassVariableCstChildren;
}

export type ClassVariableCstChildren = {
	name: IToken[];
	value?: ExpressionCstNode[];
};


export interface ClassFunctionCstNode extends CstNode {
	name: "classFunction";
	children: ClassFunctionCstChildren;
}

export type ClassFunctionCstChildren = {
	functionBegin: FunctionBeginCstNode[];
	statements: StatementsCstNode[];
};


export interface ClassEndCstNode extends CstNode {
	name: "classEnd";
	children: ClassEndCstChildren;
}

export type ClassEndCstChildren = {
	end: IToken[];
};
