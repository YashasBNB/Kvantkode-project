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
import { timeout } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { State, } from '../common/update.js';
export function createUpdateURL(platform, quality, productService) {
    return `${productService.updateUrl}/api/update/${platform}/${quality}/${productService.commit}`;
}
let AbstractUpdateService = class AbstractUpdateService {
    get state() {
        return this._state;
    }
    setState(state) {
        this.logService.info('update#setState', state.type);
        this._state = state;
        this._onStateChange.fire(state);
    }
    constructor(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService) {
        this.lifecycleMainService = lifecycleMainService;
        this.configurationService = configurationService;
        this.environmentMainService = environmentMainService;
        this.requestService = requestService;
        this.logService = logService;
        this.productService = productService;
        this._state = State.Uninitialized;
        this._onStateChange = new Emitter();
        this.onStateChange = this._onStateChange.event;
        lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */).finally(() => this.initialize());
    }
    /**
     * This must be called before any other call. This is a performance
     * optimization, to avoid using extra CPU cycles before first window open.
     * https://github.com/microsoft/vscode/issues/89784
     */
    async initialize() {
        if (!this.environmentMainService.isBuilt) {
            this.setState(State.Disabled(0 /* DisablementReason.NotBuilt */));
            return; // updates are never enabled when running out of sources
        }
        if (this.environmentMainService.disableUpdates) {
            this.setState(State.Disabled(1 /* DisablementReason.DisabledByEnvironment */));
            this.logService.info('update#ctor - updates are disabled by the environment');
            return;
        }
        if (!this.productService.updateUrl || !this.productService.commit) {
            this.setState(State.Disabled(3 /* DisablementReason.MissingConfiguration */));
            this.logService.info('update#ctor - updates are disabled as there is no update URL');
            return;
        }
        const updateMode = this.configurationService.getValue('update.mode');
        const quality = this.getProductQuality(updateMode);
        if (!quality) {
            this.setState(State.Disabled(2 /* DisablementReason.ManuallyDisabled */));
            this.logService.info('update#ctor - updates are disabled by user preference');
            return;
        }
        this.url = this.buildUpdateFeedUrl(quality);
        if (!this.url) {
            this.setState(State.Disabled(4 /* DisablementReason.InvalidConfiguration */));
            this.logService.info('update#ctor - updates are disabled as the update URL is badly formed');
            return;
        }
        // hidden setting
        if (this.configurationService.getValue('_update.prss')) {
            const url = new URL(this.url);
            url.searchParams.set('prss', 'true');
            this.url = url.toString();
        }
        this.setState(State.Idle(this.getUpdateType()));
        if (updateMode === 'manual') {
            this.logService.info('update#ctor - manual checks only; automatic updates are disabled by user preference');
            return;
        }
        if (updateMode === 'start') {
            this.logService.info('update#ctor - startup checks only; automatic updates are disabled by user preference');
            // Check for updates only once after 30 seconds
            setTimeout(() => this.checkForUpdates(false), 30 * 1000);
        }
        else {
            // Start checking for updates after 30 seconds
            this.scheduleCheckForUpdates(30 * 1000).then(undefined, (err) => this.logService.error(err));
        }
    }
    getProductQuality(updateMode) {
        return updateMode === 'none' ? undefined : this.productService.quality;
    }
    scheduleCheckForUpdates(delay = 60 * 60 * 1000) {
        return timeout(delay)
            .then(() => this.checkForUpdates(false))
            .then(() => {
            // Check again after 1 hour
            return this.scheduleCheckForUpdates(60 * 60 * 1000);
        });
    }
    async checkForUpdates(explicit) {
        this.logService.trace('update#checkForUpdates, state = ', this.state.type);
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        this.doCheckForUpdates(explicit);
    }
    async downloadUpdate() {
        this.logService.trace('update#downloadUpdate, state = ', this.state.type);
        if (this.state.type !== "available for download" /* StateType.AvailableForDownload */) {
            return;
        }
        await this.doDownloadUpdate(this.state);
    }
    async doDownloadUpdate(state) {
        // noop
    }
    async applyUpdate() {
        this.logService.trace('update#applyUpdate, state = ', this.state.type);
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return;
        }
        await this.doApplyUpdate();
    }
    async doApplyUpdate() {
        // noop
    }
    quitAndInstall() {
        this.logService.trace('update#quitAndInstall, state = ', this.state.type);
        if (this.state.type !== "ready" /* StateType.Ready */) {
            return Promise.resolve(undefined);
        }
        this.logService.trace('update#quitAndInstall(): before lifecycle quit()');
        this.lifecycleMainService.quit(true /* will restart */).then((vetod) => {
            this.logService.trace(`update#quitAndInstall(): after lifecycle quit() with veto: ${vetod}`);
            if (vetod) {
                return;
            }
            this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
            this.doQuitAndInstall();
        });
        return Promise.resolve(undefined);
    }
    async isLatestVersion() {
        if (!this.url) {
            return undefined;
        }
        const mode = this.configurationService.getValue('update.mode');
        if (mode === 'none') {
            return false;
        }
        try {
            const context = await this.requestService.request({ url: this.url }, CancellationToken.None);
            // The update server replies with 204 (No Content) when no
            // update is available - that's all we want to know.
            return context.res.statusCode === 204;
        }
        catch (error) {
            this.logService.error('update#isLatestVersion(): failed to check for updates');
            this.logService.error(error);
            return undefined;
        }
    }
    async _applySpecificUpdate(packagePath) {
        // noop
    }
    getUpdateType() {
        return 1 /* UpdateType.Archive */;
    }
    doQuitAndInstall() {
        // noop
    }
};
AbstractUpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, IRequestService),
    __param(4, ILogService),
    __param(5, IProductService)
], AbstractUpdateService);
export { AbstractUpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RVcGRhdGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvZWxlY3Ryb24tbWFpbi9hYnN0cmFjdFVwZGF0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUlOLEtBQUssR0FHTCxNQUFNLHFCQUFxQixDQUFBO0FBRTVCLE1BQU0sVUFBVSxlQUFlLENBQzlCLFFBQWdCLEVBQ2hCLE9BQWUsRUFDZixjQUErQjtJQUUvQixPQUFPLEdBQUcsY0FBYyxDQUFDLFNBQVMsZUFBZSxRQUFRLElBQUksT0FBTyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtBQUNoRyxDQUFDO0FBWU0sSUFBZSxxQkFBcUIsR0FBcEMsTUFBZSxxQkFBcUI7SUFVMUMsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lB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