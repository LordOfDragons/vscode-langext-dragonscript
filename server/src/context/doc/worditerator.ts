import { integer } from "vscode-languageserver";
import { DocumentationBlockTextWordCstNode } from "../../nodeclasses/doc/blockText";

export class ContextDocumentationWordIterator{
	protected _list: DocumentationBlockTextWordCstNode[];
	protected _nextIndex: integer;
	protected _count: integer;
	protected _last: integer;
	
	constructor(list: DocumentationBlockTextWordCstNode[]) {
		this._list = list;
		this._nextIndex = 0;
		this._count = list.length;
		this._last = this._count - 1;
	}
	
	public get current(): DocumentationBlockTextWordCstNode | undefined {
		return this._list.at(this._nextIndex);
	}
	
	public get next(): DocumentationBlockTextWordCstNode | undefined {
		if (this._nextIndex < this._count) {
			this._nextIndex++;
		}
		return this.current;
	}
}
