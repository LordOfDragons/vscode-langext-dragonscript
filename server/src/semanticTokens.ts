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

import { Range, SemanticTokenModifiers, SemanticTokenTypes, SemanticTokensBuilder, SemanticTokensLegend, integer } from "vscode-languageserver"
import { Context } from "./context/context"
import { Identifier } from "./context/identifier"
import { Resolved } from "./resolve/resolved"

export namespace semtokens {
export class Type {
private _name: string
private _index: integer

public constructor (name: string, index: integer) {
this._name = name
this._index = index
}

public get name(): string {
return this._name
}

public get index(): integer {
return this._index
}
}

export class Modifier {
private _name: string
private _index: integer

public constructor (name: string, index: integer) {
this._name = name
this._index = index
}

public get name(): string {
return this._name
}

public get index(): integer {
return this._index
}
}

export const typeNamespace = new Type(SemanticTokenTypes.namespace, 0)
export const typeClass = new Type(SemanticTokenTypes.class, 1)
export const typeEnum = new Type(SemanticTokenTypes.enum, 2)
export const typeInterface = new Type(SemanticTokenTypes.interface, 3)
export const typeParameter = new Type(SemanticTokenTypes.parameter, 4)
export const typeVariable = new Type(SemanticTokenTypes.variable, 5)
export const typeProperty = new Type(SemanticTokenTypes.property, 6)
export const typeEnumMember = new Type(SemanticTokenTypes.enumMember, 7)
export const typeMethod = new Type(SemanticTokenTypes.method, 8)
export const typeComment = new Type(SemanticTokenTypes.comment, 9)
export const typeString = new Type(SemanticTokenTypes.string, 10)
export const typeKeyword = new Type(SemanticTokenTypes.keyword, 11)
export const typeNumber = new Type(SemanticTokenTypes.number, 12)
export const typeOperator = new Type(SemanticTokenTypes.operator, 13)

export const allTypes = [typeNamespace, typeClass, typeEnum, typeInterface, typeParameter,
typeVariable, typeProperty, typeEnumMember, typeMethod, typeComment, typeString,
typeKeyword, typeNumber, typeOperator]

export const modDeclaration = new Modifier(SemanticTokenModifiers.declaration, 0)
export const modReadOnly = new Modifier(SemanticTokenModifiers.readonly, 1)
export const modStatic = new Modifier(SemanticTokenModifiers.static, 2)
export const modDeprecated = new Modifier(SemanticTokenModifiers.deprecated, 3)
export const modAbstract = new Modifier(SemanticTokenModifiers.abstract, 4)
export const modModification = new Modifier(SemanticTokenModifiers.modification, 5)
export const modDocumentation = new Modifier(SemanticTokenModifiers.documentation, 6)
export const modDefaultLibrary = new Modifier(SemanticTokenModifiers.defaultLibrary, 7)

export const allModifiers = [modDeclaration, modReadOnly, modStatic, modDeprecated,
modAbstract, modModification, modDocumentation, modDefaultLibrary]

export const legend: SemanticTokensLegend = {
tokenTypes: allTypes.map(t => t.name),
tokenModifiers: allModifiers.map(t => t.name)
}

export class Builder extends SemanticTokensBuilder {
public constructor() {
super()
}

public add(range: Range, type: Type, modifiers: Modifier[]): void {
this.push(range.start.line, range.start.character,
range.end.character - range.start.character, type.index,
modifiers.map(m => 1 << m.index).reduce((a,b) => a + b, 0))
}
}

/**
 * Provider for semantic tokens.
 * Delegates to Context.addSemanticTokens() for each context to add its tokens.
 */
export class Provider {
private builder: Builder

constructor() {
this.builder = new Builder()
}

/**
 * Build semantic tokens from a context tree.
 * Simply delegates to the context's addSemanticTokens method.
 */
public build(context: Context | undefined) {
if (context) {
context.addSemanticTokens(this.builder)
}
return this.builder.build()
}
}

/**
 * Helper functions for adding semantic tokens.
 */

/**
 * Add a declaration token for a context with an identifier.
 */
export function addDeclarationToken(builder: Builder, name: Identifier | undefined, 
tokenType: Type, typeModifiers?: Context.TypeModifierSet): void {
if (!name?.range) {
return
}

const modifiers: Modifier[] = [modDeclaration]

if (typeModifiers) {
if (typeModifiers.isStatic) {
modifiers.push(modStatic)
}
if (typeModifiers.isAbstract) {
modifiers.push(modAbstract)
}
if (typeModifiers.isFixed) {
modifiers.push(modReadOnly)
}
}

builder.add(name.range, tokenType, modifiers)
}

/**
 * Add a reference token for a resolved usage.
 */
export function addReferenceToken(builder: Builder, range: Range | undefined,
resolved: Resolved): void {
if (!range) {
return
}

const tokenType = getTokenTypeFromResolved(resolved)
if (!tokenType) {
return
}

const modifiers: Modifier[] = []

// Check if the resolved has type modifiers
if ('typeModifiers' in resolved) {
const typeModifiers = (resolved as any).typeModifiers as Context.TypeModifierSet | undefined
if (typeModifiers) {
if (typeModifiers.isStatic) {
modifiers.push(modStatic)
}
if (typeModifiers.isAbstract) {
modifiers.push(modAbstract)
}
if (typeModifiers.isFixed) {
modifiers.push(modReadOnly)
}
}
}

builder.add(range, tokenType, modifiers)
}

/**
 * Get semantic token type from a Resolved object.
 */
function getTokenTypeFromResolved(resolved: Resolved): Type | undefined {
switch (resolved.type) {
case Resolved.Type.Namespace:
return typeNamespace

case Resolved.Type.Class:
return typeClass

case Resolved.Type.Interface:
return typeInterface

case Resolved.Type.Enumeration:
return typeEnum

case Resolved.Type.Function:
case Resolved.Type.FunctionGroup:
return typeMethod

case Resolved.Type.Variable:
return typeProperty

case Resolved.Type.Argument:
return typeParameter

case Resolved.Type.LocalVariable:
return typeVariable

default:
return undefined
}
}
}
