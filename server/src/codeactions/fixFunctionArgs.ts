import { CodeAction, CodeActionKind, Diagnostic, TextEdit } from "vscode-languageserver";
import { ContextFunctionCall } from "../context/expressionCall";
import { ResolveFunction } from "../resolve/function";
import { BaseCodeAction } from "./base";
import { CodeActionHelpers } from "./helpers";

export class CodeActionDisambiguate extends BaseCodeAction {
	protected _sourceContext: ContextFunctionCall;
	protected _targetFunction: ResolveFunction;
	protected _title: string;
	
	
	constructor(diagnostic: Diagnostic, sourceContext: ContextFunctionCall,
			targetFuction: ResolveFunction, title: string) {
		super(diagnostic);
		this._sourceContext = sourceContext;
		this._targetFunction = targetFuction;
		this._title = title;
	}
	
	
	public get sourceContext(): ContextFunctionCall {
		return this._sourceContext;
	}
	
	public get targetFunction(): ResolveFunction {
		return this._targetFunction;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		const uri = this._sourceContext.documentUri;
		if (!uri) {
			return [];
		}
		
		const argLen = this._sourceContext.arguments.length;
		const targetArgs = this._targetFunction.signature.arguments;
		if (argLen != targetArgs.length) {
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [];
		
		for (var i=0; i<argLen; i++) {
			const arg = this._sourceContext.arguments[i];
			const sourceType = arg.expressionType;
			if (!sourceType) {
				return [];
			}
			
			const targetArg = targetArgs[i];
			const targetType = targetArg.type;
			if (!targetType) {
				return [];
			}
			
			const result = CodeActionHelpers.autoCast(sourceType, targetType, arg.expressionAutoCast, arg);
			if (!result) {
				return [];
			}
			
			changes[uri].push(...result.edits);
		}
		
		if (changes[uri].length == 0) {
			return [];
		}
		
		const title = `${this._title} ${this.targetFunction.name}${this.targetFunction.signature.resolveTextShort}`;
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		//this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
