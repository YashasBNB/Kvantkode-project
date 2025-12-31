/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess, nodeModulesAsarUnpackedPath, nodeModulesPath, } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { canASAR } from '../../../../amdX.js';
import { Emitter } from '../../../../base/common/event.js';
import { PromiseResult } from '../../../../base/common/observable.js';
export const MODULE_LOCATION_SUBPATH = `@vscode/tree-sitter-wasm/wasm`;
export function getModuleLocation(environmentService) {
    return `${canASAR && environmentService.isBuilt ? nodeModulesAsarUnpackedPath : nodeModulesPath}/${MODULE_LOCATION_SUBPATH}`;
}
export class TreeSitterLanguages extends Disposable {
    constructor(_treeSitterImporter, _fileService, _environmentService, _registeredLanguages) {
        super();
        this._treeSitterImporter = _treeSitterImporter;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._registeredLanguages = _registeredLanguages;
        this._languages = new AsyncCache();
        this._onDidAddLanguage = this._register(new Emitter());
        /**
         * If you're looking for a specific language, make sure to check if it already exists with `getLanguage` as it will kick off the process to add it if it doesn't exist.
         */
        this.onDidAddLanguage = this._onDidAddLanguage.event;
    }
    getOrInitLanguage(languageId) {
        if (this._languages.isCached(languageId)) {
            return this._languages.getSyncIfCached(languageId);
        }
        else {
            // kick off adding the language, but don't wait
            this._addLanguage(languageId);
            return undefined;
        }
    }
    async getLanguage(languageId) {
        if (this._languages.isCached(languageId)) {
            return this._languages.getSyncIfCached(languageId);
        }
        else {
            await this._addLanguage(languageId);
            return this._languages.get(languageId);
        }
    }
    async _addLanguage(languageId) {
        const languagePromise = this._languages.get(languageId);
        if (!languagePromise) {
            this._languages.set(languageId, this._fetchLanguage(languageId));
            const language = await this._languages.get(languageId);
            if (!language) {
                return undefined;
            }
            this._onDidAddLanguage.fire({ id: languageId, language });
        }
    }
    async _fetchLanguage(languageId) {
        const grammarName = this._registeredLanguages.get(languageId);
        const languageLocation = this._getLanguageLocation(languageId);
        if (!grammarName || !languageLocation) {
            return undefined;
        }
        const wasmPath = `${languageLocation}/${grammarName}.wasm`;
        const languageFile = await this._fileService.readFile(FileAccess.asFileUri(wasmPath));
        const Language = await this._treeSitterImporter.getLanguageClass();
        return Language.load(languageFile.value.buffer);
    }
    _getLanguageLocation(languageId) {
        const grammarName = this._registeredLanguages.get(languageId);
        if (!grammarName) {
            return undefined;
        }
        return getModuleLocation(this._environmentService);
    }
}
class AsyncCache {
    constructor() {
        this._values = new Map();
    }
    set(key, promise) {
        this._values.set(key, new PromiseWithSyncAccess(promise));
    }
    get(key) {
        return this._values.get(key)?.promise;
    }
    getSyncIfCached(key) {
        return this._values.get(key)?.result?.data;
    }
    isCached(key) {
        return this._values.get(key)?.result !== undefined;
    }
}
class PromiseWithSyncAccess {
    /**
     * Returns undefined if the promise did not resolve yet.
     */
    get result() {
        return this._result;
    }
    constructor(promise) {
        this.promise = promise;
        promise
            .then((result) => {
            this._result = new PromiseResult(result, undefined);
        })
            .catch((e) => {
            this._result = new PromiseResult(undefined, e);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlci90cmVlU2l0dGVyTGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFFTixVQUFVLEVBQ1YsMkJBQTJCLEVBQzNCLGVBQWUsR0FDZixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVyRSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRywrQkFBK0IsQ0FBQTtBQUV0RSxNQUFNLFVBQVUsaUJBQWlCLENBQUMsa0JBQXVDO0lBQ3hFLE9BQU8sR0FBRyxPQUFPLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsZUFBZSxJQUFJLHVCQUF1QixFQUFFLENBQUE7QUFDN0gsQ0FBQztBQUVELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBWWxELFlBQ2tCLG1CQUF3QyxFQUN4QyxZQUEwQixFQUMxQixtQkFBd0MsRUFDeEMsb0JBQXlDO1FBRTFELEtBQUssRUFBRSxDQUFBO1FBTFUsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN4QyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMxQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUI7UUFmbkQsZUFBVSxHQUFv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