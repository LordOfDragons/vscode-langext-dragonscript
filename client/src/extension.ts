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

import * as path from 'path'
import {
	workspace,
	ExtensionContext,
	ConfigurationTarget,
	window,
	TextEditor,
	commands,
	Range
} from 'vscode'

import {
	LanguageClient,
	LanguageClientOptions,
	SemanticTokens,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node'

interface DSInitOptions {
	globalStoragePath: string;
}

class ImplDSInitOptions implements DSInitOptions {
	public globalStoragePath: string;
}

let client: LanguageClient
let timeout: NodeJS.Timeout | undefined = undefined

const decorationModification = window.createTextEditorDecorationType({
	textDecoration: 'underline; text-underline-offset: 0.15em;'
});

const decorationDeprecated = window.createTextEditorDecorationType({
	textDecoration: 'line-through'
});

async function updateModifications(editor: TextEditor) {
	if (editor.document.languageId !== 'dragonscript'){
		return
	}
	
	// get the tokens from your Language Server via the VS Code command
	const tokenResponse = await commands.executeCommand<SemanticTokens>(
		'vscode.provideDocumentSemanticTokens',
		editor.document.uri
	)
	
	if (!tokenResponse){
		return
	}
	
	const rangesModification: Range[] = []
	const rangesDeprecated: Range[] = []
	const bitModification = (1 << 5)
	const bitDeprecated = (1 << 3)
	let line = 0
	let char = 0
	
	// parse the Uint32Array (Standard LSP format)
	for (let i = 0; i < tokenResponse.data.length; i += 5) {
		const deltaLine = tokenResponse.data[i];
		const deltaChar = tokenResponse.data[i + 1];
		const length = tokenResponse.data[i + 2];
		const modifiers = tokenResponse.data[i + 4];
		
		line += deltaLine;
		char = deltaLine > 0 ? deltaChar : char + deltaChar;
		
		if ((modifiers & bitModification) !== 0) {
			rangesModification.push(new Range(line, char, line, char + length));
		}
		if ((modifiers & bitDeprecated) !== 0) {
			rangesDeprecated.push(new Range(line, char, line, char + length));
		}
	}
	
	// set the decorations for the editor
	editor.setDecorations(decorationModification, rangesModification)
	editor.setDecorations(decorationDeprecated, rangesDeprecated)
}

function triggerUpdateModifications(editor: TextEditor) {
	if (timeout) {
		clearTimeout(timeout)
	}
	timeout = setTimeout(() => {
		updateModifications(editor)
	}, 250) // wait 250ms after the last change
}

function activateModifications(context: ExtensionContext) {
	if (!workspace.getConfiguration("dragonscriptLanguage").get("enableSemanticHighlightingOverrides")) {
		return
	}
	
	// initial run
	const editor = window.activeTextEditor;
	if (editor) {
		// give the engine one final tick to ensure tokens are indexed
		setImmediate(() => updateModifications(editor))
	}
	
	// trigger on change
	context.subscriptions.push(
		window.onDidChangeActiveTextEditor(editor => {
			if (editor) updateModifications(editor);
		}),
		workspace.onDidChangeTextDocument(event => {
			const editor = window.activeTextEditor
			if (editor && event.document === editor.document) {
				triggerUpdateModifications(editor) // use the debounced version
			}
		})
	)
	
	// for older versions (v6.x and below)
	client.onReady().then(() => {
		const editor = window.activeTextEditor
		if (editor) {
			updateModifications(editor)
		}
	})
}

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = {
		execArgv: [
			'--nolazy',
			'--inspect=6009',
			'--max_old_space_size=8192'
		]
	};
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: {
			module: serverModule,
			transport: TransportKind.ipc
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
	
	// Options to control the language client
	let options = new ImplDSInitOptions;
	options.globalStoragePath = context.globalStorageUri.toString();
	
	const clientOptions: LanguageClientOptions = {
		// Register the server for dragonscript documents
		documentSelector: [
			{
				scheme: 'file',
				language: 'dragonscript'
			}
		],
		synchronize: {
			// Notify the server about file changes to '.ds files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/*.ds')
		},
		initializationOptions: options
	};
	
	// Create the language client and start the client.
	client = new LanguageClient(
		'dragonscriptServer',
		'DragonScript Language Server',
		serverOptions,
		clientOptions
	);
	
	// Start the client. This will also launch the server
	client.start();
	
	registerXmlSchemaAssociations();
	
	/*
	context.subscriptions.push(workspace.registerFileSystemProvider("delga", new DelgaFileProvider(), {
		isCaseSensitive: false,
		isReadonly: true
	}));
	*/
	
	activateModifications(context)
}

export function deactivate(): Thenable<void> | undefined {
	return client?.stop();
}

interface XmlSchemaAssociationEntry {
	pattern: string;
	systemId: string;
}

function registerXmlSchemaAssociations() {
	if (!workspace.getConfiguration("dragonscriptLanguage").get("requiresPackageDragengine")) {
		return;
	}
	
	let config = workspace.getConfiguration("xml");
	let associations: XmlSchemaAssociationEntry[] =
		config.inspect("fileAssociations")?.workspaceValue as XmlSchemaAssociationEntry[] ?? [];
	
	let mappings: XmlSchemaAssociationEntry[] = [
		{
			"pattern": "**/*.desconvo",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/simpleConversation.xsd"
		},
		{
			"pattern": "**/*.debt",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/behaviorTree.xsd"
		},
		{
			"pattern": "**/*.desm",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/stateMachine.xsd"
		},
		{
			"pattern": "**/*.dept",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/parameterTree.xsd"
		},
		{
			"pattern": "**/*.deeclass",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/elementClass.xsd"
		},
		{
			"pattern": "**/*.decc",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/canvasCreator.xsd"
		},
		{
			"pattern": "**/*.debor",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/border.xsd"
		},
		{
			"pattern": "**/*.dedeco",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/decoration.xsd"
		},
		{
			"pattern": "**/*.demp",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/mousePointer.xsd"
		},
		{
			"pattern": "**/*.dedes",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/designer.xsd"
		},
		{
			"pattern": "**/*.degt",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/guitheme.xsd"
		},
		{
			"pattern": "**/*.decam",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/camera.xsd"
		},
		{
			"pattern": "**/*.deskin",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/skin.xsd"
		},
		{
			"pattern": "**/*.deskinann",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/skinAnnotations.xsd"
		},
		{
			"pattern": "**/*.dest",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/styledText.xsd"
		},
		{
			"pattern": "**/*.deann",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/announcer.xsd"
		},
		{
			"pattern": "**/*.dedm",
			"systemId": "https://lordofdragons.github.io/dragengine/artifacts/xmlschema/dragengine/latest/dynamicMusic.xsd"
		}
	]
	
	let changed = false;
	
	for (const each of mappings) {
		let association = associations.find(a => a.pattern == each.pattern);
		if (!association) {
			associations.push(each);
			changed = true;
		}
	}
	
	if (changed) {
		config.update("fileAssociations", associations, ConfigurationTarget.Workspace);
	}
}
