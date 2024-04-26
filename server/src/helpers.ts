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

import { IToken } from "chevrotain";
import { integer, Location, Position, Range } from "vscode-languageserver"
import { ContextFunction } from "./context/classFunction";
import { Context } from "./context/context";
import { EndOfCommandCstNode } from "./nodeclasses/endOfCommand";
import { ResolveFunction } from "./resolve/function";
import { Resolved, ResolveUsage } from "./resolve/resolved";
import { debugLogMessage } from "./server";
import { URI } from "vscode-uri";


export class Helpers {
	public static rangeFrom(start: IToken, end?: IToken, startAtLeft: boolean = true, endAtLeft: boolean = false): Range {
		// note: end column ist at the left side of the last character hence (+1 -1) cancels out
		let a = start;
		let b = end || start;
		
		let startLine = a.startLine || 1;
		let endLine = b.endLine || startLine;
		
		let startColumn = startAtLeft ? (a.startColumn || 1) : (a.endColumn || 1) + 1;
		let endColumn = endAtLeft ? (b.startColumn || 1) : (b.endColumn || 1) + 1;
		
		// note: line/column in chevrotain is base-1 and in vs base-0
		return Range.create(startLine - 1, startColumn - 1, endLine - 1, endColumn - 1);
	}

	public static rangeFromPosition(start: Position, end: Position): Range {
		return Range.create(start.line, start.character, end.line, end.character);
	}

	public static positionFrom(token: IToken, atLeft: boolean = true) {
		let line = token.startLine || 1;
		let column = atLeft ? (token.startColumn || 1) : (token.endColumn || 1) + 1;

		// note: line/column in chevrotain is base-1 and in vs base-0
		return Position.create(line - 1, column - 1);
	}

	/**
	 * Shrink range.
	 * @param range Range to shink.
	 * @param cutStart Count of characters to cut from the start of the range.
	 * @param cutEnd Count of characters to cut from the end of the range.
	 * @returns Shrinked range.
	 */
	public static shrinkRange(range: Range, cutStart: integer, cutEnd: integer): Range {
		return Range.create(range.start.line, range.start.character + cutStart,
			range.end.line, range.end.character - cutEnd);
	}
	
	/**
	 * Create range spaning across two ranges. The second range can be undefined
	 * in which case the first one is used. The ranges can be in any order.
	 * @param a First range.
	 * @param b Optional second range.
	 */
	public static spanRanges(a: Range, b: Range | undefined): Range {
		if (!b) {
			return a;
		}
		
		const s = Helpers.isPositionBefore(a.start, b.start) ? a.start : b.start;
		const e = Helpers.isPositionAfter(a.end, b.end) ? a.end : b.end;
		return Range.create(s, e);
	}
	
	/** Move position. */
	public static movePosition(position: Position, characters: integer, lines: integer = 0): Position {
		return Position.create(position.line + lines, position.character + characters);
	}
	
	public static isPositionInsideRange(range: Range | undefined, position: Position): boolean {
		if (!range) {
			return false;
		}
		
		if (position.line < range.start.line) {
			return false;
		} else if (position.line == range.start.line) {
			if (position.character < range.start.character) {
				return false;
			}
		}

		if (position.line > range.end.line) {
			return false;
		} else if (position.line == range.end.line) {
			if (position.character > range.end.character) {
				return false;
			}
		}

		return true;
	}

	/** Returns true if rangeCheck is fully inside range. */
	public static isRangeInsideRange(range: Range | undefined, rangeCheck: Range): boolean {
		if (!range) {
			return false;
		}
		
		if (rangeCheck.end.line < range.start.line) {
			return false;
		} else if (rangeCheck.end.line == range.start.line) {
			if (rangeCheck.end.character < range.start.character) {
				return false;
			}
		}
		
		if (rangeCheck.start.line > range.end.line) {
			return false;
		} else if (rangeCheck.start.line == range.end.line) {
			if (rangeCheck.start.character > range.end.character) {
				return false;
			}
		}
		
		return true;
	}

	public static isPositionInsideToken(token: IToken, position: Position): boolean {
		return Helpers.isPositionInsideRange(Helpers.rangeFrom(token), position);
	}

	public static isPositionInsideTokens(start: IToken, end: IToken, position: Position): boolean {
		return Helpers.isPositionInsideRange(Helpers.rangeFrom(start, end), position);
	}
	
	/** Returns true if a is before b. */
	public static isPositionBefore(a: Position, b: Position): boolean {
		if (a.line < b.line) {
			return true;
		} else if (a.line > b.line) {
			return false;
		} else {
			return a.character < b.character;
		}
	}
	
	/** Returns true if a is after b. */
	public static isPositionAfter(a: Position, b: Position): boolean {
		if (a.line > b.line) {
			return true;
		} else if (a.line < b.line) {
			return false;
		} else {
			return a.character > b.character;
		}
	}
	
	public static endOfCommandToken(endOfCommand?: EndOfCommandCstNode[]): IToken | undefined {
		const c = endOfCommand?.at(0)?.children;
		const tok = (c?.newline ?? c?.commandSeparator)?.at(0);
		return tok && tok.isInsertedInRecovery !== true ? tok : undefined;
	}
	
	public static endOfCommandBegin(endOfCommand?: EndOfCommandCstNode[]): Position | undefined {
		const c = endOfCommand?.at(0)?.children;
		const tok = (c?.newline ?? c?.commandSeparator)?.at(0);
		return tok && tok.isInsertedInRecovery !== true ? Helpers.positionFrom(tok) : undefined;
	}
	
