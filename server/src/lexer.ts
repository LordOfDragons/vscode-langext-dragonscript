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

import { createToken, Lexer } from "chevrotain"


export class DSLexer extends Lexer{
	// special tokens
	public static readonly tokenSpace = createToken({
		name: "space",
		pattern: /[ \t\f]+/,
		group: Lexer.SKIPPED
	})

	public static readonly tokenIdentifier = createToken({
		name: "identifier",
		pattern: /[A-Za-z_][A-Za-z0-9_]*/
	})

	public static readonly tokenAbstract = createToken({
		name: "abstract",
		pattern: /abstract/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenLineSplicing = createToken({
		name: "lineSplicing",
		pattern: /\\(\n|\r|\r\n)/,
		group: Lexer.SKIPPED
	})

	public static readonly tokenNewline = createToken({
		name: "newline",
		pattern: /\n|\r|\r\n/
	})

	public static readonly tokenAnyCharacter = createToken({
		name: "anyChar",
		pattern: /./
	})



	// keywords
	public static readonly tokenLogicalAnd = createToken({
		name: "logicalAnd",
		pattern: /and/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenBlock = createToken({
		name: "block",
		pattern: /block/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenBreak = createToken({
		name: "break",
		pattern: /break/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenCase = createToken({
		name: "case",
		pattern: /case/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenCastable = createToken({
		name: "castable",
		pattern: /castable/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenCast = createToken({
		name: "cast",
		pattern: /cast/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenCatch = createToken({
		name: "catch",
		pattern: /catch/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenClass = createToken({
		name: "class",
		pattern: /class/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenContinue = createToken({
		name: "continue",
		pattern: /continue/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenDownto = createToken({
		name: "downto",
		pattern: /downto/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenElif = createToken({
		name: "elif",
		pattern: /elif/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenElse = createToken({
		name: "else",
		pattern: /else/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenEnd = createToken({
		name: "end",
		pattern: /end/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenEnum = createToken({
		name: "enum",
		pattern: /enum/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenExtends = createToken({
		name: "extends",
		pattern: /extends/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenFalse = createToken({
		name: "false",
		pattern: /false/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenFixed = createToken({
		name: "fixed",
		pattern: /fixed/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenFor = createToken({
		name: "for",
		pattern: /for/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenFunc = createToken({
		name: "func",
		pattern: /func/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenIf = createToken({
		name: "if",
		pattern: /if/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenImplements = createToken({
		name: "implements",
		pattern: /implements/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenInterface = createToken({
		name: "interface",
		pattern: /interface/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenNamespace = createToken({
		name: "namespace",
		pattern: /namespace/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenNative = createToken({
		name: "native",
		pattern: /native/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenNull = createToken({
		name: "null",
		pattern: /null/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenNot = createToken({
		name: "not",
		pattern: /not/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenLogicalOr = createToken({
		name: "logicalOr",
		pattern: /or/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenPin = createToken({
		name: "pin",
		pattern: /pin/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenPrivate = createToken({
		name: "private",
		pattern: /private/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenProtected = createToken({
		name: "protected",
		pattern: /protected/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenPublic = createToken({
		name: "public",
		pattern: /public/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenRequires = createToken({
		name: "requires",
		pattern: /requires/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenReturn = createToken({
		name: "return",
		pattern: /return/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenSelect = createToken({
		name: "select",
		pattern: /select/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenStatic = createToken({
		name: "static",
		pattern: /static/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenStep = createToken({
		name: "step",
		pattern: /step/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenSuper = createToken({
		name: "super",
		pattern: /super/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenThis = createToken({
		name: "this",
		pattern: /this/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenThrow = createToken({
		name: "throw",
		pattern: /throw/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenTo = createToken({
		name: "to",
		pattern: /to/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenTrue = createToken({
		name: "true",
		pattern: /true/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenTry = createToken({
		name: "try",
		pattern: /try/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenTypeof = createToken({
		name: "typeof",
		pattern: /typeof/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenVar = createToken({
		name: "var",
		pattern: /var/,
		longer_alt: DSLexer.tokenIdentifier
	})

	public static readonly tokenWhile = createToken({
		name: "while",
		pattern: /while/,
		longer_alt: DSLexer.tokenIdentifier
	})
	


	// operators
	public static readonly tokenLParan = createToken({
		name: "leftParanthesis",
		pattern: /\(/
	})

	public static readonly tokenRParan = createToken({
		name: "rightParanthesis",
		pattern: /\)/
	})

	public static readonly tokenAssign = createToken({
		name: "assign",
		pattern: /=/
	})

	public static readonly tokenAssignMultiply = createToken({
		name: "assignMultiply",
		pattern: /\*=/
	})

	public static readonly tokenAssignDivide = createToken({
		name: "assignDivide",
		pattern: /\/=/
	})

	public static readonly tokenAssignModulus = createToken({
		name: "assignModulus",
		pattern: /%=/
	})

	public static readonly tokenAssignAdd = createToken({
		name: "assignAdd",
		pattern: /\+=/
	})

	public static readonly tokenAssignSubtract = createToken({
		name: "assignSubtract",
		pattern: /\-=/
	})

	public static readonly tokenAssignShiftLeft = createToken({
		name: "assignShiftLeft",
		pattern: /<<=/
	})

	public static readonly tokenAssignShiftRight = createToken({
		name: "assignShiftRight",
		pattern: />>=/
	})

	public static readonly tokenAssignAnd = createToken({
		name: "assignAnd",
		pattern: /&=/
	})

	public static readonly tokenAssignOr = createToken({
		name: "assignOr",
		pattern: /\|=/
	})

	public static readonly tokenAssignXor = createToken({
		name: "assignXor",
		pattern: /\^=/
	})

	public static readonly tokenAnd = createToken({
		name: "and",
		pattern: /&/
	})

	public static readonly tokenOr = createToken({
		name: "or",
		pattern: /\|/
	})

	public static readonly tokenXor = createToken({
		name: "xor",
		pattern: /\^/
	})

	public static readonly tokenCommandSeparator = createToken({
		name: "commandSeparator",
		pattern: /:/
	})

	public static readonly tokenShiftLeft = createToken({
		name: "shiftLeft",
		pattern: /<</
	})

	public static readonly tokenShiftRight = createToken({
		name: "shiftRight",
		pattern: />>/
	})

	public static readonly tokenLess = createToken({
		name: "less",
		pattern: /</
	})

	public static readonly tokenGreater = createToken({
		name: "greater",
		pattern: />/
	})

	public static readonly tokenLessEqual = createToken({
		name: "lessEqual",
		pattern: /<=/
	})

	public static readonly tokenGreaterEqual = createToken({
		name: "greaterEqual",
		pattern: />=/
	})

	public static readonly tokenEquals = createToken({
		name: "equals",
		pattern: /==/
	})

	public static readonly tokenNotEquals = createToken({
		name: "notEquals",
		pattern: /!=/
	})

	public static readonly tokenMultiply = createToken({
		name: "multiply",
		pattern: /\*/
	})

	public static readonly tokenDivide = createToken({
		name: "divide",
		pattern: /\//
	})

	public static readonly tokenModulus = createToken({
		name: "modulus",
		pattern: /%/
	})

	public static readonly tokenAdd = createToken({
		name: "add",
		pattern: /\+/
	})

	public static readonly tokenSubtract = createToken({
		name: "subtract",
		pattern: /\-/
	})

	public static readonly tokenIncrement = createToken({
		name: "increment",
		pattern: /\+\+/
	})

	public static readonly tokenDecrement = createToken({
		name: "decrement",
		pattern: /\-\-/
	})

	public static readonly tokenInverse = createToken({
		name: "inverse",
		pattern: /~/
	})

	public static readonly tokenPeriod = createToken({
		name: "period",
		pattern: /\./
	})

	public static readonly tokenComma = createToken({
		name: "comma",
		pattern: /,/
	})



	// comments
	public static readonly tokenCommentSingleline = createToken({
		name: "commentSingleline",
		pattern: new RegExp("//"
			+ "("
				+ "\\\\(\\n|\\r|\\r\\n)"  // line splicing
				+ "|"
				+ "[^\\r\\n]"  // comment
			+ ")*"
			),
		group: "comments"
	})

	public static readonly tokenCommentDocSingleline = createToken({
		name: "commentDocSingleline",
		pattern: new RegExp("//<<!"
			+ "("
				+ "\\\\(\\n|\\r|\\r\\n)"  // line splicing
				+ "|"
				+ "[^\\r\\n]"  // comment
			+ ")*"
			),
		group: "documentation"
	})

	public static readonly tokenCommentDocMultiline = createToken({
		name: "commentDocMultiline",
		pattern: new RegExp("/\\*\\*"
				+ "("
				+ "\\*(?!/)"    // lone star
				+ "|"
				+ "[^*]"
			+ ")*"
			+ "\\*/"
			),
		group: "documentation"
	})

	public static readonly tokenCommentMultiline = createToken({
		name: "commentMultiline",
		pattern: new RegExp("/\\*[^*]"
				+ "("
				+ "\\*(?!/)"    // lone star
				+ "|"
				+ "[^*]"
			+ ")*"
			+ "\\*/"
			),
		group: "comments"
	})



	public static readonly tokenString = createToken({
		name: "string",
		pattern: new RegExp("\""
			+ "("
				+ "\\\\u[0-9a-fA-F]{1,4}"
				+ "|"
				+ "\\\\x[0-9a-fA-F]{1,2}"
				+ "|"
				+ "\\\\[0-7]{1,3}"
				+ "|"
				+ "\\\\."
				+ "|"
				+ "[^\"]"
			+ ")*"
			+ "\""
			)
	})

	public static readonly tokenLiteralByte = createToken({
		name: "literalByte",
		pattern: new RegExp("'"
			+ "("
				+ "\\\\u[0-9a-fA-F]{1,4}"
				+ "|"
				+ "\\\\h[0-9a-fA-F]{1,2}"
				+ "|"
				+ "\\\\[0-7]{1,3}"
				+ "|"
				+ "\\\\."
				+ "|"
				+ "[^']"
			+ ")?"
			+ "'"
			)
	})

	public static readonly tokenLiteralIntByte = createToken({
		name: "literalIntByte",
		pattern: /-?0b[01]{1,8}/
	})

	public static readonly tokenLiteralIntOct = createToken({
		name: "literalIntOct",
		pattern: /-?0o[0-7]{1,3}/
	})

	public static readonly tokenLiteralIntHex = createToken({
		name: "literalIntHex",
		pattern: /-?0h[0-9A-Fa-f]{1,8}/
	})

	public static readonly tokenLiteralInt = createToken({
		name: "literalInt",
		pattern: /-?[0-9]+/
	})

	public static readonly tokenLiteralFloat = createToken({
		name: "literalFloat",
		pattern: /-?[0-9]+(\.[0-9]+|e[+\-]?[0-9]+)/
	})
	


	public static readonly allTokens = [
		// special
		DSLexer.tokenLineSplicing,    // \\(\n|\r|\r\n)
		DSLexer.tokenNewline,         // \n|\r|\r\n
		DSLexer.tokenSpace,           // [ \t\f]+
		
		// comments
		DSLexer.tokenCommentDocMultiline,   // /** ... */
		DSLexer.tokenCommentMultiline,      // /* ... */
		DSLexer.tokenCommentDocSingleline,  // //<! ...
		DSLexer.tokenCommentSingleline,     // // ...

		// literals
		DSLexer.tokenString,           // "
		DSLexer.tokenLiteralByte,      // '

		DSLexer.tokenLiteralFloat,     // -?[0-9]+(\.[0-9]+|e[+\-]?[0-9]+)
		DSLexer.tokenLiteralIntByte,   // -?"0b"[01]{1,8}
		DSLexer.tokenLiteralIntHex,    // -?"0h"[0-9A-Fa-f]{1,8}
		DSLexer.tokenLiteralIntOct,    // -?"0o"[0-7]{1,3}
		DSLexer.tokenLiteralInt,       // -?[0-9]+

		// operators
		DSLexer.tokenAssignShiftLeft,  // <<=
		DSLexer.tokenAssignShiftRight, // >>=
		DSLexer.tokenAssignMultiply,   // *=
		DSLexer.tokenAssignDivide,     // /=
		DSLexer.tokenAssignModulus,    // %=
		DSLexer.tokenAssignAdd,        // +=
		DSLexer.tokenAssignSubtract,   // -=
		DSLexer.tokenAssignAnd,        // &=
		DSLexer.tokenAssignOr,         // |=
		DSLexer.tokenAssignXor,        // ^=
		DSLexer.tokenShiftLeft,        // <<
		DSLexer.tokenShiftRight,       // >>
		DSLexer.tokenLessEqual,        // <=
		DSLexer.tokenGreaterEqual,     // >=
		DSLexer.tokenEquals,           // ==
		DSLexer.tokenNotEquals,        // !=
		DSLexer.tokenIncrement,        // ++
		DSLexer.tokenDecrement,        // --
		DSLexer.tokenLParan,           // (
		DSLexer.tokenRParan,           // )
		DSLexer.tokenAssign,           // =
		DSLexer.tokenAnd,              // &
		DSLexer.tokenOr,               // |
		DSLexer.tokenXor,              // ^
		DSLexer.tokenCommandSeparator, // :
		DSLexer.tokenLess,             // <
		DSLexer.tokenGreater,          // >
		DSLexer.tokenMultiply,         // *
		DSLexer.tokenDivide,           // /
		DSLexer.tokenModulus,          // %
		DSLexer.tokenAdd,              // +
		DSLexer.tokenSubtract,         // -
		DSLexer.tokenInverse,          // ~
		DSLexer.tokenPeriod,           // .
		DSLexer.tokenComma,            // ,
		
		// keywords
		DSLexer.tokenImplements, // implements
		DSLexer.tokenInterface,  // interface
		DSLexer.tokenNamespace,  // namespace
		DSLexer.tokenProtected,  // protected
		DSLexer.tokenAbstract,   // abstract
		DSLexer.tokenCastable,   // castable
		DSLexer.tokenContinue,   // continue
		DSLexer.tokenRequires,   // requires
		DSLexer.tokenExtends,    // extends
		DSLexer.tokenPrivate,    // private 
		DSLexer.tokenDownto,     // downto
		DSLexer.tokenNative,     // native
		DSLexer.tokenPublic,     // public
		DSLexer.tokenReturn,     // return
		DSLexer.tokenSelect,     // select
		DSLexer.tokenStatic,     // static
		DSLexer.tokenTypeof,     // typeof
		DSLexer.tokenBlock,      // block
		DSLexer.tokenBreak,      // break
		DSLexer.tokenCatch,      // catch
		DSLexer.tokenClass,      // class
		DSLexer.tokenFalse,      // false
		DSLexer.tokenFixed,      // fixed
		DSLexer.tokenSuper,      // super
		DSLexer.tokenThrow,      // throw
		DSLexer.tokenWhile,      // while
		DSLexer.tokenCase,       // case
		DSLexer.tokenCast,       // cast
		DSLexer.tokenElif,       // elif
		DSLexer.tokenElse,       // else
		DSLexer.tokenEnum,       // enum
		DSLexer.tokenFunc,       // func
		DSLexer.tokenNull,       // null
		DSLexer.tokenStep,       // step
		DSLexer.tokenThis,       // this
		DSLexer.tokenTrue,       // true
		DSLexer.tokenLogicalAnd, // and
		DSLexer.tokenEnd,        // end
		DSLexer.tokenFor,        // for
		DSLexer.tokenNot,        // not
		DSLexer.tokenPin,        // pin
		DSLexer.tokenTry,        // try
		DSLexer.tokenVar,        // var
		DSLexer.tokenIf,         // if
		DSLexer.tokenLogicalOr,  // or
		DSLexer.tokenTo,         // to

		// identifier
		DSLexer.tokenIdentifier // [A-Za-z_][A-Za-z0-9_]*

		// anything
		//DSLexer.tokenAnyCharacter
	]



	/**
	 * Constructor.
	 */
	constructor() {
		super(DSLexer.allTokens)
	}
}
