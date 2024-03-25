export class DeferredPromise<T> {
	private _promise: Promise<T>;
	private _resolve?: (document: T) => void;
	private _reject?: Function;
	
	constructor () {
		this._promise = new Promise<T>((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}
	
	public get promise(): Promise<T> {
		return this._promise;
	}
	
	public succeed(document: T): void {
		if (this._resolve) {
			this._resolve(document);
		}
	}
	
	public fail(): void {
		if (this._reject) {
			this._reject();
		}
	}
}

export class DeferredPromiseVoid {
	private _promise: Promise<void>;
	private _resolve?: () => void;
	private _reject?: Function;
	
	constructor () {
		this._promise = new Promise<void>((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}
	
	public get promise(): Promise<void> {
		return this._promise;
	}
	
	public succeed(): void {
		if (this._resolve) {
			this._resolve();
		}
	}
	
	public fail(): void {
		if (this._reject) {
			this._reject();
		}
	}
}
