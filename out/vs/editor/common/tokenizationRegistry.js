/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
export class TokenizationRegistry {
    constructor() {
        this._tokenizationSupports = new Map();
        this._factories = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._colorMap = null;
    }
    handleChange(languageIds) {
        this._onDidChange.fire({
            changedLanguages: languageIds,
            changedColorMap: false,
        });
    }
    register(languageId, support) {
        this._tokenizationSupports.set(languageId, support);
        this.handleChange([languageId]);
        return toDisposable(() => {
            if (this._tokenizationSupports.get(languageId) !== support) {
                return;
            }
            this._tokenizationSupports.delete(languageId);
            this.handleChange([languageId]);
        });
    }
    get(languageId) {
        return this._tokenizationSupports.get(languageId) || null;
    }
    registerFactory(languageId, factory) {
        this._factories.get(languageId)?.dispose();
        const myData = new TokenizationSupportFactoryData(this, languageId, factory);
        this._factories.set(languageId, myData);
        return toDisposable(() => {
            const v = this._factories.get(languageId);
            if (!v || v !== myData) {
                return;
            }
            this._factories.delete(languageId);
            v.dispose();
        });
    }
    async getOrCreate(languageId) {
        // check first if the support is already set
        const tokenizationSupport = this.get(languageId);
        if (tokenizationSupport) {
            return tokenizationSupport;
        }
        const factory = this._factories.get(languageId);
        if (!factory || factory.isResolved) {
            // no factory or factory.resolve already finished
            return null;
        }
        await factory.resolve();
        return this.get(languageId);
    }
    isResolved(languageId) {
        const tokenizationSupport = this.get(languageId);
        if (tokenizationSupport) {
            return true;
        }
        const factory = this._factories.get(languageId);
        if (!factory || factory.isResolved) {
            return true;
        }
        return false;
    }
    setColorMap(colorMap) {
        this._colorMap = colorMap;
        this._onDidChange.fire({
            changedLanguages: Array.from(this._tokenizationSupports.keys()),
            changedColorMap: true,
        });
    }
    getColorMap() {
        return this._colorMap;
    }
    getDefaultBackground() {
        if (this._colorMap && this._colorMap.length > 2 /* ColorId.DefaultBackground */) {
            return this._colorMap[2 /* ColorId.DefaultBackground */];
        }
        return null;
    }
}
class TokenizationSupportFactoryData extends Disposable {
    get isResolved() {
        return this._isResolved;
    }
    constructor(_registry, _languageId, _factory) {
        super();
        this._registry = _registry;
        this._languageId = _languageId;
        this._factory = _factory;
        this._isDisposed = false;
        this._resolvePromise = null;
        this._isResolved = false;
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    async resolve() {
        if (!this._resolvePromise) {
            this._resolvePromise = this._create();
        }
        return this._resolvePromise;
    }
    async _create() {
        const value = await this._factory.tokenizationSupport;
        this._isResolved = true;
        if (value && !this._isDisposed) {
            this._register(this._registry.register(this._languageId, value));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2VuaXphdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBUXRGLE1BQU0sT0FBTyxvQkFBb0I7SUFTaEM7UUFSaUIsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUE7UUFDbkQsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFBO1FBRXhFLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUE7UUFDL0QsZ0JBQVcsR0FBNEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFLN0YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDdEIsQ0FBQztJQUVNLFlBQVksQ0FBQyxXQUFxQjtRQUN4QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUN0QixnQkFBZ0IsRUFBRSxXQUFXO1lBQzdCLGVBQWUsRUFBRSxLQUFLO1NBQ3RCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsVUFBa0IsRUFBRSxPQUFpQjtRQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMvQixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLE9BQU8s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