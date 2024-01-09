/**
 * MIT License
 *
 * Copyright (c) 2023 DragonDreams (info@dragondreams.ch)
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

import { Context } from '../context/context';
import { ResolveType } from './type';


/**
 * Signature argument with type and optional name.
 */
export class ResolveSignatureArgument{
	protected _type?: ResolveType;
	protected _name?: string;
	protected _autoCast: Context.AutoCast = Context.AutoCast.No;

	constructor (type: ResolveType | undefined, name?: string, autoCast?: Context.AutoCast) {
		this._type = type;
		this._name = name;
		this._autoCast = autoCast ?? Context.AutoCast.No;
	}

	public get name(): string | undefined {
		return this._name;
	}

	public get type(): ResolveType | undefined {
		return this._type;
	}
	
	public get autoCast(): Context.AutoCast {
		return this._autoCast;
	}
	
	public matches(target: ResolveSignatureArgument): ResolveSignature.Match {
		return ResolveSignatureArgument.typeMatches(this._type, target._type, this._autoCast);
	}
	
	public static exprMatches(from: Context, to: Context) {
		return ResolveSignatureArgument.typeMatches(from.expressionType, to.expressionType, from.expressionAutoCast);
	}
	
	public static typeMatches(fromType: ResolveType | undefined, toType: ResolveType | undefined,
	autoCast: Context.AutoCast): ResolveSignature.Match {
		if (!fromType || !toType) {
			return ResolveSignature.Match.Wildcard;
		}
		if (fromType === toType) {
			return ResolveSignature.Match.Full;
		}
		if (fromType.castable(toType)) {
			return ResolveSignature.Match.Partial;
		}
		
		if (autoCast === Context.AutoCast.No && fromType?.autoCast) {
			autoCast = fromType.autoCast;
		}
		
		switch (autoCast) {
		case Context.AutoCast.KeywordNull:
			return ResolveSignature.Match.Partial;
			
		case Context.AutoCast.LiteralByte:
		case Context.AutoCast.ValueByte:
			if (toType.fullyQualifiedName == 'int' || toType.fullyQualifiedName == 'float') {
				return ResolveSignature.Match.Partial;
			}
			break;
			
		case Context.AutoCast.LiteralInt:
		case Context.AutoCast.ValueInt:
			if (toType.fullyQualifiedName == 'float' || toType.fullyQualifiedName == 'byte') {
				return ResolveSignature.Match.Partial;
			}
			break;
			
		default:
			break;
		}
		
		return ResolveSignature.Match.No;
	}
};

/**
 * Function signature or call signature.
 */
export class ResolveSignature{
	protected _resolveTextShort?: string;
	protected _resolveTextLong?: string[];


	constructor () {
	}

	public dispose(): void {
		this.arguments.splice(0)
	}


	/**
	 * Function or call arguments. An argument with type 'undefined' means unknown
	 * or wildcard and matches anything.
	 */
	public arguments: ResolveSignatureArgument[] = [];

	public addArgument(type: ResolveType | undefined, name?: string, autoCast?: Context.AutoCast) {
		this.arguments.push(new ResolveSignatureArgument(type, name, autoCast));
	}

	public get displayName(): string {
		return this.resolveTextShort;
	}

	public get resolveTextShort(): string {
		if (!this._resolveTextShort) {
			this._resolveTextShort = this.updateResolveTextShort();
		}
		return this._resolveTextShort ?? "?";
	}

	protected updateResolveTextShort(): string {
		if (this.arguments.length == 0) {
			return "()";
		}

		var parts = this.arguments.map(each => {
			const name: string = each.name !== undefined ? `${each.name} ` : "";
			const type: string = each.type?.name ?? "?";
			return `${name}${type}`;
		});
		return `(${parts.join(",")})`;
	}

	public get resolveTextLong(): string[] {
		if (!this._resolveTextLong) {
			this._resolveTextLong = this.updateResolveTextLong();
		}
		return this._resolveTextLong ?? ["?"];
	}

	protected updateResolveTextLong(): string[] {
		if (arguments.length == 0) {
			return ["()"];
		}

		var parts = this.arguments.map(each => {
			const name: string = each.name !== undefined ? `${each.name} ` : "";
			const type: string = each.type?.fullyQualifiedName ?? "?";
			return `${name}${type}`;
		});
		return [`(${parts.join(",")})`];
	}

	protected updateReportInfoText(): string {
		if (arguments.length == 0) {
			return "()";
		}

		var parts = this.arguments.map(each => {
			const name: string = each.name !== undefined ? `${each.name} ` : "";
			const type: string = each.type?.fullyQualifiedName ?? "?";
			return `${name}${type}`;
		});
		return `(${parts.join(",")})`;
	}


	/** Signatures match (this exact/cast signature) */
	public matches(signature: ResolveSignature): ResolveSignature.Match {
		const len = this.arguments.length;
		if (len != signature.arguments.length) {
			return ResolveSignature.Match.No;
		}
		
		var result = ResolveSignature.Match.Full;
		
		for (var i=0; i<len; i++) {
			switch (this.arguments[i].matches(signature.arguments[i])) {
			case ResolveSignature.Match.Full:
				continue;
				
			case ResolveSignature.Match.Partial:
				result = ResolveSignature.Match.Partial;
				break;
				
			case ResolveSignature.Match.Wildcard:
				result = ResolveSignature.Match.Wildcard;
				break;
				
			case ResolveSignature.Match.No:
				return ResolveSignature.Match.No;
			}
		}
		
		return result;
	}

	/** Signatures match exactly. */
	public matchesExactly(signature: ResolveSignature): boolean {
		const len = this.arguments.length;
		if (len != signature.arguments.length) {
			return false;
		}

		for (var i=0; i<len; i++) {
			const at1 = this.arguments[i].type;
			const at2 = signature.arguments[i].type;
			if (!at1 || !at2 || at1 !== at2) {
				return false;
			}
		}
		return true;
	}
}


export namespace ResolveSignature {
	export enum Match {
		/** Exact match. */
		Full,

		/** Partial match requiring auto-casting. */
		Partial,

		/** Match using wildcard or error. */
		Wildcard,

		/** No match. */
		No
	}
}
