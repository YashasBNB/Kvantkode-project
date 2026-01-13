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
        this._lastUpdateCheck = 0;
        this._updateCheckCache = null;
        this._RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes between checks
        // Start automatic update checking every 30 minutes
        this._startAutoUpdateCheck();
    }
    _startAutoUpdateCheck() {
        // Only check for updates in production mode
        if (this._envMainService.isBuilt) {
            setInterval(() => {
                this.check(false); // Silent check
            }, 30 * 60 * 1000); // 30 minutes
        }
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
            return { message: 'Restart KvantKode to update!', action: 'restart' };
        }
        if (this._updateService.state.type === "disabled" /* StateType.Disabled */) {
            return await this._manualCheckGHTagIfDisabled(explicit);
        }
        return null;
    }
    async getDownloadUrl() {
        const now = Date.now();
        // Return cached result if within rate limit
        if (this._updateCheckCache && (now - this._lastUpdateCheck) < this._RATE_LIMIT_MS) {
            return this._updateCheckCache;
        }
        try {
            // Add user agent to avoid rate limiting
            const response = await fetch('https://api.github.com/repos/YashasBNB/Kvantkode-project/releases/latest', {
                headers: {
                    'User-Agent': 'KvantKode-Editor/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited, return fallback URL
                    return 'https://github.com/YashasBNB/Kvantkode-project/releases/latest';
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            // Find appropriate asset for current platform
            const asset = data.assets?.find((asset) => {
                if (process.platform === 'darwin') {
                    return asset.name.includes('.dmg') || asset.name.includes('mac');
                }
                else if (process.platform === 'win32') {
                    return asset.name.includes('.exe') || asset.name.includes('win');
                }
                else if (process.platform === 'linux') {
                    return asset.name.includes('.AppImage') || asset.name.includes('.deb') || asset.name.includes('.rpm');
                }
                return false;
            });
            const downloadUrl = asset?.browser_download_url || data.html_url;
            // Cache the result
            this._updateCheckCache = downloadUrl;
            this._lastUpdateCheck = now;
            return downloadUrl;
        }
        catch (e) {
            console.error('Failed to get download URL:', e);
            // Return fallback URL on error
            return 'https://github.com/YashasBNB/Kvantkode-project/releases/latest';
        }
    }
    async _manualCheckGHTagIfDisabled(explicit) {
        const now = Date.now();
        // For non-explicit checks, use cache to avoid rate limiting
        if (!explicit && this._updateCheckCache && (now - this._lastUpdateCheck) < this._RATE_LIMIT_MS) {
            return { message: null }; // Silent check, use cached data
        }
        try {
            const response = await fetch('https://api.github.com/repos/YashasBNB/Kvantkode-project/releases/latest', {
                headers: {
                    'User-Agent': 'KvantKode-Editor/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!response.ok) {
                if (response.status === 429 && !explicit) {
                    // Rate limited on silent check, just return null
                    return { message: null };
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const version = data.tag_name;
            const myVersion = this._productService.voidVersion || this._productService.version;
            const latestVersion = version;
            const isUpToDate = myVersion === latestVersion; // only makes sense if response.ok
            let message;
            let action;
            // explicit
            if (explicit) {
                if (response.ok) {
                    if (!isUpToDate) {
                        message =
                            'A new version of KvantKode is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                        action = 'reinstall';
                    }
                    else {
                        message = 'KvantKode is up-to-date!';
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
                        'A new version of KvantKode is available! Please reinstall (auto-updates are disabled on this OS) - it only takes a second!';
                    action = 'reinstall';
                }
                else {
                    message = null;
                }
            }
            // Update cache for successful requests
            this._lastUpdateCheck = now;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFVwZGF0ZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vdm9pZFVwZGF0ZU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLDhDQUE4QyxDQUFBO0FBSWpGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQU9wRCxZQUNrQixlQUFpRCxFQUN6QyxlQUF5RCxFQUNsRSxjQUErQztRQUUvRCxLQUFLLEVBQUUsQ0FBQTtRQUoyQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ2pELG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQVB4RCxxQkFBZ0IsR0FBVyxDQUFDLENBQUE7UUFDNUIsc0JBQWlCLEdBQVEsSUFBSSxDQUFBO1FBQ3BCLG1CQUFjLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUEsQ0FBQywyQkFBMkI7UUFRMUUsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsNENBQTRDO1FBQzVDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUNoQixJ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