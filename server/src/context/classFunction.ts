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
import { CompletionItem, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole, SymbolKind, integer } from "vscode-languageserver";
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
import { CodeActionRemove } from "../codeactions/remove";
import { VisitorAllHasReturn } from "../visitor/allhasreturn";
import { ResolveClass } from "../resolve/class";
import { DebugSettings } from "../debugSettings";
import { debugLogMessage } from "../server";
import { ContextDocumentation } from "./documentation";
import { semtokens } from "../semanticTokens";


export class ContextFunction extends Context{
	protected _typeModifiers: Context.TypeModifierSet;
	protected _functionType: ContextFunction.Type;
	protected _isBodyStatic = false;
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
	protected _inheritUsage?: ResolveUsage;


	constructor(node: InterfaceFunctionCstNode | ClassFunctionCstNode,
				typemodNode: TypeModifiersCstNode | undefined,
				ownerTypeName: string | undefined, parent: Context) {
		super(Context.ContextType.Function, parent);
		
		this._typeModifiers = new Context.TypeModifierSet(typemodNode,
			Context.AccessLevel.Public, [Context.TypeModifier.Public]);

		var tokBegin: IToken | undefined;
		let typeMods = typemodNode?.children.typeModifier;
		if (typeMods && typeMods.length > 0) {
			let tmnode = typeMods[0].children;
			tokBegin = (tmnode.abstract || tmnode.fixed || tmnode.native || tmnode.private
				|| tmnode.protected || tmnode.public || tmnode.static)![0];
		}

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
		
		var posEnd: Position | undefined;
		var posEndInner: Position | undefined;
		
		if (cfdecl?.children.statements) {
			const cfdecl2 = cfdecl.children.functionEnd?.at(0)?.children;
			if (cfdecl2) {
				const tokEnd = cfdecl2.end?.at(0) ?? Helpers.endOfCommandToken(cfdecl2.endOfCommand);
				if (tokEnd) {
					posEndInner = Helpers.positionFrom(tokEnd);
					posEnd = Helpers.positionFrom(tokEnd, false);
					this.blockClosed = true;
				}
			}
			
			this._statements = new ContextStatements(cfdecl.children.statements[0], this);
			if (!posEnd) {
				posEndInner = posEnd = this._statements.range?.end;
			}
		}
		
		if (this.typeModifiers.isAbstract) {
			this.blockClosed = true;
		}
		
		if (this.typeModifiers.isStatic) {
			switch (this._functionType) {
			case ContextFunction.Type.Destructor:
			case ContextFunction.Type.Operator:
			case ContextFunction.Type.Regular:
				this._isBodyStatic = true;
			}
		}
		
		if (!posEnd) {
			const tokEnd = Helpers.endOfCommandToken(fdecl2.endOfCommand);
			if (tokEnd) {
				posEndInner = Helpers.positionFrom(tokEnd);
				posEnd = Helpers.positionFrom(tokEnd, false);
			}
		}
		
		if (tokBegin && posEnd && this._name?.token) {
			let args = this._arguments.map(each => `${each.typename.name} ${each.simpleName}`);
			let argText = args.length > 0 ? args.reduce((a,b) => `${a}, ${b}`) : "";
			let retText = this._returnType?.name || "void";
			let extText = `(${argText}): ${retText}`;
			
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), posEnd);
			
			if (this._name.range && posEndInner) {
				this.documentSymbol = DocumentSymbol.create(this._name.name, extText, docSymKind,
					this.range, Helpers.rangeFromPosition(this._name.range.start, posEndInner));
			}
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
		this._inheritUsage?.dispose();
		this._inheritUsage = undefined;
		
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

