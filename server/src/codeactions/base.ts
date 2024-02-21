import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit, WorkspaceEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { Helpers } from "../helpers";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";

export interface BaseCodeActionAutoCastResult {
	edits: TextEdit[];
	compareToNull: boolean;
	compareToNullNegate: boolean;
}

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
			? this.doCreateCodeActions() : [];
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
	
	protected autoCast(sourceType: ResolveType, targetType: ResolveType,
			sourceAutoCast: Context.AutoCast, sourceContext: Context): BaseCodeActionAutoCastResult | undefined {
		var compareToNullNegate: Range | undefined;
		var compareToNull = false;
		
		if (sourceContext.type == Context.ContextType.FunctionCall) {
			const cfc = sourceContext as ContextFunctionCall;
			if (cfc.functionType == ContextFunctionCall.FunctionType.not) {
				if (!cfc.object?.range || !cfc.object?.expressionType || !cfc.name.range) {
					return undefined;
				}
				sourceContext = cfc.object;
				sourceType = cfc.object.expressionType;
				sourceAutoCast = cfc.object.expressionAutoCast;
				compareToNullNegate = Range.create(cfc.name.range.start, cfc.object.range.start);
			}
		}
		
		const crange = sourceContext.range;
		if (!crange) {
			return undefined;
		}
		
		switch (ResolveSignatureArgument.typeMatches(targetType, sourceType, sourceAutoCast)) {
		case ResolveSignature.Match.Full:
			return {
				edits: [],
				compareToNull: false,
				compareToNullNegate: false
			};
			
		case ResolveSignature.Match.Partial:
			break;
		
		default:
			if (!sourceType.isPrimitive && targetType === ResolveNamespace.classBool) {
				compareToNull = true;
				
			} else {
				return undefined;
			}
		}
		
		const needsWrap = this.requiresWrap(sourceContext);
		let edits: TextEdit[] = [];
		
		var textBegin = '';
		var textEnd: string;
		
		if (needsWrap) {
			textBegin = '(';
			if (compareToNull) {
				if (compareToNullNegate) {
					textEnd = ') == null';
				} else {
					textEnd = ') != null';
				}
			} else {
				textEnd = `) cast ${targetType.name}`;
			}
		} else {
			if (compareToNull) {
				if (compareToNullNegate) {
					textEnd = ' == null';
				} else {
					textEnd = ' != null';
				}
			} else {
				textEnd = ` cast ${targetType.name}`;
			}
		}
		
		if (compareToNullNegate) {
			edits.push(TextEdit.del(compareToNullNegate));
		}
		if (textBegin.length > 0) {
			edits.push(TextEdit.insert(crange.start, textBegin));
		}
		edits.push(TextEdit.insert(crange.end, textEnd));
		
		return {
			edits: edits,
			compareToNull: compareToNull,
			compareToNullNegate: compareToNullNegate !== undefined
		};
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
	
	protected doCreateCodeActions(): CodeAction[] {
		return [];
	}
}