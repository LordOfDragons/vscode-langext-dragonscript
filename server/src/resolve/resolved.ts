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

import { DiagnosticRelatedInformation, Location, Range } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextDocumentation } from "../context/documentation";
import { MatchableName } from "../matchableName";

/** Resolved usage. */
export class ResolveUsage{
	protected _resolved?: Resolved;
	protected _context?: Context;
	protected _target: any;
	public range?: Range;
	public write: boolean = false;
	
	
	constructor (resolved: Resolved, context: Context, target?: any) {
		this._resolved = resolved;
		this._context = context;
		this._target = target;
		
		if (resolved.canUsage) {
			resolved.addUsage(this);
		}
	}
	
	public dispose(): void {
		if (this._resolved?.canUsage) {
			this._resolved.removeUsage(this);
		}
		
		this._resolved = undefined;
		this._context = undefined;
		this._target = undefined;
	}
	
	public get resolved(): Resolved | undefined {
		return this._resolved;
	}
	
	public get context(): Context | undefined {
		return this._context;
	}
	
	/*public get target(): any {
		return this._target;
	}*/
	
	public get reference(): Location | undefined {
		return this.context?.referenceFor(this);
	}
	
	/** For use by Resolved class only. */
	public drop(): void {
		this._resolved = undefined;
	}
}

/** Base class for resolves. */
export class Resolved{
	protected _type: Resolved.Type;
	protected _name: string;
	protected _matchableName?: MatchableName;
	protected _fullyQualifiedName?: string;
	protected _displayName?: string;
	protected _linkName?: string;
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];
	protected _reportInfoText?: string;
	protected _usage: Set<ResolveUsage> = new Set();
	
	
	constructor (name: string, type: Resolved.Type) {
		this._name = name;
		this._type = type;
	}
	
	public dispose(): void {
		for (const each of this._usage) {
			each.drop();
		}
		this._usage = new Set();
		
		this.removeFromParent();
	}
	
	
	public canUsage: boolean = true;
	
	
	public get type(): Resolved.Type {
		return this._type;
	}


	public get name(): string {
		return this._name;
	}
	
	public get matchableName(): MatchableName {
		if (!this._matchableName) {
			this._matchableName = new MatchableName(this._name);
		}
		return this._matchableName;
	}

	public get fullyQualifiedName(): string {
		if (!this._fullyQualifiedName) {
			if (this.parent) {
				const pfqn = this.parent.fullyQualifiedName;
				this._fullyQualifiedName = pfqn != "" ? `${pfqn}.${this._name}` : this._name;
			} else {
				this._fullyQualifiedName = this._name;
			}
		}
		return this._fullyQualifiedName;
	}

	public get displayName(): string {
		if (!this._displayName) {
			this._displayName = this.parent ? this.fullyQualifiedName : "(root)";
		}
		return this._displayName;
	}
	
	public get linkName(): string {
		if (!this._linkName) {
			this._linkName = this.parent ? `${this.parent.name}.${this.name}` : this.name;
		}
		return this._linkName;
	}
	
	public get simpleName(): string {
		return this._name;
	}
	
	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		return `${this._name}`;
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
	}

	protected updateResolveTextLong(): string[] {
		return [`${this.fullyQualifiedName}`];
	}

	public get reportInfoText(): string {
		if (!this._reportInfoText) {
			this._reportInfoText = this.updateReportInfoText();
		}
		return this._reportInfoText ?? "?";
	}

	protected updateReportInfoText(): string {
		return `${this._name}`;
	}
	
	public createReportInfo(_message: string): DiagnosticRelatedInformation | undefined {
		return undefined;
	}
	
	public addReportInfo(relatedInformation: DiagnosticRelatedInformation[], message: string) {
		var info = this.createReportInfo(message);
		if (info) {
			relatedInformation.push(info);
		}
	}
	
	public get resolveLocation(): Location[] {
		return [];
	}
	
	public get references(): Location[] {
		return [];
	}
	
	public get documentation(): ContextDocumentation | undefined {
		return undefined;
	}
	
	
	public parent?: Resolved;
	
	public removeFromParent(): void {
		this.parent = undefined;
	}
	
	
	public get usage(): Set<ResolveUsage> {
		return this._usage;
	}
	
	/** For use by ResolveUsage only. */
	public addUsage(usage: ResolveUsage): void {
		this._usage.add(usage);
	}
	
	/** For use by ResolveUsage only. */
	public removeUsage(usage: ResolveUsage): void {
		this._usage.delete(usage);
	}
}

export namespace Resolved {
	export enum Type {
		Namespace,
		Class,
		Interface,
		Enumeration,
		Function,
		FunctionGroup,
		Variable,
		Argument,
		LocalVariable
	}
}
