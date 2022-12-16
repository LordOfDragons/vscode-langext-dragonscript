import { CstNode, IToken } from "chevrotain";
import { ExpressionCstNode } from "./expression";
import { ExpressionObjectCstNode } from "./expressionObject";
import { StatementsCstNode } from "./statement";


export interface StatementForCstNode extends CstNode {
	name: "statementFor";
	children: StatementForCstChildren;
}

export type StatementForCstChildren = {
	statementForBegin: StatementForBeginCstNode[];
	statements: StatementsCstNode[];
};


export interface StatementForBeginCstNode extends CstNode {
	name: "statementForBegin";
	children: StatementForBeginCstChildren;
}

export type StatementForBeginCstChildren = {
	statementForVariable: StatementForVariableCstNode[];
	statementForFrom: StatementForFromCstNode[];
	statementForTo: StatementForToCstNode[];
	statementForStep?: StatementForStepCstNode[];
};


export interface StatementForVariableCstNode extends CstNode {
	name: "statementForVariable";
	children: StatementForVariableCstChildren;
}

export type StatementForVariableCstChildren = {
	variable: ExpressionObjectCstNode[];
};


export interface StatementForFromCstNode extends CstNode {
	name: "statementForFrom";
	children: StatementForFromCstChildren;
}

export type StatementForFromCstChildren = {
	value: ExpressionCstNode[];
};


export interface StatementForToCstNode extends CstNode {
	name: "statementForTo";
	children: StatementForToCstChildren;
}

export type StatementForToCstChildren = {
	to?: IToken[];
	downto?: IToken[];
	value: ExpressionCstNode[];
};


export interface StatementForStepCstNode extends CstNode {
	name: "statementForStep";
	children: StatementForStepCstChildren;
}

export type StatementForStepCstChildren = {
	value: ExpressionCstNode[];
};
