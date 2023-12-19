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


export class RefactoringHelper {
	public static insertPinPosition(before: Context): Position {
		var ns: ContextNamespace = before.selfOrParentWithType(Context.ContextType.Namespace) as ContextNamespace;
		var pin: Context | undefined;
		
		while (ns) {
			for (const each of ns.statements) {
				if (each === before) {
					break;
				}
				if (each.type == Context.ContextType.PinNamespace) {
					pin = each;
				}
			}
			if (pin) {
				break;
			}
			before = ns;
			ns = ns.selfOrParentWithType(Context.ContextType.Namespace) as ContextNamespace;
		}
		
		if (!pin) {
			const script = before.selfOrParentWithType(Context.ContextType.Script) as ContextScript;
			if (script) {
				for (const each of script.statements) {
					if (each === before) {
						break;
					}
					if (each.type == Context.ContextType.PinNamespace) {
						pin = each;
					}
				}
			}
		}
		
		return pin?.range?.end ?? Position.create(0, 0);
	}
}
