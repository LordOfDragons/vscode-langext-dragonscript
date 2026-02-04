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
import { Context } from "./context/context";
import { ContextClass } from "./context/scriptClass";
import { ContextInterface } from "./context/scriptInterface";
import { ContextEnumeration, ContextEnumEntry } from "./context/scriptEnum";
import { ContextFunction } from "./context/classFunction";
import { ContextClassVariable } from "./context/classVariable";
import { ContextFunctionArgument } from "./context/classFunctionArgument";
import { ContextNamespace } from "./context/namespace";

export namespace semtokens {
	export class Type {
		private _name: string;
		private _index: integer;
		
		public constructor (name: string, index: integer) {
			this._name = name;
			this._index = index;
		}
		
		public get name(): string {
			return this._name;
		}
		
		public get index(): integer {
			return this._index;
		}
	}
	
	export class Modifier {
		private _name: string;
		private _index: integer;
		
		public constructor (name: string, index: integer) {
			this._name = name;
			this._index = index;
		}
		
		public get name(): string {
			return this._name;
		}
		
		public get index(): integer {
			return this._index;
		}
	}
	
	export const typeNamespace = new Type(SemanticTokenTypes.namespace, 0);
	export const typeClass = new Type(SemanticTokenTypes.class, 1);
	export const typeEnum = new Type(SemanticTokenTypes.enum, 2);
	export const typeInterface = new Type(SemanticTokenTypes.interface, 3);
	export const typeParameter = new Type(SemanticTokenTypes.parameter, 4);
	export const typeVariable = new Type(SemanticTokenTypes.variable, 5);
	export const typeProperty = new Type(SemanticTokenTypes.property, 6);
	export const typeEnumMember = new Type(SemanticTokenTypes.enumMember, 7);
	export const typeMethod = new Type(SemanticTokenTypes.method, 8);
	export const typeComment = new Type(SemanticTokenTypes.comment, 9);
	export const typeString = new Type(SemanticTokenTypes.string, 10);
	export const typeKeyword = new Type(SemanticTokenTypes.keyword, 11);
	export const typeNumber = new Type(SemanticTokenTypes.number, 12);
	export const typeOperator = new Type(SemanticTokenTypes.operator, 13);
	
	export const allTypes = [typeNamespace, typeClass, typeEnum, typeInterface, typeParameter,
		typeVariable, typeProperty, typeEnumMember, typeMethod, typeComment, typeString,
		typeKeyword, typeNumber, typeOperator];
	
	export const modDeclaration = new Modifier(SemanticTokenModifiers.declaration, 0);
	export const modReadOnly = new Modifier(SemanticTokenModifiers.readonly, 1);
	export const modStatic = new Modifier(SemanticTokenModifiers.static, 2);
	export const modDeprecated = new Modifier(SemanticTokenModifiers.deprecated, 3);
	export const modAbstract = new Modifier(SemanticTokenModifiers.abstract, 4);
	export const modModification = new Modifier(SemanticTokenModifiers.modification, 5);
	export const modDocumentation = new Modifier(SemanticTokenModifiers.documentation, 6);
	export const modDefaultLibrary = new Modifier(SemanticTokenModifiers.defaultLibrary, 7);
	
	export const allModifiers = [modDeclaration, modReadOnly, modStatic, modDeprecated,
		modAbstract, modModification, modDocumentation, modDefaultLibrary];
	
	export const legend: SemanticTokensLegend = {
		tokenTypes: allTypes.map(t => t.name),
		tokenModifiers: allModifiers.map(t => t.name)
	}
	
	export class Builder extends SemanticTokensBuilder {
		public constructor() {
			super();
		}
		
		public add(range: Range, type: Type, modifiers: Modifier[]): void {
			this.push(range.start.line, range.start.character,
				range.end.character - range.start.character, type.index,
				modifiers.map(m => 1 << m.index).reduce((a,b) => a + b, 0));
		}
	}
	
	/**
	 * Provider for semantic tokens.
	 * Walks the context tree and generates semantic tokens for identifiers.
	 */
	export class Provider {
		private builder: Builder;
		
		constructor() {
			this.builder = new Builder();
		}
		
		/**
		 * Build semantic tokens from a context tree.
		 */
		public build(context: Context | undefined) {
			if (context) {
				this.visitContext(context);
			}
			return this.builder.build();
		}
		
		/**
		 * Visit a context and its children recursively.
		 */
		protected visitContext(context: Context): void {
			this.processContext(context);
			this.visitChildren(context);
		}
		
		/**
		 * Process a single context and add semantic tokens for its identifier if applicable.
		 */
		protected processContext(context: Context): void {
			const modifiers = this.getModifiers(context);
			const type = this.getTokenType(context);
			const range = this.getIdentifierRange(context);
			
			if (type && range) {
				this.builder.add(range, type, modifiers);
			}
		}
		
