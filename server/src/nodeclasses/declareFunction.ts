import { CstNode, IToken } from "chevrotain";
import { FullyQualifiedClassNameCstNode } from "./fullyQualifiedClassName";
import { ExpressionCstNode } from "./expression";
import { EndOfCommandCstNode } from "./endOfCommand";


export interface FunctionBeginCstNode extends CstNode {
	name: "functionBegin";
	children: FunctionBeginCstChildren;
}

export type FunctionBeginCstChildren = {
	classConstructor?: ClassConstructorCstNode[];
	classDestructor?: ClassDestructorCstNode[];
	regularFunction?: RegularFunctionCstNode[];
};


export interface ClassConstructorCstNode extends CstNode {
	name: "classConstructor";
	children: ClassConstructorCstChildren;
}

export type ClassConstructorCstChildren = {
	identifier: IToken[]; // is always "new"
	functionArguments: FunctionArgumentsCstNode[];
	this?: IToken[];
	super?: IToken[];
	functionCall?: FunctionCallCstNode[];
	endOfCommand: EndOfCommandCstNode[];
};


export interface ClassDestructorCstNode extends CstNode {
	name: "classDestructor";
	children: ClassDestructorCstChildren;
}

export type ClassDestructorCstChildren = {
	identifier: IToken[];  // is always "destructor"
	endOfCommand: EndOfCommandCstNode[];
};


export interface FunctionCallCstNode extends CstNode {
	name: "functionCall";
	children: FunctionCallCstChildren;
}

export type FunctionCallCstChildren = {
	leftParanthesis: IToken[];
	argument: ExpressionCstNode[];
	rightParanthesis?: IToken[];
};


export interface RegularFunctionCstNode extends CstNode {
	name: "regularFunction";
	children: RegularFunctionCstChildren;
}

export type RegularFunctionCstChildren = {
	returnType: FullyQualifiedClassNameCstNode[];
	name?: IToken[];
	operator?: FunctionOperatorCstNode[];
	functionArguments: FunctionArgumentsCstNode[];
	endOfCommand: EndOfCommandCstNode[];
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
	functionArgument?: FunctionArgumentCstNode[];
};


export interface FunctionArgumentCstNode extends CstNode {
	name: "functionArgument";
	children: FunctionArgumentCstChildren;
}

export type FunctionArgumentCstChildren = {
	type: FullyQualifiedClassNameCstNode[];
	name: IToken[];
};



export interface FunctionEndCstNode extends CstNode {
	name: "functionEnd";
	children: FunctionEndCstChildren;
}

export type FunctionEndCstChildren = {
	end?: IToken[];
	endOfCommand?: EndOfCommandCstNode[];
};