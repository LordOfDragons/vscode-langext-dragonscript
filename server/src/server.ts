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
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentSymbolParams,
	DocumentSymbol,
	Hover,
	Location,
	Definition,
	WorkspaceSymbolParams,
	SymbolInformation,
	ReferenceParams,
	DocumentHighlightParams,
	DocumentHighlight,
	DocumentHighlightKind,
	SignatureHelpParams,
	SignatureHelp,
	CodeActionParams,
	CodeAction,
	RenameParams,
	WorkspaceEdit,
	TextEdit,
	DidChangeConfigurationParams,
	DidChangeWatchedFilesParams} from 'vscode-languageserver/node'

import {
	TextDocument
} from 'vscode-languageserver-textdocument'

import { ContextScript } from "./context/script";
import { ScriptDocuments } from "./scriptDocuments";
import { ScriptValidator } from "./scriptValidator";
import { DSSettings, FileSettings } from "./settings";
import { DSCapabilities } from "./capabilities";
import { ScriptDocument } from "./scriptDocument";
import { Packages } from "./package/packages";
import { PackageDEModule } from "./package/dragenginemodule";
import { PackageDSLanguage } from "./package/dslanguage";
import { ReportConfig } from './reportConfig';
import { PackageWorkspace } from './package/workspacepackage';
import { Context } from './context/context';
import { DocumentationValidator } from './documentationValidator';
import { Package } from './package/package';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

export function debugLogObjProps(message: string, obj: any) {
	if (obj) {
		let s = Object.keys(obj).reduce((a, b) => `${a}, ${b}`);
		debugLogMessage(`${message}: (${obj.constructor?.name}) ${s}`);
	} else {
		debugLogMessage(`${message}: object is undefined`);
	}
}

export function debugLogObj(message: string, obj: any) {
	if (obj) {
		let s = Object.keys(obj).map(a => `${a}=${obj[a]}`).reduce((a, b) => `${a}, ${b}`);
		debugLogMessage(`${message}: (${obj.constructor?.name}) ${s}`);
	} else {
		debugLogMessage(`${message}: object is undefined`);
	}
}

export function debugLogMessage(message: string) {
	connection.console.log(message);
}

export function debugErrorMessage(message: string) {
	connection.console.error(message);
}

export function debugLogContext(context?: Context) {
	context?.log(connection.console);
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

export function remoteConsole() {
	return connection.console;
}


const defaultSettings: DSSettings = {
	maxNumberOfProblems: 1000,
	pathDragengine: '',
	requiresPackageDragengine: false,
	scriptDirectories: ['.']
};
export let globalSettings: DSSettings = defaultSettings;

export const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
export const capabilities: DSCapabilities = new DSCapabilities;
export const validator = new ScriptValidator(capabilities);
export const scriptDocuments: ScriptDocuments = new ScriptDocuments(connection.console);
export const documentationValidator = new DocumentationValidator(capabilities);

const workspacePackages: PackageWorkspace[] = [];
export const packages: Packages = new Packages();


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
				//resolveProvider: true,
				triggerCharacters: ['.']
			},
			documentSymbolProvider: {
				label: "DragonScript"
			},
			hoverProvider: true,
			definitionProvider: true,
			workspaceSymbolProvider: true,
			referencesProvider: true,
			documentHighlightProvider: true,
			signatureHelpProvider: {
				triggerCharacters: ['('],
				retriggerCharacters: [',']
			},
			codeActionProvider: true,
			renameProvider: true
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

connection.onInitialized(async () => {
	if (capabilities.hasConfiguration) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (capabilities.hasWorkspaceFolder) {
		connection.workspace.onDidChangeWorkspaceFolders(async _event => {
			await onDidChangeWorkspaceFolders();
		});
	}
	
	packages.add(new PackageDSLanguage(connection.console));
	packages.add(new PackageDEModule(connection.console));
	
	const wsSettings = capabilities.hasConfiguration
		? await connection.workspace.getConfiguration({section: 'dragonscriptLanguage'})
		: defaultSettings;
	
	const settings = wsSettings ?? defaultSettings;
	
	(packages.get(PackageDEModule.PACKAGE_ID) as PackageDEModule).pathDragengine = settings.pathDragengine;
	
	await onDidChangeWorkspaceFolders();
});

connection.onDidChangeConfiguration(
	async (change: DidChangeConfigurationParams): Promise<void> => {
		const wsSettings = await connection.workspace.getConfiguration({
			section: 'dragonscriptLanguage'
		});
		const settings = wsSettings
			?? (change.settings?.dragonscriptLanguage as DSSettings)
			?? defaultSettings;
		
		if (!capabilities.hasConfiguration) {
			globalSettings = settings;
		}
		
		(packages.get(PackageDEModule.PACKAGE_ID) as PackageDEModule).pathDragengine = settings.pathDragengine;
		
		// Revalidate all open text documents
		/*for (const each of documents.all()) {
			validateTextDocument(each);
		}*/
		for (const each of workspacePackages) {
			each.resolveAllLater();
		}
	}
);

