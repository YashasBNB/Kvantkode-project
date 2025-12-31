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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrQ2FjaGVkRGF0YUNsZWFuZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL2xhbmd1YWdlUGFja0NhY2hlZERhdGFDbGVhbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDN0IsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQW1CaEYsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxVQUFVO0lBRzVELFlBQzZDLGtCQUE2QyxFQUMzRCxVQUF1QixFQUNwQyxjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQTtRQUpxQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBQzNELGVBQVUsR0FBVixVQUFVLENBQWE7UUFLckQsSUFBSSxDQUFDLFVBQVU7WUFDZCxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVE7Z0JBQ2xDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxH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