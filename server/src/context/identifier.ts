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

import { IToken } from "chevrotain"
import { Location, Position, Range } from "vscode-languageserver";
import { Helpers } from "../helpers";
import { MatchableName } from "../matchableName";
import { Context } from "./context";


export class Identifier {
	protected _token?: IToken;
	protected _name: string;
	protected _range?: Range;
	protected _matchableName?: MatchableName;
	
	
	constructor(token?: IToken, name?: string) {
		this._token = token;
		
		if(name) {
			this._name = name;
		} else if (token) {
			this._name = token.image;
		} else {
			throw Error("Token and name can not both be undefined");
		}
		
		if (token) {
			this._range = Helpers.rangeFrom(token);
		}
	}
	
	
	public get token(): IToken | undefined {
		return this._token
	}
	
	public get name(): string {
		return this._name
	}
	
	public get matchableName(): MatchableName {
		if (!this._matchableName) {
			this._matchableName = new MatchableName(this._name);
		}
		return this._matchableName;
	}
	
	public get range(): Range | undefined {
		return this._range;
	}
	
	public isPositionInside(position: Position): boolean {
		return Helpers.isPositionInsideRange(this._range, position);
	}
	
	public location(context: Context): Location | undefined {
		const range = this.range;
		if (!range) {
			return undefined;
		}
		
		const uri = context.documentUri;
		if (!uri) {
			return undefined;
		}
		
		return Location.create(uri, range);
	}
	
	
	toString() : string {
		return this._name;
	}
}
