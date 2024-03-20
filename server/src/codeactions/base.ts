import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit, WorkspaceEdit } from "vscode-languageserver";
import { Helpers } from "../helpers";

export interface BaseCodeActionAutoCastResult {
	edits: TextEdit[];
	compareToNull: boolean;
	compareToNullNegate: boolean;
}

export class BaseCodeAction {
	protected _diagnostic: Diagnostic;
	
	public resolver?: string;
	
	
	constructor(diagnostic: Diagnostic) {
		this._diagnostic = diagnostic;
	}
	
	
	public get diagnostic(): Diagnostic {
		return this._diagnostic;
	}
	
	
	public createCodeActions(range: Range): CodeAction[] {
		return Helpers.isRangeInsideRange(range, this._diagnostic.range)
			? this.doCreateCodeActions() : [];
	}
	
	
	protected addAction(list: CodeAction[], title: string, kind: CodeActionKind,
			edit: WorkspaceEdit, preferred: boolean = false,
			resolver: string | undefined = undefined): void {
		list.push({
			title: title,
			kind: kind,
			diagnostics: [this._diagnostic],
			isPreferred: preferred,
			edit: edit,
			data: resolver ?? this.resolver
		});
	}
	
	protected doCreateCodeActions(): CodeAction[] {
		return [];
	}
}