
/** Stores name for matching with other names. */
export class MatchableName {
	/**
	 * Regular expression for splitting camel case names. Split is done if
	 * an upper case letter is found that has no upper case letter either
	 * on the left or right side.
	 */
	private static _regexSplitCamelCase = /(?<=[^A-Z])(?=[A-Z])|(?=[A-Z][^A-Z])/g;
	
	private _name: string;
	private _parts: string[];
	private _partsLower: string[];
	
	
	constructor (name: string) {
		this._name = name;
		this._parts = name.split(MatchableName._regexSplitCamelCase);
		this._partsLower = this._parts.map(p => p.toLowerCase());
	}
	
	
	public get name(): string {
		return this._name;
	}
	
	
	public matches(matchable: MatchableName) {
		return !this._partsLower.find(a => !matchable._partsLower.find(b => b.startsWith(a)));
	}
}
