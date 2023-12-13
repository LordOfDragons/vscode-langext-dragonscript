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

import {
	createConnection,
	TextDocuments,
	Diagnostic,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentSymbolParams,
	DocumentSymbol,
	Hover} from 'vscode-languageserver/node'

import {
	TextDocument
} from 'vscode-languageserver-textdocument'

import { ContextScript } from "./context/script";
import { ScriptDocuments } from "./scriptDocuments";
import { ScriptValidator } from "./scriptValidator";
import { DSSettings } from "./settings";
import { DSCapabilities } from "./capabilities";
import { ScriptDocument } from "./scriptDocument";
import { Packages } from "./package/packages";
import { PackageDEModule } from "./package/dragenginemodule";
import { PackageDSLanguage } from "./package/dslanguage";
import { ReportConfig } from './reportConfig';
import { PackageWorkspace } from './package/workspacepackage';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

export function debugLogObjProps(message: string, obj: any) {
	if (obj) {
		let s = Object.keys(obj).reduce((a, b) => `${a}, ${b}`);
		debugLogMessage(`${message}: (${typeof obj}) ${s}`);
	} else {
		debugLogMessage(`${message}: object is undefined`);
	}
}

export function debugLogMessage(message: string) {
	connection.console.log(message);
}

export function assertWarn(message: string) {
	connection.console.log(message);
	let st = new Error().stack;
	if (st) {
		debugLogMessage(st);
	}
}

export function reportDiagnostics(uri: string, diagnostics: Diagnostic[]) {
	connection.sendDiagnostics({uri: uri, diagnostics});
}

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
export const capabilities: DSCapabilities = new DSCapabilities;
export const validator = new ScriptValidator(capabilities);
export const scriptDocuments: ScriptDocuments = new ScriptDocuments(connection.console);

const workspacePackages: PackageWorkspace[] = [];


connection.onInitialize((params: InitializeParams) => {
	Error.stackTraceLimit = 50; // 10 is default but too short to debug lexing/parsing problems
	
	workspacePackages.forEach((each) => each.dispose());
	workspacePackages.length = 0;
	
	capabilities.init(params.capabilities);
	connection.console.log(`Capabilities:`)
	connection.console.log(`- hasConfiguration: ${capabilities.hasConfiguration}`)
	connection.console.log(`- hasWorkspaceFolder: ${capabilities.hasWorkspaceFolder}`)
	connection.console.log(`- hasDiagnosticRelatedInformation: ${capabilities.hasDiagnosticRelatedInformation}`)
	
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				resolveProvider: true
			},
			documentSymbolProvider: {
				label: "DragonScript"
			},
			hoverProvider: true
		}
	};
	
	if (capabilities.hasWorkspaceFolder) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (capabilities.hasConfiguration) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (capabilities.hasWorkspaceFolder) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			onDidChangeWorkspaceFolders();
		});
	}
	
	packages.add(new PackageDSLanguage(connection.console));
	packages.add(new PackageDEModule(connection.console));
	
	if (capabilities.hasConfiguration) {
		connection.workspace.getConfiguration('dragonscriptLanguage').then(settings => {
			(<PackageDEModule>packages.get(PackageDEModule.PACKAGE_ID)).pathDragengine = settings.pathDragengine;
		});
	}
	
	onDidChangeWorkspaceFolders();
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
const defaultSettings: DSSettings = {
	maxNumberOfProblems: 1000,
	pathDragengine: "",
	requiresPackageDragengine: false
};
export let globalSettings: DSSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<DSSettings>> = new Map();

export const packages: Packages = new Packages();

connection.onDidChangeConfiguration(change => {
	if (capabilities.hasConfiguration) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <DSSettings>(change.settings.dragonscriptLanguage || defaultSettings);
	}

	(<PackageDEModule>packages.get(PackageDEModule.PACKAGE_ID)).pathDragengine =
		(change.settings.dragonscriptLanguage || defaultSettings).pathDragengine;
	
	// Revalidate all open text documents
	for (const each of documents.all()) {
		validateTextDocument(each);
	}
});

