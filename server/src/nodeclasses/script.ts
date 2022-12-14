import { CstNode } from "chevrotain";
import { DeclareClassCstNode } from "./declareClass";
import { DeclareEnumerationCstNode } from "./declareEnumeration";
import { DeclareInterfaceCstNode } from "./declareInterface";
import { OpenNamespaceCstNode } from "./openNamespace";
import { PinNamespaceCstNode } from "./pinNamespace";
import { RequiresPackageCstNode } from "./requiresPackage";
import { TypeModifiersCstNode } from "./typeModifiers";


export interface ScriptCstNode extends CstNode {
	name: "script";
	children: ScriptCstChildren;
}

export type ScriptCstChildren = {
	scriptStatement: ScriptStatementCstNode[];
};


export interface ScriptDeclarationCstNode extends CstNode {
	name: "scriptDeclaration";
	children: ScriptDeclarationCstChildren;
}

export type ScriptDeclarationCstChildren = {
	typeModifiers?: TypeModifiersCstNode[];
	declareClass?: DeclareClassCstNode[];
	declareInterface?: DeclareInterfaceCstNode[];
	declareEnumeration?: DeclareEnumerationCstNode[];
};


export interface ScriptStatementCstNode extends CstNode {
	name: "scriptStatement";
	children: ScriptStatementCstChildren;
}

export type ScriptStatementCstChildren = {
	requiresPackage?: RequiresPackageCstNode[];
	openNamespace?: OpenNamespaceCstNode[];
	pinNamespace?: PinNamespaceCstNode[];
	scriptDeclaration?: ScriptDeclarationCstNode[];
};