async function onDidChangeWorkspaceFolders() {
	const folders = await connection.workspace.getWorkspaceFolders();
	
	// dispose of folders no more existing
	const retainPackages: PackageWorkspace[] = [];
	const disposePackages: PackageWorkspace[] = [];
	
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
				const settings = await getDocumentSettings(f.uri);
				if (settings.scriptDirectories.length == 0) {
					continue;
				}
				
				const wfpackage = new PackageWorkspace(connection.console, f);
				workspacePackages.push(wfpackage);
				console.log(`onDidChangeWorkspaceFolders reload ${f.uri}`);
				wfpackage.reload();
			}
		}
	}
}

export async function getDocumentSettings(resource: string): Promise<DSSettings> {
	if (!capabilities.hasConfiguration) {
		return globalSettings;
	} else {
		return connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'dragonscriptLanguage'
		});
	}
}

export async function getFileSettings(resource: string): Promise<FileSettings> {
	if (!capabilities.hasConfiguration) {
		return {
			exclude: {}
		};
	} else {
		return connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'files'
		});
	}
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async change => {
	//console.log(`onDidChangeContent ${change.document.uri} ${change.document.version}`);
	validateTextDocumentAndReresolve(change.document);
});

async function ensureDocument(uri: string): Promise<ScriptDocument> {
	let sd = await scriptDocuments.ensureGet(uri);
	await (sd.package as Package)?.load();
	return sd;
}

async function ensureWorkspaceDocuments(): Promise<void> {
	for (const each of workspacePackages) {
		await each.load();
	}
}

async function validateTextDocumentAndReresolve(textDocument: TextDocument): Promise<void> {
	const scriptDocument = scriptDocuments.get(textDocument.uri);
	if (scriptDocument && textDocument.version == scriptDocument.revision) {
		return;
	}
	
	const pkg = scriptDocument?.package as Package;
	if (!pkg?.isLoaded) {
		//console.log(`validateTextDocumentAndReresolve(${textDocument.uri}): owner package not loaded yet`);
		return;
	}
	
	await validateTextDocument(textDocument);
	//workspacePackages.forEach (each => each.resolveAllLater());
	pkg.resolveAllLater();
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	//console.log(`validateTextDocument ${textDocument.uri} ${textDocument.version}`);
	
	//let startTime = Date.now();
	
	let scriptDocument = scriptDocuments.get(textDocument.uri);
	if (scriptDocument) {
		scriptDocument.revision = textDocument.version;
		
	} else {
		const settings = await getDocumentSettings(textDocument.uri);
		scriptDocument = new ScriptDocument(textDocument.uri, connection.console, settings);
		scriptDocument.revision = textDocument.version;
		scriptDocuments.add(scriptDocument);
	}
	
	let reportConfig = new ReportConfig;
	
	scriptDocument.diagnosticsLexer = [];
	await validator.parse(scriptDocument, textDocument);
	
	if (scriptDocument.node) {
		try {
			scriptDocument.context = new ContextScript(scriptDocument, textDocument);
			scriptDocument.context.uri = textDocument.uri;
		} catch (error) {
			logError(error);
			scriptDocument.context = undefined;
		}
	} else {
		scriptDocument.context = undefined;
	}
	
	scriptDocument.diagnosticsClasses = await scriptDocument.resolveClasses(reportConfig);
	scriptDocument.diagnosticsInheritance = await scriptDocument.resolveInheritance(reportConfig);
	scriptDocument.diagnosticsResolveMembers = await scriptDocument.resolveMembers(reportConfig);
	scriptDocument.diagnosticsResolveStatements = await scriptDocument.resolveStatements(reportConfig);
	
	const diagnostics: Diagnostic[] = [];
	diagnostics.push(...scriptDocument.diagnosticsLexer);
	diagnostics.push(...scriptDocument.diagnosticsClasses);
	diagnostics.push(...scriptDocument.diagnosticsInheritance);
	diagnostics.push(...scriptDocument.diagnosticsResolveMembers);
	diagnostics.push(...scriptDocument.diagnosticsResolveStatements);
	
	connection.sendDiagnostics({uri: textDocument.uri, diagnostics})
}

connection.onDidChangeWatchedFiles(
	async (params: DidChangeWatchedFilesParams): Promise<void> => {
		/*
		change.changes.forEach(each => {
			//if (each.type === FileChangeType.Changed) {
				console.log(`onDidChangeWatchedFiles ${each.uri}`);
			//}
		});
		*/
	}
);

connection.onDocumentSymbol(
	async (params: DocumentSymbolParams): Promise<DocumentSymbol[]> => {
		const sd = await ensureDocument(params.textDocument.uri);
		return sd.context?.documentSymbols ?? [];
	}
);

