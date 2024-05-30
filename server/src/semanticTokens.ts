import { Range, SemanticTokenModifiers, SemanticTokenTypes, SemanticTokensBuilder, SemanticTokensLegend, integer } from "vscode-languageserver"

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
};
