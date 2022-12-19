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
	InitializeResult
} from 'vscode-languageserver/node'

import {
	TextDocument
} from 'vscode-languageserver-textdocument'

import { ContextScript } from "./context/script"
import { ScriptDocuments } from './scriptDocuments'
import { ScriptValidator } from './scriptValidator'
import { DSSettings } from './settings'
import { DSCapabilities } from './capabilities'
import { ScriptDocument } from './scriptDocument'

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

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const capabilities: DSCapabilities = new DSCapabilities;
const validator = new ScriptValidator(capabilities);
const scriptDocuments: ScriptDocuments = new ScriptDocuments(connection.console);


connection.onInitialize((params: InitializeParams) => {
	capabilities.init(params.capabilities);
	connection.console.log(`Capabilities:`)
	connection.console.log(`- hasConfiguration: ${capabilities.hasConfiguration}`)
	connection.console.log(`- hasWorkspaceFolder: ${capabilities.hasWorkspaceFolder}`)
	connection.console.log(`- hasDiagnosticRelatedInformation: ${capabilities.hasDiagnosticRelatedInformation}`)

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
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
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (capabilities.hasWorkspaceFolder) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: DSSettings = { maxNumberOfProblems: 1000 };
let globalSettings: DSSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<DSSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (capabilities.hasConfiguration) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <DSSettings>(
			(change.settings.dragonscriptLanguage || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<DSSettings> {
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
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	let scriptDocument = scriptDocuments.get(textDocument.uri);
	if (!scriptDocument) {
		const settings = await getDocumentSettings(textDocument.uri);
		scriptDocument = new ScriptDocument(textDocument.uri, connection.console, settings);
		scriptDocuments.add(scriptDocument);
	}

	const diagnostics: Diagnostic[] = [];
	validator.parse(scriptDocument, textDocument, diagnostics);

	if (scriptDocument.node) {
		scriptDocument.context = new ContextScript(scriptDocument.node);
	} else {
		scriptDocument.context = undefined;
	}

	scriptDocument.context?.log(connection.console);
	
	connection.sendDiagnostics({uri: textDocument.uri, diagnostics})
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
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
