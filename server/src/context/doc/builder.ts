/**
 * MIT License
 *
 * Copyright (c) 2024 DragonDreams (info@dragondreams.ch)
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

import { DocumentationWordCstNode } from "../../nodeclasses/doc/word";
import { ContextDocumentationBold } from "./bold";
import { ContextDocBase } from "./contextDoc";
import { ContextDocumentationEmboss } from "./emboss";
import { ContextDocumentationReference } from "./reference";
import { ContextDocumentationSee } from "./see";
import { ContextDocumentationString } from "./string";
import { ContextDocumentationWord } from "./word";


export class ContextDocBuilder {
	constructor() {
	}
	
	
	public static createWord(node: DocumentationWordCstNode, parent: ContextDocBase): ContextDocBase | undefined {
		const c = node.children;
		if (c.ruleEmboss) {
			return new ContextDocumentationEmboss(c.ruleEmboss[0], parent);
		} else if (c.ruleReference) {
			return new ContextDocumentationReference(c.ruleReference[0], parent);
		} else if (c.ruleSee) {
			return new ContextDocumentationSee(c.ruleSee[0], parent);
		} else if (c.ruleBold) {
			return new ContextDocumentationBold(c.ruleBold[0], parent);
		} else if (c.string) {
			return new ContextDocumentationString(c.string[0], parent);
		} else if (c.word) {
			return new ContextDocumentationWord(c.word[0], parent);
		}
		return undefined;
	}
}