	public static endOfCommandEnd(endOfCommand?: EndOfCommandCstNode[]): Position | undefined {
		const c = endOfCommand?.at(0)?.children;
		const tok = (c?.newline ?? c?.commandSeparator)?.at(0);
		return tok && tok.isInsertedInRecovery !== true ? Helpers.positionFrom(tok, false) : undefined;
	}
	
	public static endOfCommandRange(endOfCommand?: EndOfCommandCstNode[]): Range | undefined {
		const c = endOfCommand?.at(0)?.children;
		const tok = (c?.newline ?? c?.commandSeparator)?.at(0);
		return tok && tok.isInsertedInRecovery !== true ? Helpers.rangeFrom(tok) : undefined;
	}
	
	public static logPosition(position: Position | undefined) {
		return `[${position?.line}:${position?.character}]`;
	}
	
	public static logRange(range: Range | undefined) {
		return `[${range?.start.line}:${range?.start.character} -> ${range?.end.line}:${range?.end.character}]`;
		//return `range(${range?.start.line}:${range?.start.character} -> ${range?.end.line}:${range?.end.character})`;
	}

	public static linkFromLocation(location: Location, text: string): string {
		const path = URI.parse(location.uri).fsPath;
		const uri = URI.file(path).toString();
		const line = location.range.start.line + 1;
		return `[${text}](${uri}#L${line})`;
	}

	public static numToBin(value: number, leadingZeros: boolean = false): string {
		var skipZero = !leadingZeros;
		var s = '';

		for (let i=7; i>=0; i--) {
			if (value & (1 << i)) {
				s += '1';
				skipZero = false;
			} else if (!skipZero) {
				s += '0';
			}
		}

		return s.length > 0 ? s : '0';
	}

	private static _mapHex1: Map<string, number> = new Map([
		['0', 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8], ['9', 9],
		['a', 10], ['b', 11], ['c', 12], ['d', 13], ['e', 14], ['f', 15],
		['A', 10], ['B', 11], ['C', 12], ['D', 13], ['E', 14], ['F', 15]]);

	private static _mapOct1: Map<string, number> = new Map([
		['0', 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7]]);
	
	public static dsLiteralByteToNum(ds: string): number | undefined {
		if (ds.length < 2 || ds[0] != "'" || ds[ds.length - 1] != "'") {
			return undefined;
		}

		if (ds[1] == '\\') {
			const c = ds.codePointAt(2);
			if (!c) {
				return undefined;
			}

			if (c == 117 || c == 104) { // 'u' or 'h'
				return parseInt(ds.substring(3, ds.length - 2), 16);

			} else if (c >= 48 && c <= 57) { // 0 -> 9
				return parseInt(ds.substring(3, ds.length - 2), 8);
				
			} else {
				return c;
			}

		} else {
			return ds.charCodeAt(1);
		}
	}

	public static dsLiteralIntByteToNum(ds: string): number | undefined {
		if (ds.startsWith('-0b')) {
			return -parseInt(ds.substring(3), 2);

		} else if (ds.startsWith('0b')) {
			return parseInt(ds.substring(2), 2);
		}
		return undefined;
	}

	public static dsLiteralOctByteToNum(ds: string): number | undefined {
		if (ds.startsWith('-0o')) {
			return -parseInt(ds.substring(3), 8);

		} else if (ds.startsWith('0o')) {
			return parseInt(ds.substring(2), 8);
		}
		return undefined;
	}

	public static dsLiteralIntHexToNum(ds: string): number | undefined {
		if (ds.startsWith('-0h')) {
			return -parseInt(ds.substring(3), 16);

		} else if (ds.startsWith('0h')) {
			return parseInt(ds.substring(2), 16);
		}
		return undefined;
	}
	
	
	private static reStringEscape = new RegExp(
		"(\\\\u[0-9a-fA-F]{1,6})"
		+ "|"
		+ "(\\\\x[0-9a-fA-F]{1,2})"
		+ "|"
		+ "(\\\\0[0-7]{0,2})"
		+ "|"
		+ "(\\\\.)", 'g');
	
	public static dsLiteralString(ds: string): string | undefined {
		if (ds.length < 2 || ds[0] != '"' || ds[ds.length - 1] != '"') {
			return undefined;
		}
		
		const ds2 = ds.substring(1, ds.length - 1);
		const result: string[] = [];
		let match: RegExpMatchArray | null;
		let index = 0;
		
		this.reStringEscape.lastIndex = 0;
		while ((match = this.reStringEscape.exec(ds2)) !== null) {
			if (!match.index) {
				break;
			}
			
			const end = this.reStringEscape.lastIndex;
			const begin = match.index;
			if (index < begin) {
				result.push(ds2.substring(index, begin));
			}
			
			if (match[1]) {
				result.push(String.fromCodePoint(parseInt(match[1].substring(2), 16)));
				
			} else if (match[2]) {
				result.push(String.fromCodePoint(parseInt(match[2].substring(2), 16)));
				
			} else if (match[3]) {
				result.push(String.fromCodePoint(parseInt(match[3].substring(1), 8)));
				
			} else if (match[4]) {
				result.push(match[4][1]);
				
			} else {
				break;
			}
			
			index = end;
		}
		
		if (index < ds2.length) {
			result.push(ds2.substring(index));
		}
		
		return result.join('');
	}
}
