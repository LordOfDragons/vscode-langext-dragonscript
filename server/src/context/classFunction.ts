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
import { FunctionArgumentsCstNode, FunctionBeginCstNode } from "../nodeclasses/declareFunction";
import { InterfaceFunctionCstNode } from "../nodeclasses/declareInterface";
import { ClassFunctionCstNode } from "../nodeclasses/declareClass";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { CompletionItem, Definition, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolKind, integer } from "vscode-languageserver";
import { TypeName } from "./typename";
import { ContextFunctionArgument } from "./classFunctionArgument";
import { Identifier } from "./identifier";
import { ContextStatements } from "./statements";
import { IToken } from "chevrotain";
import { HoverInfo } from "../hoverinfo";
import { ResolveState } from "../resolve/state";
import { ResolveFunction } from "../resolve/function";
import { ResolveType } from "../resolve/type";
import { ContextClass } from "./scriptClass";
import { ContextInterface } from "./scriptInterface";
import { ContextFunctionCall } from "./expressionCall";
import { Helpers } from "../helpers";
import { ResolveSearch } from "../resolve/search";
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CompletionHelper } from "../completionHelper";
import { debugLogMessage } from "../server";
import { CodeActionRemove } from "../codeactions/remove";
import { CodeActionReplace } from "../codeactions/replace";
import { VisitorAllHasReturn } from "../visitor/allhasreturn";


export class ContextFunction extends Context{
	protected _node: InterfaceFunctionCstNode | ClassFunctionCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _functionType: ContextFunction.Type;
	protected _name?: Identifier;
	protected _returnType?: TypeName;
	protected _realReturnType?: TypeName;
	protected _arguments: ContextFunctionArgument[] = [];
	protected _argCommaPos: Position[] = [];
	protected _argBeginPos?: Position;
	protected _argEndPos?: Position;
	protected _superToken?: IToken;
	protected _superCall?: ContextFunctionCall;
	protected _statements?: ContextStatements;
	protected _resolveFunction?: ResolveFunction;