	public addSemanticTokens(builder: semtokens.Builder): void {
		builder.addDeclaration(this._name, semtokens.typeMethod,
			this._typeModifiers, this.useDocumentation?.isDeprecated);
		
		this._returnType?.addSemanticTokens(builder);
		
		for (const arg of this._arguments) {
			arg.addSemanticTokens(builder);
		}
		
		this._superCall?.addSemanticTokens(builder);
		
		this._statements?.addSemanticTokens(builder);
	}


	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}
	
	public get isBodyStatic(): boolean {
		return this._isBodyStatic;
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
	
	public get inheritUsage(): ResolveUsage | undefined {
		return this._inheritUsage;
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
		var containerClass: ResolveClass | undefined;
		if (this.parent) {
			var container: ResolveType | undefined;
			switch (this.parent.type) {
			case Context.ContextType.Class:
				container = containerClass = (this.parent as ContextClass).resolveClass;
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
				//if (this._typeModifiers.is)
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
			
			if (this._typeModifiers.isAbstract
			&& containerClass?.context?.typeModifiers.isAbstract === false) {
				switch (this._functionType){
				case ContextFunction.Type.Regular:
				case ContextFunction.Type.Operator:
					state.reportError(this._name.range,
						`${ResolveFunction.functionTypeTitle(this._functionType)} is abstract in a class that is not abstract`);
					break;
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
		
		if (this._name && this._resolveFunction && this.parent) {
			switch (this._functionType) {
			case ContextFunction.Type.Operator:
			case ContextFunction.Type.Regular:{
				const search = new ResolveSearch();
				search.name = this._name.name;
				search.onlyFunctions = true;
				search.ignoreNamespaceParents = true;
				search.signature = this._resolveFunction.signature;
				search.allowPartialMatch = false;
				search.allowWildcardMatch = false;
				search.ignoreConstructors = true;
				
				switch (this.parent.type) {
				case Context.ContextType.Class:
					(this.parent as ContextClass).resolveClass?.searchInherited(search);
					break;
					
				case Context.ContextType.Interface:
					(this.parent as ContextInterface).resolveInterface?.searchInherited(search);
					break;
				}
				
				const f = search.functionsFull.at(0);
				if (f) {
					this._inheritUsage = new ResolveUsage(f, this);
					this._inheritUsage.inherited = true;
				}
				}break;
			}
		}
		
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
			
			const doc = this.useDocumentation;
			if (doc) {
				content.push('___');
				content.push(...doc.resolveTextLong);
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
	
	protected updateResolveTextShortLink(): string {
		let parts = [];
		parts.push(this._typeModifiers.typestring);
		parts.push(` *${this._returnType?.simpleNameLink}*`);
		parts.push(` ${this.parent?.simpleNameLink}.${this.simpleNameLink}(`);
		
		var args = [];
		for (const each of this._arguments) {
			args.push(`*${each.typename.simpleNameLink}* ${each.name}`);
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
				parts.push(` **operator** *${this._returnType?.simpleNameLink}* `);
				break;
			case ContextFunction.Type.Regular:
			default:
				parts.push(` **function** *${this._returnType?.simpleNameLink}* `);
		}
		
		parts.push(`${this.simpleNameLink}`);
		parts.push(`(`);

		var args = [];
		for (const each of this._arguments) {
			args.push(`*${each.typename.simpleNameLink}* ${each.name}`);
		}
		if (args.length > 0) {
			parts.push(args.join(", "));
		}
		parts.push(")");
		
		let lines = [];
		lines.push(parts.join(""));
		
		this.addHoverParent(lines);
		
		const linesInherit = this.reportInheritance;
		if (linesInherit) {
			lines.push('___');
			lines.push(...linesInherit);
		}
		
		return lines;
	}
	
	public get reportInheritance(): string[] | undefined {
		let inherit: ResolveUsage | undefined = this._inheritUsage;
		if (!inherit) {
			return undefined;
		}
		
		let lines: string[] = [];
		while (inherit) {
			if (inherit.resolved?.type !== Resolved.Type.Function) {
				break;
			}
			
			const resfun = inherit.resolved as ResolveFunction;
			if (resfun.context?.type !== Context.ContextType.Function) {
				break;
			}
			
			const ctxfun = resfun.context as ContextFunction;
			
			const parent = resfun.parent as ResolveType;
			const implement = parent.type == Resolved.Type.Interface
				|| this.typeModifiers?.has(Context.TypeModifier.Abstract);
			
			lines.push([
				`${implement ? '📝 implements:' : '↪️ overrides:'}`,
				`${parent.simpleNameLink}.${ctxfun.simpleNameLink}`].join(" "));
			
			// lines.push(`${implement ? '📝 implements' : '↪️ overrides'} ${ctxfun.resolveTextShortLink}`);
			
			inherit = ctxfun._inheritUsage;
		}
		return lines;
	}
	
	public get documentationInherited(): ContextDocumentation | undefined {
		let inherit: ResolveUsage | undefined = this._inheritUsage;
		let doc: ContextDocumentation | undefined;
		
		while (inherit && !doc) {
			if (inherit.resolved?.type !== Resolved.Type.Function) {
				break;
			}
			
			const resfun = inherit.resolved as ResolveFunction;
			if (resfun.context?.type !== Context.ContextType.Function) {
				break;
			}
			
			const ctxfun = resfun.context as ContextFunction;
			doc = ctxfun.documentation;
			inherit = ctxfun._inheritUsage;
		}
		
		return doc;
	}
	
	public get useDocumentation(): ContextDocumentation | undefined {
		return this.documentation ?? this.documentationInherited;
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
	
	public get topInheritedFunction(): ContextFunction {
		if (this.inheritUsage?.resolved?.type === Resolved.Type.Function) {
			const resfun = this.inheritUsage?.resolved as ResolveFunction;
			if (resfun.context?.type === Context.ContextType.Function) {
				return (resfun.context as ContextFunction).topInheritedFunction;
			}
		}
		return this;
	}
	
	public get allInheritedReferences(): Location[] {
		const locations: Location[] = [];
		
		const l = this.referenceSelf;
		if (l) {
			locations.push(l);
		}
		
		const usages = this.resolveFunction?.usage;
		if (usages) {
			for (const each of usages) {
				if (each.inherited && each.context?.type === Context.ContextType.Function) {
					locations.push(...(each.context as ContextFunction).allInheritedReferences);
				}
			}
		}
		
		return locations;
	}
	
	public definition(position: Position): Location[] {
		if (this._name?.isPositionInside(position)) {
			const tif = this.topInheritedFunction;
			const locations: Location[] = [];
			locations.push(...tif.definitionSelf());
			
			const usages = tif.resolveFunction?.allUsages;
			if (usages) {
				for (const each of usages) {
					if (each.inherited && each.reference) {
						locations.push(each.reference);
					}
				}
			}
			
			return locations;
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
		if (this._inheritUsage === usage) {
			return this._inheritUsage.context?.referenceSelf;
		}
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
		if (DebugSettings.debugCompletion) {
			debugLogMessage('ContextFunction.completion');
		}
		
		if (this._argEndPos && Helpers.isPositionAfter(position, this._argEndPos)) {
			return this._statements?.completion(document, position) ?? [];
			
		} else if (this._argBeginPos && Helpers.isPositionAfter(position, this._argBeginPos)) {
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
		s = `${s} ${this.logRange}`;
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
