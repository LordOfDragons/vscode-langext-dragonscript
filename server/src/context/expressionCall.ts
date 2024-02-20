/**
 * MIT License
 *
 * Copyright (c) 2022 DragonDreams (info@dragondreams.ch)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Context } from "./context";
import { CodeAction, CompletionItem, Definition, Diagnostic, DiagnosticRelatedInformation, DocumentSymbol, Hover, integer, Location, Position, Range, RemoteConsole, SignatureHelp, SignatureInformation } from "vscode-languageserver";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { ExpressionAdditionCstNode } from "../nodeclasses/expressionAddition";
import { ExpressionBitOperationCstNode } from "../nodeclasses/expressionBitOperation";
import { ExpressionCompareCstNode } from "../nodeclasses/expressionCompare";
import { ExpressionLogicCstNode } from "../nodeclasses/expressionLogic";
import { ExpressionMultiplyCstNode } from "../nodeclasses/expressionMultiply";
import { ExpressionPostfixCstNode } from "../nodeclasses/expressionPostfix";
import { ExpressionUnaryCstNode } from "../nodeclasses/expressionUnary";
import { ExpressionMemberCstNode, ExpressionObjectCstNode } from "../nodeclasses/expressionObject";
import { ExpressionAssignCstNode } from "../nodeclasses/expressionAssign";
import { ExpressionSpecialCstNode } from "../nodeclasses/expressionSpecial";
import { TypeName } from "./typename";
import { ResolveState } from "../resolve/state";
import { HoverInfo } from "../hoverinfo";
import { FunctionCallCstNode } from "../nodeclasses/declareFunction";
import { IToken } from "chevrotain";
import { Helpers } from "../helpers";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveType } from "../resolve/type";
import { ResolveSearch } from "../resolve/search";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveFunction } from "../resolve/function";
import { ContextMember } from "./expressionMember";
import { ContextClass } from "./scriptClass";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { CodeActionInsertCast } from "../codeactions/insertCast";
import { debugLogContext, debugLogMessage } from "../server";


export class ContextFunctionCall extends Context{
	protected _node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
		| ExpressionCompareCstNode | ExpressionLogicCstNode
		| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
		| ExpressionUnaryCstNode | ExpressionObjectCstNode
		| ExpressionAssignCstNode | ExpressionSpecialCstNode
		| ExpressionMemberCstNode | FunctionCallCstNode;
	protected _moreIndex: integer;
	protected _object?: Context;
	protected _operator: boolean;
	protected _name?: Identifier;
	protected _arguments: Context[];
	protected _castType?: TypeName;
	protected _functionType: ContextFunctionCall.FunctionType = ContextFunctionCall.FunctionType.function;
	protected _argCommaPos: Position[];
	
	private _matches: ResolveSearch | undefined;
	private _matchFunction?: ResolveFunction;
	protected _resolveUsage?: ResolveUsage;
	protected _resolveSignature?: ResolveSignature;
	
	protected _codeActionInsertCast?: CodeActionInsertCast;
	
	
	protected constructor(node: ExpressionAdditionCstNode | ExpressionBitOperationCstNode
			| ExpressionCompareCstNode | ExpressionLogicCstNode
			| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
			| ExpressionUnaryCstNode | ExpressionObjectCstNode
			| ExpressionAssignCstNode | ExpressionSpecialCstNode
			| ExpressionMemberCstNode | FunctionCallCstNode,
			moreIndex: integer, parent: Context) {
		super(Context.ContextType.FunctionCall, parent);
		this._node = node;
		this._moreIndex = moreIndex;
		this._operator = false;
		this._arguments = [];
		this._argCommaPos = [];
	}

	public static newAddition(node: ExpressionAdditionCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionMultiply(node.children.left[0], cfc);
	
			let oper = each.children.operator[0].children;
			if (oper.add) {
				cfc._name = new Identifier(oper.add[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.add;
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.subtract;
			}
			cfc._operator = true;
			
			cfc._arguments.push(ContextBuilder.createExpressionMultiply(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newBitOperation(node: ExpressionBitOperationCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionAddition(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.shiftLeft) {
				cfc._name = new Identifier(oper.shiftLeft[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.shiftLeft;
			} else if(oper.shiftRight) {
				cfc._name = new Identifier(oper.shiftRight[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.shiftRight;
			} else if(oper.and) {
				cfc._name = new Identifier(oper.and[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.and;
			} else if(oper.or) {
				cfc._name = new Identifier(oper.or[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.or;
			} else if(oper.xor) {
				cfc._name = new Identifier(oper.xor[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.xor;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionAddition(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newCompare(node: ExpressionCompareCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionBitOperation(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.less) {
				cfc._name = new Identifier(oper.less[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.less;
			} else if(oper.greater) {
				cfc._name = new Identifier(oper.greater[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.greater;
			} else if(oper.lessEqual) {
				cfc._name = new Identifier(oper.lessEqual[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.lessEqual;
			} else if(oper.greaterEqual) {
				cfc._name = new Identifier(oper.greaterEqual[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.greaterEqual;
			} else if(oper.equals) {
				cfc._name = new Identifier(oper.equals[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.equals;
			} else if(oper.notEquals) {
				cfc._name = new Identifier(oper.notEquals[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.notEquals;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionBitOperation(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newLogic(node: ExpressionLogicCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionCompare(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.logicalAnd) {
				cfc._name = new Identifier(oper.logicalAnd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.logicalAnd;
			} else if(oper.logicalOr) {
				cfc._name = new Identifier(oper.logicalOr[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.logicalOr;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionCompare(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newMultiply(node: ExpressionMultiplyCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionPostfix(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.multiply) {
				cfc._name = new Identifier(oper.multiply[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.multiply;
			} else if(oper.divide) {
				cfc._name = new Identifier(oper.divide[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.divide;
			} else if(oper.modulus) {
				cfc._name = new Identifier(oper.modulus[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.modulus;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionPostfix(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newPostfix(node: ExpressionPostfixCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.operator!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionUnary(node.children.left[0], cfc);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.increment;
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.decrement;
			}
			cfc._operator = true;
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newUnary(node: ExpressionUnaryCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.operator!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionSpecial(node.children.right[0], cfc);

			let oper = each.children;
			if (oper.increment) {
				cfc._name = new Identifier(oper.increment[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.increment;
			} else if(oper.decrement) {
				cfc._name = new Identifier(oper.decrement[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.decrement;
			} else if(oper.subtract) {
				cfc._name = new Identifier(oper.subtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.subtract;
			} else if(oper.inverse) {
				cfc._name = new Identifier(oper.inverse[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.inverse;
			} else if(oper.not) {
				cfc._name = new Identifier(oper.not[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.not;
			}
			cfc._operator = true;
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newFunctionCall(node: ExpressionObjectCstNode,
			memberIndex: integer, object: Context | undefined, parent: Context): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, memberIndex, parent);
		
		if (object) {
			object.parent = cfc;
		}
		cfc._object = object ? object : ContextBuilder.createExpressionBaseObject(node.children.object[0], cfc);
		
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.function;
		
		var endPosition: Position | undefined;
		
		if (node.children.member) {
			let member = node.children.member[memberIndex].children;
			cfc._name = new Identifier(member.name[0]);
			
			if (member.functionCall) {
				const fc = member.functionCall[0].children;
				if (fc.argument) {
					for (const each of fc.argument) {
						const ac = ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc);
						cfc._arguments.push(ac);
						if (ac.range) {
							endPosition = ac.range.end;
						}
					}
				}
				if (fc.rightParanthesis) {
					endPosition = Helpers.positionFrom(fc.rightParanthesis[0], false);
				}
				cfc.findArgCommaPos(member.functionCall[0]);
			}
		}
		
		cfc.updateRange(endPosition);
		return cfc;
	}

	public static newFunctionCallDirect(node: ExpressionMemberCstNode, parent: Context): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, -1, parent);
		
		cfc._name = new Identifier(node.children.name[0]);
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.function;
		
		var endPosition: Position | undefined;
			
		if (node.children.functionCall) {
			const fc = node.children.functionCall[0].children;
			const args = fc.argument;
			if (args) {
				for (const each of args) {
					const ac = ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc);
					cfc._arguments.push(ac);
					if (ac.range) {
						endPosition = ac.range.end;
					}
				}
			}
			if (fc.rightParanthesis) {
				endPosition = Helpers.positionFrom(fc.rightParanthesis[0], false);
			}
			cfc.findArgCommaPos(node.children.functionCall[0]);
		}
		
		cfc.updateRange(endPosition);
		return cfc;
	}

	public static newAssign(node: ExpressionAssignCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionInlineIfElse(node.children.left[0], cfc);
			
			let oper = each.children.operator[0].children;
			if (oper.assign) {
				cfc._name = new Identifier(oper.assign[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assign;
			} else if(oper.assignMultiply) {
				cfc._name = new Identifier(oper.assignMultiply[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignMultiply;
			} else if(oper.assignDivide) {
				cfc._name = new Identifier(oper.assignDivide[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignDivide;
			} else if(oper.assignModulus) {
				cfc._name = new Identifier(oper.assignModulus[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignModulus;
			} else if(oper.assignAdd) {
				cfc._name = new Identifier(oper.assignAdd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignAdd;
			} else if(oper.assignSubtract) {
				cfc._name = new Identifier(oper.assignSubtract[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignSubtract;
			} else if(oper.assignShiftLeft) {
				cfc._name = new Identifier(oper.assignShiftLeft[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignShiftLeft;
			} else if(oper.assignShiftRight) {
				cfc._name = new Identifier(oper.assignShiftRight[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignShiftRight;
			} else if(oper.assignAnd) {
				cfc._name = new Identifier(oper.assignAnd[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignAnd;
			} else if(oper.assignOr) {
				cfc._name = new Identifier(oper.assignOr[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignOr;
			} else if(oper.assignXor) {
				cfc._name = new Identifier(oper.assignXor[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.assignXor;
			}
			cfc._operator = true;

			cfc._arguments.push(ContextBuilder.createExpressionInlineIfElse(each.children.right[0], cfc));
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newSpecial(node: ExpressionSpecialCstNode, parent: Context): ContextFunctionCall {
		let last: ContextFunctionCall | undefined;
		let moreIndex: integer = 0;
		for (const each of node.children.more!) {
			let cfc = new ContextFunctionCall(node, moreIndex++, parent);
			cfc._object = last ? last : ContextBuilder.createExpressionObject(node.children.left[0], cfc);

			let oper = each.children.operator[0].children;
			if (oper.cast) {
				cfc._name = new Identifier(oper.cast[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.cast;
			} else if(oper.castable) {
				cfc._name = new Identifier(oper.castable[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.castable;
			} else if(oper.typeof) {
				cfc._name = new Identifier(oper.typeof[0]);
				cfc._functionType = ContextFunctionCall.FunctionType.typeof;
			}
			cfc._operator = true;

			cfc._castType = new TypeName(each.children.type[0]);
			cfc.updateRange();
			last = cfc;
		}
		return last!;
	}

	public static newSuperCall(node: FunctionCallCstNode, parent: Context, name: IToken): ContextFunctionCall {
		let cfc = new ContextFunctionCall(node, 0, parent);
		
		cfc._name = new Identifier(name);
		cfc._operator = false;
		cfc._functionType = ContextFunctionCall.FunctionType.functionSuper;
		
		var endPosition: Position | undefined;
		
		const args = node.children.argument;
		if (args) {
			for (const each of args) {
				const ac = ContextBuilder.createExpressionAssign(each.children.expressionAssign[0], cfc);
				cfc._arguments.push(ac);
				if (ac.range) {
					endPosition = ac.range.end;
				}
				cfc.findArgCommaPos(node);
			}
		}
		
		if (node.children.rightParanthesis) {
			endPosition = Helpers.positionFrom(node.children.rightParanthesis[0], false);
		}
		
		cfc.updateRange(endPosition);
		return cfc;
	}

	public dispose(): void {
		super.dispose();
		this._object?.dispose();
		for (const each of this._arguments) {
			each.dispose();
		}
		this._castType?.dispose();

		this._matches = undefined;
		this._matchFunction = undefined;
		this._resolveUsage?.dispose();
		this._resolveUsage = undefined;
		this._codeActionInsertCast = undefined;
	}


	public get node(): ExpressionAdditionCstNode | ExpressionBitOperationCstNode
	| ExpressionCompareCstNode | ExpressionLogicCstNode
	| ExpressionMultiplyCstNode | ExpressionPostfixCstNode
	| ExpressionUnaryCstNode | ExpressionObjectCstNode
	| ExpressionAssignCstNode | ExpressionSpecialCstNode
	| ExpressionMemberCstNode | FunctionCallCstNode {
		return this._node;
	}

	public get moreIndex(): integer {
		return this._moreIndex;
	}

	public get object(): Context {
		return this._object!;
	}
	
	public get name(): Identifier {
		return this._name!;
	}

	public get operator(): boolean {
		return this._operator;
	}

	public get arguments(): Context[] {
		return this._arguments;
	}

	public get functionType(): ContextFunctionCall.FunctionType {
		return this._functionType;
	}
	
	public get resolveUsage(): ResolveUsage | undefined {
		return this._resolveUsage;
	}


	public resolveMembers(state: ResolveState): void {
		this._object?.resolveMembers(state);
		for (const each of this._arguments) {
			each.resolveMembers(state);
		}
		this._castType?.resolveType(state, this);
	}
	
	public resolveStatements(state: ResolveState): void {
		this._object?.resolveStatements(state);
		for (const each of this._arguments) {
			each.resolveStatements(state);
		}

		// resolve expression type
		if (!this._name) {
			return;
		}

		let objtype: ResolveType | undefined;
		
		if (this._object) {
			objtype = this._object.expressionType
			if (!objtype) {
				// if base object has a problem an error has been already reported so do nothing here
				return;
			}
		}
		
		this._matchFunction = undefined;
		this._matches = new ResolveSearch();
		if (this._functionType === ContextFunctionCall.FunctionType.functionSuper) {
			this._matches.name = 'new';
		} else {
			this._matches.name = this._name.name;
		}
		this._matches.ignoreVariables = true;
		
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.function:
				this._matches.searchSuperClasses = this._name.name != 'new';
				break;
				
			case ContextFunctionCall.FunctionType.functionSuper:
				this._matches.searchSuperClasses = false;
				break;
		}
		
		this._resolveSignature = new ResolveSignature();
		for (const each of this._arguments) {
			this._resolveSignature.addArgument(each.expressionType, undefined, each.expressionAutoCast);
		}
		this._matches.signature = this._resolveSignature;
		
		if (this._matches.name) {
			if (objtype) {
				objtype.search(this._matches);
			} else if (this._functionType === ContextFunctionCall.FunctionType.functionSuper) {
				if (this._name.name == 'this') {
					state.topScopeClass?.resolveClass?.search(this._matches);
				} else {
					(state.topScopeClass?.resolveClass?.context?.extends?.resolve?.resolved as ResolveType)?.search(this._matches);
				}
			} else {
				state.search(this._matches, this);
			}
		}
		
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.assign:
				if (this._object) {
					this.expressionType = this._object.expressionType;
				} else {
					this.expressionType = state.topScopeClass?.resolveClass;
				}
				this.expressionTypeType = Context.ExpressionType.Object;
				break;
		
			case ContextFunctionCall.FunctionType.equals:
			case ContextFunctionCall.FunctionType.notEquals:
			case ContextFunctionCall.FunctionType.logicalAnd:
			case ContextFunctionCall.FunctionType.logicalOr:
			case ContextFunctionCall.FunctionType.not:
			case ContextFunctionCall.FunctionType.castable:
			case ContextFunctionCall.FunctionType.typeof:
				this.expressionType = ResolveNamespace.classBool;
				this.expressionTypeType = Context.ExpressionType.Object;
				break;

			case ContextFunctionCall.FunctionType.cast:
				this.expressionType = this._castType?.resolve?.resolved as ResolveType;
				this.expressionTypeType = Context.ExpressionType.Object;
				break;
				
			default:
				if (this._matches.functionsFull.length > 0) {
					if (this._matches.functionsFull.length == 1) {
						this._matchFunction = this._matches.functionsFull[0];
					}
				} else if (this._matches.functionsPartial.length > 0) {
					if (this._matches.functionsPartial.length == 1) {
						this._matchFunction = this._matches.functionsPartial[0];
					}
				} else if (this._matches.functionsWildcard.length > 0) {
					if (this._matches.functionsWildcard.length == 1) {
						this._matchFunction = this._matches.functionsWildcard[0];
					}
				}
				this.expressionType = this._matchFunction?.returnType;
				this.expressionTypeType = this.expressionType !== ResolveNamespace.classVoid
					? Context.ExpressionType.Object : Context.ExpressionType.Void;
				break;
		}
		
		if (this._matchFunction) {
			this._resolveUsage = new ResolveUsage(this._matchFunction, this);
			this._resolveUsage.range = this._name.range;
		}
		
		// report problems
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.cast:
			case ContextFunctionCall.FunctionType.castable:
			case ContextFunctionCall.FunctionType.typeof:
				// TODO check if argument is a class not an object
				break;
				
			case ContextFunctionCall.FunctionType.assign:
			case ContextFunctionCall.FunctionType.equals:
			case ContextFunctionCall.FunctionType.notEquals:{
				const o1 = this._arguments.at(0);
				const o2 = this._object;
				if (o1 && o2 && ResolveSignatureArgument.exprMatches(o1, o2) === ResolveSignature.Match.No) {
					const at1 = o1.expressionType;
					const at2 = o2.expressionType;
					let ri: DiagnosticRelatedInformation[] = [];
					at2?.addReportInfo(ri, `Source Type: ${at1?.reportInfoText}`);
					at1?.addReportInfo(ri, `Target Type: ${at2?.reportInfoText}`);
					const di = state.reportError(this._name.range, `Invalid cast from ${at1?.name} to ${at2?.name}`, ri);
					if (di && at1 && at2) {
						this._codeActionInsertCast = new CodeActionInsertCast(di, at1, at2, o1, o1.expressionAutoCast);
					}
				}
				}break;
				
			case ContextFunctionCall.FunctionType.logicalAnd:
			case ContextFunctionCall.FunctionType.logicalOr:{
				// WRONG! with "and"/"or" both the left and right side have to be castable to "bool"
				const o1 = this._object;
				if (o1) {
					const at1 = o1.expressionType;
					if (at1 && ResolveSignatureArgument.typeMatches(at1, this.expressionType, o1.expressionAutoCast) === ResolveSignature.Match.No) {
						let ri: DiagnosticRelatedInformation[] = [];
						this.expressionType?.addReportInfo(ri, `Source Type: ${this.expressionType?.reportInfoText}`);
						at1?.addReportInfo(ri, `Target Type: ${at1?.reportInfoText}`);
						const di = state.reportError(this._name.range, `Invalid cast from ${this.expressionType?.name} to ${at1?.name}`, ri);
						if (di && this.expressionType && at1) {
							this._codeActionInsertCast = new CodeActionInsertCast(di, this.expressionType, at1, this, this.expressionAutoCast);
						}
					}
				}
				}break;
				
			case ContextFunctionCall.FunctionType.not:{
				//        with "not" only the left side has to be castable to "bool"
				const o1 = this._object;
				if (o1) {
					const at1 = o1.expressionType;
					if (at1 && ResolveSignatureArgument.typeMatches(at1, ResolveNamespace.classBool, o1.expressionAutoCast) === ResolveSignature.Match.No) {
						let ri: DiagnosticRelatedInformation[] = [];
						this.expressionType?.addReportInfo(ri, `Source Type: ${at1.reportInfoText}`);
						at1.addReportInfo(ri, `Target Type: bool`);
						const di = state.reportError(this._name.range, `Invalid cast from ${at1.name} to bool`, ri);
						if (di && at1) {
							this._codeActionInsertCast = new CodeActionInsertCast(di, at1, ResolveNamespace.classBool,o1, o1.expressionAutoCast);
							this._codeActionInsertCast.wrapAll = true;
						}
					}
				}
				}break;
				
			default:
				if (this._matches && this._matches.name) {
					if (this._matches.functionsFull.length == 0) {
						if (this._matches.functionsPartial.length > 1) {
							let ri: DiagnosticRelatedInformation[] = [];
							for (const each of this._matches.functionsPartial) {
								each.context?.addReportInfo(ri, `Candidate: ${each.context.reportInfoText}`);
							}
							state.reportError(this._name.range, `Ambigous function call ${this._name}${this._matches.signature?.resolveTextShort}`, ri);
							
						} else if (this._matches.functionsPartial.length == 0) {
							let matches2 = new ResolveSearch(this._matches);
							matches2.signature = undefined;
							
							if (objtype) {
								objtype.search(matches2);
							} else if (this._functionType === ContextFunctionCall.FunctionType.functionSuper) {
								if (this._name.name == 'this') {
									state.topScopeClass?.resolveClass?.search(matches2);
								} else {
									(state.topScopeClass?.resolveClass?.context?.extends?.resolve?.resolved as ResolveType)?.search(matches2);
								}
							} else {
								state.search(matches2, this);
							}
							
							let ri: DiagnosticRelatedInformation[] = [];
							for (const each of matches2.functionsAll) {
								each.context?.addReportInfo(ri, `Candidate: ${each.context.reportInfoText}`);
							}
							state.reportError(this._name.range, `Function call ${this._name}${this._matches.signature?.resolveTextShort} not found`, ri);
						}
					}
					
					if (this._matchFunction) {
						const tfcc = state.topScopeFunction?.parent as ContextClass;
						if (tfcc?.type === Context.ContextType.Class) {
							const tfrc = tfcc.resolveClass;
							if (tfrc && !this._matchFunction.canAccess(tfrc)) {
								let ri: DiagnosticRelatedInformation[] = [];
								this._matchFunction.addReportInfo(ri, `Function: ${this._matchFunction.reportInfoText}`);
								this._matchFunction.parent?.addReportInfo(ri, `Owner Class: ${this._matchFunction.parent.reportInfoText}`);
								tfrc.addReportInfo(ri, `Accessing Class: ${tfrc.reportInfoText}`);
								state.reportError(this._name.range, `Can not access function ${this._matchFunction.name}`, ri);
							}
						}
					}
				}
		}
		
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.assign:{
				const other = this._arguments.at(0);
				if (other && this.sameTarget(other)) {
					let ri: DiagnosticRelatedInformation[] = [];
					other.addReportInfo(ri, `Target: ${this.targetResolveText}`);
					state.reportWarning(this._name.range, 'Assignment has no effect.', ri);
				}
				}break;
				
			case ContextFunctionCall.FunctionType.equals:{
				const other = this._arguments.at(0);
				if (other && this.sameTarget(other)) {
					let ri: DiagnosticRelatedInformation[] = [];
					other.addReportInfo(ri, `Target: ${this.targetResolveText}`);
					state.reportWarning(this._name.range, 'Comparisson is always true', ri);
				}
				}break;
				
			case ContextFunctionCall.FunctionType.notEquals:{
				const other = this._arguments.at(0);
				if (other && this.sameTarget(other)) {
					let ri: DiagnosticRelatedInformation[] = [];
					other.addReportInfo(ri, `Target: ${this.targetResolveText}`);
					state.reportWarning(this._name.range, 'Comparisson is always false', ri);
				}
				}break;
		}
	}
	
	public expectedTypesForArgument(index: number): ResolveType[] {
		let types: ResolveType[] = [];
		
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.cast:
			case ContextFunctionCall.FunctionType.castable:
			case ContextFunctionCall.FunctionType.typeof:
				break;
				
			case ContextFunctionCall.FunctionType.assign:
			case ContextFunctionCall.FunctionType.equals:
			case ContextFunctionCall.FunctionType.notEquals:
				if (this._object?.expressionType) {
					types.push(this._object?.expressionType);
				}
				break;
				
			case ContextFunctionCall.FunctionType.logicalAnd:
			case ContextFunctionCall.FunctionType.logicalOr:
				types.push(ResolveNamespace.classBool);
				break;
				
			case ContextFunctionCall.FunctionType.not:
				types.push(ResolveNamespace.classVoid);
				break;
				
			default:
				if (this._matches?.name) {
					let signatures: ResolveSignature[] = [];
					
					if (this._matches.functionsFull.length > 0) {
						for (const each of this._matches.functionsFull) {
							signatures.push(each.signature);
						}
					} else if (this._matches.functionsPartial.length > 0) {
						for (const each of this._matches.functionsPartial) {
							signatures.push(each.signature);
						}
					} else if (this._matches.functionsWildcard.length > 0) {
						for (const each of this._matches.functionsWildcard) {
							signatures.push(each.signature);
						}
					}
					
					for (const each of signatures) {
						const type = each.arguments.at(index)?.type;
						if (type && !types.includes(type)) {
							types.push(type);
						}
					}
				}
		}
		return types;
	}
	
	protected sameTarget(other: Context): boolean {
		if (!this._object || other.type !== this._object.type) {
			return false;
		}
		
		switch (this._object.type) {
			case Context.ContextType.Member:{
				const m1 = this._object as ContextMember;
				const m2 = other as ContextMember;
				
				if (m1.resolveArgument) {
					return m1.resolveArgument === m2.resolveArgument;
					
				} else if (m1.resolveLocalVariable) {
					return m1.resolveLocalVariable === m2.resolveLocalVariable;
					
				} else if (m1.resolveVariable) {
					//return m1.resolveVariable === m2.resolveVariable;
					// this is not working since the object can be different.
					// but how to check this?
				}
				}break;
		}
		
		return false;
	}
	
	protected get targetResolveText(): string {
		if (!this._object) {
			return '?';
		}
		
		switch (this._object.type) {
			case Context.ContextType.Member:
				return (this._object as ContextMember).resolveAny?.reportInfoText ?? '?';
		}
		
		return '?';
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._object?.collectChildDocSymbols(list);
		for (const each of this._arguments) {
			each.collectChildDocSymbols(list);
		}
	}


	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._object?.contextAtPosition(position)
			?? this.contextAtPositionList(this._arguments, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._object?.contextAtRange(range)
			?? this.contextAtRangeList(this._arguments, range)
			?? this;
	}
	
	protected updateHover(position: Position): Hover | null {
		if (this._name?.isPositionInside(position)) {
			let content = [];
			
			switch (this._functionType) {
				case ContextFunctionCall.FunctionType.cast:
					content.push(`**operator cast** ${this._castType?.resolve?.resolved?.resolveTextLong}`);
					break;
					
				case ContextFunctionCall.FunctionType.castable:
					content.push(`bool **operator castable** ${this._castType?.resolve?.resolved?.resolveTextLong}`);
					break;
					
				case ContextFunctionCall.FunctionType.typeof:
					content.push(`bool **operator typeof** ${this._castType?.resolve?.resolved?.resolveTextLong}`);
					break;
					
				case ContextFunctionCall.FunctionType.assign:
				case ContextFunctionCall.FunctionType.equals:
				case ContextFunctionCall.FunctionType.notEquals:
					const o1 = this._arguments.at(0);
					const o2 = this._object;
					if (o1 && o2) {
						var opname: string;
						switch (this._functionType) {
							case ContextFunctionCall.FunctionType.assign:
								opname = "="
								break;
								
							case ContextFunctionCall.FunctionType.equals:
								opname = "==";
								break;
								
							case ContextFunctionCall.FunctionType.notEquals:
								opname = "!=";
								break;
						}
						
						const at1 = o1.expressionType;
						const at2 = o2.expressionType;
						
						if (o1.expressionAutoCast === Context.AutoCast.KeywordNull) {
							content.push(`${at2?.resolveTextLong} **${opname}** **null**`);
						} else {
							content.push(`${at2?.resolveTextLong} **${opname}** ${at1?.resolveTextLong}`);
						}
					}
					break;
					
				default:
					if (this._matches) {
						var f: ResolveFunction | undefined;
						
						if (this._matches.functionsFull.length > 0) {
							if (this._matches.functionsFull.length == 1) {
								f = this._matches.functionsFull[0];
							}
						} else if (this._matches.functionsPartial.length > 0) {
							if (this._matches.functionsPartial.length == 1) {
								f = this._matches.functionsPartial[0];
							}
						} else if (this._matches.functionsWildcard.length > 0) {
							if (this._matches.functionsWildcard.length == 1) {
								f = this._matches.functionsWildcard[0];
							}
						}
						
						if (f?.context) {
							content.push(...f.context.resolveTextLong);
							const doc = f.context.documentation;
							if (doc) {
								content.push('___');
								content.push(...doc.resolveTextLong);
							}
						}
						
					} else {
						content.push(`**${this._operator ? 'operator' : 'function'} member** ${this._name.name}`);
					}
			}
			
			return new HoverInfo(content, this._name.range);

		} else if (this._castType?.isPositionInside(position)) {
			return this._castType.hover(position);
		}

		return null;
	}
	
	public definition(position: Position): Definition {
		if (this._name?.isPositionInside(position)) {
			switch (this._functionType) {
				case ContextFunctionCall.FunctionType.cast:
				case ContextFunctionCall.FunctionType.castable:
				case ContextFunctionCall.FunctionType.typeof:
				case ContextFunctionCall.FunctionType.assign:
				case ContextFunctionCall.FunctionType.equals:
				case ContextFunctionCall.FunctionType.notEquals:
					break;
					
				default:
					if (this._matches) {
						var definitions: Definition = [];
						
						if (this._matches.functionsFull.length > 0) {
							if (this._matches.functionsFull.length == 1) {
								const l = this._matches.functionsFull[0].context?.resolveLocationSelf;
								if (l) {
									definitions.push(l);
								}
							}
						} else if (this._matches.functionsPartial.length > 0) {
							for (const each of this._matches.functionsPartial) {
								const l = each.context?.resolveLocationSelf;
								if (l) {
									definitions.push(l);
								}
							}
						} else if (this._matches.functionsWildcard.length > 0) {
							for (const each of this._matches.functionsWildcard) {
								const l = each.context?.resolveLocationSelf;
								if (l) {
									definitions.push(l);
								}
							}
						}
						
						return definitions;
					}
			}
			return this.definitionSelf();
			
		} else if (this._castType?.isPositionInside(position)) {
			return this._castType.definition(position);
		}
		return super.definition(position);
	}
	
	public completion(_document: TextDocument, position: Position): CompletionItem[] {
		const range = this._name?.range ?? Range.create(position, position);
		
		if (Helpers.isPositionInsideRange(range, position)) {
			if (this._object) {
				if (this._operator) {
					return CompletionHelper.createObjectOperators(range, this, this._object);
					
				} else {
					return CompletionHelper.createObject(range, this, this._object);
				}
				
			} else {
				return CompletionHelper.createStatementOrExpression(range, this);
			}
			
		} else {
			var types: ResolveType[] | undefined;
			if (this._operator) {
				switch (this._functionType) {
					case ContextFunctionCall.FunctionType.cast:
					case ContextFunctionCall.FunctionType.castable:
					case ContextFunctionCall.FunctionType.typeof:
						return CompletionHelper.createType(Range.create(position, position), this);
				}
				
				types = this.expectedTypesForArgument(0);
			}
			
			return CompletionHelper.createExpression(Range.create(position, position), this, types);
		}
	}
	
	public expectTypes(context: Context): ResolveType[] | undefined {
		if (context === this._object) {
			return this.parent?.expectTypes(this);
		}
		const index = this._arguments.indexOf(context);
		return index != -1 ? this.expectedTypesForArgument(index) : super.expectTypes(context);
	}
	
	
	protected updateRange(endPosition?: Position): void {
		var rangeBegin = this._object?.range?.start;
		
		const nameRangeBegin = this._name?.range?.start;
		if (!rangeBegin || (nameRangeBegin && Helpers.isPositionBefore(nameRangeBegin, rangeBegin))) {
			rangeBegin = nameRangeBegin;
		}
		
		var rangeEnd = endPosition;
		
		if (!rangeEnd) {
			if (this._arguments.length > 0) {
				rangeEnd = this._arguments[this._arguments.length - 1].range?.end;
			}
			if (!rangeEnd) {
				rangeEnd = this._castType?.range?.end ?? this._name?.range?.end;
			}
		}
		
		const objRangeEnd = this._object?.range?.end;
		if (!rangeEnd || (objRangeEnd && Helpers.isPositionAfter(objRangeEnd, rangeEnd))) {
			rangeEnd = objRangeEnd;
		}
		
		if (rangeBegin && rangeEnd) {
			this.range = Range.create(rangeBegin, rangeEnd);
		}
	}
	
	protected findArgCommaPos(node: FunctionCallCstNode): void {
		if (node.children.comma) {
			for (const each of node.children.comma) {
				this._argCommaPos.push(Helpers.positionFrom(each));
			}
		}
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._castType?.isPositionInside(position)) {
			return this._castType.resolve?.resolved;
		} else if (this._name?.isPositionInside(position)) {
			return this._matchFunction;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._castType?.location(this)
			?? this._name?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._name?.range);
	}
	
	public signatureHelpAtPosition(position: Position): SignatureHelp | undefined {
		if (!this._name?.range) {
			return this.parent?.signatureHelpAtPosition(position);
		}
		
		let objtype: ResolveType | undefined;
		if (this._object) {
			objtype = this._object.expressionType
			if (!objtype) {
				return this.parent?.signatureHelpAtPosition(position);
			}
		}
		
		if (!Helpers.isPositionAfter(position, this._name.range?.end)) {
			return this.parent?.signatureHelpAtPosition(position);
		}
		
		let matches = new ResolveSearch();
		if (this._functionType === ContextFunctionCall.FunctionType.functionSuper) {
			matches.name = 'new';
		} else {
			matches.name = this._name.name;
		}
		matches.onlyFunctions = true;
		matches.ignoreShadowedFunctions = true;
		matches.stopAfterFirstFullMatch = false;
		
		switch (this._functionType) {
			case ContextFunctionCall.FunctionType.function:
				matches.searchSuperClasses = this._name.name != 'new';
				break;
				
			case ContextFunctionCall.FunctionType.functionSuper:
				matches.searchSuperClasses = false;
				break;
		}
		
		if (objtype) {
			objtype.search(matches);
		} else if (this._functionType === ContextFunctionCall.FunctionType.functionSuper) {
			let pc = ContextClass.thisContext(this);
			if (this._name.name == 'this') {
				pc?.resolveClass?.search(matches);
			} else {
				(pc?.extends?.resolve?.resolved as ResolveType)?.search(matches);
			}
		} else {
			ContextClass.thisContext(this)?.search(matches, this);
		}
		
		let siginfo: SignatureInformation[] = [];
		var activeSignature: number | null = null;
		var activeParameter: number | null = null;
		
		for (const each of matches.functionsAll) {
			siginfo.push(each.createSignatureInformation());
		}
		
		if (siginfo.length > 0) {
			const argLen = this._resolveSignature?.arguments.length ?? 0;
			var bestFullMatch: ResolveFunction | undefined;
			var bestPartialMatch: ResolveFunction | undefined;
			var bestWildcardMatch: ResolveFunction | undefined;
			var bestNoMatch: ResolveFunction | undefined;
			
			for (const each of matches.functionsAll) {
				var matchResult = ResolveSignature.Match.No;
				if (this._resolveSignature) {
					matchResult = this._resolveSignature.matches(each.signature);
				}
				
				switch (matchResult) {
				case ResolveSignature.Match.Full:
					if (!bestFullMatch || (
							bestFullMatch.signature.arguments.length != argLen
							&& each.signature.arguments.length == argLen)) {
						bestFullMatch = each;
					}
					break;
					
				case ResolveSignature.Match.Partial:
					if (!bestPartialMatch || (
						bestPartialMatch.signature.arguments.length != argLen
						&& each.signature.arguments.length == argLen)) {
						bestPartialMatch = each;
					}
					break;
					
				case ResolveSignature.Match.Wildcard:
					if (!bestWildcardMatch || (
						bestWildcardMatch.signature.arguments.length != argLen
						&& each.signature.arguments.length == argLen)) {
						bestWildcardMatch = each;
					}
					break;
					
				case ResolveSignature.Match.No:
					if (!bestNoMatch || (
						bestNoMatch.signature.arguments.length != argLen
						&& each.signature.arguments.length == argLen)) {
						bestNoMatch = each;
					}
					break;
				}
			}
			
			const bestAll = bestFullMatch ?? bestPartialMatch ?? bestWildcardMatch ?? bestNoMatch;
			if (bestAll) {
				activeSignature = matches.functionsAll.indexOf(bestAll);
			}
			
			if (activeSignature !== null) {
				var i;
				for (i=this._argCommaPos.length-1; i>=0; i--) {
					if (Helpers.isPositionAfter(position, this._argCommaPos[i])) {
						break;
					}
				}
				activeParameter = i + 1;
			}
		}
		
		return {signatures: siginfo, activeSignature: activeSignature, activeParameter: activeParameter};
	}
	
	public codeAction(range: Range): CodeAction[] {
		const actions: CodeAction[] = [];
		debugLogContext(this);
		if (this._codeActionInsertCast) {
			actions.push(...this._codeActionInsertCast.createCodeActions(range));
		}
		return actions;
	}
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Call ${this._name ?? '-'} ${this.logRange}`);
		this._object?.log(console, `${prefixLines}- Obj: `, `${prefixLines}  `);
		for (const each of this._arguments) {
			each.log(console, `${prefixLines}- Arg: `, `${prefixLines}  `);
		}
		if (this._castType) {
			console.log(`${prefixLines}- CastType ${this._castType}`);
		}
	}
}

export namespace ContextFunctionCall {
	/** Function type. */
	export enum FunctionType {
		function,
		functionSuper,

		assignMultiply,
		assignDivide,
		assignModulus,
		assignAdd,
		assignSubtract,
		assignShiftLeft,
		assignShiftRight,
		assignAnd,
		assignOr,
		assignXor,
		and,
		or,
		xor,
		shiftLeft,
		shiftRight,
		less,
		greater,
		lessEqual,
		greaterEqual,
		multiply,
		divide,
		modulus,
		add,
		subtract,
		increment,
		decrement,
		inverse,

		equals,
		notEquals,

		logicalAnd,
		logicalOr,
		not,

		cast,
		castable,
		typeof,

		assign
	}
}