		/**
		 * Get the semantic token type for a context.
		 */
		protected getTokenType(context: Context): Type | undefined {
			switch (context.type) {
				case Context.ContextType.Namespace:
				case Context.ContextType.PinNamespace:
					return typeNamespace;
				
				case Context.ContextType.Class:
					return typeClass;
				
				case Context.ContextType.Interface:
					return typeInterface;
				
				case Context.ContextType.Enumeration:
					return typeEnum;
				
				case Context.ContextType.EnumerationEntry:
					return typeEnumMember;
				
				case Context.ContextType.Function:
					return typeMethod;
				
				case Context.ContextType.FunctionArgument:
					return typeParameter;
				
				case Context.ContextType.ClassVariable:
					return typeProperty;
				
				case Context.ContextType.Variable:
					return typeVariable;
				
				default:
					return undefined;
			}
		}
		
		/**
		 * Get modifiers for a context based on its type modifiers.
		 */
		protected getModifiers(context: Context): Modifier[] {
			const modifiers: Modifier[] = [];
			
			// Add declaration modifier for declarations
			if (this.isDeclaration(context)) {
				modifiers.push(modDeclaration);
			}
			
			// Check for type modifiers if context has them
			const typeModifiers = this.getTypeModifiers(context);
			if (typeModifiers) {
				if (typeModifiers.isStatic) {
					modifiers.push(modStatic);
				}
				if (typeModifiers.isAbstract) {
					modifiers.push(modAbstract);
				}
				if (typeModifiers.isFixed) {
					modifiers.push(modReadOnly);
				}
			}
			
			return modifiers;
		}
		
		/**
		 * Check if a context is a declaration.
		 */
		protected isDeclaration(context: Context): boolean {
			switch (context.type) {
				case Context.ContextType.Class:
				case Context.ContextType.Interface:
				case Context.ContextType.Enumeration:
				case Context.ContextType.EnumerationEntry:
				case Context.ContextType.Function:
				case Context.ContextType.FunctionArgument:
				case Context.ContextType.ClassVariable:
				case Context.ContextType.Variable:
				case Context.ContextType.Namespace:
				case Context.ContextType.PinNamespace:
					return true;
				default:
					return false;
			}
		}
		
		/**
		 * Get type modifiers from a context if it has them.
		 */
		protected getTypeModifiers(context: Context): Context.TypeModifierSet | undefined {
			if (context instanceof ContextClass) {
				return context.typeModifiers;
			}
			if (context instanceof ContextInterface) {
				return context.typeModifiers;
			}
			if (context instanceof ContextEnumeration) {
				return context.typeModifiers;
			}
			if (context instanceof ContextFunction) {
				return context.typeModifiers;
			}
			if (context instanceof ContextClassVariable) {
				return context.typeModifiers;
			}
			return undefined;
		}
		
		/**
		 * Get the identifier range from a context.
		 */
		protected getIdentifierRange(context: Context): Range | undefined {
			// Try to get the name identifier if it exists
			const name = this.getIdentifier(context);
			if (name?.range) {
				return name.range;
			}
			return undefined;
		}
		
		/**
		 * Get the identifier from a context if it has one.
		 */
		protected getIdentifier(context: Context): any {
			if (context instanceof ContextClass) {
				return context.name;
			}
			if (context instanceof ContextInterface) {
				return context.name;
			}
			if (context instanceof ContextEnumeration) {
				return context.name;
			}
			if (context instanceof ContextEnumEntry) {
				return context.name;
			}
			if (context instanceof ContextFunction) {
				return context.name;
			}
			if (context instanceof ContextClassVariable) {
				return context.name;
			}
			if (context instanceof ContextFunctionArgument) {
				return context.name;
			}
			if (context instanceof ContextNamespace) {
				return context.typename.lastPart?.name;
			}
			return undefined;
		}
		
		/**
		 * Visit children of a context.
		 */
		protected visitChildren(context: Context): void {
			switch (context.type) {
				case Context.ContextType.Script:
					this.visitScriptChildren(context);
					break;
				
				case Context.ContextType.Class:
					this.visitClassChildren(context as ContextClass);
					break;
				
				case Context.ContextType.Interface:
					this.visitInterfaceChildren(context as ContextInterface);
					break;
				
				case Context.ContextType.Enumeration:
					this.visitEnumerationChildren(context as ContextEnumeration);
					break;
				
				case Context.ContextType.Function:
					this.visitFunctionChildren(context as ContextFunction);
					break;
				
				default:
					// For other contexts, we don't need to visit children for semantic tokens
					break;
			}
		}
		
		/**
		 * Visit children of a script context.
		 */
		protected visitScriptChildren(context: Context): void {
			const declarations = (context as any)._declarations as Context[] | undefined;
			if (declarations) {
				for (const child of declarations) {
					this.visitContext(child);
				}
			}
		}
		
		/**
		 * Visit children of a class context.
		 */
		protected visitClassChildren(context: ContextClass): void {
			for (const child of context.declarations) {
				this.visitContext(child);
			}
		}
		
		/**
		 * Visit children of an interface context.
		 */
		protected visitInterfaceChildren(context: ContextInterface): void {
			for (const child of context.declarations) {
				this.visitContext(child);
			}
		}
		
		/**
		 * Visit children of an enumeration context.
		 */
		protected visitEnumerationChildren(context: ContextEnumeration): void {
			for (const entry of context.entries) {
				this.visitContext(entry);
			}
		}
		
		/**
		 * Visit children of a function context.
		 */
		protected visitFunctionChildren(context: ContextFunction): void {
			for (const arg of context.arguments) {
				this.visitContext(arg);
			}
		}
	}
};
