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
import { join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let LanguagePackCachedDataCleaner = class LanguagePackCachedDataCleaner extends Disposable {
    constructor(environmentService, logService, productService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.dataMaxAge =
            productService.quality !== 'stable'
                ? 1000 * 60 * 60 * 24 * 7 // roughly 1 week (insiders)
                : 1000 * 60 * 60 * 24 * 30 * 3; // roughly 3 months (stable)
        // We have no Language pack support for dev version (run from source)
        // So only cleanup when we have a build version.
        if (this.environmentService.isBuilt) {
            const scheduler = this._register(new RunOnceScheduler(() => {
                this.cleanUpLanguagePackCache();
            }, 40 * 1000 /* after 40s */));
            scheduler.schedule();
        }
    }
    async cleanUpLanguagePackCache() {
        this.logService.trace('[language pack cache cleanup]: Starting to clean up unused language packs.');
        try {
            const installed = Object.create(null);
            const metaData = JSON.parse(await promises.readFile(join(this.environmentService.userDataPath, 'languagepacks.json'), 'utf8'));
            for (const locale of Object.keys(metaData)) {
                const entry = metaData[locale];
                installed[`${entry.hash}.${locale}`] = true;
            }
            // Cleanup entries for language packs that aren't installed anymore
            const cacheDir = join(this.environmentService.userDataPath, 'clp');
            const cacheDirExists = await Promises.exists(cacheDir);
            if (!cacheDirExists) {
                return;
            }
            const entries = await Promises.readdir(cacheDir);
            for (const entry of entries) {
                if (installed[entry]) {
                    this.logService.trace(`[language pack cache cleanup]: Skipping folder ${entry}. Language pack still in use.`);
                    continue;
                }
                this.logService.trace(`[language pack cache cleanup]: Removing unused language pack: ${entry}`);
                await Promises.rm(join(cacheDir, entry));
            }
            const now = Date.now();
            for (const packEntry of Object.keys(installed)) {
                const folder = join(cacheDir, packEntry);
                const entries = await Promises.readdir(folder);
                for (const entry of entries) {
                    if (entry === 'tcf.json') {
                        continue;
                    }
                    const candidate = join(folder, entry);
                    const stat = await promises.stat(candidate);
                    if (stat.isDirectory() && now - stat.mtime.getTime() > this.dataMaxAge) {
                        this.logService.trace(`[language pack cache cleanup]: Removing language pack cache folder: ${join(packEntry, entry)}`);
                        await Promises.rm(candidate);
                    }
                }
            }
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
LanguagePackCachedDataCleaner = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService),
    __param(2, IProductService)
], LanguagePackCachedDataCleaner);
export { LanguagePackCachedDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrQ2FjaGVkRGF0YUNsZWFuZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvbGFuZ3VhZ2VQYWNrQ2FjaGVkRGF0YUNsZWFuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUM3QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBbUJoRixJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFHNUQsWUFDNkMsa0JBQTZDLEVBQzNELFVBQXVCLEVBQ3BDLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFBO1FBSnFDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBMkI7UUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUtyRCxJQUFJLENBQUMsVUFBVTtZQUNkLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUTtnQkFDbEMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsNEJBQTRCO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7UUFFN0QscUVBQXFFO1FBQ3JFLGdEQUFnRDtRQUNoRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQkFDekIsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDaEMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQzdCLENBQUE7WUFDRCxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQiw0RUFBNEUsQ0FDNUUsQ0FBQTtRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUErQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pFLE1BQU0sUUFBUSxHQUFzQixJQUFJLENBQUMsS0FBSyxDQUM3QyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLEVBQ2hFLE1BQU0sQ0FDTixDQUNELENBQUE7WUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM5QixTQUFTLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFBO1lBQzVDLENBQUM7WUFFRCxtRUFBbUU7WUFDbkUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbEUsTUFBTSxjQUFjLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3RELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDckIsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDaEQsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLGtEQUFrRCxLQUFLLCtCQUErQixDQUN0RixDQUFBO29CQUNELFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsaUVBQWlFLEtBQUssRUFBRSxDQUN4RSxDQUFBO2dCQUVELE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDekMsQ0FBQztZQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUN0QixLQUFLLE1BQU0sU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDeEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM5QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUM3QixJQUFJLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQzt3QkFDMUIsU0FBUTtvQkFDVCxDQUFDO29CQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3JDLE1BQU0sSUFBSSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDM0MsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUN4RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsdUVBQXVFLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FDL0YsQ0FBQTt3QkFFRCxNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQzdCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE1RlksNkJBQTZCO0lBSXZDLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGVBQWUsQ0FBQTtHQU5MLDZCQUE2QixDQTRGekMifQ==