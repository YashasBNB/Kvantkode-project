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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90cmVlU2l0dGVyL3RyZWVTaXR0ZXJMYW5ndWFnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUVOLFVBQVUsRUFDViwyQkFBMkIsRUFDM0IsZUFBZSxHQUNmLE1BQU0sb0NBQW9DLENBQUE7QUFFM0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXJFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLCtCQUErQixDQUFBO0FBRXRFLE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxrQkFBdUM7SUFDeEUsT0FBTyxHQUFHLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtBQUM3SCxDQUFDO0FBRUQsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFZbEQsWUFDa0IsbUJBQXdDLEVBQ3hDLFlBQTBCLEVBQzFCLG1CQUF3QyxFQUN4QyxvQkFBeUM7UUFFMUQsS0FBSyxFQUFFLENBQUE7UUFMVSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxQjtRQWZuRCxlQUFV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