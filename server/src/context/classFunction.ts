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
import { RemoteConsole } from "vscode-languageserver";
import { TypeName } from "./typename";
import { ContextFunctionArgument } from "./classFunctionArgument";
import { ContextBuilder } from "./contextBuilder";
import { Identifier } from "./identifier";
import { ContextStatements } from "./statements";


export class ContextFunction extends Context{
	protected _node: InterfaceFunctionCstNode | ClassFunctionCstNode;
	protected _typeModifiers: Context.TypeModifierSet;
	protected _functionType: ContextFunction.Type;
	protected _name: Identifier;
	protected _returnType?: TypeName;
	protected _arguments: ContextFunctionArgument[];
	protected _thisCall?: Context[];
	protected _superCall?: Context[];
	protected _statements?: ContextStatements;


	constructor(node: InterfaceFunctionCstNode | ClassFunctionCstNode,
			    typemodNode: TypeModifiersCstNode | undefined,
				ownerTypeName: string) {
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
			this._functionType = ContextFunction.Type.Regular;
			this._name = new Identifier(undefined, "??");
			this._returnType = TypeName.typeVoid();
			return;
		}

		if (fdecl.children.classConstructor) {
			let fdecl2 = fdecl.children.classConstructor[0].children;
			this._functionType = ContextFunction.Type.Constructor;
			this._name = new Identifier(undefined, "new");
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
						this._thisCall = args.map(each => ContextBuilder.createExpression(each));
					} else if (fdecl2.super) {
						this._superCall = args.map(each => ContextBuilder.createExpression(each));
					}
				}
			}

		} else if (fdecl.children.classDestructor) {
			this._functionType = ContextFunction.Type.Destructor;
			this._name = new Identifier(undefined, "destructor");
			this._returnType = TypeName.typeVoid();

		} else if (fdecl.children.regularFunction) {
			let fdecl2 = fdecl.children.regularFunction[0].children;

			if (fdecl2.name) {
				this._functionType = ContextFunction.Type.Regular;
				this._name = new Identifier(fdecl2.name[0]);
				this._returnType = new TypeName(fdecl2.returnType[0]);

			} else if(fdecl2.operator) {
				this._functionType = ContextFunction.Type.Operator;
				this._returnType = TypeName.typeNamed(ownerTypeName);
				
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
				this._returnType = TypeName.typeVoid();
			}

			if (fdecl2.functionArguments) {
				let args = fdecl2.functionArguments[0].children.functionArgument;
				if (args) {
					args.forEach(each => this._arguments.push(new ContextFunctionArgument(each)));
				}
			}

		} else {
			this._functionType = ContextFunction.Type.Regular;
			this._name = new Identifier(undefined, "??");
			this._returnType = TypeName.typeVoid();
		}

		if (cfdecl && cfdecl.children.statements) {
			this._statements = new ContextStatements(cfdecl.children.statements[0]);
		}
	}

	dispose(): void {
		super.dispose()
		this._returnType?.dispose();
		this._arguments.forEach(each => each.dispose);
		this._thisCall?.forEach(each => each.dispose);
		this._superCall?.forEach(each => each.dispose);
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

	public get thisCall(): Context[] | undefined {
		return this._thisCall;
	}

	public get superCall(): Context[] | undefined{
		return this._superCall;
	}

	public get statements(): ContextStatements | undefined {
		return this.statements;
	}


	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		var s = `${prefix}Function ${ContextFunction.Type[this._functionType]}: ${this._typeModifiers}`;
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
			console.log(`${prefixLines}- this`);
			this.logChildren(this._thisCall, console, `${prefixLines}  `, "Arg: ");
		} else if (this._superCall) {
			console.log(`${prefixLines}- super`);
			this.logChildren(this._superCall, console, `${prefixLines}  `, "Arg: ");
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
