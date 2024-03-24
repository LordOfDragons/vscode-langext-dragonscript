import { Context } from "../context/context";
import { ContextFor } from "../context/statementFor";
import { ContextIf } from "../context/statementIf";
import { ContextSelect, ContextSelectCase } from "../context/statementSelect";
import { ContextTry } from "../context/statementTry";
import { ContextWhile } from "../context/statementWhile";
import { ContextStatements } from "../context/statements";


/** Visit checking if all code path has a return statement. */
export class VisitorAllHasReturn {
	constructor() {
	}
	
	
	public check(context: ContextStatements): boolean {
		return this.checkStatements(context);
	}
	
	
	protected checkStatements(context: ContextStatements): boolean {
		return context.statements.find(s => this.checkStatement(s)) !== undefined;
	}
	
	protected checkStatement(context: Context): boolean {
		switch (context.type) {
		case Context.ContextType.Return:
		case Context.ContextType.Throw:
			return true;
			
		case Context.ContextType.For:
			return this.checkFor(context as ContextFor);
			
		case Context.ContextType.If:
			return this.checkIf(context as ContextIf);
			
		case Context.ContextType.Select:
			return this.checkSelect(context as ContextSelect);
			
		case Context.ContextType.Statements:
			return this.checkStatements(context as ContextStatements);
			
		case Context.ContextType.Try:
			return this.checkTry(context as ContextTry);
			
		case Context.ContextType.While:
			return this.checkWhile(context as ContextWhile);
			
		default:
			return false;
		}
	}
	
	protected checkStatementsLoop(context: ContextStatements): boolean {
		for (const each of context.statements) {
			switch (each.type) {
			case Context.ContextType.Break:
			case Context.ContextType.Continue:
				return false;
				
			default:
				if (this.checkStatement(each)) {
					return true;
				}
				break;
			}
		}
		return false;
	}
	
	protected checkFor(context: ContextFor): boolean {
		return this.checkStatementsLoop(context.statements);
	}
	
	protected checkIf(context: ContextIf): boolean {
		return this.checkStatements(context.ifstatements)
			&& !context.elif.find(e => !this.checkStatements(e.statements))
			&& (!context.elsestatements || this.checkStatements(context.elsestatements));
	}
	
	protected checkSelect(context: ContextSelect): boolean {
		return !context.cases.find(c => !this.checkSelectCase(c))
			&& (!context.elsestatements || this.checkStatements(context.elsestatements));
	}
	
	protected checkSelectCase(context: ContextSelectCase): boolean {
		for (const each of context.statements.statements) {
			switch (each.type) {
			case Context.ContextType.Break:
				return false;
				
			default:
				if (this.checkStatement(each)) {
					return true;
				}
				break;
			}
		}
		return false;
	}
	
	protected checkTry(context: ContextTry): boolean {
		return this.checkStatements(context.statements)
			&& !context.catches.find(c => !this.checkStatements(c.statements));
	}
	
	protected checkWhile(context: ContextWhile): boolean {
		return this.checkStatementsLoop(context.statements);
	}
}