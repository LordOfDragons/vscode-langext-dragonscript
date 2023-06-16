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
import { Position, Range } from "vscode-languageserver"


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

	public static isPositionInsideToken(token: IToken, position: Position): boolean {
		return Helpers.isPositionInsideRange(Helpers.rangeFrom(token), position);
	}

	public static isPositionInsideTokens(start: IToken, end: IToken, position: Position): boolean {
		return Helpers.isPositionInsideRange(Helpers.rangeFrom(start, end), position);
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
}
