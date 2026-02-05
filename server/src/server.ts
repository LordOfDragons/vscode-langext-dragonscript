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
	DidChangeWatchedFilesParams,
	FileChangeType,
	DefinitionParams,
	SemanticTokensParams,
	SemanticTokens} from 'vscode-languageserver/node'

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
import { Helpers } from './helpers';
import { DebugSettings } from './debugSettings';
import { semtokens } from './semanticTokens';
import { DelgaCacher } from './delgaCacher';
import { URI } from 'vscode-uri';
import { join } from 'path';

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
	scriptDirectories: ['.'],
	basePackages: []
};
export let globalSettings: DSSettings = defaultSettings;

export const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
export const capabilities: DSCapabilities = new DSCapabilities;
export const validator = new ScriptValidator(capabilities);
export const scriptDocuments: ScriptDocuments = new ScriptDocuments(connection.console);
export const documentationValidator = new DocumentationValidator(capabilities);

const workspacePackages: PackageWorkspace[] = [];
export const packages: Packages = new Packages();

export const delgaCacher: DelgaCacher = new DelgaCacher(connection.console);

interface DSInitOptions {
	globalStoragePath: string;
}

connection.onInitialize(async (params: InitializeParams) => {
	Error.stackTraceLimit = 50; // 10 is default but too short to debug lexing/parsing problems
	
	workspacePackages.forEach(async (each) => await each.dispose());
	workspacePackages.length = 0;
	
	capabilities.init(params.capabilities);
	connection.console.log(`Capabilities:`)
	connection.console.log(`- hasConfiguration: ${capabilities.hasConfiguration}`)
	connection.console.log(`- hasWorkspaceFolder: ${capabilities.hasWorkspaceFolder}`)
	connection.console.log(`- hasDiagnosticRelatedInformation: ${capabilities.hasDiagnosticRelatedInformation}`)
	
	const iopts = params.initializationOptions as DSInitOptions;
	delgaCacher.cacheDir = join(URI.parse(iopts.globalStoragePath).fsPath, "delgaCache");
	
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				triggerCharacters: ['.']
			},
			documentSymbolProvider: {
				label: 'DragonScript'
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
			renameProvider: true,
			semanticTokensProvider: {
				legend: semtokens.legend,
				full: true
			}
			
			/*
			- typeDefinitionProvider
			- implementationProvider
			- codeLensProvider
			- documentLinkProvider
			- colorProvider
			- documentFormattingProvider
			- documentRangeFormattingProvider
			- documentOnTypeFormattingProvider
			- foldingRangeProvider
			- selectionRangeProvider
			- executeCommandProvider
			- callHierarchyProvider
			- linkedEditingRangeProvider
			*/
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

connection.onShutdown(async () => {
	await packages.dispose();
	workspacePackages.forEach (async e => await e.dispose());
	workspacePackages.splice(0);
	documentationValidator.dispose();
	scriptDocuments.dispose();
	validator.dispose();
});

connection.onInitialized(async () => {
	await delgaCacher.initCache();
	
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
	
	disposePackages.forEach(async p => await p.dispose());
	
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
			// the line below required scriptDocument.node, then it can be discarded
			scriptDocument.context = new ContextScript(scriptDocument, textDocument);
			scriptDocument.context.realUri = textDocument.uri;
			scriptDocument.context.uri = textDocument.uri;
		} catch (error) {
			logError(error);
			scriptDocument.context = undefined;
		} finally {
			scriptDocument.node = undefined; // converse memory
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
		params.changes.forEach(each => {
			switch (each.type) {
			case FileChangeType.Created:
				console.log(`file created (${each.uri}). reparse all workspace packages`);
				for (const each of workspacePackages) {
					each.reload();
				}
				break;
				
			case FileChangeType.Deleted:
				console.log(`file deleted (${each.uri}). reparse all workspace packages`);
				for (const each of workspacePackages) {
					each.reload();
				}
				break;
			}
			/*
			if (each.type === FileChangeType.Changed) {
				console.log(`onDidChangeWatchedFiles ${each.uri}`);
			}
			*/
		});
	}
);

connection.onDocumentSymbol(
	async (params: DocumentSymbolParams): Promise<DocumentSymbol[] | undefined> => {
		const sd = await ensureDocument(params.textDocument.uri);
		return sd.context?.documentSymbols;
	}
);

connection.onWorkspaceSymbol(
	async (_params: WorkspaceSymbolParams): Promise<SymbolInformation[] | undefined> => {
		try {
			await ensureWorkspaceDocuments();
			
			const symbols: SymbolInformation[] = [];
			for (const pkg of workspacePackages) {
				for (const scrdoc of pkg.scriptDocuments) {
					scrdoc.context?.collectWorkspaceSymbols(symbols);
				}
			}
			return symbols;
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.onHover(
	async (params: TextDocumentPositionParams): Promise<Hover | null> => {
		try {
			// return new HoverInfo(["**TEST**: [name](vscode://dragonscript-language-support/path?say=Testing)"], undefined);
			const sd = await ensureDocument(params.textDocument.uri);
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
	async (params: TextDocumentPositionParams): Promise<CompletionItem[] | undefined> => {
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			const document = documents.get(params.textDocument.uri);
			if (!document || !sd.context) {
				return undefined;
			}
			
			if (DebugSettings.debugCompletion) {
				console.log(`onCompletion ${Helpers.logPosition(params.position)}: ${sd.context.contextAtPosition(params.position)?.constructor.name}`);
				// debugLogContext(sd.context.contextAtPosition(params.position));
			}
			
			const items = sd.context.
				contextAtPosition(params.position)?.
				completion(document, params.position);
			return items && items.length > 0 ? items : undefined;
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
);

connection.onDefinition(
	async (params: DefinitionParams): Promise<Definition | undefined> => {
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			return sd.context?.
				contextAtPosition(params.position)?.
				definition(params.position);
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
);

connection.onReferences(
	async (params: ReferenceParams): Promise<Location[] | undefined> => {
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			
			const resolved = sd.context?.
				contextAtPosition(params.position)?.
				resolvedAtPosition(params.position);
			
			if (!resolved) {
				return undefined;
			}
			
			const references: Location[] = [];
			
			const ti = resolved.topInherited;
			var usages = [...ti.allUsages];
			if (params.context.includeDeclaration) {
				references.push(...ti.references);
			} else {
				usages = usages.filter(u => !u.inherited);
			}
			
			for (const each of usages) {
				const r = each.reference;
				if (r) {
					references.push(r);
				}
			}
			
			return references;
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.onDocumentHighlight(
	async (params: DocumentHighlightParams): Promise<DocumentHighlight[] | undefined> => {
		try {
			const uri = params.textDocument.uri;
			const sd = await ensureDocument(uri);
			
			const resolved = sd.context?.
				contextAtPosition(params.position)?.
				resolvedAtPosition(params.position);
			
			if (!resolved) {
				return undefined;
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
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.onSignatureHelp(
	async (params: SignatureHelpParams): Promise<SignatureHelp | undefined> => {
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			return sd.context?.
				contextAtPosition(params.position)?.
				signatureHelpAtPosition(params.position);
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.onCodeAction(
	async (params: CodeActionParams): Promise<CodeAction[] | undefined> => {
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			return sd.context?.
				contextAtRange(params.range)?.
				codeAction(params.range);
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.onRenameRequest(
	async (params: RenameParams): Promise<WorkspaceEdit | undefined> => {
		try {
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
		} catch (error) {
			logError(error);
			return undefined;
		}
	}
)

connection.languages.semanticTokens.on(
	async (params: SemanticTokensParams): Promise<SemanticTokens> => {
		const builder = new semtokens.Builder();
		try {
			const sd = await ensureDocument(params.textDocument.uri);
			sd.context?.addSemanticTokens(builder);
		} catch (error) {
			logError(error);
		}
		return builder.build();
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