	constructor(node: InterfaceFunctionCstNode | ClassFunctionCstNode,
				typemodNode: TypeModifiersCstNode | undefined,
				ownerTypeName: string | undefined, parent: Context) {
		super(Context.ContextType.Function, parent);
		this._node = node;
		this._typeModifiers = new Context.TypeModifierSet(typemodNode, Context.TypeModifier.Public);

		var tokBegin: IToken | undefined;
		let typeMods = typemodNode?.children.typeModifier;
		if (typeMods && typeMods.length > 0) {
			let tmnode = typeMods[0].children;
			tokBegin = (tmnode.abstract || tmnode.fixed || tmnode.native || tmnode.private
				|| tmnode.protected || tmnode.public || tmnode.static)![0];
		}

		var tokEnd: IToken | undefined;

		var fdecl: FunctionBeginCstNode | undefined;
		let cfdecl: ClassFunctionCstNode | undefined;
		var docSymKind: SymbolKind = SymbolKind.Method;
		
		if (node.name === 'interfaceFunction') {
			let ifdecl = node as InterfaceFunctionCstNode;
			if (ifdecl.children.functionBegin) {
				fdecl = ifdecl.children.functionBegin[0];
				if (!tokBegin) {
					tokBegin = ifdecl.children.func[0];
				}
			}
			
		} else if (node.name === 'classFunction') {
			cfdecl = node as ClassFunctionCstNode;
			if (cfdecl.children.functionBegin) {
				fdecl = cfdecl.children.functionBegin[0];
				if (!tokBegin) {
					tokBegin = cfdecl.children.func[0];
				}
			}
		}
		
		if (!fdecl) {
			this._functionType = ContextFunction.Type.Regular;
			this._returnType = TypeName.typeVoid;
			return;
		}
		
		let fdecl2 = fdecl.children;
		if (fdecl2.returnType) {
			this._realReturnType = new TypeName(fdecl2.returnType[0]);
		}
		this._returnType = this._realReturnType ?? TypeName.typeVoid;
		
		if (fdecl2.functionName) {
			const fdecl3 = fdecl2.functionName[0].children;
			const identName = fdecl3?.name?.at(0);
			const name = identName?.image;
			
			if (name) {
				this._name = new Identifier(identName);
				
				if (name == 'new') {
					this._functionType = ContextFunction.Type.Constructor;
					this._returnType = ownerTypeName ? TypeName.typeNamed(ownerTypeName) : TypeName.typeObject;
					this._typeModifiers.add(Context.TypeModifier.Static);
					docSymKind = SymbolKind.Constructor;
					
				} else if (name == 'destructor') {
					this._functionType = ContextFunction.Type.Destructor;
					this._returnType = TypeName.typeVoid;
					
				} else {
					this._functionType = ContextFunction.Type.Regular;
				}
				
			} else if(fdecl3?.operator) {
				this._functionType = ContextFunction.Type.Operator;
				docSymKind = SymbolKind.Operator;
				
				let odecl = fdecl3.operator[0].children;
				if (odecl.assignMultiply) {
					this._name = new Identifier(odecl.assignMultiply[0], "*=");
				} else if(odecl.assignDivide) {
					this._name = new Identifier(odecl.assignDivide[0], "/=");
				} else if(odecl.assignModulus) {
					this._name = new Identifier(odecl.assignModulus[0], "%=");
				} else if(odecl.assignAdd) {
					this._name = new Identifier(odecl.assignAdd[0], "+=");
				} else if(odecl.assignSubtract) {
					this._name = new Identifier(odecl.assignSubtract[0], "-=");
				} else if(odecl.assignShiftLeft) {
					this._name = new Identifier(odecl.assignShiftLeft[0], "<<=");
				} else if(odecl.assignShiftRight) {
					this._name = new Identifier(odecl.assignShiftRight[0], ">>=");
				} else if(odecl.assignAnd) {
					this._name = new Identifier(odecl.assignAnd[0], "&=");
				} else if(odecl.assignOr) {
					this._name = new Identifier(odecl.assignOr[0], "|=");
				} else if(odecl.assignXor) {
					this._name = new Identifier(odecl.assignXor[0], "^=");
				} else if(odecl.and) {
					this._name = new Identifier(odecl.and[0], "&");
				} else if(odecl.or) {
					this._name = new Identifier(odecl.or[0], "|");
				} else if(odecl.xor) {
					this._name = new Identifier(odecl.xor[0], "^");
				} else if(odecl.shiftLeft) {
					this._name = new Identifier(odecl.shiftLeft[0], "<<");
				} else if(odecl.shiftRight) {
					this._name = new Identifier(odecl.shiftRight[0], ">>");
				} else if(odecl.less) {
					this._name = new Identifier(odecl.less[0], "<");
				} else if(odecl.greater) {
					this._name = new Identifier(odecl.greater[0], ">");
				} else if(odecl.lessEqual) {
					this._name = new Identifier(odecl.lessEqual[0], "<=");
				} else if(odecl.greaterEqual) {
					this._name = new Identifier(odecl.greaterEqual[0], ">=");
				} else if(odecl.multiply) {
					this._name = new Identifier(odecl.multiply[0], "*");
				} else if(odecl.divide) {
					this._name = new Identifier(odecl.divide[0], "/");
				} else if(odecl.modulus) {
					this._name = new Identifier(odecl.modulus[0], "%");
				} else if(odecl.add) {
					this._name = new Identifier(odecl.add[0], "+");
				} else if(odecl.subtract) {
					this._name = new Identifier(odecl.subtract[0], "-");
				} else if(odecl.increment) {
					this._name = new Identifier(odecl.increment[0], "++");
				} else if(odecl.decrement) {
					this._name = new Identifier(odecl.decrement[0], "--");
				} else if(odecl.inverse) {
					this._name = new Identifier(odecl.inverse[0], "~");
				} else {
					this._name = new Identifier(undefined, "??");
				}
				
			} else {
				this._functionType = ContextFunction.Type.Regular;
			}
			
		} else {
			this._functionType = ContextFunction.Type.Regular;
		}
		
		if (fdecl2.functionArguments) {
			this._processFuncArgs(fdecl2.functionArguments);
		}
		
		const fdeclsc = fdecl2.functionSuperCall?.at(0)?.children;
		if (fdeclsc?.functionCall) {
			let args = fdeclsc.functionCall[0].children.argument;
			if (args) {
				if (fdeclsc.this) {
					this._superToken = fdeclsc.this[0];
					this._superCall = ContextFunctionCall.newSuperCall(fdeclsc.functionCall[0], this, fdeclsc.this[0]);
				} else if (fdeclsc.super) {
					this._superToken = fdeclsc.super[0];
					this._superCall = ContextFunctionCall.newSuperCall(fdeclsc.functionCall[0], this, fdeclsc.super[0]);
				}
			}
		}
		
		let declEnd = fdecl2.endOfCommand?.at(0)?.children;
		tokEnd = (declEnd?.newline || declEnd?.commandSeparator)?.at(0) ?? tokEnd;
		
		if (cfdecl?.children.statements) {
			this._statements = new ContextStatements(cfdecl.children.statements[0], this);
			
			let declEnd = cfdecl.children.functionEnd;
			if (declEnd) {
				if (declEnd[0].children.end) {
					tokEnd = declEnd[0].children.end[0];
				} else {
					let declEnd2 = declEnd[0].children.endOfCommand?.at(0)?.children;
					tokEnd = (declEnd2?.newline || declEnd2?.commandSeparator)?.at(0) ?? tokEnd;
				}
			}
		}
		
		if (tokBegin && tokEnd && this._name?.token) {
			let args = this._arguments.map(each => `${each.typename.name} ${each.simpleName}`);
			let argText = args.length > 0 ? args.reduce((a,b) => `${a}, ${b}`) : "";
			let retText = this._returnType?.name || "void";
			let extText = `(${argText}): ${retText}`;
			
			this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
			this.documentSymbol = DocumentSymbol.create(this._name.name, extText,
				docSymKind, this.range, Helpers.rangeFrom(this._name.token, tokEnd, true, true));
		}
		
		if (this._statements && this.documentSymbol) {
			let collected: DocumentSymbol[] = [];
			this._statements.collectChildDocSymbols(collected);
			if (collected.length > 0) {
				if (!this.documentSymbol.children) {
					this.documentSymbol.children = [];
				}
				this.documentSymbol.children.push(...collected);
			}
		}
	}

