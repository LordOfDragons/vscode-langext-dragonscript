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

import { Position } from "vscode-languageserver"
import { Context } from "./context/context";
import { ContextNamespace } from "./context/namespace";
import { ContextScript } from "./context/script";
import { debugLogMessage } from "./server";


export class RefactoringHelper {
	public static insertPinPosition(before: Context): Position {
		var position: Position | undefined;
		
		while (before.parent) {
			const p = before.parent;
			
			if (p.type === Context.ContextType.Namespace || p.type === Context.ContextType.Script) {
				var pin: Context | undefined;
				
				for (const each of (p as (ContextNamespace | ContextScript)).statements) {
					if (each === before) {
						break;
					}
					if (each.type === Context.ContextType.PinNamespace) {
						pin = each;
					}
				}
				
				if (pin?.range) {
					position = pin.range.end;
					break;
				}
				
				if (p.type === Context.ContextType.Namespace) {
					position = (p as ContextNamespace).positionBeginEnd;
				} else {
					position = (p as ContextScript).documentations.at(0)?.range?.end;
				}
				break;
			}
			before = p;
		}
		
		return position ?? Position.create(0, 0);
	}
}
