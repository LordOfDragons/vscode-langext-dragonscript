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

import { ILexingResult, tokenName } from "chevrotain";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DSCapabilities } from "./capabilities";
import { ContextDocumentationDoc } from "./context/doc/doc";
import { ContextDocumentation } from "./context/documentation";
import { Helpers } from "./helpers";
import { DSDocLexer } from "./lexer_doc";
import { DocumentationDocCstNode } from "./nodeclasses/doc/documentation";
import { DSDocParser } from "./parser_doc";
import { ScriptDocument } from "./scriptDocument";
import { debugLogMessage, remoteConsole } from "./server";
import { DSSettings } from "./settings";

export class DocumentationValidator {
	protected _capabilities: DSCapabilities;
	protected _lexer: DSDocLexer = new DSDocLexer();
	protected _parser: DSDocParser = new DSDocParser();
	
	
	constructor(capabilities: DSCapabilities) {
		this._capabilities = capabilities;
	}
	
	public dispose(): void {
	}
	
	
	public get lexer(): DSDocLexer {
		return this._lexer;
	}
	
	public get parser(): DSDocParser {
		return this._parser;
	}
	
	
	public parse(scriptDocument: ScriptDocument, documentation: ContextDocumentation, textDocument: TextDocument): void {
		let diagnostics: Diagnostic[] = [];
		const lexed = this.doLex(textDocument, documentation, scriptDocument.settings, diagnostics);
		documentation.docNode = this.doParse(textDocument, documentation, scriptDocument.settings, lexed, diagnostics);
		documentation.docContext = new ContextDocumentationDoc(documentation.docNode, documentation);
	}
	
	public parseLog(scriptDocument: ScriptDocument, documentation: ContextDocumentation, logs: string[]): void {
		const lexed = this.doLexLog(scriptDocument, documentation, scriptDocument.settings, logs);
		documentation.docNode = this.doParseLog(scriptDocument, documentation, scriptDocument.settings, lexed, logs);
		documentation.docContext = new ContextDocumentationDoc(documentation.docNode, documentation);
	}
	
	
	protected doLex(textDocument: TextDocument, documentation: ContextDocumentation,
			settings: DSSettings, diagnostics: Diagnostic[]): ILexingResult {
				
		const lexed = this._lexer.tokenize(documentation.token.image);
		
		if (lexed.errors.length > 0) {
			const docOffset = textDocument.offsetAt(Helpers.positionFrom(documentation.token, true));
			
			for (const error of lexed.errors.slice(0, settings.maxNumberOfProblems)) {
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(docOffset + error.offset),
						end: textDocument.positionAt(docOffset + error.offset + error.length)
					},
					message: error.message,
					source: 'Lexing'
				};
					
				if (this._capabilities.hasDiagnosticRelatedInformation) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri: textDocument.uri,
								range: Object.assign({}, diagnostic.range)
							},
							message: 'Lexing Errors'
						}
					];
				}
				
				diagnostics.push(diagnostic);
			}
		}
		
		return lexed;
	}
	
	protected doLexLog(document: ScriptDocument, documentation: ContextDocumentation,
			settings: DSSettings, logs: string[]): ILexingResult {
		const lexed = this._lexer.tokenize(documentation.token.image);
		
		for (const error of lexed.errors.slice(0, settings.maxNumberOfProblems)) {
			logs.push(`[EE] ${document.uri}:? : ${error.message}`);
		};
		
		return lexed;
	}
	
	protected doParse(textDocument: TextDocument, documentation: ContextDocumentation,
			settings: DSSettings, lexed: ILexingResult, diagnostics: Diagnostic[]): DocumentationDocCstNode {
		this._parser.input = lexed.tokens;
		const node = this._parser.documentation() as DocumentationDocCstNode;
		
		if (this._parser.errors.length > 0) {
			const docOffset = textDocument.offsetAt(Helpers.positionFrom(documentation.token, true));
			
			for (const error of this._parser.errors.slice(0, settings.maxNumberOfProblems)) {
				const startToken = error.token
				var endToken = error.resyncedTokens.at(-1) ?? startToken
				
				const diagnostic: Diagnostic = {
					severity: DiagnosticSeverity.Error,
					range: {
						start: textDocument.positionAt(docOffset + startToken.startOffset),
						end: textDocument.positionAt(docOffset + (endToken.endOffset ?? endToken.startOffset))
					},
					message: error.message,
					source: error.name
				}
				
				if (this._capabilities.hasDiagnosticRelatedInformation) {
					diagnostic.relatedInformation = [
						{
							location: {
								uri: textDocument.uri,
								range: Object.assign({}, diagnostic.range)
							},
							message: 'Grammar Errors'
						}
					]
				}
				
				diagnostics.push(diagnostic)
			}
		}
		
		return node;
	}

	protected doParseLog(document: ScriptDocument, documentation: ContextDocumentation, settings: DSSettings,
			lexed: ILexingResult, logs: string[]): DocumentationDocCstNode {
		this._parser.input = lexed.tokens;
		const node = this._parser.documentation() as DocumentationDocCstNode;
		
		if (this._parser.errors.length > 0) {
			const docOffset = documentation.token.startLine ?? 0;
			
			/*
			debugLogMessage(`text: "${documentation.token.image}"`);
			for (const t of lexed.tokens) {
				debugLogMessage(`lexed: ${tokenName(t.tokenType)} => "${t.image}"`);
			};
			*/
			
			for (const error of this._parser.errors.slice(0, settings.maxNumberOfProblems)) {
				logs.push(`[EE] ${document.uri}:${docOffset + (error.token.startLine ?? 1)} : ${error.message}`);
			}
		}
		
		return node;
	}
}