	dispose(): void {
		this._resolveFunction?.dispose();
		this._resolveFunction = undefined;

		super.dispose()
		this._realReturnType?.dispose();
		this._returnType = undefined;
		for (const each of this._arguments) {
			each.dispose();
		}
		this._superCall?.dispose();
		this._statements?.dispose();
	}


	public get node(): InterfaceFunctionCstNode | ClassFunctionCstNode {
		return this._node;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get functionType(): ContextFunction.Type {
		return this._functionType;
	}

	public get name(): Identifier | undefined {
		return this._name;
	}

	public get returnType(): TypeName | undefined {
		return this._returnType;
	}

	public get realReturnType(): TypeName | undefined {
		return this._realReturnType;
	}

	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}

	public get superToken(): IToken | undefined {
		return this._superToken;
	}

	public get superCall(): Context | undefined{
		return this._superCall;
	}

	public get statements(): ContextStatements | undefined {
		return this.statements;
	}

	public get fullyQualifiedName(): string {
		let n = this.parent?.fullyQualifiedName || "";
		return n ? `${n}.${this._name}` : this.simpleName;
	}

	public get simpleName(): string {
		return this._name?.name ?? "??";
	}
	
	public get resolveFunction(): ResolveFunction | undefined {
		return this._resolveFunction;
	}
	
	protected _processFuncArgs(nodes: FunctionArgumentsCstNode[]): void {
		const children = nodes[0].children;
		
		if (children.leftParanthesis) {
			this._argBeginPos = Helpers.positionFrom(children.leftParanthesis[0]);
		}
		if (children.rightParanthesis) {
			this._argEndPos = Helpers.positionFrom(children.rightParanthesis[0], false);
		}
		
		let args = children.functionArgument;
		if (args) {
			for (const each of args) {
				this._arguments.push(new ContextFunctionArgument(each, this));
			}
		}
		
		if (children.comma) {
			for (const each of children.comma) {
				this._argCommaPos.push(Helpers.positionFrom(each));
			}
		}
	}
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._resolveFunction?.dispose();
		this._resolveFunction = undefined;
		
