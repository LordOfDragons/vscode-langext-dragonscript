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

import { ClientCapabilities } from "vscode-languageserver";

export class DSCapabilities {
	protected _hasConfiguration = false;
	protected _hasWorkspaceFolder = false;
	protected _hasDiagnosticRelatedInformation = false;


	constructor() {
	}


	public init(clientCapabilities: ClientCapabilities): void {
		// Does the client support the `workspace/configuration` request?
		// If not, we fall back using global settings.
		this._hasConfiguration = !!(
			clientCapabilities.workspace
			&& !!clientCapabilities.workspace.configuration
		);

		this._hasWorkspaceFolder = !!(
			clientCapabilities.workspace
			&& !!clientCapabilities.workspace.workspaceFolders
		);

		this._hasDiagnosticRelatedInformation = !!(
			clientCapabilities.textDocument
			&& clientCapabilities.textDocument.publishDiagnostics
			&& clientCapabilities.textDocument.publishDiagnostics.relatedInformation
		);
	}


	public get hasConfiguration(): boolean {
		return this._hasConfiguration;
	}

	public get hasWorkspaceFolder(): boolean {
		return this._hasWorkspaceFolder;
	}

	public get hasDiagnosticRelatedInformation(): boolean {
		return this._hasDiagnosticRelatedInformation;
	}
}
