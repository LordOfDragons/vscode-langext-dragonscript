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
import { CompletionItem, DiagnosticRelatedInformation, DocumentSymbol, Hover, Location, Position, Range, RemoteConsole } from "vscode-languageserver";
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
import { Resolved, ResolveUsage } from "../resolve/resolved";
import { ResolveArgument } from "../resolve/argument";
import { TextDocument } from "vscode-languageserver-textdocument";


export class ContextTryCatch extends Context {
	protected _node: StatementCatchCstNode;
	protected _typename: TypeName;
	protected _variable: Identifier;
	protected _statements: ContextStatements;
	protected _resolveArgument?: ResolveArgument;
	
	
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
		this._resolveArgument?.dispose();
		this._resolveArgument = undefined;
	}
	
	
	public get statements(): ContextStatements {
		return this._statements;
	}
	
	public get typename(): TypeName {
		return this._typename;
	}
	
	public get simpleName(): string {
		return this._variable.name;
	}
	
	public get resolveArgument(): ResolveArgument | undefined {
		return this._resolveArgument;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		this._resolveArgument?.dispose();
		this._resolveArgument = undefined;
		
		this._typename.resolveType(state, this);
		
		this._resolveArgument = new ResolveArgument(this);
		
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
		});
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
		});
		
		const t1 = this._typename.resolve?.resolved as ResolveType;
		const t2 = ResolveNamespace.classException;
		if (t1 && ResolveSignatureArgument.typeMatches(t1, t2, Context.AutoCast.No) === ResolveSignature.Match.No) {
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
		return this._statements.contextAtPosition(position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._statements.contextAtRange(range)
			?? this;
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
	
	public search(search: ResolveSearch, before?: Context): void {
		if (search.onlyTypes || search.stopSearching) {
			return;
		}
		
		if (search.matchableName) {
			if (search.matchableName.matches(this._variable.matchableName)) {
				search.addArgument(this);
			}
			
		} else if (this._variable.name == search.name || !search.name) {
			search.addArgument(this);
		}
	}
	
	public resolvedAtPosition(position: Position): Resolved | undefined {
		if (this._variable.isPositionInside(position)) {
			return this._resolveArgument;
		} else if (this._typename?.isPositionInside(position)) {
			return this._typename.resolve?.resolved;
		}
		return super.resolvedAtPosition(position);
	}
	
	public referenceFor(usage: ResolveUsage): Location | undefined {
		return this._typename?.location(this)
			?? super.referenceFor(usage);
	}
	
	public get referenceSelf(): Location | undefined {
		return this.resolveLocation(this._variable.range);
	}
	
	public completion(document: TextDocument, position: Position): CompletionItem[] {
		const npos = this._variable?.range?.start;
		if (!npos || Helpers.isPositionBefore(position, npos)) {
			if (this._typename) {
				return this._typename.completion(document, position, this);
			}
		}
		return super.completion(document, position);
	}
	
	
	public log(console: RemoteConsole, prefix: string = ""): void {
		console.log(`${prefix}- Catch ${this._typename} ${this._variable} ${this.logRange}`);
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
	
	public get statements(): ContextStatements {
		return this._statements;
	}
	
	public get catches(): ContextTryCatch[] {
		return this._catches;
	}
	
	
	public resolveMembers(state: ResolveState): void {
		super.resolveMembers(state);
		
		state.withScopeContext(this, () => {
			this._statements.resolveMembers(state);
		});
		
		for (const each of this._catches) {
			each.resolveMembers(state);
		}
	}
	
	public resolveStatements(state: ResolveState): void {
		state.withScopeContext(this, () => {
			this._statements.resolveStatements(state);
		});
		
		for (const each of this._catches) {
			each.resolveStatements(state);
		}
	}
	
	public contextAtPosition(position: Position): Context | undefined {
		if (!Helpers.isPositionInsideRange(this.range, position)) {
			return undefined;
		}
		return this._statements.contextAtPosition(position)
			?? this.contextAtPositionList(this._catches, position)
			?? this;
	}
	
	public contextAtRange(range: Range): Context | undefined {
		if (!Helpers.isRangeInsideRange(this.range, range)) {
			return undefined;
		}
		return this._statements.contextAtRange(range)
			?? this.contextAtRangeList(this._catches, range)
			?? this;
	}
	
	public collectChildDocSymbols(list: DocumentSymbol[]) {
		super.collectChildDocSymbols(list);
		this._statements.collectChildDocSymbols(list);
		for (const each of this._catches) {
			each.collectChildDocSymbols(list);
		}
	}
	
	
	public log(console: RemoteConsole, prefix: string = "", prefixLines: string = ""): void {
		console.log(`${prefix}Try ${this.logRange}`);
		this.logChild(this._statements, console, prefixLines);
		for (const each of this._catches) {
			each.log(console, prefixLines);
		}
	}
}