		this._returnType?.resolveType(state, this);
		
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveMembers(state);
			}
			this._superCall?.resolveMembers(state);
			this._statements?.resolveMembers(state);
		});
		
		this._resolveFunction = new ResolveFunction(this);
		if (this.parent) {
			var container: ResolveType | undefined;
			switch (this.parent.type) {
			case Context.ContextType.Class:
				container = (this.parent as ContextClass).resolveClass;
				break;
				
			case Context.ContextType.Interface:
				container = (this.parent as ContextInterface).resolveInterface;
				break;
			}
			
			if (container) {
				if (!container.addFunction(this._resolveFunction)) {
					if (this._name?.range) {
						state.reportError(this._name.range, `Duplicate function ${this._name}`);
					}
				}
			}
		}
		
		// show problems
		if (this._name) {
			switch (this._functionType){
			case ContextFunction.Type.Constructor:
			case ContextFunction.Type.Destructor:
				if (this._realReturnType) {
					const di = state.reportError(this._name.range,
						`${ResolveFunction.functionTypeTitle(this._functionType)} can not have a return type`);
					if (di && this._realReturnType?.range) {
						const ca = new CodeActionRemove(di, "Remove return type", this._realReturnType?.range, this);
						ca.extendEnd = true;
						this._codeActions.push(ca);
					}
				}
				break;
				
			case ContextFunction.Type.Regular:
			case ContextFunction.Type.Operator:
				if (!this._realReturnType) {
					state.reportError(this._name.range,
						`${ResolveFunction.functionTypeTitle(this._functionType)} requires a return type`);
				}
				break;
			}
			
			if (this._functionType !== ContextFunction.Type.Constructor && this._superCall) {
				const di = state.reportError(this._name.range,
					`${ResolveFunction.functionTypeTitle(this._functionType)} can not have a super call`);
				if (di && this._superCall?.range) {
					const ca = new CodeActionRemove(di, "Remove super call", this._superCall?.range, this);
					ca.extendBegin = true;
					this._codeActions.push(ca);
				}
			}
			
			if (this._functionType === ContextFunction.Type.Destructor && this._arguments.length > 0) {
				const di = state.reportError(this._name.range,
					`${ResolveFunction.functionTypeTitle(this._functionType)} can not have arguments`);
				if (di && this._argBeginPos && this._argEndPos) {
					const ca = new CodeActionRemove(di, "Remove arguments",
						Helpers.rangeFromPosition(this._argBeginPos, this._argEndPos), this);
					ca.extendBegin = true;
					ca.extendEnd = true;
					this._codeActions.push(ca);
				}
			}
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveStatements(state);
			}
			this._superCall?.resolveStatements(state);
			this._statements?.resolveStatements(state);
		});
		
		this.documentation?.resolveStatements(state);
		
		// check for problems
		if (this._name
		&& this._functionType !== ContextFunction.Type.Constructor
		&& this._returnType && this._returnType?.name != 'void'
		&& this._statements && !(new VisitorAllHasReturn).check(this._statements)) {
			state.reportError(this._name.range, `Not all control path return a value or throw an exception`);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._arguments, position)
			?? this._superCall?.contextAtPosition(position)
			?? this._statements?.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this.contextAtRangeList(this._arguments, range)
			?? this._superCall?.contextAtRange(range)
			?? this._statements?.contextAtRange(range)
			?? this;
	}

	protected updateHover(position: Position): Hover | null {
		if (this._name?.isPositionInside(position)) {
			let content: string[] = [];
			content.push(...this.resolveTextLong);
			if (this.documentation) {
				content.push('___');
				content.push(...this.documentation.resolveTextLong);
			}
			return new HoverInfo(content, this._name.range);
		}
		if (this._returnType?.isPositionInside(position)) {
			return this._returnType.hover(position);
		}
		return null;
	}

	protected updateResolveTextShort(): string {
		let parts = [];
		parts.push(this._typeModifiers.typestring);
		parts.push(` ${this._returnType?.name ?? "?"}`);
		parts.push(` ${this.parent?.simpleName}.${this._name}(`);
		
		var args = [];
		for (const each of this._arguments) {
			args.push(`${each.typename} ${each.name}`);
		}
		if (args.length > 0) {
			parts.push(args.join(", "));
		}
		parts.push(")");

		return parts.join("");
	}

	protected updateResolveTextLong(): string[] {
		let parts = [];
		parts.push(this._typeModifiers.typestring);
		switch (this._functionType) {
			case ContextFunction.Type.Constructor:
				parts.push(" **constructor** ");
				break;
			case ContextFunction.Type.Destructor:
				parts.push(" **destructor** ");
				break;
			case ContextFunction.Type.Operator:
				parts.push(` **operator** *${this._returnType}* `);
				break;
			case ContextFunction.Type.Regular:
			default:
				parts.push(` **function** *${this._returnType}* `);
		}
		parts.push(`*${this.parent!.fullyQualifiedName}*.`);
		
		if (this._name?.name.startsWith('*') || this._name?.name.endsWith('*')) {
			parts.push(`__${this._name}__`);
		} else {
			parts.push(`**${this._name}**`);
		}
		parts.push(`(`);

		var args = [];
		for (const each of this._arguments) {
			args.push(`*${each.typename}* ${each.name}`);
		}
		if (args.length > 0) {
			parts.push(args.join(", "));
		}
		parts.push(")");

		let content = [];
		content.push(parts.join(""));

		return content;
	}

	protected updateReportInfoText(): string {
		let parts = [];
		parts.push(this._typeModifiers.typestring);
		switch (this._functionType) {
			case ContextFunction.Type.Constructor:
			case ContextFunction.Type.Destructor:
				break;
				
			default:
				parts.push(` ${this._returnType} `);
		}
		parts.push(` ${this.parent!.simpleName}.${this._name}(`);
		
		var args = [];
		for (const each of this._arguments) {
			args.push(`${each.typename} ${each.name}`);
		}
		if (args.length > 0) {
			parts.push(args.join(", "));
		}
		parts.push(")");
		
		return parts.join("");
	}
	
	public search(search: ResolveSearch, before?: Context): void {
		if (search.onlyTypes || search.stopSearching) {
			return;
		}
		
		if (search.matchableName) {
			for (const each of this._arguments) {
				if (each.name && search.matchableName.matches(each.name.matchableName)) {
					search.addArgument(each);
					if (search.stopSearching) {
						return;
					}
				}
			}
			
		} else if (search.name) {
			for (const each of this._arguments) {
				if (each.name && search.name == each.name.name) {
					search.addArgument(each);
					if (search.stopSearching) {
						return;
					}
				}
			}
			
		} else {
			for (const each of this._arguments) {
				search.addArgument(each);
				if (search.stopSearching) {
					return;
				}
			}
		}
	}
	
	public definition(position: Position): Definition {
		if (this._name?.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (this._returnType?.isPositionInside(position)) {
			return this._returnType.definition(position);
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name?.isPositionInside(position)) {
			return this._resolveFunction;
		} else if (this._returnType?.isPositionInside(position)) {
			return this._returnType.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._returnType?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this._name ? this.resolveLocation(this._name.range) : undefined;
	}
	
	public argBeforePos(position: Position): integer {
		var i;
		for (i=this._argCommaPos.length-1; i>=0; i--) {
			if (Helpers.isPositionAfter(position, this._argCommaPos[i])) {
				break;
			}
		}
		return i + 1;
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		if (this._argBeginPos && Helpers.isPositionAfter(position, this._argBeginPos)) {
			const indexArg = this.argBeforePos(position);
			if (indexArg >= 0 && indexArg < this._arguments.length) {
				return this._arguments[indexArg].completion(document, position);
			}
		}
		
		const npos = this._name?.range?.start;
		if (!npos || Helpers.isPositionBefore(position, npos)) {
			if (this._returnType) {
				return this._returnType.completion(document, position, this);
			}
		}
		
		// TODO propose names
		return [];
	}
	
	
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		var s = `${prefix}Function ${ContextFunction.Type[this._functionType]}: ${this._typeModifiers}`;
		if (this._returnType) {
			s = `${s} ${this._returnType.name}`;
		}
		s = `${s} ${this._name}(`;
		var delimiter = "";
		for (const each of this._arguments) {
			s = `${s}${delimiter}${each.typename.name} ${each.name}`;
			delimiter = ", ";
		}
		s = `${s})`;
		console.log(s);
		
		this.logChildren(this._arguments, console, `${prefixLines}- Arg: `, `${prefixLines}  `);
		
		if (this._superToken && this._superCall) {
			if (this._superToken.image == 'this') {
				console.log(`${prefixLines}- this`);
			} else {
				console.log(`${prefixLines}- super`);
			}
			this.logChild(this._superCall, console, prefixLines);
		}
		
		this.logChild(this._statements, console, prefixLines);
	}
}


export namespace ContextFunction {
	/** Function type. */
	export enum Type {
		Constructor,
		Destructor,
		Operator,
		Regular
	}
}
