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

import { Diagnostic, RemoteConsole } from "vscode-languageserver";
import { ContextScript } from "./context/script";
import { ScriptCstNode } from "./nodeclasses/script";
import { ReportConfig } from "./reportConfig";
import { ResolveState } from "./resolve/state";
import { debugLogMessage } from "./server";
import { DSSettings } from "./settings";

export class ScriptDocument {
	protected _uri: string;
	protected _console: RemoteConsole;

	protected _settings: DSSettings;
	protected _node?: ScriptCstNode;
	protected _context?: ContextScript;

	public requiresAnotherTurn: boolean = false;


	constructor(uri: string, console: RemoteConsole, settings: DSSettings) {
		this._uri = uri;
		this._console = console;
		this._settings = settings;
	}

	public dispose(): void {
		this._context?.dispose();
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

	public get node(): ScriptCstNode | undefined {
		return this._node;
	}

	public set node(value: ScriptCstNode | undefined) {
		this._node = value;
		// TODO invalidate
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


	public async resolveClasses(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			let state = new ResolveState(diagnostics, this.uri, reportConfig);
			this.context.resolveClasses(state);
		}

		return diagnostics;
	}

	public async resolveInheritance(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			let state = new ResolveState(diagnostics, this.uri, reportConfig);
			this.context.resolveInheritance(state);
			this.requiresAnotherTurn = state.requiresAnotherTurn;
		}

		return diagnostics;
	}

	public async resolveMembers(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			let state = new ResolveState(diagnostics, this.uri, reportConfig);
			this.context.resolveMembers(state);
		}

		return diagnostics;
	}

	public async resolveStatements(reportConfig: ReportConfig): Promise<Diagnostic[]> {
		let diagnostics: Diagnostic[] = [];
		
		if (this.context) {
			let state = new ResolveState(diagnostics, this.uri, reportConfig);
			this.context.resolveStatements(state);
		}

		return diagnostics;
	}
}
