import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { ResolveFunction } from "../resolve/function";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { BaseCodeAction } from "./base";

export class CodeActionDisambiguate extends BaseCodeAction {
	protected _sourceContext: ContextFunctionCall;
	protected _targetFunction: ResolveFunction;
	
	
	constructor(diagnostic: Diagnostic, sourceContext: ContextFunctionCall, targetFuction: ResolveFunction) {
		super(diagnostic);
		this._sourceContext = sourceContext;
		this._targetFunction = targetFuction;
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
			
			const result = this.autoCast(sourceType, targetType, arg.expressionAutoCast, arg);
			if (result) {
				changes[uri].push(...result.edits);
			}
		}
		
		if (changes[uri].length == 0) {
			return [];
		}
		
		const title = `Disambiguate ${this.targetFunction.name}${this.targetFunction.signature.resolveTextShort}`;
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		//this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
