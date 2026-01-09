/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultGenerator } from '../../../../base/common/idGenerator.js';
import { equals } from '../../../../base/common/objects.js';
var LoadingPhase;
(function (LoadingPhase) {
    LoadingPhase[LoadingPhase["Created"] = 1] = "Created";
    LoadingPhase[LoadingPhase["Loading"] = 2] = "Loading";
    LoadingPhase[LoadingPhase["Loaded"] = 3] = "Loaded";
    LoadingPhase[LoadingPhase["Errored"] = 4] = "Errored";
    LoadingPhase[LoadingPhase["Disposed"] = 5] = "Disposed";
})(LoadingPhase || (LoadingPhase = {}));
export class FileQueryCacheState {
    get cacheKey() {
        if (this.loadingPhase === LoadingPhase.Loaded || !this.previousCacheState) {
            return this._cacheKey;
        }
        return this.previousCacheState.cacheKey;
    }
    get isLoaded() {
        const isLoaded = this.loadingPhase === LoadingPhase.Loaded;
        return isLoaded || !this.previousCacheState ? isLoaded : this.previousCacheState.isLoaded;
    }
    get isUpdating() {
        const isUpdating = this.loadingPhase === LoadingPhase.Loading;
        return isUpdating || !this.previousCacheState ? isUpdating : this.previousCacheState.isUpdating;
    }
    constructor(cacheQuery, loadFn, disposeFn, previousCacheState) {
        this.cacheQuery = cacheQuery;
        this.loadFn = loadFn;
        this.disposeFn = disposeFn;
        this.previousCacheState = previousCacheState;
        this._cacheKey = defaultGenerator.nextId();
        this.query = this.cacheQuery(this._cacheKey);
        this.loadingPhase = LoadingPhase.Created;
        if (this.previousCacheState) {
            const current = Object.assign({}, this.query, { cacheKey: null });
            const previous = Object.assign({}, this.previousCacheState.query, { cacheKey: null });
            if (!equals(current, previous)) {
                this.previousCacheState.dispose();
                this.previousCacheState = undefined;
            }
        }
    }
    load() {
        if (this.isUpdating) {
            return this;
        }
        this.loadingPhase = LoadingPhase.Loading;
        this.loadPromise = (async () => {
            try {
                await this.loadFn(this.query);
                this.loadingPhase = LoadingPhase.Loaded;
                if (this.previousCacheState) {
                    this.previousCacheState.dispose();
                    this.previousCacheState = undefined;
                }
            }
            catch (error) {
                this.loadingPhase = LoadingPhase.Errored;
                throw error;
            }
        })();
        return this;
    }
    dispose() {
        if (this.loadPromise) {
            ;
            (async () => {
                try {
                    await this.loadPromise;
                }
                catch (error) {
                    // ignore
                }
                this.loadingPhase = LoadingPhase.Disposed;
                this.disposeFn(this._cacheKey);
            })();
        }
        else {
            this.loadingPhase = LoadingPhase.Disposed;
        }
        if (this.previousCacheState) {
            this.previousCacheState.dispose();
            this.previousCacheState = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9jYWNoZVN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxJQUFLLFlBTUo7QUFORCxXQUFLLFlBQVk7SUFDaEIscURBQVcsQ0FBQTtJQUNYLHFEQUFXLENBQUE7SUFDWCxtREFBVSxDQUFBO0lBQ1YscURBQVcsQ0FBQTtJQUNYLHVEQUFZLENBQUE7QUFDYixDQUFDLEVBTkksWUFBWSxLQUFaLFlBQVksUUFNaEI7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBRS9CLElBQUksUUFBUTtRQUNYLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUE7SUFDeEMsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sQ0FBQTtRQUUxRCxPQUFPLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFBO0lBQzFGLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixNQUFNLFVBQVUsR0FB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