/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
let VoidMainUpdateService = class VoidMainUpdateService extends Disposable {
    constructor(_productService, _envMainService, _updateService) {
        super();
        this._productService = _productService;
        this._envMainService = _envMainService;
        this._updateService = _updateService;
    }
    async check(explicit) {
        const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts
        if (isDevMode) {
            return { message: null };
        }
        // if disabled and not explicitly checking, return early
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            if (!explicit)
                return { message: null };
        }
        this._updateService.checkForUpdates(false); // implicity check, then handle result ourselves
        console.log('updateState', this._updateService.state);
        if (this._updateService.state.type === "uninitialized" /* StateType.Uninitialized */) {
            // The update service hasn't been initialized yet
            return {
                message: explicit ? 'Checking for updates soon...' : null,
                action: explicit ? 'reinstall' : undefined,
            };
        }
        if (this._updateService.state.type === "idle" /* StateType.Idle */) {
            // No updates currently available
            return {
                message: explicit ? 'No updates found!' : null,
                action: explicit ? 'reinstall' : undefined,
            };
        }
        if (this._updateService.state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
            // Currently checking for updates
            return { message: explicit ? 'Checking for updates...' : null };
        }
        if (this._updateService.state.type === "available for download" /* StateType.AvailableForDownload */) {
            // Update available but requires manual download (mainly for Linux)
            return { message: 'A new update is available!', action: 'download' };
        }
        if (this._updateService.state.type === "downloading" /* StateType.Downloading */) {
            // Update is currently being downloaded
            return { message: explicit ? 'Currently downloading update...' : null };
        }
        if (this._updateService.state.type === "downloaded" /* StateType.Downloaded */) {
            // Update has been downloaded but not yet ready
            return {
                message: explicit ? 'An update is ready to be applied!' : null,
                action: 'apply',
            };
        }
        if (this._updateService.state.type === "updating" /* StateType.Updating */) {
            // Update is being applied
            return { message: explicit ? 'Applying update...' : null };
        }
        if (this._updateService.state.type === "ready" /* StateType.Ready */) {
            // Update is ready
            return { message: 'Restart Void to update!', action: 'restart' };
        }
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            return await this._manualCheckGHTagIfDisabled(explicit);
        }
        return null;
    }
    async _manualCheckGHTagIfDisabled(explicit) {
        try {
            const response = await fetch('https://api.github.com/repos/voideditor/binaries/releases/latest');
            const data = await response.json();
            const version = data.tag_name;
            const myVersion = this._productService.version;
            const latestVersion = version;
            const isUpToDate = myVersion === latestVersion; // only makes sense if response.ok
            let message;
            let action;
            // explicit
            if (explicit) {
                if (response.ok) {
                    if (!isUpToDate) {
                        message =
                            'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                        action = 'reinstall';
                    }
                    else {
                        message = 'Void is up-to-date!';
                    }
                }
                else {
                    message = `An error occurred when fetching the latest GitHub release tag. Please try again in ~5 minutes, or reinstall.`;
                    action = 'reinstall';
                }
            }
            // not explicit
            else {
                if (response.ok && !isUpToDate) {
                    message =
                        'A new version of Void is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                    action = 'reinstall';
                }
                else {
                    message = null;
                }
            }
            return { message, action };
        }
        catch (e) {
            if (explicit) {
                return {
                    message: `An error occurred when fetching the latest GitHub release tag: ${e}. Please try again in ~5 minutes.`,
                    action: 'reinstall',
                };
            }
            else {
                return { message: null };
            }
        }
    }
};
VoidMainUpdateService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentMainService),
    __param(2, IUpdateService)
], VoidMainUpdateService);
export { VoidMainUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vdm9pZFVwZGF0ZU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLDhDQUE4QyxDQUFBO0FBSWpGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQUdwRCxZQUNtQyxlQUFnQyxFQUN4QixlQUF3QyxFQUNqRCxjQUE4QjtRQUUvRCxLQUFLLEVBQUUsQ0FBQTtRQUoyQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ2pELG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtJQUdoRSxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFpQjtRQUM1QixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFBLENBQUMsb0NBQW9DO1FBRXBGLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBVyxDQUFBO1FBQ2xDLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLHdDQUF1QixFQUFFLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxF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