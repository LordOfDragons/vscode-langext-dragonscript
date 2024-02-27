import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { BaseCodeAction } from "./base";

export class CodeActionRemove extends BaseCodeAction {
	protected _title: string;
	protected _context: Context;
	protected _range: Range;
	
	public addToFixAll = false;
	
	
	constructor(diagnostic: Diagnostic, title: string, range: Range, context: Context) {
		super(diagnostic);
		this._title = title;
		this._range = range;
		this._context = context;
	}
	
	
	public get range(): Range {
		return this._range;
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
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [TextEdit.del(this._range)];
		
		let actions: CodeAction[] = [];
		this.addAction(actions, this._title, CodeActionKind.QuickFix, {changes: changes}, true);
		if (this.addToFixAll) {
			this.addAction(actions, this._title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		}
		return actions;
	}
}
