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

import { CstParser } from "chevrotain"
import { DSLexer } from "./lexer"

export class DSParser extends CstParser{
	constructor() {
		super(DSLexer.allTokens, {
			recoveryEnabled: true
			/* , nodeLocationTracking: "full" */
		})

		this.performSelfAnalysis()
	}



	public static readonly typeModPublic = 0x1
	public static readonly typeModProtected = 0x2
	public static readonly typeModPrivate = 0x4
	public static readonly typeModNative = 0x8
	public static readonly typeModStatic = 0x10
	public static readonly typeModAbstract = 0x20
	public static readonly typeModFixed = 0x40

	public static readonly typeModsAccess = DSParser.typeModPublic | DSParser.typeModProtected | DSParser.typeModPrivate


	public lastTypeModifiers = 0



	// common stuff
	/////////////////
	
	// type modifiers
	public typeModifier = this.RULE("typeModifier", () => {
		this.OR([
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModsAccess) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenPublic)
					this.lastTypeModifiers |= DSParser.typeModPublic
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModsAccess) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenProtected)
					this.lastTypeModifiers |= DSParser.typeModProtected
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModsAccess) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenPrivate)
					this.lastTypeModifiers |= DSParser.typeModPrivate
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModAbstract) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenAbstract)
					this.lastTypeModifiers |= DSParser.typeModAbstract
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModFixed) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenFixed)
					this.lastTypeModifiers |= DSParser.typeModFixed
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModStatic) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenStatic)
					this.lastTypeModifiers |= DSParser.typeModStatic
				}
			},
			{
				GATE: () => (this.lastTypeModifiers & DSParser.typeModNative) == 0,
				ALT: () => {
					this.CONSUME(DSLexer.tokenNative)
					this.lastTypeModifiers |= DSParser.typeModNative
				}
			}
		])
	})

	public typeModifiers = this.RULE("typeModifiers", () => {
		this.lastTypeModifiers = 0
		this.MANY(() => this.SUBRULE(this.typeModifier))
	})

	// fully qualified class name
	public fullyQualifiedClassName = this.RULE("fullyQualifiedClassName", () => {
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenPeriod,
			DEF: () => this.SUBRULE(this.fullyQualifiedClassNamePart)
		})
	})
	
	public fullyQualifiedClassNamePart = this.RULE("fullyQualifiedClassNamePart", () => {
		this.CONSUME(DSLexer.tokenIdentifier);
	})
	
	// end of command
	public endOfCommand = this.RULE("endOfCommand", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenCommandSeparator)},
			{ALT: () => this.CONSUME(DSLexer.tokenNewline)}
		])
	})



	// script level
	/////////////////

	// script declaration: class, interface, enumeration
	public scriptDeclaration = this.RULE("scriptDeclaration", () => {
		this.SUBRULE(this.typeModifiers)
		this.OR([
			{ALT: () => this.SUBRULE(this.declareClass)},
			{ALT: () => this.SUBRULE(this.declareInterface)},
			{ALT: () => this.SUBRULE(this.declareEnumeration)}
		])
	})

	// script statement: requires, namespace, pin, script declaration or end oc command
	public scriptStatement = this.RULE("scriptStatement", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.requiresPackage)},
			{ALT: () => this.SUBRULE(this.openNamespace)},
			{ALT: () => this.SUBRULE(this.pinNamespace)},
			{ALT: () => this.SUBRULE(this.scriptDeclaration)},
			{ALT: () => this.SUBRULE(this.endOfCommand)}
		])
	})

	// script. entry point for parsing the entire script
	public script = this.RULE("script", () => {
		this.MANY(() => this.SUBRULE(this.scriptStatement))
	})

	// requires
	public requiresPackage = this.RULE("requiresPackage", () => {
		this.CONSUME(DSLexer.tokenRequires)
		this.CONSUME(DSLexer.tokenString, {LABEL: "name"})
		this.SUBRULE(this.endOfCommand)
	})

	// namespace
	public openNamespace = this.RULE("openNamespace", () => {
		this.CONSUME(DSLexer.tokenNamespace)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "name"})
		this.SUBRULE(this.endOfCommand)
	})

	// pin
	public pinNamespace = this.RULE("pinNamespace", () => {
		this.CONSUME(DSLexer.tokenPin)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "name"})
		this.SUBRULE(this.endOfCommand)
	})



	// class level
	////////////////

	// begin of class
	public classBegin = this.RULE("classBegin", () => {
		this.CONSUME(DSLexer.tokenClass)
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.OPTION(() => this.SUBRULE(this.classBeginExtends))
		this.OPTION2(() => this.SUBRULE(this.classBeginImplements))
		this.SUBRULE(this.endOfCommand)
	})

	public classBeginExtends = this.RULE("classBeginExtends", () => {
		this.CONSUME(DSLexer.tokenExtends)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "baseClassName"})
	})

	public classBeginImplements = this.RULE("classBeginImplements", () => {
		this.CONSUME(DSLexer.tokenImplements)
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => {this.SUBRULE2(this.fullyQualifiedClassName, {LABEL: "interfaceName"})}
		})
	})

	// class body
	public classBodyDeclaration = this.RULE("classBodyDeclaration", () => {
		this.SUBRULE(this.typeModifiers)
		this.OR([
			{ALT: () => this.SUBRULE(this.declareClass)},
			{ALT: () => this.SUBRULE(this.declareInterface)},
			{ALT: () => this.SUBRULE(this.declareEnumeration)},
			{ALT: () => this.SUBRULE(this.classFunction)},
			{ALT: () => this.SUBRULE(this.classVariables)}
		])
	})

	// class function declaration
	public classFunction = this.RULE("classFunction", () => {
		this.CONSUME(DSLexer.tokenFunc)
		this.SUBRULE(this.functionBegin)
		this.OPTION({
			GATE: () => (this.lastTypeModifiers & DSParser.typeModAbstract) == 0,
			DEF: () => {
				this.SUBRULE(this.statements)
				this.SUBRULE(this.functionEnd)
			}
		})
	})

	// declare function arguments
	public functionArgument = this.RULE("functionArgument", () => {
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "type"})
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
	})

	public functionArguments = this.RULE("functionArguments", () => {
		this.CONSUME(DSLexer.tokenLParan)
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.functionArgument)
		})
		this.CONSUME(DSLexer.tokenRParan)
	})
	
	// declare class constructor
	public classConstructor = this.RULE("classConstructor", () => {
		this.CONSUME(DSLexer.tokenIdentifier)  // is always "new"
		this.SUBRULE(this.functionArguments)
		this.OPTION(() => {
			this.OR2([
				{ALT: () => this.CONSUME(DSLexer.tokenThis)},
				{ALT: () => this.CONSUME(DSLexer.tokenSuper)}
			])
			this.SUBRULE(this.functionCall)
		})
		this.SUBRULE(this.endOfCommand)
	})

	// declare class destructor
	public classDestructor = this.RULE("classDestructor", () => {
		this.CONSUME(DSLexer.tokenIdentifier)  // is always "destructor"
		this.CONSUME(DSLexer.tokenLParan)
		this.CONSUME(DSLexer.tokenRParan)
		this.SUBRULE(this.endOfCommand)
	})
	
	// declare regular class function
	public regularFunction = this.RULE("regularFunction", () => {
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "returnType"})
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})},
			{ALT: () => this.SUBRULE(this.functionOperator, {LABEL: "operator"})}
		])
		this.SUBRULE(this.functionArguments)
		this.SUBRULE(this.endOfCommand)
	})
	
	// begin class function declaration
	public functionBegin = this.RULE("functionBegin", () => {
		this.OR([
			{
				GATE: () => this.LA(1).tokenType === DSLexer.tokenIdentifier && this.LA(1).image == "new",
				ALT: () => this.SUBRULE(this.classConstructor)
			},
			{
				GATE: () => this.LA(1).tokenType === DSLexer.tokenIdentifier && this.LA(1).image == "destructor",
				ALT: () => this.SUBRULE(this.classDestructor)
			},
			{ALT: () => this.SUBRULE(this.regularFunction)}
		])
	})

	// class operator function name
	public functionOperator = this.RULE("functionOperator", () => {
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

	// end of class function
	public functionEnd = this.RULE("functionEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// class variable declaration
	public classVariables = this.RULE("classVariables", () => {
		this.CONSUME(DSLexer.tokenVar)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "type"})
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.classVariable)
		})
		this.SUBRULE(this.endOfCommand)
	})

	public classVariable = this.RULE("classVariable", () => {
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.OPTION(() => {
			this.CONSUME(DSLexer.tokenAssign)
			this.SUBRULE(this.expression, {LABEL: "value"})
		})
	})

	// class body
	public classBody = this.RULE("classBody", () => {
		this.MANY(() => {
			this.OR([
				{ALT: () => this.SUBRULE(this.classBodyDeclaration)},
				{ALT: () => this.SUBRULE(this.endOfCommand)}
			])
		})
	})

	// end of class
	public classEnd = this.RULE("classEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// class declaration
	public declareClass = this.RULE("declareClass", () => {
		this.SUBRULE(this.classBegin)
		this.SUBRULE(this.classBody)
		this.SUBRULE(this.classEnd)
	})



	// interface level
	////////////////////
	
	// begin interface declaration
	public interfaceBegin = this.RULE("interfaceBegin", () => {
		this.CONSUME(DSLexer.tokenInterface)
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.OPTION(() => this.SUBRULE(this.interfaceBeginImplements))
		this.SUBRULE(this.endOfCommand)
	})

	public interfaceBeginImplements = this.RULE("interfaceBeginImplements", () => {
		this.CONSUME(DSLexer.tokenImplements)
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "baseInterfaceName"})
		})
	})

	// interface function declaration
	public interfaceFunction = this.RULE("interfaceFunction", () => {
		this.CONSUME(DSLexer.tokenFunc)
		this.SUBRULE(this.functionBegin)
	})

	// interface body
	public interfaceBodyDeclaration = this.RULE("interfaceBodyDeclaration", () => {
		this.SUBRULE(this.typeModifiers)
		this.OR([
			{ALT: () => this.SUBRULE(this.declareClass)},
			{ALT: () => this.SUBRULE(this.declareInterface)},
			{ALT: () => this.SUBRULE(this.declareEnumeration)},
			{ALT: () => this.SUBRULE(this.interfaceFunction)}
		])
	})

	public interfaceBody = this.RULE("interfaceBody", () => {
		this.MANY(() => {
			this.OR([
				{ALT: () => this.SUBRULE(this.interfaceBodyDeclaration)},
				{ALT: () => this.SUBRULE(this.endOfCommand)}
			])
		})
	})

	// end of interface
	public interfaceEnd = this.RULE("interfaceEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// declare interface
	public declareInterface = this.RULE("declareInterface", () => {
		this.SUBRULE(this.interfaceBegin)
		this.SUBRULE(this.interfaceBody)
		this.SUBRULE(this.interfaceEnd)
	})



	// enumeration level
	//////////////////////

	// begin enumeration
	public enumerationBegin = this.RULE("enumerationBegin", () => {
		this.CONSUME(DSLexer.tokenEnum)
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.SUBRULE(this.endOfCommand)
	})

	// enumeration entry
	public enumerationEntry = this.RULE("enumerationEntry", () => {
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.SUBRULE(this.endOfCommand)
	})

	// enumeration body
	public enumerationBody = this.RULE("enumerationBody", () => {
		this.MANY(() => {
			this.OR([
				{ALT: () => this.SUBRULE(this.enumerationEntry)},
				{ALT: () => this.SUBRULE(this.endOfCommand)}
			])
		})
	})

	// end of enumeration
	public enumerationEnd = this.RULE("enumerationEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// end of enumeration
	public declareEnumeration = this.RULE("declareEnumeration", () => {
		this.SUBRULE(this.enumerationBegin)
		this.SUBRULE(this.enumerationBody)
		this.SUBRULE(this.enumerationEnd)
	})



	// statement level
	////////////////////

	// statements
	public statements = this.RULE("statements", () => {
		this.MANY(() => this.SUBRULE(this.statement))
	})

	public statement = this.RULE("statement", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.statementIf)},
			{ALT: () => this.SUBRULE(this.statementReturn)},
			{ALT: () => this.SUBRULE(this.statementSelect)},
			{ALT: () => this.SUBRULE(this.statementWhile)},
			{ALT: () => this.SUBRULE(this.statementFor)},
			{ALT: () => this.SUBRULE(this.statementBreak)},
			{ALT: () => this.SUBRULE(this.statementContinue)},
			{ALT: () => this.SUBRULE(this.statementThrow)},
			{ALT: () => this.SUBRULE(this.statementTry)},
			{ALT: () => this.SUBRULE(this.statementVariables)},
			{ALT: () => {
				this.OPTION(() => this.SUBRULE(this.expression))
				this.SUBRULE(this.endOfCommand)
			}}
		])
	})

	// if-elif-else
	public statementIf = this.RULE("statementIf", () => {
		this.SUBRULE(this.statementIfBegin)
		this.MANY(() => this.SUBRULE(this.statementElif))
		this.OPTION(() => {
			this.SUBRULE(this.statementElse)
		})
		this.SUBRULE(this.statementIfEnd)
	})

	public statementIfBegin = this.RULE("statementIfBegin", () => {
		this.CONSUME(DSLexer.tokenIf)
		this.SUBRULE(this.expression, {LABEL: "condition"})
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	public statementElse = this.RULE("statementElse", () => {
		this.CONSUME(DSLexer.tokenElse)
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	public statementIfEnd = this.RULE("statementIfEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	public statementElif = this.RULE("statementElif", () => {
		this.CONSUME(DSLexer.tokenElif)
		this.SUBRULE(this.expression, {LABEL: "condition"})
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	// return
	public statementReturn = this.RULE("statementReturn", () => {
		this.CONSUME(DSLexer.tokenReturn)
		this.OPTION(() => this.SUBRULE(this.expression, {LABEL: "value"}))
		this.SUBRULE(this.endOfCommand)
	})

	// select
	public statementSelect = this.RULE("statementSelect", () => {
		this.SUBRULE(this.statementSelectBegin)
		this.SUBRULE(this.statementSelectBody)
		this.SUBRULE(this.statementSelectEnd)
	})

	public statementSelectBegin = this.RULE("statementSelectBegin", () => {
		this.CONSUME(DSLexer.tokenSelect)
		this.SUBRULE(this.expression, {LABEL: "value"})
		this.AT_LEAST_ONE(() => this.SUBRULE(this.endOfCommand))
	})

	public statementSelectBody = this.RULE("statementSelectBody", () => {
		this.MANY(() => this.SUBRULE(this.statementCase))
		this.OPTION(() => this.SUBRULE(this.statementSelectElse))
	})

	public statementCase = this.RULE("statementCase", () => {
		this.CONSUME(DSLexer.tokenCase)
		this.SUBRULE(this.statementCaseValues)
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	public statementCaseValues = this.RULE("statementCaseValues", () => {
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.expression, {LABEL: "value"})
		})
	})

	public statementSelectElse = this.RULE("statementSelectElse", () => {
		this.CONSUME(DSLexer.tokenElse)
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	public statementSelectEnd = this.RULE("statementSelectEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// while
	public statementWhile = this.RULE("statementWhile", () => {
		this.SUBRULE(this.statementWhileBegin)
		this.SUBRULE(this.statements)
		this.SUBRULE(this.statementWhileEnd)
	})

	public statementWhileBegin = this.RULE("statementWhileBegin", () => {
		this.CONSUME(DSLexer.tokenWhile)
		this.SUBRULE(this.expression, {LABEL: "condition"})
		this.SUBRULE(this.endOfCommand)
	})

	public statementWhileEnd = this.RULE("statementWhileEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// for
	public statementFor = this.RULE("statementFor", () => {
		this.SUBRULE(this.statementForBegin)
		this.SUBRULE(this.statements)
		this.SUBRULE(this.statementForEnd)
	})

	public statementForBegin = this.RULE("statementForBegin", () => {
		this.CONSUME(DSLexer.tokenFor)
		this.SUBRULE(this.statementForVariable)
		this.SUBRULE(this.statementForFrom)
		this.SUBRULE(this.statementForTo)
		this.OPTION(() => this.SUBRULE(this.statementForStep))
		this.SUBRULE(this.endOfCommand)
	})
	
	public statementForVariable = this.RULE("statementForVariable", () => {
		this.SUBRULE(this.expressionObject, {LABEL: "variable"})
	})

	public statementForFrom = this.RULE("statementForFrom", () => {
		this.CONSUME(DSLexer.tokenAssign)
		this.SUBRULE(this.expression, {LABEL: "value"})
	})

	public statementForTo = this.RULE("statementForTo", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenTo)},
			{ALT: () => this.CONSUME(DSLexer.tokenDownto)}
		])
		this.SUBRULE(this.expression, {LABEL: "value"})
	})

	public statementForStep = this.RULE("statementForStep", () => {
		this.CONSUME(DSLexer.tokenStep)
		this.SUBRULE(this.expression, {LABEL: "value"})
	})

	public statementForEnd = this.RULE("statementForEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// break
	public statementBreak = this.RULE("statementBreak", () => {
		this.CONSUME(DSLexer.tokenBreak)
		this.SUBRULE(this.endOfCommand)
	})

	// continue
	public statementContinue = this.RULE("statementContinue", () => {
		this.CONSUME(DSLexer.tokenContinue)
		this.SUBRULE(this.endOfCommand)
	})

	// throw
	public statementThrow = this.RULE("statementThrow", () => {
		this.CONSUME(DSLexer.tokenThrow)
		this.OPTION(() => this.SUBRULE(this.expression, {LABEL: "exception"}))
		this.SUBRULE(this.endOfCommand)
	})

	// try-catch
	public statementTry = this.RULE("statementTry", () => {
		this.SUBRULE(this.statementTryBegin)
		this.SUBRULE(this.statements)
		this.MANY(() => this.SUBRULE(this.statementCatch))
		this.SUBRULE(this.statementTryEnd)
	})

	public statementTryBegin = this.RULE("statementTryBegin", () => {
		this.CONSUME(DSLexer.tokenTry)
		this.SUBRULE(this.endOfCommand)
	})

	public statementCatch = this.RULE("statementCatch", () => {
		this.CONSUME(DSLexer.tokenCatch)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "type"})
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "variable"})
		this.SUBRULE(this.endOfCommand)
		this.SUBRULE(this.statements)
	})

	public statementTryEnd = this.RULE("statementTryEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
		this.SUBRULE(this.endOfCommand)
	})

	// variables
	public statementVariables = this.RULE("statementVariables", () => {
		this.CONSUME(DSLexer.tokenVar)
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "type"})
		this.AT_LEAST_ONE_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.statementVariable)
		})
		this.SUBRULE(this.endOfCommand)
	})

	public statementVariable = this.RULE("statementVariable", () => {
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.OPTION(() => {
			this.CONSUME(DSLexer.tokenAssign)
			this.SUBRULE(this.expression, {LABEL: "value"})
		})
	})



	// expression level
	/////////////////////
	//
	// operator precedence (lowest to highest):
	// right:             =, *=, /=, %=, +=, -=, <<=, >>=, &=, |=, ^=
	// left:              inline if-else
	// left:              and, or
	// left:              <, >, <=, >=, ==, !=
	// left:              <<, >>, &, |, ^
	// left:              +, -
	// left:              *, /, %
	// left:              postfix ++, postfix --
	// right:             prefix ++, prefix --, prefix -, prefix ~ (bitwise negate), not (logical not)
	// non-associative:   cast <type>, castable <type>, typeof <type>
	// left:              . (class member)

	// expression
	public expression = this.RULE("expression", () => {
		this.SUBRULE(this.expressionAssign)
	})

	// assign
	public expressionAssign = this.RULE("expressionAssign", () => {
		this.SUBRULE(this.expressionInlineIfElse, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionAssignMore, {LABEL: "more"}))
	})

	public expressionAssignMore = this.RULE("expressionAssignMore", () => {
		this.SUBRULE(this.expressionAssignOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionAssign, {LABEL: "right"})
	})

	public expressionAssignOp = this.RULE("expressionAssignOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenAssign)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignMultiply)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignDivide)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignModulus)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignAdd)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignSubtract)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignShiftLeft)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignShiftRight)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignAnd)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignOr)},
			{ALT: () => this.CONSUME(DSLexer.tokenAssignXor)}
		])
	})

	// inline if-else
	public expressionInlineIfElse = this.RULE("expressionInlineIfElse", () => {
		this.SUBRULE(this.expressionLogic, {LABEL: "condition"})
		this.OPTION(() => this.SUBRULE(this.expressionInlineIfElseMore, {LABEL: "more"}))
	})

	public expressionInlineIfElseMore = this.RULE("expressionInlineIfElseMore", () => {
		this.CONSUME(DSLexer.tokenIf)
		this.SUBRULE(this.expressionLogic, {LABEL: "expressionIf"})
		this.CONSUME(DSLexer.tokenElse)
		this.SUBRULE2(this.expressionLogic, {LABEL: "expressionElse"})
	})

	// logic
	public expressionLogic = this.RULE("expressionLogic", () => {
		this.SUBRULE(this.expressionCompare, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionLogicMore, {LABEL: "more"}))
	})

	public expressionLogicMore = this.RULE("expressionLogicMore", () => {
		this.SUBRULE(this.expressionLogicOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionCompare, {LABEL: "right"})
	})

	public expressionLogicOp = this.RULE("expressionLogicOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenLogicalAnd)},
			{ALT: () => this.CONSUME(DSLexer.tokenLogicalOr)}
		])
	})

	// compare
	public expressionCompare = this.RULE("expressionCompare", () => {
		this.SUBRULE(this.expressionBitOperation, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionCompareMore, {LABEL: "more"}))
	})

	public expressionCompareMore = this.RULE("expressionCompareMore", () => {
		this.SUBRULE(this.expressionCompareOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionBitOperation, {LABEL: "right"})
	})

	public expressionCompareOp = this.RULE("expressionCompareOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenLess)},
			{ALT: () => this.CONSUME(DSLexer.tokenGreater)},
			{ALT: () => this.CONSUME(DSLexer.tokenLessEqual)},
			{ALT: () => this.CONSUME(DSLexer.tokenGreaterEqual)},
			{ALT: () => this.CONSUME(DSLexer.tokenEquals)},
			{ALT: () => this.CONSUME(DSLexer.tokenNotEquals)}
		])
	})

	// bit operations
	public expressionBitOperation = this.RULE("expressionBitOperation", () => {
		this.SUBRULE(this.expressionAddition, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionBitOperationMore, {LABEL: "more"}))
	})

	public expressionBitOperationMore = this.RULE("expressionBitOperationMore", () => {
		this.SUBRULE(this.expressionBitOperationOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionAddition, {LABEL: "right"})
	})

	public expressionBitOperationOp = this.RULE("expressionBitOperationOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenShiftLeft)},
			{ALT: () => this.CONSUME(DSLexer.tokenShiftRight)},
			{ALT: () => this.CONSUME(DSLexer.tokenAnd)},
			{ALT: () => this.CONSUME(DSLexer.tokenOr)},
			{ALT: () => this.CONSUME(DSLexer.tokenXor)}
		])
	})

	// addition
	public expressionAddition = this.RULE("expressionAddition", () => {
		this.SUBRULE(this.expressionMultiply, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionAdditionMore, {LABEL: "more"}))
	})

	public expressionAdditionMore = this.RULE("expressionAdditionMore", () => {
		this.SUBRULE(this.expressionAdditionOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionMultiply, {LABEL: "right"})
	})

	public expressionAdditionOp = this.RULE("expressionAdditionOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenAdd)},
			{ALT: () => this.CONSUME(DSLexer.tokenSubtract)}
		])
	})

	// multiply
	public expressionMultiply = this.RULE("expressionMultiply", () => {
		this.SUBRULE(this.expressionPostfix, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionMultiplyMore, {LABEL: "more"}))
	})

	public expressionMultiplyMore = this.RULE("expressionMultiplyMore", () => {
		this.SUBRULE(this.expressionMultiplyOp, {LABEL: "operator"})
		this.SUBRULE(this.expressionPostfix, {LABEL: "right"})
	})

	public expressionMultiplyOp = this.RULE("expressionMultiplyOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenMultiply)},
			{ALT: () => this.CONSUME(DSLexer.tokenDivide)},
			{ALT: () => this.CONSUME(DSLexer.tokenModulus)}
		])
	})

	// postfix
	public expressionPostfix = this.RULE("expressionPostfix", () => {
		this.SUBRULE(this.expressionUnary, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionPostfixOp, {LABEL: "operator"}))
	})

	public expressionPostfixOp = this.RULE("expressionPostfixOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenIncrement)},
			{ALT: () => this.CONSUME(DSLexer.tokenDecrement)}
		])
	})

	// unary
	public expressionUnary = this.RULE("expressionUnary", () => {
		this.MANY(() => this.SUBRULE(this.expressionUnaryOp, {LABEL: "operator"}))
		this.SUBRULE(this.expressionSpecial, {LABEL: "right"})
	})

	public expressionUnaryOp = this.RULE("expressionUnaryOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenIncrement)},
			{ALT: () => this.CONSUME(DSLexer.tokenDecrement)},
			{ALT: () => this.CONSUME(DSLexer.tokenSubtract)},
			{ALT: () => this.CONSUME(DSLexer.tokenInverse)},
			{ALT: () => this.CONSUME(DSLexer.tokenNot)}
		])
	})

	// special
	public expressionSpecial = this.RULE("expressionSpecial", () => {
		this.SUBRULE(this.expressionObject, {LABEL: "left"})
		this.MANY(() => this.SUBRULE(this.expressionSpecialMore, {LABEL: "more"}))
	})

	public expressionSpecialMore = this.RULE("expressionSpecialMore", () => {
		this.SUBRULE(this.expressionSpecialOp, {LABEL: "operator"})
		this.SUBRULE(this.fullyQualifiedClassName, {LABEL: "type"})
	})

	public expressionSpecialOp = this.RULE("expressionSpecialOp", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenCast)},
			{ALT: () => this.CONSUME(DSLexer.tokenCastable)},
			{ALT: () => this.CONSUME(DSLexer.tokenTypeof)}
		])
	})

	// object
	public expressionObject = this.RULE("expressionObject", () => {
		this.SUBRULE(this.expressionBaseObject, {LABEL: "object"})
		this.MANY(() => {
			this.CONSUME(DSLexer.tokenPeriod)
			this.SUBRULE(this.expressionMember, {LABEL: "member"})
		})
	})

	public expressionBaseObject = this.RULE("expressionBaseObject", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.expressionGroup)},
			{ALT: () => this.SUBRULE(this.expressionConstant)},
			{ALT: () => this.SUBRULE(this.expressionMember)},
			{ALT: () => this.SUBRULE(this.expressionBlock)}
		])
	} /*, {resyncEnabled: false}*/)

	public expressionGroup = this.RULE("expressionGroup", () => {
		this.CONSUME(DSLexer.tokenLParan)
		this.SUBRULE(this.expression)
		this.CONSUME(DSLexer.tokenRParan)
	})

	public expressionConstant = this.RULE("expressionConstant", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralByte)},
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralIntByte)},
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralIntHex)},
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralIntOct)},
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralInt)},
			{ALT: () => this.CONSUME(DSLexer.tokenLiteralFloat)},
			{ALT: () => this.CONSUME(DSLexer.tokenString)},
			{ALT: () => this.CONSUME(DSLexer.tokenTrue)},
			{ALT: () => this.CONSUME(DSLexer.tokenFalse)},
			{ALT: () => this.CONSUME(DSLexer.tokenNull)},
			{ALT: () => this.CONSUME(DSLexer.tokenThis)},
			{ALT: () => this.CONSUME(DSLexer.tokenSuper)}
		])
	})

	public expressionMember = this.RULE("expressionMember", () => {
		this.CONSUME(DSLexer.tokenIdentifier, {LABEL: "name"})
		this.OPTION(() => this.SUBRULE(this.functionCall))
	})
	
	public functionCall = this.RULE("functionCall", () => {
		this.CONSUME(DSLexer.tokenLParan)
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.expression, {LABEL: "argument"})
		})
		this.CONSUME(DSLexer.tokenRParan)
	})



	// block level
	////////////////

	public expressionBlock = this.RULE("expressionBlock", () => {
		this.SUBRULE(this.expressionBlockBegin)
		this.SUBRULE(this.statements)
		this.SUBRULE(this.expressionBlockEnd)
	})

	public expressionBlockBegin = this.RULE("expressionBlockBegin", () => {
		this.CONSUME(DSLexer.tokenBlock)
		this.MANY_SEP({
			SEP: DSLexer.tokenComma,
			DEF: () => this.SUBRULE(this.functionArgument)
		})
		this.SUBRULE(this.endOfCommand)
	})

	public expressionBlockEnd = this.RULE("expressionBlockEnd", () => {
		this.CONSUME(DSLexer.tokenEnd)
	})
}
