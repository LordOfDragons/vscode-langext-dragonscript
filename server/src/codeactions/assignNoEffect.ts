import { CodeAction, CodeActionKind, Diagnostic, TextEdit } from "vscode-languageserver";
import { ContextFunction } from "../context/classFunction";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { ContextMember } from "../context/expressionMember";
import { ContextClass } from "../context/scriptClass";
import { ResolveSearch } from "../resolve/search";
import { BaseCodeAction } from "./base";

export class CodeActionAssignmentNoEffect extends BaseCodeAction {
	protected _context: ContextFunctionCall;
	
	
	constructor(diagnostic: Diagnostic, context: ContextFunctionCall) {
		super(diagnostic);
		this._context = context;
	}
	
	
	public get context(): ContextFunctionCall {
		return this._context;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		if (this._context.object.type !== Context.ContextType.Member) {
			return [];
		}
		
		const m = this._context.object as ContextMember;
		if (!m.resolveArgument || !m.range) {
			return [];
		}
		
		const uri = m.documentUri;
		if (!uri) {
			return [];
		}
		
		let matches = new ResolveSearch();
		matches.name = m.resolveArgument.simpleName;
		matches.onlyVariables = true;
		
		const topFunc = this._context.selfOrParentWithType(Context.ContextType.Function);
		if ((topFunc as ContextFunction | undefined)?.isBodyStatic) {
			matches.onlyStatic = true;
		}
		
		ContextClass.thisContext(this._context)?.search(matches);
		if (matches.variables.length == 0) {
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [TextEdit.insert(m.range.start, 'this.')];
		
		const title = 'Insert "this."';
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
