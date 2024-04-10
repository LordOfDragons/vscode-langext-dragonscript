import { Diagnostic, integer, Range, TextEdit } from "vscode-languageserver";
import { Context } from "../context/context";
import { ContextFunctionCall } from "../context/expressionCall";
import { ResolveNamespace } from "../resolve/namespace";
import { ResolveSignature, ResolveSignatureArgument } from "../resolve/signature";
import { ResolveType } from "../resolve/type";
import { documents } from "../server";
import { CodeActionRemove } from "./remove";

export interface BaseCodeActionAutoCastResult {
	edits: TextEdit[];
	compareToNull: boolean;
	compareToNullNegate: boolean;
}

export class CodeActionHelpers {
	public static requiresWrap(context: Context): boolean {
		switch (context.type) {
		case Context.ContextType.Block:
		case Context.ContextType.Constant:
		case Context.ContextType.Group:
		case Context.ContextType.Member:
			return false;
			
		case Context.ContextType.FunctionCall:
			switch ((context as ContextFunctionCall).functionType) {
			case ContextFunctionCall.FunctionType.function:
			case ContextFunctionCall.FunctionType.functionSuper:
			case ContextFunctionCall.FunctionType.increment:
			case ContextFunctionCall.FunctionType.decrement:
			case ContextFunctionCall.FunctionType.inverse:
				return false;
			}
			return true;
			
		default:
			return true;
		}
	}
	
	public static autoCast(sourceType: ResolveType, targetType: ResolveType,
			sourceAutoCast: Context.AutoCast, sourceContext: Context):
				BaseCodeActionAutoCastResult | undefined {
		var compareToNullNegate: Range | undefined;
		var compareToNull = false;
		
		if (sourceContext.type == Context.ContextType.FunctionCall) {
			const cfc = sourceContext as ContextFunctionCall;
			if (cfc.functionType == ContextFunctionCall.FunctionType.not) {
				if (!cfc.object?.range || !cfc.object?.expressionType || !cfc.name.range) {
					return undefined;
				}
				sourceContext = cfc.object;
				sourceType = cfc.object.expressionType;
				sourceAutoCast = cfc.object.expressionAutoCast;
				compareToNullNegate = Range.create(cfc.name.range.start, cfc.object.range.start);
			}
		}
		
		const crange = sourceContext.range;
		if (!crange) {
			return undefined;
		}
		
		switch (ResolveSignatureArgument.typeMatches(targetType, sourceType, sourceAutoCast)) {
		case ResolveSignature.Match.Full:
			return {
				edits: [],
				compareToNull: false,
				compareToNullNegate: false
			};
			
		case ResolveSignature.Match.Partial:
			break;
		
		default:
			if (!sourceType.isPrimitive && targetType === ResolveNamespace.classBool) {
				compareToNull = true;
				
			} else {
				return undefined;
			}
		}
		
		const needsWrap = this.requiresWrap(sourceContext);
		let edits: TextEdit[] = [];
		
		var textBegin = '';
		var textEnd: string;
		
		if (needsWrap) {
			textBegin = '(';
			if (compareToNull) {
				if (compareToNullNegate) {
					textEnd = ') == null';
				} else {
					textEnd = ') != null';
				}
			} else {
				textEnd = `) cast ${targetType.name}`;
			}
		} else {
			if (compareToNull) {
				if (compareToNullNegate) {
					textEnd = ' == null';
				} else {
					textEnd = ' != null';
				}
			} else {
				textEnd = ` cast ${targetType.name}`;
			}
		}
		
		if (compareToNullNegate) {
			edits.push(TextEdit.del(compareToNullNegate));
		}
		if (textBegin.length > 0) {
			edits.push(TextEdit.insert(crange.start, textBegin));
		}
		edits.push(TextEdit.insert(crange.end, textEnd));
		
		return {
			edits: edits,
			compareToNull: compareToNull,
			compareToNullNegate: compareToNullNegate !== undefined
		};
	}
	
	//public static invalidTypeModifier(context: Context, typeModifier)
	
	/**
	 * Calculate name difference vector. For each character in the first string
	 * the difference vector stores an integer with the count of characters to
	 * skip before the respective first string character has been matched. If
	 * the second string gets exhausted a count of 1000 is stored. The count
	 * of surplus characters in the second string is stored at the end of the
	 * difference vector.
	 * 
	 * For example if the first string is 'Member' and the second string is
	 * 'getMemberName' then the difference vector will be [3,0,0,0,0,0,4].
	 */
	public static nameDifference(first: string, second: string): integer[] {
		let diff: integer[] = [];
		const len = second.length;
		var index = 0;
		
		for (const each of first) {
			var count = 0;
			
			while (index <= len) {
				if (index == len) {
					count = 1000;
					break;
				}
				const c = second.charAt(index++);
				if (c == each) {
					break;
				}
				count++;
			}
			
			diff.push(count);
		}
		
		diff.push(len - index);
		return diff;
	}
	
	/** Total difference. */
	public static totalNameDifference(diff: integer[]): integer {
		return diff.reduce((a, b) => a + b, 0);
	}
	
	/** Different vector is smaller. */
	public static isNameDiffLessThan(a: integer[], b: integer[]): boolean {
		const len = a.length;
		for (var i=0; i<len; i++) {
			const d1 = a[i];
			const d2 = b.at(i) ?? 1000;
			if (d1 < d2) {
				return true;
			}
			if (d1 > d2) {
				return false;
			}
		}
		return false;
	}
	
	/** Extend begin range beyond adjacent newlines if possible. */
	public static extendBeginSpaces(uri: string, range: Range, characters: string[]): Range | undefined {
		const document = documents.get(uri);
		if (!document) {
			return undefined;
		}
		
		var offset = document.offsetAt(range.start);
		const text = document.getText();
		
		while (offset > 0) {
			if (characters.includes(text[offset - 1])) {
				offset--;
			} else {
				break;
			}
		}
		
		return Range.create(document.positionAt(offset), range.end);
	}
	
	/** Extend end range beyond adjacent newlines if possible. */
	public static extendEndSpaces(uri: string, range: Range, characters: string[]): Range | undefined {
		const document = documents.get(uri);
		if (!document) {
			return undefined;
		}
		
		var offset = document.offsetAt(range.end);
		const text = document.getText();
		var length = text.length;
		
		while (offset < length) {
			if (characters.includes(text[offset])) {
				offset++;
			} else {
				break;
			}
		}
		
		return Range.create(range.start, document.positionAt(offset));
	}
	
	/** Text range contains no line splicing nor double colon. */
	public static isSingleCommentSafe(uri: string, range: Range): boolean {
		const document = documents.get(uri);
		if (!document) {
			return false;
		}
		
		const text = document.getText(range);
		return !text.includes("\\\n")
			&& !text.includes("\\\r")
			&& !text.includes(":");
	}
}