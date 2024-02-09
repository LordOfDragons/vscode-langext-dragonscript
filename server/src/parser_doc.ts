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

import { CstParser } from "chevrotain"
import { DSDocLexer } from "./lexer_doc"

export class DSDocParser extends CstParser{
	constructor() {
		super(DSDocLexer.allTokens, {
			recoveryEnabled: true
		})
		this.performSelfAnalysis();
	}
	
	
	public documentation = this.RULE("documentation", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.docType1)},
			{ALT: () => this.SUBRULE(this.docType2)}
		]);
	})
	
	
	public docType1 = this.RULE("docType1", () => {
		this.CONSUME(DSDocLexer.tokenDocBegin);
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenNewline));
		this.SUBRULE(this.body);
		this.CONSUME(DSDocLexer.tokenDocEnd);
	})
	
	public docType2 = this.RULE("docType2", () => {
		this.CONSUME(DSDocLexer.tokenDocBegin2);
		this.SUBRULE(this.body);
	})
	
	
	public body = this.RULE("body", () => {
		this.AT_LEAST_ONE(() => this.SUBRULE(this.block));
	})
	
	
	public block = this.RULE("block", () => {
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenDocLine));
		this.OR([
			{ALT: () => this.SUBRULE(this.brief)},
			{ALT: () => this.SUBRULE(this.details)},
			{ALT: () => this.SUBRULE(this.param)},
			{ALT: () => this.SUBRULE(this.code)},
			{ALT: () => this.SUBRULE(this.copyDoc)},
			{ALT: () => this.SUBRULE(this.note)},
			{ALT: () => this.SUBRULE(this.deprecated)},
			{ALT: () => this.SUBRULE(this.paragraph)},
			{ALT: () => this.SUBRULE(this.return)},
			{ALT: () => this.SUBRULE(this.returnValue)},
			{ALT: () => this.SUBRULE(this.since)},
			{ALT: () => this.SUBRULE(this.version)},
			{ALT: () => this.SUBRULE(this.throw)},
			{ALT: () => this.SUBRULE(this.todo)},
			{ALT: () => this.SUBRULE(this.warning)},
			{ALT: () => this.SUBRULE(this.blockText)}
		]);
	})
	
	
	public blockText = this.RULE("blockText", () => {
		this.AT_LEAST_ONE(() => this.SUBRULE(this.blockTextLine));
	})
	
	public blockTextLine = this.RULE("blockTextLine", () => {
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenDocLine));
		this.OR([
			{ALT: () => this.SUBRULE(this.lineText)},
			{ALT: () => this.CONSUME(DSDocLexer.tokenNewline)}
		]);
	})
	
	
	public lineText = this.RULE("lineText", () => {
		this.AT_LEAST_ONE(() => this.SUBRULE(this.word));
	})
	
	
	public brief = this.RULE("ruleBrief", () => {
		this.CONSUME(DSDocLexer.tokenBrief);
		this.SUBRULE(this.blockText);
	})
	
	public details = this.RULE("ruleDetails", () => {
		this.CONSUME(DSDocLexer.tokenDetails);
		this.SUBRULE(this.blockText);
	})
	
	public param = this.RULE("ruleParam", () => {
		this.CONSUME(DSDocLexer.tokenParam);
		this.SUBRULE(this.blockText);
	})
	
	public code = this.RULE("ruleCode", () => {
		this.CONSUME(DSDocLexer.tokenCode);
		this.MANY(() => this.SUBRULE(this.lineText));
		this.CONSUME(DSDocLexer.tokenEndCode);
	})
	
	public copyDoc = this.RULE("ruleCopyDoc", () => {
		this.CONSUME(DSDocLexer.tokenCopyDoc);
		this.SUBRULE(this.blockText);
	})
	
	public note = this.RULE("ruleNote", () => {
		this.CONSUME(DSDocLexer.tokenNote);
		this.SUBRULE(this.blockText);
	})
	
	public deprecated = this.RULE("ruleDeprecated", () => {
		this.CONSUME(DSDocLexer.tokenDeprecated);
		this.SUBRULE(this.blockText);
	})
	
	public paragraph = this.RULE("ruleParagraph", () => {
		this.CONSUME(DSDocLexer.tokenParagraph);
		this.SUBRULE(this.blockText);
	})
	
	public return = this.RULE("ruleReturn", () => {
		this.CONSUME(DSDocLexer.tokenReturn);
		this.SUBRULE(this.blockText);
	})
	
	public returnValue = this.RULE("ruleReturnValue", () => {
		this.CONSUME(DSDocLexer.tokenReturnValue);
		this.SUBRULE(this.blockText);
	})
	
	public since = this.RULE("ruleSince", () => {
		this.CONSUME(DSDocLexer.tokenSince);
		this.SUBRULE(this.blockText);
	})
	
	public version = this.RULE("ruleVersion", () => {
		this.CONSUME(DSDocLexer.tokenVersion);
		this.SUBRULE(this.blockText);
	})
	
	public throw = this.RULE("ruleThrow", () => {
		this.CONSUME(DSDocLexer.tokenThrow);
		this.SUBRULE(this.blockText);
	})
	
	public todo = this.RULE("ruleTodo", () => {
		this.CONSUME(DSDocLexer.tokenTodo);
		this.SUBRULE(this.blockText);
	})
	
	public warning = this.RULE("ruleWarning", () => {
		this.CONSUME(DSDocLexer.tokenWarning);
		this.SUBRULE(this.blockText);
	})
	
	
	public word = this.RULE("ruleWord", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.emboss)},
			{ALT: () => this.SUBRULE(this.reference)},
			{ALT: () => this.SUBRULE(this.see)},
			{ALT: () => this.CONSUME(DSDocLexer.tokenWord)}
		]);
	})
	
	public emboss = this.RULE("ruleEmboss", () => {
		this.CONSUME(DSDocLexer.tokenEmboss);
	})
	
	public reference = this.RULE("ruleReference", () => {
		this.CONSUME(DSDocLexer.tokenReference);
	})
	
	public see = this.RULE("ruleSee", () => {
		this.CONSUME(DSDocLexer.tokenSee);
	})
}
