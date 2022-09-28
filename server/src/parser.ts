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

import { CstNode, CstParser, ParserMethod } from "chevrotain"
import { DSLexer } from "./lexer"

export class DSParser extends CstParser{
	constructor() {
		super(DSLexer.allTokens, {
			recoveryEnabled: true
		})
		this.performSelfAnalysis()
	}



	// common stuff
	/////////////////
	
	// PUBLIC | PROTECTED | PRIVATE | ABSTRACT | FIXED | STATIC | NATIVE -> typeModifier
	public typeModifier = this.RULE("typeModifier", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenPublic)},
			{ALT: () => this.CONSUME(DSLexer.tokenProtected)},
			{ALT: () => this.CONSUME(DSLexer.tokenPrivate)},
			{ALT: () => this.CONSUME(DSLexer.tokenAbstract)},
			{ALT: () => this.CONSUME(DSLexer.tokenFixed)},
			{ALT: () => this.CONSUME(DSLexer.tokenStatic)},
			{ALT: () => this.CONSUME(DSLexer.tokenNative)}
		])
	})

	// typeModifier* -> typeModifiers
	public typeModifiers = this.RULE("typeModifiers", () => {
		this.MANY(() => this.SUBRULE(this.typeModifier))
	})

	// identifier @ PERIOD -> fullyQualifiedClassname
	public fullyQualifiedClassname = this.RULE("fullyQualifiedClassname", () => {
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenPeriod,
			DEF: () => this.CONSUME(DSLexer.tokenIdentifier)
		})
	})

	// COMMAND_SEPARATOR | LINEBREAK -> endOfCommand
	public endOfCommand = this.RULE("endOfCommand", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenCommandSeparator)},
			{ALT: () => this.CONSUME(DSLexer.tokenNewline)}
		])
	})



	// script level
	/////////////////

	// typeModifier* ( class | interface  | enumeration  ) -> scriptDeclaration
	public scriptDeclaration = this.RULE("scriptDeclaration", () => {
		this.SUBRULE(this.typeModifiers)
		this.OR([
			{ALT: () => this.SUBRULE(this.scriptClass)},
			{ALT: () => this.SUBRULE(this.scriptInterface)},
			{ALT: () => this.SUBRULE(this.scriptEnumeration)}
		])
	})

	// requires | namespace | pin | scriptDeclaration | endOfCommand -> scriptStatement
	public scriptStatement = this.RULE("scriptStatement", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.scriptRequires)},
			{ALT: () => this.SUBRULE(this.scriptNamespace)},
			{ALT: () => this.SUBRULE(this.scriptPin)},
			{ALT: () => this.SUBRULE(this.scriptDeclaration)},
			{ALT: () => this.SUBRULE(this.endOfCommand)}
		])
	})

	// scriptStatement* -> script
	public script = this.RULE("script", () => {
		this.MANY(() => this.SUBRULE(this.scriptStatement))
	})

	// REQUIRES name=LITERAL_STRING endOfCommand -> requires
	public scriptRequires = this.RULE("scriptRequires", () => {
		this.CONSUME(DSLexer.tokenRequires)
		this.CONSUME(DSLexer.tokenString)
		this.SUBRULE(this.endOfCommand)
	})

	// NAMESPACE fullyQualifiedClassname endOfCommand -> namespace
	public scriptNamespace = this.RULE("scriptNamespace", () => {
		this.CONSUME(DSLexer.tokenNamespace)
		this.SUBRULE(this.fullyQualifiedClassname)
		this.SUBRULE(this.endOfCommand)
	})

	// PIN fullyQualifiedClassname endOfCommand -> pin
	public scriptPin = this.RULE("scriptPin", () => {
		this.CONSUME(DSLexer.tokenPin)
		this.SUBRULE(this.fullyQualifiedClassname)
		this.SUBRULE(this.endOfCommand)
	})



	// class level
	////////////////

	// CLASS name=identifier
	//    ?( EXTENDS extends=fullyQualifiedClassname )
	//    ?( IMPLEMENTS #implements=fullyQualifiedClassname
	//       ( COMMA #implements=fullyQualifiedClassname )* )
	//    endOfCommand -> classBegin
	public classBegin = this.RULE("classBegin", () => {
		this.CONSUME(DSLexer.tokenClass)
		this.CONSUME(DSLexer.tokenIdentifier)
		this.OPTION(() => {
			this.CONSUME(DSLexer.tokenExtends)
			this.SUBRULE(this.fullyQualifiedClassname)
		})
		this.OPTION2(() => {
			this.CONSUME(DSLexer.tokenImplements)
			this.AT_LEAST_ONE_SEP({
				SEP: DSLexer.tokenComma,
				DEF: () => {this.SUBRULE2(this.fullyQualifiedClassname)}
			})
		})
		this.SUBRULE(this.endOfCommand)
	})

	// typeModifier* ( class | interface | enumeration | classFunctionDeclare | classVariablesDeclare ) -> scriptClassBodyDeclaration
	public scriptClassBodyDeclaration = this.RULE("scriptClassBodyDeclaration", () => {
		this.SUBRULE(this.typeModifiers)
		this.OR([
			{ALT: () => this.SUBRULE(this.scriptClass)},
			{ALT: () => this.SUBRULE(this.scriptInterface)},
			{ALT: () => this.SUBRULE(this.scriptEnumeration)},
			{ALT: () => this.SUBRULE(this.classFunctionDeclare)},
			{ALT: () => this.SUBRULE(this.classVariablesDeclare)}
		])
	})

	// FUNC classFunctionDeclareBegin
	// -- for non-abstract functions only
	// [: if( ( pLastTypeModifiers & etmAbstract ) != etmAbstract ){ :]
	//    #body=statement*
	// classFunctionEnd
	// [: } :] -> classFunctionDeclare
	public classFunctionDeclare = this.RULE("classFunctionDeclare", () => {
		this.CONSUME(DSLexer.tokenFunc)
		this.SUBRULE(this.classFunctionDeclareBegin)
		// TODO: statement and end only if parent typemodifiers contains abstract
		this.MANY(() => this.SUBRULE(this.statement))
		this.SUBRULE(this.classFunctionEnd)
	})

	// type=fullyQualifiedClassname name=identifier -> classFunctionDeclareArgument
	public classFunctionDeclareArgument = this.RULE("classFunctionDeclareArgument", () => {
		this.SUBRULE(this.fullyQualifiedClassname)
		this.CONSUME(DSLexer.tokenIdentifier)
	})

	// LPAREN ?( classFunctionDeclareArgument @ COMMA ) RPAREN -> classFunctionDeclareArguments
	public classFunctionDeclareArguments = this.RULE("classFunctionDeclareArguments", () => {
		this.CONSUME(DSLexer.tokenLParan)
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.classFunctionDeclareArgument)
		})
		this.CONSUME(DSLexer.tokenRParan)
	})
	
	// classConstructorDeclareBegin
	// identifier="new" classFunctionDeclareArguments
	// ?( ( this | super ) funcCallArguments )
	// endOfCommand
	public classConstructorDeclareBegin = this.RULE("classConstructorDeclareBegin", () => {
		this.CONSUME(DSLexer.tokenIdentifier)
		this.SUBRULE(this.classFunctionDeclareArguments)
		this.OPTION(() => {
			this.OR2([
				{ALT: () => this.CONSUME(DSLexer.tokenThis)},
				{ALT: () => this.CONSUME(DSLexer.tokenSuper)}
			])
			this.SUBRULE(this.funcCallArguments)
		})
		this.SUBRULE(this.endOfCommand)
	})

	// classDestructorDeclareBegin
	// identifier="destructor" LPAREN RPAREN endOfCommand
	public classDestructorDeclareBegin = this.RULE("classDestructorDeclareBegin", () => {
		this.CONSUME(DSLexer.tokenLParan)
		this.CONSUME(DSLexer.tokenRParan)
		this.SUBRULE(this.endOfCommand)
	})
	
	// classFunctionOtherDeclareBegin
	// identifier classFunctionDeclareArguments endOfCommand
	public classFunctionOtherDeclareBegin = this.RULE("classFunctionOtherDeclareBegin", () => {
		this.SUBRULE(this.fullyQualifiedClassname)
		this.CONSUME(DSLexer.tokenIdentifier)
		this.SUBRULE(this.classFunctionDeclareArguments)
		this.SUBRULE(this.endOfCommand)
	})
	
	// classFunctionDeclareBegin
	public classFunctionDeclareBegin = this.RULE("classFunctionDeclareBegin", () => {
		this.OR([
			{
				GATE: () => this.LA(1).tokenType === DSLexer.tokenIdentifier && this.LA(1).image == "new",
				ALT: () => this.SUBRULE(this.classConstructorDeclareBegin)
			},
			{
				GATE: () => this.LA(1).tokenType === DSLexer.tokenIdentifier && this.LA(1).image == "destructor",
				ALT: () => this.SUBRULE(this.classDestructorDeclareBegin)
			},
			{ALT: () => this.SUBRULE(this.classFunctionOtherDeclareBegin)}
		])
	})

	// op=ASSIGN_MULTIPLY | op=ASSIGN_DIVIDE | op=ASSIGN_MODULUS
	// | op=ASSIGN_ADD | op=ASSIGN_SUBTRACT | op=ASSIGN_SHIFT_LEFT | op=ASSIGN_SHIFT_RIGHT
	// | op=ASSIGN_AND | op=ASSIGN_OR | op=ASSIGN_XOR | op=AND | op=OR | op=XOR
	// | op=SHIFT_LEFT | op=SHIFT_RIGHT | op=LESS | op=GREATER | op=LEQUAL | op=GEQUAL
	// | op=MULTIPLY | op=DIVIDE | op=MODULUS | op=ADD | op=SUBTRACT | op=INCREMENT
	// | op=DECREMENT | op=INVERSE
	// -> operatorFunctionName
	public operatorFunctionName = this.RULE("operatorFunctionName", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenAssignMultiply)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignDivide)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignModulus)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignAdd)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignSubtract)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignShiftLeft)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignShiftRight)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignAnd)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignOr)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignXor)},
			{ALT: () => this.CONSUME(DSLexer.tokenAnd)},
			{ALT: () => this.CONSUME(DSLexer.tokenOr)},
			{ALT: () => this.CONSUME(DSLexer.tokenXor)},
			{ALT: () => this.CONSUME(DSLexer.tokenShiftLeft)},
			{ALT: () => this.CONSUME(DSLexer.tokenShiftRight)},
			{ALT: () => this.CONSUME(DSLexer.tokenLess)},
			{ALT: () => this.CONSUME(DSLexer.tokenGreater)},
			{ALT: () => this.CONSUME(DSLexer.tokenLessEqual)},
			{ALT: () => this.CONSUME(DSLexer.tokenGreaterEqual)},
			{ALT: () => this.CONSUME(DSLexer.tokenMultiply)},
			{ALT: () => this.CONSUME(DSLexer.tokenDivide)},
			{ALT: () => this.CONSUME(DSLexer.tokenModulus)},
			{ALT: () => this.CONSUME(DSLexer.tokenAdd)},
			{ALT: () => this.CONSUME(DSLexer.tokenSubtract)},
			{ALT: () => this.CONSUME(DSLexer.tokenIncrement)},
			{ALT: () => this.CONSUME(DSLexer.tokenDecrement)},
			{ALT: () => this.CONSUME(DSLexer.tokenInverse)}
		])
	})

	// END endOfCommand -> classFunctionEnd
	public classFunctionEnd = this.RULE("classFunctionEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// VAR type=fullyQualifiedClassname ( #variables=classVariableDeclare @ COMMA ) endOfCommand -> classVariablesDeclare
	public classVariablesDeclare = this.RULE("classVariablesDeclare", () => {
		this.CONSUME(DSLexer.tokenVar)
		this.SUBRULE(this.fullyQualifiedClassname)
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.classVariableDeclare)
		})
		this.SUBRULE(this.endOfCommand)
	})

	// name=identifier ?( ASSIGN value=expression ) -> classVariableDeclare
	public classVariableDeclare = this.RULE("classVariableDeclare", () => {
		this.CONSUME(DSLexer.tokenIdentifier)
		this.OPTION(() => {
			this.CONSUME(DSLexer.tokenAssign)
			this.SUBRULE(this.expression)
		})
		this.SUBRULE(this.endOfCommand)
	})

	// declaration=scriptClassBodyDeclaration | empty=endOfCommand -> scriptClassBody
	public scriptClassBody = this.RULE("scriptClassBody", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.scriptClassBodyDeclaration)},
			{ALT: () => this.SUBRULE(this.endOfCommand)}
		])
	})

	// END endOfCommand -> scriptClassEnd
	public scriptClassEnd = this.RULE("scriptClassEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// begin=classBegin #body=scriptClassBody* end=scriptClassEnd -> class
	public scriptClass = this.RULE("scriptClass", () => {
		this.SUBRULE(this.classBegin)
		this.MANY(() => this.SUBRULE(this.scriptClassBody))
		this.SUBRULE(this.scriptClassEnd)
	})




	public funcCallArguments = this.RULE("funcCallArguments", () => {
		this.CONSUME(DSLexer.tokenCastable)
	})
	public expression = this.RULE("expression", () => {
		this.CONSUME(DSLexer.tokenCastable)
	})
	public scriptInterface = this.RULE("scriptInterface", () => {
		this.CONSUME(DSLexer.tokenInterface)
	})
	public scriptEnumeration = this.RULE("scriptEnumeration", () => {
		this.CONSUME(DSLexer.tokenEnum)
	})
	public statement = this.RULE("statement", () => {
		this.CONSUME(DSLexer.tokenCastable)
	})
}
