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

import { TextDocument } from "vscode-languageserver-textdocument";
import { Context } from "./context";
import { CompletionItem, Position, Range, RemoteConsole } from "vscode-languageserver";
import { CompletionHelper } from "../completionHelper";


export class ContextExpression extends Context{
	constructor(parent: Context) {
		super(Context.ContextType.Expression, parent);
	}
	
	
	public completion(_document: TextDocument, position: Position): CompletionItem[] {
		return CompletionHelper.createExpression(Range.create(position, position), this);
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", _prefixLines: string = ""): void {
		console.log(`${prefix}Expression`);
	}
}
