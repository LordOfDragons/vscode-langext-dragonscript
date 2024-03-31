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

import { IToken } from "chevrotain";
import { Diagnostic, RemoteConsole } from "vscode-languageserver";
import { ContextScript } from "./context/script";
import { ScriptCstNode } from "./nodeclasses/script";
import { ReportConfig } from "./reportConfig";
import { ResolveState } from "./resolve/state";
import { DSSettings } from "./settings";

export class ScriptDocument {
	protected _uri: string;
	protected _console: RemoteConsole;
	
	public package?: any; // not type Package due to inheritence cycle
	protected _settings: DSSettings;
	public node?: ScriptCstNode;
	protected _context?: ContextScript;
	protected _documentationTokens: IToken[] = [];
	protected _commentTokens: IToken[] = [];
	
	protected _classesResolved = false;
	protected _inheritanceResolved = false;
	protected _membersResolved = false;
	protected _statementsResolved = false;
	
	public requiresAnotherTurn: boolean = false;
	public revision: number = 1;
	public diagnosticsLexer: Diagnostic[] = [];
	public diagnosticsClasses: Diagnostic[] = [];
	public diagnosticsInheritance: Diagnostic[] = [];
	public diagnosticsResolveMembers: Diagnostic[] = [];
	public diagnosticsResolveStatements: Diagnostic[] = [];
	
	
	constructor(uri: string, console: RemoteConsole, settings: DSSettings) {
		this._uri = uri;
		this._console = console;
		this._settings = settings;
	}
	
	public dispose(): void {
		this._context?.dispose();
		this.package = undefined;
	}
	
	
	public get console(): RemoteConsole {
		return this._console;
	}
	
	public get uri(): string {
		return this._uri;
	}
	
	public get settings(): DSSettings {
		return this._settings;
	}
	
	public set settings(value: DSSettings) {
		this._settings = value;
		// TODO invalidate
	}
	
	public get documentationTokens(): IToken[] {
		return this._documentationTokens;
	}
	
	public set documentationTokens(value: IToken[]) {
		this._documentationTokens = value;
	}
	
	public get commentTokens(): IToken[] {
		return this._commentTokens;
	}
	
	public set commentTokens(value: IToken[]) {
		this._commentTokens = value;
	}
	
	public get context(): ContextScript | undefined {
		return this._context;
	}
	
	public set context(context: ContextScript | undefined) {
		if (context === this._context) {
			return;
		}
		
		this._context?.dispose();
		this._context = context;
		// TODO invalidate
	}
	
	
	public get areClassesResolved(): boolean {
		return this._classesResolved;
	}
	
	public async waitClassesResolved(): Promise<void> {
		while (!this._classesResolved) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}
	
	public get isInheritanceResolved(): boolean {
		return this._inheritanceResolved;
	}
	
	public async waitInheritanceResolved(): Promise<void> {
		while (!this._inheritanceResolved) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}
	
	public get areMembersResolved(): boolean {
		return this._membersResolved;
	}
	
	public async waitMembersResolved(): Promise<void> {
		while (!this._membersResolved) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}
	
	public get areStatementsResolved(): boolean {
		return this._statementsResolved;
	}
	
	public async waitStatementsResolved(): Promise<void> {
		while (!this._statementsResolved) {
			await new Promise(resolve => setTimeout(resolve, 250));
		}
	}
	
	
	public async resolveClasses(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		const diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			this.context.resolveClasses(new ResolveState(diagnostics, this.uri, reportConfig));
		}
		
		this._classesResolved = true;
		return diagnostics;
	}
	
	public async resolveInheritance(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		const  diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			const state = new ResolveState(diagnostics, this.uri, reportConfig);
			this.context.resolveInheritance(state);
			this.requiresAnotherTurn = state.requiresAnotherTurn;
		}
		
		if (!this.requiresAnotherTurn) {
			this._inheritanceResolved = true;
		}
		return diagnostics;
	}
	
	public async resolveMembers(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		const diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			this.context.resolveMembers(new ResolveState(diagnostics, this.uri, reportConfig));
		}
		
		this._membersResolved = true;
		return diagnostics;
	}
	
	public async resolveStatements(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		const diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			this.context.resolveStatements(new ResolveState(diagnostics, this.uri, reportConfig));
		}
		
		this._statementsResolved = true;
		return diagnostics;
	}
}
