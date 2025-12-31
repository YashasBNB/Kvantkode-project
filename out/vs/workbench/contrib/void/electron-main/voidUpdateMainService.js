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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL3ZvaWRVcGRhdGVNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQTtBQUlqRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFHcEQsWUFDbUMsZUFBZ0MsRUFDeEIsZUFBd0MsRUFDakQsY0FBOEI7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFKMkIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3hCLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUNqRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7SUFHaEUsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBaUI7UUFDNUIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQSxDQUFDLG9DQUFvQztRQUVwRixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQVcsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSx3Q0FBdUIsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQyxRQUFRO2dCQUFFLE9BQU8sRUFBRSxP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