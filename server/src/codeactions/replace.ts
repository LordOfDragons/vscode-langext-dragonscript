import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { BaseCodeAction } from "./base";
import { CodeActionHelpers } from "./helpers";

export class CodeActionReplace extends BaseCodeAction {
	protected _title: string;
	protected _text: string;
	protected _context: Context;
	protected _range: Range;
	
	public addToFixAll = false;
	public extendBegin = false;
	public extendBeginChars: string[] = ['\n', '\r', ' ', '\t', ':']
	public extendEnd = false;
	public extendEndChars: string[] = ['\n', '\r', ' ', '\t', ':']
	
	
	constructor(diagnostic: Diagnostic, title: string, text: string, range: Range, context: Context) {
		super(diagnostic);
		this._title = title;
		this._text = text;
		this._range = range;
		this._context = context;
	}
	
	
	public get text(): string {
		return this._text;
	}
	
	public get range(): Range {
		return this._range;
	}
	
	public set range(value: Range) {
		this._range = value;
	}
	
	public get context(): Context {
		return this._context;
	}
	
	public get title(): string {
		return this._title;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		const uri = this._context.documentUri;
		if (!uri) {
			return [];
		}
		
		var range = this._range;
		if (this.extendBegin) {
			range = CodeActionHelpers.extendBeginSpaces(uri, range, this.extendBeginChars) ?? range;
		}
		if (this.extendEnd) {
			range = CodeActionHelpers.extendEndSpaces(uri, range, this.extendEndChars) ?? range;
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [TextEdit.replace(range, this._text)];
		
		let actions: CodeAction[] = [];
		this.addAction(actions, this._title, CodeActionKind.QuickFix, {changes: changes}, true);
		if (this.addToFixAll) {
			this.addAction(actions, this._title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		}
		return actions;
	}
}
