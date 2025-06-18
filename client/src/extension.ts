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

import * as path from 'path';
import { workspace, ExtensionContext, Uri, ConfigurationTarget } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { DelgaFileProvider } from './delgaFileProvider';

interface DSInitOptions {
	globalStoragePath: string;
}

class ImplDSInitOptions implements DSInitOptions {
	public globalStoragePath: string;
}

let client: LanguageClient;

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
