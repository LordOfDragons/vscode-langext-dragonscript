import { IToken } from "chevrotain";
import { Range } from "vscode-languageserver";
import { Helpers } from "../../helpers";



export class DocumentationWhitespace {
	private _token: IToken;
	private _range?: Range;

	public constructor(token: IToken) {
		this._token = token;
	}

	public get token(): IToken {
		return this._token;
	}

	public get range(): Range {
		if (!this._range) {
			this._range = Helpers.rangeFrom(this._token);
		}
		return this._range;
	}
}
