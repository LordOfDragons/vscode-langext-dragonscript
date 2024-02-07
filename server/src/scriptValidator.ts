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

import { ILexingResult } from "chevrotain";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DSCapabilities } from "./capabilities";
import { ContextDocumentation } from "./context/documentation";
import { DSLexer } from "./lexer";
import { ScriptCstNode } from "./nodeclasses/script";
import { PackageDEModule } from "./package/dragenginemodule";
import { PackageDSLanguage } from "./package/dslanguage";
import { Package } from "./package/package";
import { DSParser } from "./parser";
import { ScriptDocument } from "./scriptDocument";
import { packages } from "./server";
import { DSSettings } from "./settings";

export class ScriptValidator {
	protected _capabilities: DSCapabilities;
	protected _lexer: DSLexer = new DSLexer();
	protected _parser: DSParser = new DSParser();


	constructor(capabilities: DSCapabilities) {
		this._capabilities = capabilities;
	}

	public dispose(): void {
	}


	public get lexer(): DSLexer {
		return this._lexer;
	}

	public get parser(): DSParser {
		return this._parser;
	}


	public async parse(scriptDocument: ScriptDocument, textDocument: TextDocument): Promise<void> {
		scriptDocument.diagnosticsLexer = [];
		await this.doRequires(scriptDocument, scriptDocument.diagnosticsLexer);
		const lexed = this.doLex(textDocument, scriptDocument.settings, scriptDocument.diagnosticsLexer);
		scriptDocument.node = this.doParse(textDocument, scriptDocument.settings, lexed, scriptDocument.diagnosticsLexer);
		for (const each of lexed.groups['documentation']) {
			scriptDocument.documentations.push(new ContextDocumentation(each));
		}
	}

	public async parseLog(scriptDocument: ScriptDocument, text: string, logs: string[]): Promise<void> {
		await this.doRequiresLog(scriptDocument, logs);
		const lexed = this.doLexLog(scriptDocument, text, scriptDocument.settings, logs);
		scriptDocument.node = this.doParseLog(scriptDocument, scriptDocument.settings, lexed, logs);
		for (const each of lexed.groups['documentation']) {
			scriptDocument.documentations.push(new ContextDocumentation(each));
		}
	}


	protected async doRequires(scriptDocument: ScriptDocument, diagnostics: Diagnostic[]): Promise<void> {
		let pkg: Package = packages.get(PackageDSLanguage.PACKAGE_ID)!;
		await pkg.load();
		
		if (scriptDocument.settings.requiresPackageDragengine) {
			let pkg: Package = packages.get(PackageDEModule.PACKAGE_ID)!;
			await pkg.load();
		}
	}

	protected async doRequiresLog(scriptDocument: ScriptDocument, logs: string[]): Promise<void> {
		//let pkg: Package = packages.get(PackageDSLanguage.PACKAGE_ID)!;
		//pkg.load();
	}

	protected doLex(textDocument: TextDocument, settings: DSSettings, diagnostics: Diagnostic[]): ILexingResult {
		const lexed = this._lexer.tokenize(textDocument.getText());

		for (const error of lexed.errors.slice(0, settings.maxNumberOfProblems)) {
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(error.offset),
					end: textDocument.positionAt(error.offset + error.length)
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

		return lexed;
	}

	protected doLexLog(document: ScriptDocument, text: string,
			settings: DSSettings, logs: string[]): ILexingResult {
		const lexed = this._lexer.tokenize(text);

		for (const error of lexed.errors.slice(0, settings.maxNumberOfProblems)) {
			logs.push(`[EE] ${document.uri}:? : ${error.message}`);
		};

		return lexed;
	}

	protected doParse(textDocument: TextDocument, settings: DSSettings,
			lexed: ILexingResult, diagnostics: Diagnostic[]): ScriptCstNode {
		this._parser.input = lexed.tokens;
		const node = this._parser.script() as ScriptCstNode;

		for (const error of this._parser.errors.slice(0, settings.maxNumberOfProblems)) {
			const startToken = error.token
			var endToken = error.resyncedTokens.at(-1) ?? startToken

			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(startToken.startOffset),
					end: textDocument.positionAt(endToken.endOffset ?? endToken.startOffset)
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
		return node;
	}

	protected doParseLog(document: ScriptDocument, settings: DSSettings,
			lexed: ILexingResult, logs: string[]): ScriptCstNode {
		this._parser.input = lexed.tokens;
		const node = this._parser.script() as ScriptCstNode;
		
		for (const error of this._parser.errors.slice(0, settings.maxNumberOfProblems)) {
			logs.push(`[EE] ${document.uri}:? : ${error.message}`);
		}
		return node;
	}
}