function onDidChangeWorkspaceFolders() {
	connection.workspace.getWorkspaceFolders().then(folders => {
		// dispose of folders no more existing
		let retainPackages: PackageWorkspace[] = [];
		let disposePackages: PackageWorkspace[] = [];
		
		if (folders) {
			for (const p of workspacePackages) {
				if (folders.find(f => f.uri == p.uri)) {
					retainPackages.push(p);
				} else {
					disposePackages.push(p);
				}
			}
			
		} else {
			disposePackages.push(...workspacePackages);
		}
		
		workspacePackages.length = 0;
		workspacePackages.push(...retainPackages);
		
		disposePackages.forEach(p => p.dispose());
		
		// add new packages
		if (folders) {
			for (const f of folders) {
				if (!workspacePackages.find(p => p.uri == f.uri)) {
					const wfpackage = new PackageWorkspace(connection.console, f);
					workspacePackages.push(wfpackage);
					wfpackage.reload();
				}
			}
		}
	});
}

export function getDocumentSettings(resource: string): Thenable<DSSettings> {
	if (!capabilities.hasConfiguration) {
		return Promise.resolve(globalSettings);
	} else {
		return connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'dragonscriptLanguage'
		});
	}
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocumentAndReresolve(change.document);
});

/*
function test(n: ResolveNamespace, i: string) {
	connection.console.log(`${i}Namespace '${n.name}'`);
	for (const each of n.namespaces.values()) {
		test(each, `${i}  `);
	}
}
*/

async function validateTextDocumentAndReresolve(textDocument: TextDocument): Promise<void> {
	await validateTextDocument(textDocument);
	workspacePackages.forEach (each => each.resolveAll());
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	//let startTime = Date.now();
	
	let scriptDocument = scriptDocuments.get(textDocument.uri);
	if (!scriptDocument) {
		const settings = await getDocumentSettings(textDocument.uri);
		scriptDocument = new ScriptDocument(textDocument.uri, connection.console, settings);
		scriptDocuments.add(scriptDocument);
	}
	
	let reportConfig = new ReportConfig;
	
	const diagnostics: Diagnostic[] = [];
	await validator.parse(scriptDocument, textDocument, diagnostics);
	
	if (scriptDocument.node) {
		try {
			scriptDocument.context = new ContextScript(scriptDocument.node, textDocument);
			scriptDocument.context.uri = textDocument.uri;
		} catch (error) {
			if (error instanceof Error) {
				let err = error as Error;
				connection.console.error(err.name);
				if (err.stack) {
					connection.console.error(err.stack);
				}
			} else {
				connection.console.error(`${error}`);
			}
			scriptDocument.context = undefined;
		}
	} else {
		scriptDocument.context = undefined;
	}
	
	for (const each of await scriptDocument.resolveClasses(reportConfig)) {
		diagnostics.push(each)
	}
	for (const each of await scriptDocument.resolveInheritance(reportConfig)) {
		diagnostics.push(each)
	}
	for (const each of await scriptDocument.resolveMembers(reportConfig)) {
		diagnostics.push(each)
	}
	for (const each of await scriptDocument.resolveStatements(reportConfig)) {
		diagnostics.push(each)
	}
	
	//let elapsedTime = Date.now() - startTime;
	//connection.console.info(`Parsed '${scriptDocument.uri}' in ${elapsedTime / 1000}s`);
	
	//scriptDocument.context?.log(connection.console);
	
	connection.sendDiagnostics({uri: textDocument.uri, diagnostics})
	
	//test(ResolveNamespace.root, "");
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

connection.onDocumentSymbol(
	(params: DocumentSymbolParams): DocumentSymbol[] => {
		return scriptDocuments.get(params.textDocument.uri)?.context?.documentSymbols || [];
	}
);

connection.onHover(
	(params: TextDocumentPositionParams): Hover | null => {
		try {
			return scriptDocuments.get(params.textDocument.uri)?.context?.
				contextAtPosition(params.position)?.hover(params.position) || null;
		} catch (error) {
			if (error instanceof Error) {
				let err = error as Error;
				connection.console.error(err.name);
				if (err.stack) {
					connection.console.error(err.stack);
				}
			} else {
				connection.console.error(`${error}`);
			}
			return null;
		}
	}
);

connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
