import { CstNode, IToken } from "chevrotain";
import { DeclareClassCstNode } from "./declareClass";
import { DeclareEnumerationCstNode } from "./declareEnumeration";
import { FunctionBeginCstNode } from "./declareFunction";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { TypeModifiersCstNode } from "./typeModifiers";


export interface DeclareInterfaceCstNode extends CstNode {
	name: "declareInterface";
	children: DeclareInterfaceCstChildren;
}

export type DeclareInterfaceCstChildren = {
	interfaceBegin: InterfaceBeginCstNode[];
	interfaceBody: InterfaceBodyCstNode[];
};


export interface InterfaceBeginCstNode extends CstNode {
	name: "interfaceBegin";
	children: InterfaceBeginCstChildren;
}

export type InterfaceBeginCstChildren = {
	name: IToken[];
	baseInterfaceName?: FullyQualifiedClassNameCstNode[];
};


export interface InterfaceBodyCstNode extends CstNode {
	name: "interfaceBody";
	children: InterfaceBodyCstChildren;
}

export type InterfaceBodyCstChildren = {
	interfaceBodyDeclaration?: InterfaceBodyDeclarationCstNode[];
};


export interface InterfaceBodyDeclarationCstNode extends CstNode {
	name: "interfaceBodyDeclaration";
	children: InterfaceBodyDeclarationCstChildren;
}

export type InterfaceBodyDeclarationCstChildren = {
	typeModifiers?: TypeModifiersCstNode[];
	declareClass?: DeclareClassCstNode[];
	declareInterface?: DeclareInterfaceCstNode[];
	declareEnumeration?: DeclareEnumerationCstNode[];
	interfaceFunction?: InterfaceFunctionCstNode[];
};


export interface InterfaceFunctionCstNode extends CstNode {
	name: "interfaceFunction";
	children: InterfaceFunctionCstChildren;
}

export type InterfaceFunctionCstChildren = {
	functionBegin?: FunctionBeginCstNode[];
};