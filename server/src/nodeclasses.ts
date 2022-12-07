/**
 * MIT License
 *
 * Copyright (c) 2022 DragonDreams (info@dragondreams.ch)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { CstNode, CstParser, IToken } from "chevrotain";

// script
export interface ScriptCstNode extends CstNode {
	name: "script";
	children: ScriptCstChildren;
}

export type ScriptCstChildren = {
	scriptStatement: ScriptStatementCstNode[];
}

// scriptStatement
export interface ScriptStatementCstNode extends CstNode {
	name: "scriptStatement";
	children: ScriptStatementCstChildren;
}

export type ScriptStatementCstChildren = {
	requiresPackage?: RequiresPackageCstNode[];
	openNamespace?: OpenNamespaceCstNode[];
	pinNamespace?: PinNamespaceCstNode[];
	scriptDeclaration?: ScriptDeclarationCstNode[];
}

// requiresPackage
export interface RequiresPackageCstNode extends CstNode {
	name: "requiresPackage";
	children: RequiresPackageCstChildren;
}

export type RequiresPackageCstChildren = {
	name: IToken[];
}

// pinNamespace
export interface PinNamespaceCstNode extends CstNode {
	name: "pinNamespace";
	children: PinNamespaceCstChildren;
}

export type PinNamespaceCstChildren = {
	name: FullyQualifiedClassNameCstNode[];
}

// fullyQualifiedClassName
export interface FullyQualifiedClassNameCstNode extends CstNode {
	name: "fullyQualifiedClassName";
	children: FullyQualifiedClassNameCstChildren;
}

export type FullyQualifiedClassNameCstChildren = {
	identifier: IToken[];
}

// openNamespace
export interface OpenNamespaceCstNode extends CstNode {
	name: "openNamespace";
	children: OpenNamespaceCstChildren;
}

export type OpenNamespaceCstChildren = {
	name: FullyQualifiedClassNameCstNode[];
}

// scriptDeclaration
export interface ScriptDeclarationCstNode extends CstNode {
	name: "scriptDeclaration";
	children: ScriptDeclarationCstChildren;
}

export type ScriptDeclarationCstChildren = {
	typeModifiers?: TypeModifiersCstNode[];
	declareClass?: DeclareClassCstNode[];
	declareInterface?: DeclareInterfaceCstNode[];
	declareEnumeration?: DeclareEnumerationCstNode[];
}

// typeModifiers
export interface TypeModifiersCstNode extends CstNode {
	name: "typeModifiers";
	children: TypeModifiersCstChildren;
}

export type TypeModifiersCstChildren = {
	typeModifier: TypeModifierCstNode[];
}

// typeModifier
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

// declareClass
export interface DeclareClassCstNode extends CstNode {
	name: "declareClass";
	children: DeclareClassCstChildren;
}

export type DeclareClassCstChildren = {
	classBegin: ClassBeginCstNode[];
	classBody: ClassBodyCstNode[];
}

// classBegin
export interface ClassBeginCstNode extends CstNode {
	name: "classBegin";
	children: ClassBeginCstChildren;
}

export type ClassBeginCstChildren = {
	name: IToken[];
	baseClassName?: FullyQualifiedClassNameCstNode[];
	interfaceName?: FullyQualifiedClassNameCstNode[];
}

// classBody
export interface ClassBodyCstNode extends CstNode {
	name: "classBody";
	children: ClassBodyCstChildren;
}

export type ClassBodyCstChildren = {
	classBodyDeclaration: ClassBodyDeclarationCstNode[];
}

// classBodyDeclaration
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
}

// classVariables
export interface ClassVariablesCstNode extends CstNode {
	name: "classVariables";
	children: ClassVariablesCstChildren;
}

export type ClassVariablesCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	classVariable?: ClassVariableCstNode[];
}

// classVariable
export interface ClassVariableCstNode extends CstNode {
	name: "classVariable";
	children: ClassVariableCstChildren;
}

export type ClassVariableCstChildren = {
	name: IToken[];
	value?: ExpressionCstNode[];
}

// classFunction
export interface ClassFunctionCstNode extends CstNode {
	name: "classFunction";
	children: ClassFunctionCstChildren;
}

export type ClassFunctionCstChildren = {
	functionBegin: FunctionBeginCstNode[];
	statement: StatementCstNode[];
}

// declareInterface
export interface DeclareInterfaceCstNode extends CstNode {
	name: "declareInterface";
	children: DeclareInterfaceCstChildren;
}

export type DeclareInterfaceCstChildren = {
	interfaceBegin: InterfaceBeginCstNode[];
	interfaceBody: InterfaceBodyCstNode[];
}

// interfaceBegin
export interface InterfaceBeginCstNode extends CstNode {
	name: "interfaceBegin";
	children: InterfaceBeginCstChildren;
}

export type InterfaceBeginCstChildren = {
	name: IToken[];
	baseInterfaceName?: FullyQualifiedClassNameCstNode[];
}

// interfaceBody
export interface InterfaceBodyCstNode extends CstNode {
	name: "interfaceBody";
	children: InterfaceBodyCstChildren;
}

export type InterfaceBodyCstChildren = {
	interfaceBodyDeclaration?: InterfaceBodyDeclarationCstNode[];
}

// interfaceBodyDeclaration
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
}

// interfaceFunction
export interface InterfaceFunctionCstNode extends CstNode {
	name: "interfaceFunction";
	children: InterfaceFunctionCstChildren;
}

export type InterfaceFunctionCstChildren = {
	functionBegin?: FunctionBeginCstNode[];
}

// functionBegin
export interface FunctionBeginCstNode extends CstNode {
	name: "functionBegin";
	children: FunctionBeginCstChildren;
}

export type FunctionBeginCstChildren = {
	classConstructor?: ClassConstructorCstNode[];
	classDestructor?: CstNode[];
	regularFunction?: RegularFunctionCstNode[];
}

// classConstructor
export interface ClassConstructorCstNode extends CstNode {
	name: "classConstructor";
	children: ClassConstructorCstChildren;
}

export type ClassConstructorCstChildren = {
	functionArguments: FunctionArgumentsCstNode[];
	this?: IToken[];
	super?: IToken[];
	functionCall?: FunctionCallCstNode[];
}

// functionCall
export interface FunctionCallCstNode extends CstNode {
	name: "functionCall";
	children: FunctionCallCstChildren;
}

export type FunctionCallCstChildren = {
	argument: ExpressionCstNode[];
}

// regularFunction
export interface RegularFunctionCstNode extends CstNode {
	name: "regularFunction";
	children: RegularFunctionCstChildren;
}

export type RegularFunctionCstChildren = {
	returnType: FullyQualifiedClassNameCstNode[];
	name?: IToken[];
	operator?: FunctionOperatorCstNode[];
	functionArguments: FunctionArgumentsCstNode[];
}

// functionOperator
export interface FunctionOperatorCstNode extends CstNode {
	name: "functionOperator";
	children: FunctionOperatorCstChildren;
}

export type FunctionOperatorCstChildren = {
	assignMultiply?: IToken[];
	assignDivide?: IToken[];
	assignModulus?: IToken[];
	assignAdd?: IToken[];
	assignSubtract?: IToken[];
	assignShiftLeft?: IToken[];
	assignShiftRight?: IToken[];
	assignAnd?: IToken[];
	assignOr?: IToken[];
	assignXor?: IToken[];
	and?: IToken[];
	or?: IToken[];
	xor?: IToken[];
	shiftLeft?: IToken[];
	shiftRight?: IToken[];
	less?: IToken[];
	greater?: IToken[];
	lessEqual?: IToken[];
	greaterEqual?: IToken[];
	multiply?: IToken[];
	divide?: IToken[];
	modulus?: IToken[];
	add?: IToken[];
	subtract?: IToken[];
	increment?: IToken[];
	decrement?: IToken[];
	inverse?: IToken[];
}

// functionArguments
export interface FunctionArgumentsCstNode extends CstNode {
	name: "functionArguments";
	children: FunctionArgumentsCstChildren;
}

export type FunctionArgumentsCstChildren = {
	functionArgument?: FunctionArgumentCstNode[];
}

// functionArgument
export interface FunctionArgumentCstNode extends CstNode {
	name: "functionArgument";
	children: FunctionArgumentCstChildren;
}

export type FunctionArgumentCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	name: IToken[];
}

// declareEnumeration
export interface DeclareEnumerationCstNode extends CstNode {
	name: "declareEnumeration";
	children: DeclareEnumerationCstChildren;
}

export type DeclareEnumerationCstChildren = {
	enumerationBegin: EnumerationBeginCstNode[];
	enumerationBody: EnumerationBodyCstNode[];
}

// enumerationBegin
export interface EnumerationBeginCstNode extends CstNode {
	name: "enumerationBegin";
	children: EnumerationBeginCstChildren;
}

export type EnumerationBeginCstChildren = {
	name: IToken[];
}

// enumerationBody
export interface EnumerationBodyCstNode extends CstNode {
	name: "enumerationBody";
	children: EnumerationBodyCstChildren;
}

export type EnumerationBodyCstChildren = {
	enumerationEntry?: EnumerationEntryCstNode[];
}

// enumerationEntry
export interface EnumerationEntryCstNode extends CstNode {
	name: "enumerationEntry";
	children: EnumerationEntryCstChildren;
}

export type EnumerationEntryCstChildren = {
	name: IToken[];
}

// expression
export interface ExpressionCstNode extends CstNode {
	name: "expression";
	children: ExpressionCstChildren;
}

export type ExpressionCstChildren = {
	
}

// statement
export interface StatementCstNode extends CstNode {
	name: "statement";
	children: StatementCstChildren;
}

export type StatementCstChildren = {
	statementIf?: CstNode[];
	statementReturn?: CstNode[];
	statementSelect?: CstNode[];
	statementWhile?: CstNode[];
	statementFor?: CstNode[];
	break?: IToken[];
	continue?: IToken[];
	statementThrow?: CstNode[];
	statementTry?: CstNode[];
	statementVariables?: CstNode[];
	expression?: ExpressionCstNode[];
}
