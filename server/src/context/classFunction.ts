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
import { ClassFunctionCstNode, FunctionBeginCstNode, InterfaceFunctionCstNode, TypeModifiersCstNode } from "../nodeclasses";
import { RemoteConsole } from "vscode-languageserver";
import { TypeName } from "./typename";
import { ContextFunctionArgument } from "./classFunctionArgument";

export class ContextFunction extends Context{
	protected _node: InterfaceFunctionCstNode | ClassFunctionCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _functionType: ContextFunction.ContextFunctionType;
	protected _name: string;
	protected _returnType?: TypeName;
	protected _arguments: ContextFunctionArgument[];
	protected _thisCall?: any[]; // expression
	protected _superCall?: any[]; // expression

	constructor(node: InterfaceFunctionCstNode | ClassFunctionCstNode,
			    typemodNode: TypeModifiersCstNode | undefined, ownerTypeName: string) {
		super(Context.ContextType.Function);
		this._node = node;
		this._arguments = [];
		this._typeModifiers = new Context.TypeModifierSet(typemodNode);

		let ifdecl = node as InterfaceFunctionCstNode;
		let cfdecl = node as ClassFunctionCstNode;
		var fdecl: FunctionBeginCstNode | undefined;

		if (ifdecl && ifdecl.children.functionBegin) {
			fdecl = ifdecl.children.functionBegin[0];
		} else if (cfdecl && cfdecl.children.functionBegin) {
			fdecl = cfdecl.children.functionBegin[0];
		}

		if (!fdecl) {
			this._functionType = ContextFunction.ContextFunctionType.Regular;
			this._name = "??";
			this._returnType = TypeName.typeVoid();
			return;
		}

		if (fdecl.children.classConstructor) {
			let fdecl2 = fdecl.children.classConstructor[0].children;
			this._functionType = ContextFunction.ContextFunctionType.Constructor;
			this._name = "new";
			this._returnType = TypeName.typeNamed(ownerTypeName);
			this._typeModifiers.add(Context.TypeModifier.Static);

			if (fdecl2.functionArguments) {
				let args = fdecl2.functionArguments[0].children.functionArgument;
				if (args) {
					args.forEach(each => this._arguments.push(new ContextFunctionArgument(each)));
				}
			}
			
			if (fdecl2.functionCall) {
				let args = fdecl2.functionCall[0].children.argument;
				if (args) {
					if (fdecl2.this) {
						this._thisCall = args.map(each => new Context(Context.ContextType.Generic));
					} else if (fdecl2.super) {
						this._superCall = args.map(each => new Context(Context.ContextType.Generic));
					}
				}
			}

		} else if (fdecl.children.classDestructor) {
			this._functionType = ContextFunction.ContextFunctionType.Destructor;
			this._name = "destructor";
			this._returnType = TypeName.typeVoid();

		} else if (fdecl.children.regularFunction) {
			let fdecl2 = fdecl.children.regularFunction[0].children;

			if (fdecl2.name) {
				this._functionType = ContextFunction.ContextFunctionType.Regular;
				this._name = fdecl2.name[0].image;
				this._returnType = new TypeName(fdecl2.returnType[0]);

			} else if(fdecl2.operator) {
				this._functionType = ContextFunction.ContextFunctionType.Operator;
				this._returnType = TypeName.typeNamed(ownerTypeName);
				
				let odecl = fdecl2.operator[0].children;
				if (odecl.assignMultiply) {
					this._name = "*=";
				} else if(odecl.assignDivide) {
					this._name = "/=";
				} else if(odecl.assignModulus) {
					this._name = "%=";
				} else if(odecl.assignAdd) {
					this._name = "+=";
				} else if(odecl.assignSubtract) {
					this._name = "-=";
				} else if(odecl.assignShiftLeft) {
					this._name = "<<=";
				} else if(odecl.assignShiftRight) {
					this._name = ">>=";
				} else if(odecl.assignAnd) {
					this._name = "&=";
				} else if(odecl.assignOr) {
					this._name = "|=";
				} else if(odecl.assignXor) {
					this._name = "^=";
				} else if(odecl.and) {
					this._name = "&";
				} else if(odecl.or) {
					this._name = "|";
				} else if(odecl.xor) {
					this._name = "^";
				} else if(odecl.shiftLeft) {
					this._name = "<<";
				} else if(odecl.shiftRight) {
					this._name = ">>";
				} else if(odecl.less) {
					this._name = "<";
				} else if(odecl.greater) {
					this._name = ">";
				} else if(odecl.lessEqual) {
					this._name = "<=";
				} else if(odecl.greaterEqual) {
					this._name = ">=";
				} else if(odecl.multiply) {
					this._name = "*";
				} else if(odecl.divide) {
					this._name = "/";
				} else if(odecl.modulus) {
					this._name = "%";
				} else if(odecl.add) {
					this._name = "+";
				} else if(odecl.subtract) {
					this._name = "-";
				} else if(odecl.increment) {
					this._name = "++";
				} else if(odecl.decrement) {
					this._name = "--";
				} else if(odecl.inverse) {
					this._name = "~";
				} else {
					this._name = "??";
				}

			} else {
				this._functionType = ContextFunction.ContextFunctionType.Regular;
				this._name = "??";
				this._returnType = TypeName.typeVoid();
			}

			if (fdecl2.functionArguments) {
				let args = fdecl2.functionArguments[0].children.functionArgument;
				if (args) {
					args.forEach(each => this._arguments.push(new ContextFunctionArgument(each)));
				}
			}

		} else {
			this._functionType = ContextFunction.ContextFunctionType.Regular;
			this._name = "??";
			this._returnType = TypeName.typeVoid();
		}
	}

	dispose(): void {
		super.dispose()
		this._returnType?.dispose();
		this._arguments.forEach(each => each.dispose);
		this._thisCall?.forEach(each => each.dispose);
		this._superCall?.forEach(each => each.dispose);
	}

	public get node(): InterfaceFunctionCstNode | ClassFunctionCstNode {
		return this._node;
	}

	public get typeModifiers(): Context.TypeModifierSet {
		return this._typeModifiers;
	}

	public get functionType(): ContextFunction.ContextFunctionType {
		return this._functionType;
	}

	public get name(): string {
		return this._name;
	}

	public get returnType(): TypeName | undefined {
		return this._returnType;
	}

	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}

	public get thisCall(): any[] | undefined {
		return this._thisCall;
	}

	public get superCall(): any[] | undefined{
		return this._superCall;
	}

	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		var s = `${prefix}Function ${ContextFunction.ContextFunctionType[this._functionType]}: ${this._typeModifiers}`;
		if (this._returnType) {
			s = `${s} ${this._returnType.name}`;
		}
		s = `${s} ${this._name}(`;
		var delimiter = "";
		this._arguments.forEach(each => {
			s = `${s}${delimiter}${each.typename.name} ${each.name}`;
			delimiter = ", ";
		});
		s = `${s})`;
		console.log(s);

		if (this._thisCall) {
			console.log(`${prefixLines}- this(${this._thisCall.length} arguments)`);
		} else if (this._superCall) {
			console.log(`${prefixLines}- super(${this._superCall.length} arguments)`);
		}
		
		this.logChildren(console, prefixLines);
	}
}

export namespace ContextFunction {
	/** Function type. */
	export enum ContextFunctionType {
		Constructor,
		Destructor,
		Operator,
		Regular
	}
}
