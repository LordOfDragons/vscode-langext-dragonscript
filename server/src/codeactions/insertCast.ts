import { CodeAction, CodeActionKind, Diagnostic, Range, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { BaseCodeAction } from "./base";

export class CodeActionInsertCast extends BaseCodeAction {
	protected _sourceType: ResolveType;
	protected _targetType: ResolveType;
	protected _sourceContext: Context;
	protected _sourceAutoCast: Context.AutoCast;
	public wrapAll = false;
	public negate?: Range;
	
	
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
	
	
	protected doCreateCodeActions(range: Range): CodeAction[] {
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
		
		const needsWrap = this.requiresWrap(this._sourceContext);
		var title: string;
		
		if (autoNotNull) {
			if (this.negate) {
				title = `Insert == null`
			} else {
				title = `Insert != null`
			}
		} else {
			title = `Insert cast ${this._sourceType.name}`
		}
		
		var textBegin = '';
		var textEnd: string;
		
		if (needsWrap) {
			textBegin = '(';
			if (autoNotNull) {
				if (this.negate) {
					textEnd = ') == null';
				} else {
					textEnd = ') != null';
				}
			} else {
				textEnd = `) cast ${this._targetType.name}`;
			}
		} else {
			if (autoNotNull) {
				if (this.negate) {
					textEnd = ' == null';
				} else {
					textEnd = ' != null';
				}
			} else {
				textEnd = ` cast ${this._targetType.name}`;
			}
		}
		
		if (this.wrapAll) {
			textBegin = '(' + textBegin;
			textEnd = textEnd + ')';
		}
		
		if (this.negate) {
			changes[uri].push(TextEdit.del(this.negate));
		}
		if (textBegin.length > 0) {
			changes[uri].push(TextEdit.insert(crange.start, textBegin));
		}
		changes[uri].push(TextEdit.insert(crange.end, textEnd));
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
