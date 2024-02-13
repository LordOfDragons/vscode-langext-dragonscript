/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { IToken } from "chevrotain";
import { RemoteConsole } from "vscode-languageserver";
import { Context } from "../context";


export class ContextDocumentationWord extends Context{
	protected _token: IToken;
	
	
	constructor(token: IToken, parent: Context) {
		super(Context.ContextType.DocumentationWord, parent);
		this._token = token;
	}
	
	
	public get token(): IToken {
		return this._token;
	}
	
	public get text(): string {
		return this._token.image;
	}
	
	
	log(console: RemoteConsole, prefix: string = "", _prefixLines: string = "") {
		console.log(`${prefix}Word: ${this._token.image}`);
	}
}
