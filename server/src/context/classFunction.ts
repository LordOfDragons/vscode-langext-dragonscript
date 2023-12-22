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
import { FunctionBeginCstNode } from "../nodeclasses/declareFunction";
import { InterfaceFunctionCstNode } from "../nodeclasses/declareInterface";
import { ClassFunctionCstNode } from "../nodeclasses/declareClass";
import { TypeModifiersCstNode } from "../nodeclasses/typeModifiers";
import { Definition, DocumentSymbol, Hover, Location, Position, RemoteConsole, SymbolInformation, SymbolKind } from "vscode-languageserver";
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


export class ContextFunction extends Context{
	protected _node: InterfaceFunctionCstNode | ClassFunctionCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _functionType: ContextFunction.Type;
	protected _name: Identifier;
	protected _returnType?: TypeName;
	protected _arguments: ContextFunctionArgument[] = [];
	protected _superToken?: IToken;
	protected _superCall?: ContextFunctionCall;
	protected _statements?: ContextStatements;
	protected _resolveFunction?: ResolveFunction;


	constructor(node: InterfaceFunctionCstNode | ClassFunctionCstNode,
				typemodNode: TypeModifiersCstNode | undefined,
				ownerTypeName: string, parent: Context) {
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
			this._name = new Identifier(undefined, "??");
			this._returnType = TypeName.typeVoid;
			return;
		}

		if (fdecl.children.classConstructor) {
			let fdecl2 = fdecl.children.classConstructor[0].children;
			this._functionType = ContextFunction.Type.Constructor;
			this._name = new Identifier(fdecl2.identifier[0]); // is always "new"
			this._returnType = TypeName.typeNamed(ownerTypeName);
			this._typeModifiers.add(Context.TypeModifier.Static);

			if (fdecl2.functionArguments) {
				let args = fdecl2.functionArguments[0].children.functionArgument;
				if (args) {
					for (const each of args) {
						this._arguments.push(new ContextFunctionArgument(each, this));
					}
				}
			}
			
			if (fdecl2.functionCall) {
				let args = fdecl2.functionCall[0].children.argument;
				if (args) {
					if (fdecl2.this) {
						this._superToken = fdecl2.this[0];
						this._superCall = ContextFunctionCall.newSuperCall(fdecl2.functionCall[0], this, fdecl2.this[0]);
					} else if (fdecl2.super) {
						this._superToken = fdecl2.super[0];
						this._superCall = ContextFunctionCall.newSuperCall(fdecl2.functionCall[0], this, fdecl2.super[0]);
					}
				}
			}

			let declEnd = fdecl2.endOfCommand[0].children;
			tokEnd = (declEnd.newline || declEnd.commandSeparator)![0];
			docSymKind = SymbolKind.Constructor;

		} else if (fdecl.children.classDestructor) {
			let fdecl2 = fdecl.children.classDestructor[0].children;
			this._functionType = ContextFunction.Type.Destructor;
			this._name = new Identifier(fdecl2.identifier[0]); // is always "destructor"
			this._returnType = TypeName.typeVoid;

			let declEnd = fdecl2.endOfCommand[0].children;
			tokEnd = (declEnd.newline || declEnd.commandSeparator)![0];

		} else if (fdecl.children.regularFunction) {
			let fdecl2 = fdecl.children.regularFunction[0].children;
			
			if (fdecl2.name) {
				this._functionType = ContextFunction.Type.Regular;
				this._returnType = new TypeName(fdecl2.returnType[0]);
				this._name = new Identifier(fdecl2.name[0]);

			} else if(fdecl2.operator) {
				this._functionType = ContextFunction.Type.Operator;
				this._returnType = new TypeName(fdecl2.returnType[0]);
				docSymKind = SymbolKind.Operator;
				
				let odecl = fdecl2.operator[0].children;
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
				this._name = new Identifier(undefined, "??");
				this._returnType = TypeName.typeVoid;
			}

			if (fdecl2.functionArguments) {
				let args = fdecl2.functionArguments[0].children.functionArgument;
				if (args) {
					for (const each of args) {
						this._arguments.push(new ContextFunctionArgument(each, this));
					}
				}
			}

			let declEnd = fdecl2.endOfCommand[0].children;
			tokEnd = (declEnd.newline || declEnd.commandSeparator)![0];

		} else {
			this._functionType = ContextFunction.Type.Regular;
			this._name = new Identifier(undefined, "??");
			this._returnType = TypeName.typeVoid;
		}

		if (cfdecl?.children.statements) {
			this._statements = new ContextStatements(cfdecl.children.statements[0], this);

			let declEnd = cfdecl.children.functionEnd;
			if (declEnd) {
				tokEnd = (declEnd[0].children.end || declEnd[0].children.endOfCommand)![0];
			}
		}

		if (tokBegin && tokEnd && this._name.token) {
			let args = this._arguments.map(each => `${each.typename.name} ${each.name.name}`);
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
		this._returnType?.dispose();
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

	public get name(): Identifier {
		return this._name;
	}

	public get returnType(): TypeName | undefined {
		return this._returnType;
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
		return n ? `${n}.${this._name}` : this._name.name;
	}

	public get simpleName(): string {
		return this._name.name;
	}
	
	public get resolveFunction(): ResolveFunction | undefined {
		return this._resolveFunction;
	}
	
	public resolveMembers(state: ResolveState): void {
		this._returnType?.resolveType(state, this);
		
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveMembers(state);
			}
			this._superCall?.resolveMembers(state);
			this._statements?.resolveMembers(state);
		});
		
		this._resolveFunction?.dispose();
		this._resolveFunction = undefined;

		this._resolveFunction = new ResolveFunction(this);
		if (this.parent) {
			var container: ResolveType | undefined;
			if (this.parent.type == Context.ContextType.Class) {
				container = (this.parent as ContextClass).resolveClass;
			} else if (this.parent.type == Context.ContextType.Interface) {
				container = (this.parent as ContextInterface).resolveInterface;
			}

			if (container) {
				if (!container.addFunction(this._resolveFunction)) {
					if (this._name.range) {
						state.reportError(this._name.range, `Duplicate function ${this._name}`);
					}
				}
			}
		}
		
		this._statements?.resolveMembers(state);
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveStatements(state);
			}
			this._superCall?.resolveStatements(state);
			this._statements?.resolveStatements(state);
		});
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

	protected updateHover(position: Position): Hover | null {
		if (this._name.isPositionInside(position)) {
			return new HoverInfo(this.resolveTextLong, this._name.range);
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
		parts.push(` ${this._name}(`);
		
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
		
		if (this._name.name.startsWith('*') || this._name.name.endsWith('*')) {
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
		parts.push(`${this.parent!.simpleName}.${this._name}(`);
		
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
		if (search.onlyTypes) {
			return;
		}
		
		if (search.matchableName) {
			for (const each of this._arguments) {
				if (search.matchableName.matches(each.name.matchableName)) {
					search.addArgument(each);
				}
			}
			
		} else if (search.name) {
			for (const each of this._arguments) {
				if (search.name == each.name.name) {
					search.addArgument(each);
				}
			}
			
		} else {
			for (const each of this._arguments) {
				search.addArgument(each);
			}
		}
	}
	
	public definition(position: Position): Definition {
		if (this._name.isPositionInside(position)) {
			return this.definitionSelf();
		}
		if (this._returnType?.isPositionInside(position)) {
			return this._returnType.definition(position);
		}
		return super.definition(position);
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._name.isPositionInside(position)) {
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
		return this.resolveLocation(this._name.range);
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
