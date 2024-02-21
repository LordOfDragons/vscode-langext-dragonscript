import { CodeAction, CodeActionKind, Diagnostic, Range, WorkspaceEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { Helpers } from "../helpers";

export class BaseCodeAction {
	protected _diagnostic: Diagnostic;
	
	
	constructor(diagnostic: Diagnostic) {
		this._diagnostic = diagnostic;
	}
	
	
	public get diagnostic(): Diagnostic {
		return this._diagnostic;
	}
	
	
	public createCodeActions(range: Range): CodeAction[] {
		return Helpers.isRangeInsideRange(range, this._diagnostic.range)
			? this.doCreateCodeActions(range) : [];
	}
	
	
	protected requiresWrap(context: Context): boolean {
		switch (context.type) {
		case Context.ContextType.Block:
		case Context.ContextType.Constant:
		case Context.ContextType.Group:
		case Context.ContextType.Member:
			return false;
			
		case Context.ContextType.FunctionCall:
			switch ((context as ContextFunctionCall).functionType) {
			case ContextFunctionCall.FunctionType.function:
			case ContextFunctionCall.FunctionType.functionSuper:
			case ContextFunctionCall.FunctionType.increment:
			case ContextFunctionCall.FunctionType.decrement:
			case ContextFunctionCall.FunctionType.inverse:
				return false;
			}
			return true;
			
		default:
			return true;
		}
	}
	
	protected addAction(list: CodeAction[], title: string, kind: CodeActionKind,
			edit: WorkspaceEdit, preferred: boolean = false): void {
		list.push({
			title: title,
			kind: kind,
			diagnostics: [this._diagnostic],
			isPreferred: preferred,
			edit: edit
		});
	}
	
	protected doCreateCodeActions(range: Range): CodeAction[] {
		return [];
	}
}