connection.onWorkspaceSymbol(
	async (_params: WorkspaceSymbolParams): Promise<SymbolInformation[]> => {
		await ensureWorkspaceDocuments();
		
		const symbols: SymbolInformation[] = [];
		for (const pkg of workspacePackages) {
			for (const scrdoc of pkg.scriptDocuments) {
				scrdoc.context?.collectWorkspaceSymbols(symbols);
			}
		}
		return symbols;
	}
)

connection.onHover(
	async (params: TextDocumentPositionParams): Promise<Hover | null> => {
		const sd = await ensureDocument(params.textDocument.uri);
		try {
			return sd.context?.
				contextAtPosition(params.position)?.
				hover(params.position) ?? null;
		} catch (error) {
			logError(error);
			return null;
		}
	}
);

connection.onCompletion(
	async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
		const sd = await ensureDocument(params.textDocument.uri);
		
		const document = documents.get(params.textDocument.uri);
		if (!document || !sd.context) {
			return [];
		}
		
		try {
			// console.log(`onCompletion ${Helpers.logPosition(params.position)}: ${sd.context.contextAtPosition(params.position)?.constructor.name}`);
			// debugLogContext(sd.context.contextAtPosition(params.position));
			return sd.context.
				contextAtPosition(params.position)?.
				completion(document, params.position) ?? [];
			
		} catch (error) {
			logError(error);
			return [];
		}
	}
);

/*
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
*/

connection.onDefinition(
	async (params: TextDocumentPositionParams): Promise<Definition> => {
		const sd = await ensureDocument(params.textDocument.uri);
		try {
			return sd.context?.
				contextAtPosition(params.position)?.
				definition(params.position) ?? [];
		} catch (error) {
			logError(error);
			return [];
		}
	}
);

connection.onReferences(
	async (params: ReferenceParams): Promise<Location[]> => {
		const sd = await ensureDocument(params.textDocument.uri);
		
		const resolved = sd.context?.
			contextAtPosition(params.position)?.
			resolvedAtPosition(params.position);
		
		if (!resolved) {
			return [];
		}
		
		const references: Location[] = [];
		
		if (params.context.includeDeclaration) {
			references.push(...resolved.references);
		}
		
		for (const each of resolved.usage) {
			const r = each.reference;
			if (r) {
				references.push(r);
			}
		}
		
		return references;
	}
)

connection.onDocumentHighlight(
	async (params: DocumentHighlightParams): Promise<DocumentHighlight[]> => {
		const uri = params.textDocument.uri;
		const sd = await ensureDocument(uri);
		
		const resolved = sd.context?.
			contextAtPosition(params.position)?.
			resolvedAtPosition(params.position);
		
		if (!resolved) {
			return [];
		}
		
		const hilight: DocumentHighlight[] = [];
		
		for (const each of resolved.references) {
			if (each.uri == uri) {
				hilight.push({
					range: each.range,
					kind: DocumentHighlightKind.Text
				});
			}
		}
		
		for (const each of resolved.usage) {
			if (each.context?.documentUri == uri && each.range) {
				hilight.push({
					range: each.range,
					kind: each.write ? DocumentHighlightKind.Write : DocumentHighlightKind.Read
				});
			}
		}
		
		return hilight;
	}
)

connection.onSignatureHelp(
	async (params: SignatureHelpParams): Promise<SignatureHelp | undefined> => {
		const sd = await ensureDocument(params.textDocument.uri);
		
		return sd.context?.
			contextAtPosition(params.position)?.
			signatureHelpAtPosition(params.position);
	}
)

connection.onCodeAction(
	async (params: CodeActionParams): Promise<CodeAction[]> => {
		const sd = await ensureDocument(params.textDocument.uri);
		
		return sd.context?.
			contextAtRange(params.range)?.
			codeAction(params.range) ?? [];
	}
)

connection.onRenameRequest(
	async (params: RenameParams): Promise<WorkspaceEdit | undefined> => {
		const sd = await ensureDocument(params.textDocument.uri);
		
		const resolved = sd.context?.
			contextAtPosition(params.position)?.
			resolvedAtPosition(params.position);
		
		if (!resolved) {
			return undefined;
		}
		
		let references: Location[] = [];
		references.push(...resolved.references);
		
		for (const each of resolved.usage) {
			const r = each.reference;
			if (r) {
				references.push(r);
			}
		}
		
		if (references.length == 0) {
			return undefined;
		}
		
		let changes: {[uri: string]: TextEdit[]} = {};
		
		for (const each of references) {
			if (!changes[each.uri]) {
				changes[each.uri] = [];
			}
			changes[each.uri].push(TextEdit.replace(each.range, params.newName));
		}
		
		return {changes: changes};
	}
)

export function logError(error: any): void {
	if (error instanceof Error) {
		let err = error as Error;
		connection.console.error(err.name);
		if (err.stack) {
			connection.console.error(err.stack);
		}
	} else {
		connection.console.error(`${error}`);
	}
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
