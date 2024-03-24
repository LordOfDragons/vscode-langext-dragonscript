import { CstNode, IToken } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { ExpressionCstNode } from "./expression";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface FunctionBeginCstNode extends CstNode {
	name: "functionBegin";
	children: FunctionBeginCstChildren;
}

export type FunctionBeginCstChildren = {
	returnType: FullyQualifiedClassNameCstNode[];
	functionName?: FunctionNameCstNode[];
	functionArguments?: FunctionArgumentsCstNode[];
	functionSuperCall?: FunctionSuperCallCstNode[];
	endOfCommand?: EndOfCommandCstNode[];
};


export interface FunctionNameCstNode extends CstNode {
	name: "functionName";
	children: FunctionNameCstChildren;
}

export type FunctionNameCstChildren = {
	name?: IToken[];
	operator?: FunctionOperatorCstNode[];
};


export interface FunctionOperatorCstNode extends CstNode {
	name: "functionOperator";
	children: FunctionOperatorCstChildren;
}

export type FunctionOperatorCstChildren = {
	assignMultiply?: IToken[];
	assignDivide?: IToken[];
	assignModulus?: IToken[];
	assignAdd?: IToken[];
	assignSubtract?: IToken[];
	assignShiftLeft?: IToken[];
	assignShiftRight?: IToken[];
	assignAnd?: IToken[];
	assignOr?: IToken[];
	assignXor?: IToken[];
	and?: IToken[];
	or?: IToken[];
	xor?: IToken[];
	shiftLeft?: IToken[];
	shiftRight?: IToken[];
	less?: IToken[];
	greater?: IToken[];
	lessEqual?: IToken[];
	greaterEqual?: IToken[];
	multiply?: IToken[];
	divide?: IToken[];
	modulus?: IToken[];
	add?: IToken[];
	subtract?: IToken[];
	increment?: IToken[];
	decrement?: IToken[];
	inverse?: IToken[];
};


export interface FunctionArgumentsCstNode extends CstNode {
	name: "functionArguments";
	children: FunctionArgumentsCstChildren;
}

export type FunctionArgumentsCstChildren = {
	leftParanthesis?: IToken[];
	comma?: IToken[];
	functionArgument?: FunctionArgumentCstNode[];
	rightParanthesis?: IToken[];
};


export interface FunctionArgumentCstNode extends CstNode {
	name: "functionArgument";
	children: FunctionArgumentCstChildren;
}

export type FunctionArgumentCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	name?: IToken[];
};


export interface FunctionSuperCallCstNode extends CstNode {
	name: "functionSuperCall";
	children: FunctionSuperCallCstChildren;
}

export type FunctionSuperCallCstChildren = {
	this?: IToken[];
	super?: IToken[];
	functionCall?: FunctionCallCstNode[];
};


export interface FunctionCallCstNode extends CstNode {
	name: "functionCall";
	children: FunctionCallCstChildren;
}

export type FunctionCallCstChildren = {
	leftParanthesis: IToken[];
	comma?: IToken[];
	argument: ExpressionCstNode[];
	rightParanthesis?: IToken[];
};



export interface FunctionEndCstNode extends CstNode {
	name: "functionEnd";
	children: FunctionEndCstChildren;
}

export type FunctionEndCstChildren = {
	end?: IToken[];
	endOfCommand?: EndOfCommandCstNode[];
};