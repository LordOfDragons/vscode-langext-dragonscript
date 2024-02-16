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
		this.SUBRULE(this.docBegin);
		this.SUBRULE(this.docBody);
		this.SUBRULE(this.docEnd);
	})
	
	
	public newline = this.RULE("ruleNewline", () => {
		this.CONSUME(DSDocLexer.tokenNewline);
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenDocLine));
	})
	
	
	public docBegin = this.RULE("ruleDocBegin", () => {
		this.OR([
			{ALT: () => this.CONSUME(DSDocLexer.tokenDocBegin)},
			{ALT: () => this.CONSUME(DSDocLexer.tokenDocBegin2)}
		]);
		this.OPTION(() => this.SUBRULE(this.newline));
	})
	
	public docBody = this.RULE("ruleDocBody", () => {
		this.AT_LEAST_ONE(() => this.SUBRULE(this.docBlock));
	})
	
	public docEnd = this.RULE("ruleDocEnd", () => {
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenDocEnd));
	})
	
	public docBlock = this.RULE("docBlock", () => {
		this.OPTION(() => {
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
				{ALT: () => this.SUBRULE(this.warning)}
			])
		});
		this.SUBRULE(this.docBlockText);
	})
	
	public brief = this.RULE("ruleBrief", () => {
		this.CONSUME(DSDocLexer.tokenBrief);
	})
	
	public details = this.RULE("ruleDetails", () => {
		this.CONSUME(DSDocLexer.tokenDetails);
	})
	
	public param = this.RULE("ruleParam", () => {
		this.CONSUME(DSDocLexer.tokenParam);
		this.CONSUME(DSDocLexer.tokenWord, {LABEL: "name"});
	})
	
	public code = this.RULE("ruleCode", () => {
		this.CONSUME(DSDocLexer.tokenCode);
	})
	
	public copyDoc = this.RULE("ruleCopyDoc", () => {
		this.CONSUME(DSDocLexer.tokenCopyDoc);
	})
	
	public note = this.RULE("ruleNote", () => {
		this.CONSUME(DSDocLexer.tokenNote);
	})
	
	public deprecated = this.RULE("ruleDeprecated", () => {
		this.CONSUME(DSDocLexer.tokenDeprecated);
	})
	
	public paragraph = this.RULE("ruleParagraph", () => {
		this.CONSUME(DSDocLexer.tokenParagraph);
		this.MANY(() => this.SUBRULE(this.docWord));
	})
	
	public return = this.RULE("ruleReturn", () => {
		this.CONSUME(DSDocLexer.tokenReturn);
	})
	
	public returnValue = this.RULE("ruleReturnValue", () => {
		this.CONSUME(DSDocLexer.tokenReturnValue);
		this.CONSUME(DSDocLexer.tokenWord, {LABEL: "value"});
	})
	
	public since = this.RULE("ruleSince", () => {
		this.CONSUME(DSDocLexer.tokenSince);
	})
	
	public version = this.RULE("ruleVersion", () => {
		this.CONSUME(DSDocLexer.tokenVersion);
	})
	
	public throw = this.RULE("ruleThrow", () => {
		this.CONSUME(DSDocLexer.tokenThrow);
		this.CONSUME(DSDocLexer.tokenWord, {LABEL: "type"});
	})
	
	public todo = this.RULE("ruleTodo", () => {
		this.CONSUME(DSDocLexer.tokenTodo);
	})
	
	public warning = this.RULE("ruleWarning", () => {
		this.CONSUME(DSDocLexer.tokenWarning);
	})
	
	
	public docBlockText = this.RULE("docBlockText", () => {
		this.OPTION(() => this.CONSUME(DSDocLexer.tokenDocLine));
		this.MANY(() => this.SUBRULE(this.docBlockTextWord));
	})
	
	public docBlockTextWord = this.RULE("docBlockTextWord", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.docWord)},
			{ALT: () => this.SUBRULE(this.newline)}
		]);
	})
	
	public docWord = this.RULE("docWord", () => {
		this.OR([
			{ALT: () => this.SUBRULE(this.emboss)},
			{ALT: () => this.SUBRULE(this.reference)},
			{ALT: () => this.SUBRULE(this.see)},
			{ALT: () => this.SUBRULE(this.bold)},
			{ALT: () => this.CONSUME(DSDocLexer.tokenString)},
			{ALT: () => this.CONSUME(DSDocLexer.tokenWord)}
		]);
	})
	
	public emboss = this.RULE("ruleEmboss", () => {
		this.CONSUME(DSDocLexer.tokenEmboss);
		this.SUBRULE(this.docWord);
	})
	
	public bold = this.RULE("ruleBold", () => {
		this.CONSUME(DSDocLexer.tokenBold);
		this.SUBRULE(this.docWord);
	})
	
	public reference = this.RULE("ruleReference", () => {
		this.CONSUME(DSDocLexer.tokenReference);
		this.CONSUME(DSDocLexer.tokenWord, {LABEL: "target"});
	})
	
	public see = this.RULE("ruleSee", () => {
		this.CONSUME(DSDocLexer.tokenSee);
		this.CONSUME(DSDocLexer.tokenWord, {LABEL: "target"});
	})
}
