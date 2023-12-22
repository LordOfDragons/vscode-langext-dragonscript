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
import { Definition, DocumentSymbol, Hover, Position, RemoteConsole, SymbolKind } from "vscode-languageserver";
import { ExpressionBlockCstNode } from "../nodeclasses/expressionBlock";
import { ContextFunctionArgument } from "./classFunctionArgument";
import { ContextStatements } from "./statements";
import { ResolveSearch } from "../resolve/search";
import { ResolveState } from "../resolve/state";
import { ResolveFunction } from "../resolve/function";
import { Helpers } from "../helpers";
import { HoverInfo } from "../hoverinfo";
import { ResolveNamespace } from "../resolve/namespace";
import { TypeName } from "./typename";
import { IToken } from "chevrotain";


export class ContextBlock extends Context{
	protected _node: ExpressionBlockCstNode;
	protected _tokenBlock: IToken;
	protected _arguments: ContextFunctionArgument[];
	protected _statements: ContextStatements;
	protected _resolveFunction?: ResolveFunction;
	protected _returnType: TypeName;


	constructor(node: ExpressionBlockCstNode, parent: Context) {
		super(Context.ContextType.Block, parent);
		
		const children = node.children.expressionBlockBegin[0].children;
		
		this._node = node;
		this._tokenBlock = children.block[0];
		this._arguments = [];
		this._returnType = TypeName.typeObject;
		
		const funcArgs = children.functionArgument;
		if (funcArgs) {
			for (const each of funcArgs) {
				this._arguments.push(new ContextFunctionArgument(each, this));
			}
		}
		
		this._statements = new ContextStatements(node.children.statements[0], this);
		
		let tokBegin = this._tokenBlock;
		let tokEnd = node.children.expressionBlockEnd[0].children.end[0];
		
		this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
		
		let args = this._arguments.map(each => `${each.typename.name} ${each.name.name}`);
		let argText = args.length > 0 ? args.reduce((a,b) => `${a}, ${b}`) : "";
		
		this.documentSymbol = DocumentSymbol.create("block", `(${argText}): Object`,
			SymbolKind.Function, this.range, Helpers.rangeFrom(tokBegin, tokEnd, true, true));
		
		let collected: DocumentSymbol[] = [];
		this._statements.collectChildDocSymbols(collected);
		if (collected.length > 0) {
			if (!this.documentSymbol.children) {
				this.documentSymbol.children = [];
			}
			this.documentSymbol.children.push(...collected);
		}
	}
	
	public dispose(): void {
		this._resolveFunction?.dispose();
		this._resolveFunction = undefined;
		this._returnType.dispose();
		
		super.dispose();
		for (const each of this._arguments) {
			each.dispose();
		}
		this._statements?.dispose();
	}


	public get node(): ExpressionBlockCstNode {
		return this._node;
	}

	public get arguments(): ContextFunctionArgument[] {
		return this._arguments;
	}
	
	public get simpleName(): string {
		return "run";
	}
	
	public get statements(): ContextStatements | undefined {
		return this.statements;
	}

	public get returnType(): TypeName {
		return this._returnType;
	}
	
	public get resolveFunction(): ResolveFunction | undefined {
		return this._resolveFunction;
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
			
		} else if(search.name) {
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
	
	public resolveMembers(state: ResolveState): void {
		this._returnType.resolveType(state, this);
		
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveMembers(state);
			}
			this._statements?.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		this.expressionType = ResolveNamespace.classBlock;
		this.expressionTypeType = Context.ExpressionType.Object;
		
		this._resolveFunction?.dispose();
		this._resolveFunction = undefined;
		
		this._resolveFunction = new ResolveFunction(this);
		
		state.withScopeContext(this, () => {
			for (const each of this._arguments) {
				each.resolveStatements(state);
			}
			this._statements?.resolveStatements(state);
		});
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this.contextAtPositionList(this._arguments, position)
			?? this._statements?.contextAtPosition(position)
			?? this;
	}
	
	protected updateHover(position: Position): Hover | null {
		if (Helpers.isPositionInsideToken(this._tokenBlock, position)) {
			return new HoverInfo(this.resolveTextLong, Helpers.rangeFrom(this._tokenBlock));
		}
		return null;
	}
	
	protected updateResolveTextShort(): string {
		let parts = [];
		parts.push('public Object block (');
		
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
		parts.push('public **function** Object **block** (');
		
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
		parts.push('public Object block (');
		
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
	
	public definition(position: Position): Definition {
		if (Helpers.isPositionInsideToken(this._node.children.expressionBlockBegin[0].children.block[0], position)) {
			return this.definitionSelf();
		}
		return super.definition(position);
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		var s = `${prefix}Block (`;
		var delimiter = "";
		for (const each of this._arguments) {
			s = `${s}${delimiter}${each.typename.name} ${each.name}`;
			delimiter = ", ";
		}
		s = `${s}) ${this.logRange}`;
		console.log(s);

		this.logChild(this._statements, console, prefixLines);
	}
}
