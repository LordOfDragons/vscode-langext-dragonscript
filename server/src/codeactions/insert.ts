import { CodeAction, CodeActionKind, Diagnostic, Position, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { BaseCodeAction } from "./base";

export class CodeActionInsert extends BaseCodeAction {
	protected _title: string;
	protected _text: string;
	protected _position: Position;
	protected _context: Context;
	
	public addToFixAll = false;
	
	
	constructor(diagnostic: Diagnostic, title: string, text: string, position: Position, context: Context) {
		super(diagnostic);
		this._title = title;
		this._text = text;
		this._position = position;
		this._context = context;
	}
	
	
	public get text(): string {
		return this._text;
	}
	
	public get context(): Context {
		return this._context;
	}
	
	public get title(): string {
		return this._title;
	}
	
	public get position(): Position {
		return this._position;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		const uri = this._context.documentUri;
		if (!uri) {
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [TextEdit.insert(this._position, this._text)];
		
		let actions: CodeAction[] = [];
		this.addAction(actions, this._title, CodeActionKind.QuickFix, {changes: changes}, true);
		if (this.addToFixAll) {
			this.addAction(actions, this._title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		}
		return actions;
	}
}
