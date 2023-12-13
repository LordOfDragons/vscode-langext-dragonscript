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
import { DiagnosticRelatedInformation, DocumentSymbol, Hover, Position, RemoteConsole } from "vscode-languageserver";
import { ContextStatements } from "./statements";
import { StatementCatchCstNode, StatementTryCstNode } from "../nodeclasses/statementTry";
import { TypeName } from "./typename";
import { Identifier } from "./identifier";
import { Helpers } from "../helpers";
import { ResolveState } from "../resolve/state";
import { ResolveType } from "../resolve/type";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { HoverInfo } from "../hoverinfo";
import { ResolveSearch } from "../resolve/search";


export class ContextTryCatch extends Context {
	protected _node: StatementCatchCstNode;
	protected _typename: TypeName;
	protected _variable: Identifier;
	protected _statements: ContextStatements;
	
	
	constructor(node: StatementCatchCstNode, parent: Context) {
		super(Context.ContextType.TryCatch, parent);
		
		let c = node.children;
		
		this._node = node;
		this._typename = new TypeName(c.type[0]);
		this._variable = new Identifier(c.variable[0]);
		this._statements = new ContextStatements(c.statements[0], parent);
		
		const tokBegin = node.children.catch[0];
		let tokEnd = this._statements.range?.end;
		
		if (tokEnd) {
			this.range = Helpers.rangeFromPosition(Helpers.positionFrom(tokBegin), tokEnd);
		}
	}
	
	public dispose(): void {
		this._typename.dispose();
		this._statements.dispose();
	}
	
	
	public get typename(): TypeName {
		return this._typename;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		this._typename.resolveType(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
		});
		
		const t1 = this._typename.resolve as ResolveType;
		const t2 = ResolveNamespace.classException;
		if (t1 && ResolveSignatureArgument.typeMatches(t1, t2, Context.AutoCast.No) == ResolveSignature.Match.No) {
			let ri: DiagnosticRelatedInformation[] = [];
			t1.addReportInfo(ri, `Source Type: ${t1.reportInfoText}`);
			t2.addReportInfo(ri, `Target Type: ${t2.reportInfoText}`);
			state.reportError(this._typename.range, `Exception: Invalid cast from ${t1.name} to ${t2.name}`, ri);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		if (this._variable.isPositionInside(position) || this._typename.isPositionInside(position)) {
			return this;
		}
		return this._statements.contextAtPosition(position);
	}
	
	protected updateHover(position: Position): Hover | null {
		if (this._variable.isPositionInside(position)) {
			return new HoverInfo(this.resolveTextLong, this._variable.range);
			
		} else if (this._typename.isPositionInside(position)) {
			return this._typename.hover(position);
			
		} else {
			return null;
		}
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._statements.collectChildDocSymbols(list);
	}
	
	protected updateResolveTextShort(): string {
		return `${this._typename} ${this._variable}`;
	}
	
	protected updateResolveTextLong(): string[] {
		return [`**argument** *${this._typename}* **${this._variable}**`];
	}
	
	protected updateReportInfoText(): string {
		return `${this._typename} ${this._variable}`;
	}
	
	public search(search: ResolveSearch, before: Context | undefined = undefined): void {
		if (search.onlyTypes) {
			return;
		}
		if (this._variable.name == search.name) {
			search.arguments.push(this);
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = ""): void {
		console.log(`${prefix}- Catch ${this._typename} ${this._variable}`);
		this._statements.log(console, `${prefix}  - `, `${prefix}    `);
	}
}


export class ContextTry extends Context {
	protected _node: StatementTryCstNode;
	protected _statements: ContextStatements;
	protected _catches: ContextTryCatch[];
	
	
	constructor(node: StatementTryCstNode, parent: Context) {
		super(Context.ContextType.Try, parent);
		this._node = node;
		this._catches = [];
		
		this._statements = new ContextStatements(node.children.statements[0], this);
		
		const catches = node.children.statementCatch;
		if (catches) {
			for (const each of catches) {
				this._catches.push(new ContextTryCatch(each, this));
			}
		}
		
		const tokBegin = node.children.statementTryBegin[0].children.try[0];
		let tokEnd = node.children.statementTryEnd[0].children.end[0];
		
		this.range = Helpers.rangeFrom(tokBegin, tokEnd, true, false);
	}
	
	public dispose(): void {
		super.dispose();
		this._statements.dispose();
		for (const each of this._catches) {
			each.dispose();
		}
	}
	
	
	public get node(): StatementTryCstNode {
		return this._node;
	}
	
	public get statements(): Context {
		return this._statements;
	}
	
	public get catches(): ContextTryCatch[] {
		return this._catches;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
			for (const each of this._catches) {
				each.resolveMembers(state);
			}
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
			for (const each of this._catches) {
				each.resolveStatements(state);
			}
		});
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._statements.contextAtPosition(position)
			?? this.contextAtPositionList(this._catches, position);
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._statements.collectChildDocSymbols(list);
		for (const each of this._catches) {
			each.collectChildDocSymbols(list);
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Try`);
		this.logChild(this._statements, console, prefixLines);
		for (const each of this._catches) {
			each.log(console, prefixLines);
		}
	}
}
