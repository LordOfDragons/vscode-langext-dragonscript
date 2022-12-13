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

import { ExpressionCstNode, StatementCstNode } from "../nodeclasses";
import { Context } from "./context";
import { ContextIf } from "./staif";
import { ContextReturn } from "./stareturn";
import { ContextSelect } from "./staselect";
import { ContextWhile } from "./stawhile";

/** Context builder. */
export class ContextBuilder{
	/** Create statement from node. */
	static createStatement(node: StatementCstNode): Context {
		if (node.children.statementIf) {
			return new ContextIf(node.children.statementIf[0]);
		} else if (node.children.statementReturn) {
			return new ContextReturn(node.children.statementReturn[0]);
		} else if (node.children.statementSelect) {
			return new ContextSelect(node.children.statementSelect[0]);
		} else if (node.children.statementWhile) {
			return new ContextWhile(node.children.statementWhile[0]);
		} else if (node.children.statementFor) {

		} else if (node.children.break) {

		} else if (node.children.continue) {

		} else if (node.children.statementThrow) {

		} else if (node.children.statementTry) {

		} else if (node.children.statementVariables) {

		} else if (node.children.expression) {
			return ContextBuilder.createExpression(node.children.expression[0]);
		}
		return new Context(Context.ContextType.Generic);
	}

	/** Create expression from node. */
	static createExpression(node: ExpressionCstNode): Context {
		return new Context(Context.ContextType.Generic);
	}
}
 