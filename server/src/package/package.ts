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

import { statSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { Diagnostic, DiagnosticSeverity, RemoteConsole } from "vscode-languageserver";
import { ContextScript } from "../context/script";
import { ScriptDocument } from "../scriptDocument";
import { getDocumentSettings, globalSettings, scriptDocuments, validator } from "../server";

export class Package {
	protected _console: RemoteConsole;
	protected _id: string;
	protected _loaded: boolean = false;
	protected _promiseLoading?: Promise<void>;
	protected _loadingStartTime?: number;
	protected _scriptDocuments: ScriptDocument[];
	protected _files: string[] = [];
	//protected _finishedCounter: number = 0;


	constructor(console: RemoteConsole, id: string) {
		this._console = console;
		this._id = id;
		this._scriptDocuments = [];
	}

	public dispose(): void {
		this._scriptDocuments = [];
	}


	public get console(): RemoteConsole {
		return this._console;
	}

	public get id(): string {
		return this._id;
	}

	public get scriptDocuments(): ScriptDocument[] {
		return this._scriptDocuments;
	}

	public get files(): string[] {
		return this._files;
	}
	

	public async load(): Promise<void> {
		if (this._promiseLoading) {
			return this._promiseLoading;
		} else if (!this._loaded) {
			this._promiseLoading = this.reload();
			return this._promiseLoading;
		}
	}

	public async reload(): Promise<void> {
		this.clear();
		this._loadingStartTime = Date.now();
		this._promiseLoading = this.loadPackage();
		return this._promiseLoading;
	}
	

	protected async loadPackage(): Promise<void> {
	}
	
	protected loadingFinished(): void {
		let elapsedTime = Date.now() - (this._loadingStartTime ?? 0);
		this._loadingStartTime = undefined;
		this._loaded = true;
		this._promiseLoading = undefined;
		this._console.log(`Package '${this._id}': Done loading in ${elapsedTime / 1000}s`);
	}
	
	protected clear(): void {
		this._promiseLoading = undefined;
		this._loadingStartTime = undefined;
		//this._finishedCounter = 0;
		this._scriptDocuments = [];
		this._files = [];
	}

	protected async loadFiles(): Promise<void> {
		// loading files does "resolveClasses" on all documents individually
		await Promise.all(this._files.map(each => this.loadFile(each)));

		// calling "resolveInheritance" and "resolveStatements" requires all files to be present
		await Promise.all(this._scriptDocuments.map(each => {
			this.resolveLogDiagnostics(each.resolveInheritance(), each.uri);
		}));
		
		await Promise.all(this._scriptDocuments.map(each => {
			this.resolveLogDiagnostics(each.resolveStatements(), each.uri);
		}));
	}

	protected async loadFile(path: string): Promise<void> {
		//let startTime = Date.now();

		let uri = `file://${path}`
		let scriptDocument = scriptDocuments.get(uri);
		if (!scriptDocument) {
			scriptDocument = new ScriptDocument(uri, this.console, globalSettings);
			scriptDocuments.add(scriptDocument);
		}

		let text: string = await readFile(path, 'utf8');
		let logs: string[] = [];

		try {
			await validator.parseLog(scriptDocument, text, logs);
		} catch (error) {
			this._console.error(`Package '${this._id}': Failed parsing '${path}'`);
			if (error instanceof Error) {
				let err = error as Error;
				this._console.error(error.name);
				if (error.stack) {
					this._console.error(error.stack);
				}
			} else {
				this._console.error(`${error}`);
			}
			throw error;
		}

		for (const each of logs) {
			this._console.log(each);
		}

		if (scriptDocument.node) {
			let lineCount = (text.match(/\n/g) || '').length + 1;
			try {
				scriptDocument.context = new ContextScript(scriptDocument.node, undefined, lineCount);
			} catch (error) {
				this._console.error(`Package '${this._id}': Failed syntax '${path}'`);
				if (error instanceof Error) {
					let err = error as Error;
					this._console.error(error.name);
					if (error.stack) {
						this._console.error(error.stack);
					}
				} else {
					this._console.error(`${error}`);
				}
				throw error;
			}

		} else {
			scriptDocument.context = undefined;
		}

		//let elapsedTime = Date.now() - startTime;
		
		//scriptDocument.context?.log(connection.console);
		
		this._scriptDocuments.push(scriptDocument);

		//this._finishedCounter++;
		//scriptDocument.console.info(`Package '${this._id}' (${this._finishedCounter}/${this._files.length}): Parsed '${path}' in ${elapsedTime / 1000}s`);

		// this can run asynchronous
		this.resolveLogDiagnostics(scriptDocument.resolveClasses(), scriptDocument.uri);
	}

	protected async resolveLogDiagnostics(diagnostics: Promise<Diagnostic[]>, uri: string): Promise<void> {
		for (const each of await diagnostics) {
			var severity;
			switch (each.severity ?? DiagnosticSeverity.Information) {
				case DiagnosticSeverity.Error:
					severity = "[EE]";
					break;

				case DiagnosticSeverity.Warning:
					severity = "[WW]";
					break;

				case DiagnosticSeverity.Information:
					severity = "[II]";
					break;

				case DiagnosticSeverity.Hint:
					severity = "[HH]";
					break;

				default:
					severity = "[II]";
			}

			this._console.log(`Package '${this._id}' ${severity}: ${uri}:${each.range.start.line}:${each.range.start.character}: ${each.message}`);
		}
	}
	
	protected async scanPackage(list: string[], path: string): Promise<void> {
		let files = await readdir(path);
		let directories: string[] = []

		for (const each of files) {
			let childpath = join(path, each);
			let stats = statSync(childpath);
			if (stats.isDirectory()) {
				directories.push(childpath);
			} else if (stats.isFile()) {
				if (each.endsWith('.ds')) {
					list.push(childpath);
				}
			}
		}

		await Promise.all(directories.map(each => this.scanPackage(list, each)));
	}
}
