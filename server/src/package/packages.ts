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

import { Package } from "./package";

export class Packages {
	protected _packages: Map<string,Package> = new Map<string,Package>();
	
	
	constructor() {
	}
	
	public async dispose(): Promise<void> {
		for (const each of this._packages.values()) {
			await each.dispose();
		}
	}
	
	
	public get(id: string): Package | undefined {
		if (this._packages.has(id)) {
			return this._packages.get(id);
		}
		return undefined;
	}
	
	public add(apackage: Package): void {
		if (this._packages.has(apackage.id)) {
			throw Error("Package exists already");
		}
		this._packages.set(apackage.id, apackage);
	}
	
	public forEach(visitor: (each: Package) => void): void {
		for (const each of this._packages.values()) {
			visitor(each);
		}
	}
	
	public async ensureAllLoaded(): Promise<void> {
		for (const each of this._packages.values()) {
			await each.load();
		}
	}
}
