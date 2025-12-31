/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { promises } from 'fs';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename, dirname, join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let CodeCacheCleaner = class CodeCacheCleaner extends Disposable {
    constructor(currentCodeCachePath, productService, logService) {
        super();
        this.logService = logService;
        this.dataMaxAge =
            productService.quality !== 'stable'
                ? 1000 * 60 * 60 * 24 * 7 // roughly 1 week (insiders)
                : 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months (stable)
        // Cached data is stored as user data and we run a cleanup task every time
        // the editor starts. The strategy is to delete all files that are older than
        // 3 months (1 week respectively)
        if (currentCodeCachePath) {
            const scheduler = this._register(new RunOnceScheduler(() => {
                this.cleanUpCodeCaches(currentCodeCachePath);
            }, 30 * 1000 /* after 30s */));
            scheduler.schedule();
        }
    }
    async cleanUpCodeCaches(currentCodeCachePath) {
        this.logService.trace('[code cache cleanup]: Starting to clean up old code cache folders.');
        try {
            const now = Date.now();
            // The folder which contains folders of cached data.
            // Each of these folders is partioned per commit
            const codeCacheRootPath = dirname(currentCodeCachePath);
            const currentCodeCache = basename(currentCodeCachePath);
            const codeCaches = await Promises.readdir(codeCacheRootPath);
            await Promise.all(codeCaches.map(async (codeCache) => {
                if (codeCache === currentCodeCache) {
                    return; // not the current cache folder
                }
                // Delete cache folder if old enough
                const codeCacheEntryPath = join(codeCacheRootPath, codeCache);
                const codeCacheEntryStat = await promises.stat(codeCacheEntryPath);
                if (codeCacheEntryStat.isDirectory() &&
                    now - codeCacheEntryStat.mtime.getTime() > this.dataMaxAge) {
                    this.logService.trace(`[code cache cleanup]: Removing code cache folder ${codeCache}.`);
                    return Promises.rm(codeCacheEntryPath);
                }
            }));
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
CodeCacheCleaner = __decorate([
    __param(1, IProductService),
    __param(2, ILogService)
], CodeCacheCleaner);
export { CodeCacheCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNhY2hlQ2xlYW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvY29kZUNhY2hlQ2xlYW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzdCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUVoRixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFHL0MsWUFDQyxvQkFBd0MsRUFDdkIsY0FBK0IsRUFDbEIsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFGdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUlyRCxJQUFJLENBQUMsVUFBVTtZQUNkLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUTtnQkFDbEMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsNEJBQTRCO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7UUFFN0QsMEVBQTBFO1FBQzFFLDZFQUE2RTtRQUM3RSxpQ0FBaUM7UUFDakMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQy9CLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM3QyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FDN0IsQ0FBQTtZQUNELFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBNEI7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQTtRQUUzRixJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7WUFFdEIsb0RBQW9EO1lBQ3BELGdEQUFnRDtZQUNoRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQ3ZELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFFdkQsTUFBTSxVQUFVLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDNUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtnQkFDbEMsSUFBSSxTQUFTLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztvQkFDcEMsT0FBTSxDQUFDLCtCQUErQjtnQkFDdkMsQ0FBQztnQkFFRCxvQ0FBb0M7Z0JBQ3BDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUM3RCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO2dCQUNsRSxJQUNDLGtCQUFrQixDQUFDLFdBQVcsRUFBRTtvQkFDaEMsR0FBRyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUN6RCxDQUFDO29CQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxTQUFTLEdBQUcsQ0FBQyxDQUFBO29CQUV2RixPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEvRFksZ0JBQWdCO0lBSzFCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FORCxnQkFBZ0IsQ0ErRDVCIn0=