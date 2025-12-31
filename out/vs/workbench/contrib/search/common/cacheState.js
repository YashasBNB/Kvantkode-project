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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9jb21tb24vY2FjaGVTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsSUFBSyxZQU1KO0FBTkQsV0FBSyxZQUFZO0lBQ2hCLHFEQUFXLENBQUE7SUFDWCxxREFBVyxDQUFBO0lBQ1gsbURBQVUsQ0FBQTtJQUNWLHFEQUFXLENBQUE7SUFDWCx1REFBWSxDQUFBO0FBQ2IsQ0FBQyxFQU5JLFlBQVksS0FBWixZQUFZLFFBTWhCO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjtJQUUvQixJQUFJLFFBQVE7UUFDWCxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUN0QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFBO0lBQ3hDLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLENBQUE7UUFFMUQsT0FBTyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQTtJQUMxRixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsT0FBTyxDQUFBO1FBRTdELE9BQU8sVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUE7SUFDaEcsQ0FBQztJQU9ELFlBQ1MsVUFBNEMsRUFDNUMsTUFBMkMsRUFDM0MsU0FBOEMsRUFDOUMsa0JBQW1EO1FBSG5ELGVBQVUsR0FBVixVQUFVLENBQWtDO1FBQzVDLFdBQU0sR0FBTixNQUFNLENBQXFDO1FBQzNDLGNBQVMsR0FBVCxTQUFTLENBQXFDO1FBQzlDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBaUM7UUE5QjNDLGNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQXFCckMsVUFBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWhELGlCQUFZLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtRQVMxQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNqRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDckYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNqQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1lBQ3BDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUE7UUFFeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzlCLElBQUksQ0FBQztnQkFDSixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUU3QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUE7Z0JBRXZDLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDakMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQTtnQkFDcEMsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUE7Z0JBRXhDLE1BQU0sS0FBSyxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFSixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsQ0FBQztZQUFBLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ1osSUFBSSxDQUFDO29CQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQTtnQkFDdkIsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixTQUFTO2dCQUNWLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFBO2dCQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMvQixDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUE7UUFDMUMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2pDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUE7UUFDcEMsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9