import { CodeAction, CodeActionKind, Diagnostic, Position, Range, TextEdit } from "vscode-languageserver";
import { CompletionHelper } from "../completionHelper";
import { Context } from "../context/context";
import { ContextClass } from "../context/scriptClass";
import { RefactoringHelper } from "../refactoringHelper";
import { ResolveFunction } from "../resolve/function";
import { BaseCodeAction } from "./base";

export class CodeActionImplementAbstractFunctions extends BaseCodeAction {
	protected _contextClass: ContextClass;
	protected _functions: ResolveFunction[];
	protected _text: string;
	
	
	constructor(diagnostic: Diagnostic, contextClass: ContextClass, functions: ResolveFunction[]) {
		super(diagnostic);
		this._contextClass = contextClass;
		this._functions = functions;
		this._text = 'Implement abstract functions';
	}
	
	
	public get text(): string {
		return this._text;
	}
	
	
	protected doCreateCodeActions(): CodeAction[] {
		const uri = this._contextClass.documentUri;
		if (!uri) {
			return [];
		}
		
		var position: Position | undefined;
		
		const lastDecl = this._contextClass.declarations.at(this._contextClass.declarations.length - 1);
		if (lastDecl) {
			position = lastDecl.range?.end;
		}
		
		if (!position) {
			return [];
		}
		
		const visibleTypes = new Set(CompletionHelper.searchExpressionType(this._contextClass).types);
		const initialRange = Range.create(position, position);
		const edits: TextEdit[] = [];
		const pins: TextEdit[] = [];
		
		for (const f of this._functions) {
			const ci = f.createCompletionOverride(initialRange, '', visibleTypes, this._contextClass);
			if (!ci?.textEdit) {
				continue;
			}
			
			const edit = ci?.textEdit as TextEdit;
			edit.newText = edit.newText.replace(/\$\{[0-9]+:?([^}]*)\}/i, '$1');
			edits.push(edit);
			
			if (ci?.additionalTextEdits) {
				pins.push(...ci.additionalTextEdits);
			}
		}
		
		if (!edits) {
			return [];
		}
		
		if (pins.length > 0) {
			const pinPosition = RefactoringHelper.insertPinPosition(this._contextClass);
			const pinText = pins.map(p => p.newText).join('\n');
			pins.splice(0);
			pins.push(TextEdit.insert(pinPosition, pinText));
		}
		
		const editText = edits.map(p => p.newText).join('\n');
		edits.splice(0);
		edits.push(TextEdit.insert(position, '\n' + editText));
		
		if (pins.length > 0) {
			edits.push(...pins);
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = edits;
		
		let actions: CodeAction[] = [];
		this.addAction(actions, this._text, CodeActionKind.QuickFix, {changes: changes}, true);
		return actions;
	}
}
