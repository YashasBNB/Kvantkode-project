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
import * as electron from 'electron';
import { memoize } from '../../../base/common/decorators.js';
import { Event } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { State } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL, } from './abstractUpdateService.js';
let DarwinUpdateService = class DarwinUpdateService extends AbstractUpdateService {
    get onRawError() {
        return Event.fromNodeEventEmitter(electron.autoUpdater, 'error', (_, message) => message);
    }
    get onRawUpdateNotAvailable() {
        return Event.fromNodeEventEmitter(electron.autoUpdater, 'update-not-available');
    }
    get onRawUpdateAvailable() {
        return Event.fromNodeEventEmitter(electron.autoUpdater, 'update-available');
    }
    get onRawUpdateDownloaded() {
        return Event.fromNodeEventEmitter(electron.autoUpdater, 'update-downloaded', (_, releaseNotes, version, timestamp) => ({ version, productVersion: version, timestamp }));
    }
    constructor(lifecycleMainService, configurationService, telemetryService, environmentMainService, requestService, logService, productService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
        this.telemetryService = telemetryService;
        this.disposables = new DisposableStore();
        lifecycleMainService.setRelaunchHandler(this);
    }
    handleRelaunch(options) {
        if (options?.addArgs || options?.removeArgs) {
            return false; // we cannot apply an update and restart with different args
        }
        if (this.state.type !== "ready" /* StateType.Ready */) {
            return false; // we only handle the relaunch when we have a pending update
        }
        this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
        this.doQuitAndInstall();
        return true;
    }
    async initialize() {
        await super.initialize();
        this.onRawError(this.onError, this, this.disposables);
        this.onRawUpdateAvailable(this.onUpdateAvailable, this, this.disposables);
        this.onRawUpdateDownloaded(this.onUpdateDownloaded, this, this.disposables);
        this.onRawUpdateNotAvailable(this.onUpdateNotAvailable, this, this.disposables);
    }
    onError(err) {
        this.telemetryService.publicLog2('update:error', { messageHash: String(hash(String(err))) });
        this.logService.error('UpdateService error:', err);
        // only show message when explicitly checking for updates
        const message = this.state.type === "checking for updates" /* StateType.CheckingForUpdates */ && this.state.explicit ? err : undefined;
        this.setState(State.Idle(1 /* UpdateType.Archive */, message));
    }
    buildUpdateFeedUrl(quality) {
        let assetID;
        if (!this.productService.darwinUniversalAssetId) {
            assetID = process.arch === 'x64' ? 'darwin' : 'darwin-arm64';
        }
        else {
            assetID = this.productService.darwinUniversalAssetId;
        }
        const url = createUpdateURL(assetID, quality, this.productService);
        try {
            electron.autoUpdater.setFeedURL({ url });
        }
        catch (e) {
            // application is very likely not signed
            this.logService.error('Failed to set update feed URL', e);
            return undefined;
        }
        return url;
    }
    doCheckForUpdates(context) {
        this.setState(State.CheckingForUpdates(context));
        electron.autoUpdater.checkForUpdates();
    }
    onUpdateAvailable() {
        if (this.state.type !== "checking for updates" /* StateType.CheckingForUpdates */) {
            return;
        }
        this.setState(State.Downloading);
    }
    onUpdateDownloaded(update) {
        if (this.state.type !== "downloading" /* StateType.Downloading */) {
            return;
        }
        this.setState(State.Downloaded(update));
        this.telemetryService.publicLog2('update:downloaded', { newVersion: update.version });
        this.setState(State.Ready(update));
    }
    onUpdateNotAvailable() {
        if (this.state.type !== "checking for updates" /* StateType.CheckingForUpdates */) {
            return;
        }
        this.setState(State.Idle(1 /* UpdateType.Archive */));
    }
    doQuitAndInstall() {
        this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
        electron.autoUpdater.quitAndInstall();
    }
    dispose() {
        this.disposables.dispose();
    }
};
__decorate([
    memoize
], DarwinUpdateService.prototype, "onRawError", null);
__decorate([
    memoize
], DarwinUpdateService.prototype, "onRawUpdateNotAvailable", null);
__decorate([
    memoize
], DarwinUpdateService.prototype, "onRawUpdateAvailable", null);
__decorate([
    memoize
], DarwinUpdateService.prototype, "onRawUpdateDownloaded", null);
DarwinUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, ITelemetryService),
    __param(3, IEnvironmentMainService),
    __param(4, IRequestService),
    __param(5, ILogService),
    __param(6, IProductService)
], DarwinUpdateService);
export { DarwinUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5kYXJ3aW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvZWxlY3Ryb24tbWFpbi91cGRhdGVTZXJ2aWNlLmRhcndpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUNOLHFCQUFxQixHQUdyQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBVyxLQUFLLEVBQXlCLE1BQU0scUJBQXFCLENBQUE7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixlQUFlLEdBRWYsTUFBTSw0QkFBNEIsQ0FBQTtBQUU1QixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLHFCQUFxQjtJQUdwRCxJQUFZ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