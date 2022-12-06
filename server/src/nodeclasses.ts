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

import { CstNode, IToken } from "chevrotain"

// script
export interface ScriptCstNode extends CstNode {
	name: "script"
	children: ScriptCstChildren
}

export type ScriptCstChildren = {
	scriptStatement: CstNode[]
}

// scriptStatement
export interface ScriptStatementCstNode extends CstNode {
	name: "scriptStatement"
	children: ScriptStatementCstChildren
}

export type ScriptStatementCstChildren = {
	requiresPackage?: CstNode[]
	openNamespace?: OpenNamespaceCstNode[]
	pinNamespace?: PinNamespaceCstNode[]
	scriptDeclaration?: CstNode[]
	endOfCommand?: CstNode[]
}

// requiresPackage
export interface RequiresPackageCstNode extends CstNode {
	name: "requiresPackage"
	children: RequiresPackageCstChildren
}

export type RequiresPackageCstChildren = {
	requires: IToken[]
	name: IToken[]
	endOfCommand: CstNode[]
}

// pinNamespace
export interface PinNamespaceCstNode extends CstNode {
	name: "pinNamespace"
	children: PinNamespaceCstChildren
}

export type PinNamespaceCstChildren = {
	pin: IToken[]
	name: FullyQualifiedClassNameCstNode[]
	endOfCommand: CstNode[]
}

// fullyQualifiedClassName
export interface FullyQualifiedClassNameCstNode extends CstNode {
	name: "fullyQualifiedClassName"
	children: FullyQualifiedClassNameCstChildren
}

export type FullyQualifiedClassNameCstChildren = {
	period?: IToken[]
	identifier: IToken[]
}

// openNamespace
export interface OpenNamespaceCstNode extends CstNode {
	name: "openNamespace"
	children: OpenNamespaceCstChildren
}

export type OpenNamespaceCstChildren = {
	namespace: IToken[]
	name: FullyQualifiedClassNameCstNode[]
	endOfCommand: CstNode[]
}
