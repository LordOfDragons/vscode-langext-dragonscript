import { integer } from "vscode-languageserver";
import { Resolved } from "../resolve/resolved";
import { ResolveSearch } from "../resolve/search";
import { CodeActionHelpers } from "./helpers";

export class CodeActionMatchHelper {
	protected _matchName: string;
	
	public bestMatch: Resolved | undefined;
	
	protected _bestDiff: integer[] = [];
	protected _bestDiffCount: integer = 0;
	
	
	constructor(name: string) {
		this._matchName = name.toLowerCase();
	}
	
	
	public processVariables(search: ResolveSearch): void {
		for (const each of search.variables) {
			this.processMatch(each);
		}
	}
	
	public processFunctions(search: ResolveSearch): void {
		for (const each of search.functionsAll) {
			this.processMatch(each);
		}
	}
	
	public processTypes(search: ResolveSearch): void {
		for (const each of search.types) {
			if (each.type !== Resolved.Type.Namespace) {
				this.processMatch(each);
			}
		}
	}
	
	public processNamespaces(search: ResolveSearch): void {
		for (const each of search.types) {
			if (each.type === Resolved.Type.Namespace) {
				this.processMatch(each);
			}
		}
	}
	
	public processMatch(match: Resolved): void {
		const diff = CodeActionHelpers.nameDifference(this._matchName, match.name.toLowerCase());
		const diffCount = CodeActionHelpers.totalNameDifference(diff);
		
		if (this.bestMatch) {
			if (diffCount < this._bestDiffCount) {
				this.bestMatch = undefined;
				
			} else if (diffCount == this._bestDiffCount) {
				if (CodeActionHelpers.isNameDiffLessThan(diff, this._bestDiff)) {
					this.bestMatch = undefined;
				}
			}
		}
		
		if (!this.bestMatch) {
			this.bestMatch = match;
			this._bestDiff = diff;
			this._bestDiffCount = diffCount;
		}
	}
}