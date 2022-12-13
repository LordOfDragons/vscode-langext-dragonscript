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

import { RemoteConsole } from "vscode-languageserver";
import { TypeModifiersCstNode } from "../nodeclasses";

/** Base context. */
export class Context{
	protected _type: Context.ContextType;
	public parent: Context | undefined;
	protected _children: Array<Context>;

	constructor(type: Context.ContextType){
		this._type = type;
		this.parent = undefined;
		this._children = [];
	}

	/** Dispose of context. */
	dispose(){
		this._children?.forEach(each => each.dispose());
		this._children?.splice(0);
		this.parent = undefined;
	}

	/** Type. */
	public get type(): Context.ContextType{
		return this._type;
	}

	/** Child contexts. */
	public get children(): Array<Context>{
		return this._children;
	}

	/** Debug. */
	log(console: RemoteConsole, prefix: string = "", prefixLines: string = "") {
		console.log(`${prefix}Context: ${Context.ContextType[this._type]}`);
		this.logChildren(console, prefixLines);
	}

	/** Debug log children. */
	protected logChildren(console: RemoteConsole, prefix: string) {
		let prefixChild = `${prefix}- `;
		let prefixLinesChild = `${prefix}  `;
		this._children.forEach(each => {
			each.log(console, prefixChild, prefixLinesChild);
		})
	}

	/** Set to log string. */
	protected logStringSet(set: Set<any>, enumClass: any) {
		if (set && set.size > 0) {
			return Array.from(set.values()).map(x => enumClass[x]).reduce((a, b) => `${a}, ${b}`);
		} else {
			return "()";
		}
	}
}

export namespace Context {
	/** Context type. */
	export enum ContextType {
		Script,
		Namespace,
		PinNamespace,
		Class,
		Interface,
		Enumeration,
		EnumerationEntry,
		Function,
		FunctionArgument,
		Variable,
		IfElse,
		Statements,
		Generic
	}

	/** Type modifier. */
	export enum TypeModifier {
		Public,
		Protected,
		Private,
		Abstract,
		Fixed,
		Static,
		Native
	}

	/** Type modifier set. */
	export class TypeModifierSet extends Set<Context.TypeModifier> {
		constructor(node?: TypeModifiersCstNode) {
			super();
			if (!node || !node.children.typeModifier) {
				this.add(Context.TypeModifier.Public);
				return;
			}

			node.children.typeModifier.forEach(each => {
				if (each.children.public) {
					this.add(Context.TypeModifier.Public);

				} else if (each.children.protected) {
					this.add(Context.TypeModifier.Protected);

				} else if (each.children.private) {
					this.add(Context.TypeModifier.Private);

				} else if (each.children.abstract) {
					this.add(Context.TypeModifier.Abstract);

				} else if (each.children.fixed) {
					this.add(Context.TypeModifier.Fixed);

				} else if (each.children.static) {
					this.add(Context.TypeModifier.Static);

				} else if (each.children.native) {
					this.add(Context.TypeModifier.Native);
				}
			})
		}

		toString() : string {
			if (this.size > 0) {
				return "(" + Array.from(this.values()).map(x => Context.TypeModifier[x]).reduce((a, b) => `${a}, ${b}`) + ")";
			} else {
				return "()";
			}
		}
	}
}
