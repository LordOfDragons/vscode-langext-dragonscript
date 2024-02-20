import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit, WorkspaceEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { Helpers } from "../helpers";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { debugLogMessage } from "../server";

export class CodeActionInsertCast {
	protected _diagnostic: Diagnostic;
	protected _sourceType: ResolveType;
	protected _targetType: ResolveType;
	protected _sourceContext: Context;
	protected _sourceAutoCast: Context.AutoCast;
	public wrapAll = false;
	
	
	constructor(diagnostic: Diagnostic, sourceType: ResolveType, targetType: ResolveType,
			sourceContext: Context, sourceAutoCast: Context.AutoCast) {
		this._diagnostic = diagnostic;
		this._sourceType = sourceType;
		this._targetType = targetType;
		this._sourceContext = sourceContext;
		this._sourceAutoCast = sourceAutoCast;
	}
	
	
	public get diagnostic(): Diagnostic {
		return this._diagnostic;
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
	
	
	public createCodeActions(range: Range): CodeAction[] {
		if (!Helpers.isRangeInsideRange(range, this._diagnostic.range)) {
			return [];
		}
		
		var autoNotNull = false;
		
		switch (ResolveSignatureArgument.typeMatches(this._targetType, this._sourceType, this._sourceAutoCast)) {
		case ResolveSignature.Match.Full:
		case ResolveSignature.Match.Partial:
			break;
			
		default:
			if (!this._sourceType.isPrimitive && this._targetType === ResolveNamespace.classBool) {
				autoNotNull = true;
			} else {
				return [];
			}
		}
		
		const uri = this._sourceContext.documentUri;
		if (!uri) {
			return [];
		}
		
		const crange = this._sourceContext.range;
		if (!crange) {
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [];
		
		var needsWrap = true;
		
		switch (this._sourceContext.type) {
		case Context.ContextType.Block:
		case Context.ContextType.Constant:
		case Context.ContextType.Group:
		case Context.ContextType.Member:
			needsWrap = false;
			break;
			
		case Context.ContextType.FunctionCall:
			switch ((this._sourceContext as ContextFunctionCall).functionType) {
			case ContextFunctionCall.FunctionType.function:
			case ContextFunctionCall.FunctionType.functionSuper:
			case ContextFunctionCall.FunctionType.increment:
			case ContextFunctionCall.FunctionType.decrement:
			case ContextFunctionCall.FunctionType.inverse:
				needsWrap = false;
				break;
			}
			break;
		}
		
		var label: string;
		
		if (autoNotNull) {
			label = `Insert != null`
			
		} else {
			label = `Insert cast ${this._sourceType.name}`
		}
		
		var textBegin = '';
		var textEnd: string;
		
		if (needsWrap) {
			textBegin = '(';
			if (autoNotNull) {
				textEnd = ') != null';
				
			} else {
				textEnd = `) cast ${this._targetType.name}`;
			}
			
		} else {
			if (autoNotNull) {
				textEnd = ' != null';
				
			} else {
				textEnd = ` cast ${this._targetType.name}`;
			}
		}
		
		if (this.wrapAll) {
			textBegin = '(' + textBegin;
			textEnd = textEnd + ')';
		}
		
		if (textBegin.length > 0) {
			changes[uri].push(TextEdit.insert(crange.start, textBegin));
		}
		changes[uri].push(TextEdit.insert(crange.end, textEnd));
		
		let actions: CodeAction[] = [];
		
		actions.push({
			title: label,
			kind: CodeActionKind.QuickFix,
			diagnostics: [this._diagnostic],
			isPreferred: true,
			edit: {
				changes: changes
			}
		});
		
		actions.push({
			title: label,
			kind: CodeActionKind.SourceFixAll,
			diagnostics: [this._diagnostic],
			isPreferred: true,
			edit: {
				changes: changes
			}
		});
		
		return actions;
	}
}