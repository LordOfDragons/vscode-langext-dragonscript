/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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


export class DSDocLexer extends Lexer{
	public static readonly tokenDocBegin = createToken({
		name: "docBegin",
		pattern: /\/\*\*/
	})
	
	public static readonly tokenDocBegin2 = createToken({
		name: "docBegin2",
		pattern: /\/\/<!/
	})
	
	public static readonly tokenDocEnd = createToken({
		name: "docEnd",
		pattern: /\*\//
	})
	
	public static readonly tokenDocLine = createToken({
		name: "docLine",
		pattern: /\*/
	})
	
	public static readonly tokenSpace = createToken({
		name: "space",
		pattern: /[ \t\f]+/,
		group: Lexer.SKIPPED
	})
	
	public static readonly tokenNewline = createToken({
		name: "newline",
		pattern: /\n|\r|\r\n/
	})
	
	public static readonly tokenWord = createToken({
		name: "word",
		pattern: /[^ \t\f\n\r]+/
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
	
	public static readonly tokenBrief = createToken({
		name: "brief",
		pattern: /\\brief/
	})
	
	public static readonly tokenDetails = createToken({
		name: "details",
		pattern: /\\details/
	})
	
	public static readonly tokenParam = createToken({
		name: "param",
		pattern: /\\param(\[(in|out|inout)\])?/
	})
	
	public static readonly tokenCode = createToken({
		name: "code",
		pattern: new RegExp("\\\\code(\\{[^}]+\\})?"
			+ "(.|[\n\r])*"
			+ "\\\\endcode"
			)
	})
	
	public static readonly tokenEndCode = createToken({
		name: "endcode",
		pattern: /\\endcode/
	})
	
	public static readonly tokenCopyDoc = createToken({
		name: "copydoc",
		pattern: /\\copydoc/
	})
	
	public static readonly tokenEmboss = createToken({
		name: "emboss",
		pattern: /\\em/
	})
	
	public static readonly tokenBold = createToken({
		name: "bold",
		pattern: /\\b/
	})
	
	public static readonly tokenReference = createToken({
		name: "ref",
		pattern: /\\ref/
	})
	
	public static readonly tokenNote = createToken({
		name: "note",
		pattern: /\\note/
	})
	
	public static readonly tokenDeprecated = createToken({
		name: "deprecated",
		pattern: /\\deprecated/
	})
	
	public static readonly tokenParagraph = createToken({
		name: "paragraph",
		pattern: /\\par/
	})
	
	public static readonly tokenReturn = createToken({
		name: "return",
		pattern: /\\(returns|return)/
	})
	
	public static readonly tokenReturnValue = createToken({
		name: "returnValue",
		pattern: /\\retval/
	})
	
	public static readonly tokenSee = createToken({
		name: "see",
		pattern: /\\(see|sa)/
	})
	
	public static readonly tokenSince = createToken({
		name: "since",
		pattern: /\\since/
	})
	
	public static readonly tokenVersion = createToken({
		name: "version",
		pattern: /\\version/
	})
	
	public static readonly tokenThrow = createToken({
		name: "throw",
		pattern: /\\(throw|throws)/
	})
	
	public static readonly tokenTodo = createToken({
		name: "todo",
		pattern: /\\todo/
	})
	
	public static readonly tokenWarning = createToken({
		name: "warning",
		pattern: /\\warning/
	})
	
	
	public static readonly allTokens = [
		DSDocLexer.tokenDocBegin,
		DSDocLexer.tokenDocBegin2,
		DSDocLexer.tokenDocEnd,
		DSDocLexer.tokenDocLine,
		
		DSDocLexer.tokenSpace,
		DSDocLexer.tokenNewline,
		DSDocLexer.tokenString,
		DSDocLexer.tokenBrief,
		DSDocLexer.tokenDetails,
		DSDocLexer.tokenParam,
		DSDocLexer.tokenCode,
		DSDocLexer.tokenCopyDoc,
		DSDocLexer.tokenEmboss,
		DSDocLexer.tokenReference,
		DSDocLexer.tokenNote,
		DSDocLexer.tokenDeprecated,
		DSDocLexer.tokenParagraph,
		DSDocLexer.tokenReturn,
		DSDocLexer.tokenReturnValue,
		DSDocLexer.tokenSee,
		DSDocLexer.tokenSince,
		DSDocLexer.tokenVersion,
		DSDocLexer.tokenThrow,
		DSDocLexer.tokenTodo,
		DSDocLexer.tokenWarning,
		DSDocLexer.tokenBold,
		
		DSDocLexer.tokenWord
	]
	
	
	constructor() {
		super(DSDocLexer.allTokens)
	}
}
