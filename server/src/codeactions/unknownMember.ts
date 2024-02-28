import { CodeAction, CodeActionKind, Diagnostic, TextEdit } from "vscode-languageserver";
import { ContextFunction } from "../context/classFunction";
import { Context } from "../context/context";
import { Identifier } from "../context/identifier";
import { ContextClass } from "../context/scriptClass";
import { ResolveFunction } from "../resolve/function";
import { Resolved } from "../resolve/resolved";
import { ResolveSearch } from "../resolve/search";
import { ResolveType } from "../resolve/type";
import { BaseCodeAction } from "./base";
import { CodeActionMatchHelper } from "./matchHelper";

export class CodeActionUnknownMember extends BaseCodeAction {
	protected _context: Context;
	protected _name: Identifier;
	
	public includeVariables = false;
	public includeFunctions = false;
	public includeTypes = false;
	public searchTypes: Set<ResolveType> | undefined;
	public objectType: ResolveType | undefined;
	public objectTypeType: Context.ExpressionType = Context.ExpressionType.Object;
	
	
	constructor(diagnostic: Diagnostic, context: Context, name: Identifier) {
		super(diagnostic);
		this._context = context;
		this._name = name;
	}
	
	
	public get context(): Context {
		return this._context;
	}
	
	public get name(): Identifier {
		return this._name;
	}
	
	protected doCreateCodeActions(): CodeAction[] {
		if (!this._name.range) {
			return [];
		}
		
		const uri = this._context.documentUri;
		if (!uri) {
			return [];
		}
		
		let matches = new ResolveSearch();
		matches.ignoreShadowedFunctions = true;
		matches.allMatchingTypes = true;
		if (this.objectType) {
			matches.ignoreNamespaceParents = true;
			
			switch (this.objectTypeType) {
			case Context.ExpressionType.Object:
				matches.ignoreStatic = true;
				break;
				
			case Context.ExpressionType.Type:
				matches.onlyStatic = true;
				break;
			}
		}
		if (this.searchTypes) {
			for (const each of this.searchTypes) {
				matches.types.add(each);
			}
			matches.ignoreTypes = true;
		}
		
		(this.objectType ?? ContextClass.thisContext(this._context)?.resolveClass)?.search(matches);
		
		if (this.objectType) {
			matches.removeType(this.objectType);
		}
		
		if (matches.matchCount == 0) {
			return [];
		}
		
		let matcher = new CodeActionMatchHelper(this._name.name);
		if (this.includeVariables) {
			matcher.processVariables(matches);
		}
		if (this.includeFunctions) {
			matcher.processFunctions(matches);
		}
		
		if (this.includeTypes) {
			if (!matcher.bestMatch) {
				matcher.processTypes(matches);
			}
			
			if (!matcher.bestMatch) {
				matcher.processNamespaces(matches);
			}
		}
		
		if (!matcher.bestMatch) {
			return [];
		}
		
		var title: string, text: string;
		
		switch (matcher.bestMatch.type) {
		case Resolved.Type.Variable:
			title = `Use ${matcher.bestMatch.name}`;
			text = matcher.bestMatch.name;
			break;
			
		case Resolved.Type.Function:{
			const rf = matcher.bestMatch as ResolveFunction;
			if (!rf.context) {
				return [];
			}
			
			var isOperator = false;
			
			if (rf.context.type == Context.ContextType.Function) {
				const cf = rf.context as ContextFunction;
				isOperator = cf.functionType == ContextFunction.Type.Operator;
			}
			
			if (isOperator) {
				const arg = rf.signature.arguments.at(0)?.type;
				const argText = arg?.initialValue ?? 'null';
				const argType = arg?.name ?? 'Object';
				title = `Use ${rf.name} ${argType}`;
				text = `${rf.name} ${argText}`;
				
			} else {
				const sigText = rf.signature.arguments.map(a => a.type?.initialValue ?? 'null').join(', ');
				const sigType = rf.signature.arguments.map(a => a.type?.name ?? 'Object').join(', ');
				title = `Use ${rf.name}(${sigType})`;
				text = `${rf.name}(${sigText})`;
			}
			}break;
			
		case Resolved.Type.Class:
		case Resolved.Type.Interface:
		case Resolved.Type.Enumeration:
		case Resolved.Type.Namespace:
			title = `Use ${matcher.bestMatch.name}`;
			text = matcher.bestMatch.name;
			break;
			
		default:
			return [];
		}
		
		const changes: {[uri: string]: TextEdit[]} = {};
		changes[uri] = [TextEdit.replace(this._name.range, text)];
		
		let actions: CodeAction[] = [];
		this.addAction(actions, title, CodeActionKind.QuickFix, {changes: changes}, true);
		//this.addAction(actions, title, CodeActionKind.SourceFixAll, {changes: changes}, true);
		return actions;
	}
}
