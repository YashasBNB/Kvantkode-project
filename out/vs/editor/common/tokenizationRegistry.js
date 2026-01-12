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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5pemF0aW9uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFRdEYsTUFBTSxPQUFPLG9CQUFvQjtJQVNoQztRQVJpQiwwQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUNuRCxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQW9ELENBQUE7UUFFeEUsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBb0MsQ0FBQTtRQUMvRCxnQkFBVyxHQUE0QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUs3RixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtJQUN0QixDQUFDO0lBRU0sWUFBWSxDQUFDLFdBQXFCO1FBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ3RCLGdCQUFnQixFQUFFLFdBQVc7WUFDN0IsZUFBZSxFQUFFLEtBQUs7U0FDdEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLFFBQVEsQ0FBQyxVQUFrQixFQUFFLE9BQWlCO1FBQ3BELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQy9CLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUss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