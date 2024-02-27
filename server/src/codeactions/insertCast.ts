import { CodeAction, CodeActionKind, Diagnostic, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ResolveType } from "../resolve/type";
import { BaseCodeAction } from "./base";
import { CodeActionHelpers } from "./helpers";

export class CodeActionInsertCast extends BaseCodeAction {
	protected _sourceType: ResolveType;
	protected _targetType: ResolveType;
	protected _sourceContext: Context;
	protected _sourceAutoCast: Context.AutoCast;
	
	
	constructor(diagnostic: Diagnostic, sourceType: ResolveType, targetType: ResolveType,
			sourceContext: Context, sourceAutoCast: Context.AutoCast) {
		super(diagnostic);
		this._sourceType = sourceType;
		this._targetType = targetType;
		this._sourceContext = sourceContext;
		this._sourceAutoCast = sourceAutoCast;
	}
	
	
	public get sourceType(): ResolveType {
		return this._sourceType;
	}
	
	public get targetType(): ResolveType {
		return this._targetType;
	}
	
	public get sourceContext(): Context {
		return this._sourceContext;
	}
	
	public get sourceAutoCast(): Context.AutoCast {
		return this._sourceAutoCast;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		const uri = this._sourceContext.documentUri;
		if (!uri) {
			return [];
		}
		
		const result = CodeActionHelpers.autoCast(this.sourceType, this.targetType, this.sourceAutoCast, this.sourceContext);
		if (!result || result.edits.length == 0) {
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = result.edits;
		
		var title: string;
		
		if (result.compareToNull) {
			if (result.compareToNullNegate) {
				title = `Insert == null`
				
			} else {
				title = `Insert != null`
			}
			
		} else {
			title = `Insert cast ${this._targetType.name}`
		}
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
