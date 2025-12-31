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
import { createCancelablePromise, disposableTimeout, ThrottledDelayer, timeout, } from '../../../base/common/async.js';
import { toLocalISOString } from '../../../base/common/date.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable, } from '../../../base/common/lifecycle.js';
import { isWeb } from '../../../base/common/platform.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, UserDataAutoSyncError, UserDataSyncError, } from './userDataSync.js';
import { IUserDataSyncAccountService } from './userDataSyncAccount.js';
import { IUserDataSyncMachinesService } from './userDataSyncMachines.js';
const disableMachineEventuallyKey = 'sync.disableMachineEventually';
const sessionIdKey = 'sync.sessionId';
const storeUrlKey = 'sync.storeUrl';
const productQualityKey = 'sync.productQuality';
let UserDataAutoSyncService = class UserDataAutoSyncService extends Disposable {
    get syncUrl() {
        const value = this.storageService.get(storeUrlKey, -1 /* StorageScope.APPLICATION */);
        return value ? URI.parse(value) : undefined;
    }
    set syncUrl(syncUrl) {
        if (syncUrl) {
            this.storageService.store(storeUrlKey, syncUrl.toString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(storeUrlKey, -1 /* StorageScope.APPLICATION */);
        }
    }
    get productQuality() {
        return this.storageService.get(productQualityKey, -1 /* StorageScope.APPLICATION */);
    }
    set productQuality(productQuality) {
        if (productQuality) {
            this.storageService.store(productQualityKey, productQuality, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(productQualityKey, -1 /* StorageScope.APPLICATION */);
        }
    }
    constructor(productService, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncEnablementService, userDataSyncService, logService, userDataSyncAccountService, telemetryService, userDataSyncMachinesService, storageService) {
        super();
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncService = userDataSyncService;
        this.logService = logService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.telemetryService = telemetryService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.storageService = storageService;
        this.autoSync = this._register(new MutableDisposable());
        this.successiveFailures = 0;
        this.lastSyncTriggerTime = undefined;
        this.suspendUntilRestart = false;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this.sources = [];
        this.syncTriggerDelayer = this._register(new ThrottledDelayer(this.getSyncTriggerDelayTime()));
        this.lastSyncUrl = this.syncUrl;
        this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;
        this.previousProductQuality = this.productQuality;
        this.productQuality = productService.quality;
        if (this.syncUrl) {
            this.logService.info('[AutoSync] Using settings sync service', this.syncUrl.toString());
            this._register(userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => {
                if (!isEqual(this.syncUrl, userDataSyncStoreManagementService.userDataSyncStore?.url)) {
                    this.lastSyncUrl = this.syncUrl;
                    this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;
                    if (this.syncUrl) {
                        this.logService.info('[AutoSync] Using settings sync service', this.syncUrl.toString());
                    }
                }
            }));
            if (this.userDataSyncEnablementService.isEnabled()) {
                this.logService.info('[AutoSync] Enabled.');
            }
            else {
                this.logService.info('[AutoSync] Disabled.');
            }
            this.updateAutoSync();
            if (this.hasToDisableMachineEventually()) {
                this.disableMachineEventually();
            }
            this._register(userDataSyncAccountService.onDidChangeAccount(() => this.updateAutoSync()));
            this._register(userDataSyncStoreService.onDidChangeDonotMakeRequestsUntil(() => this.updateAutoSync()));
            this._register(userDataSyncService.onDidChangeLocal((source) => this.triggerSync([source])));
            this._register(Event.filter(this.userDataSyncEnablementService.onDidChangeResourceEnablement, ([, enabled]) => enabled)(() => this.triggerSync(['resourceEnablement'])));
            this._register(this.userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => this.triggerSync(['userDataSyncStoreChanged'])));
        }
    }
    updateAutoSync() {
        const { enabled, message } = this.isAutoSyncEnabled();
        if (enabled) {
            if (this.autoSync.value === undefined) {
                this.autoSync.value = new AutoSync(this.lastSyncUrl, 1000 * 60 * 5 /* 5 miutes */, this.userDataSyncStoreManagementService, this.userDataSyncStoreService, this.userDataSyncService, this.userDataSyncMachinesService, this.logService, this.telemetryService, this.storageService);
                this.autoSync.value.register(this.autoSync.value.onDidStartSync(() => (this.lastSyncTriggerTime = new Date().getTime())));
                this.autoSync.value.register(this.autoSync.value.onDidFinishSync((e) => this.onDidFinishSync(e)));
                if (this.startAutoSync()) {
                    this.autoSync.value.start();
                }
            }
        }
        else {
            this.syncTriggerDelayer.cancel();
            if (this.autoSync.value !== undefined) {
                if (message) {
                    this.logService.info(message);
                }
                this.autoSync.clear();
            }
            else if (message && this.userDataSyncEnablementService.isEnabled()) {
                /* log message when auto sync is not disabled by user */
                this.logService.info(message);
            }
        }
    }
    // For tests purpose only
    startAutoSync() {
        return true;
    }
    isAutoSyncEnabled() {
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return { enabled: false, message: '[AutoSync] Disabled.' };
        }
        if (!this.userDataSyncAccountService.account) {
            return { enabled: false, message: '[AutoSync] Suspended until auth token is available.' };
        }
        if (this.userDataSyncStoreService.donotMakeRequestsUntil) {
            return {
                enabled: false,
                message: `[AutoSync] Suspended until ${toLocalISOString(this.userDataSyncStoreService.donotMakeRequestsUntil)} because server is not accepting requests until then.`,
            };
        }
        if (this.suspendUntilRestart) {
            return { enabled: false, message: '[AutoSync] Suspended until restart.' };
        }
        return { enabled: true };
    }
    async turnOn() {
        this.stopDisableMachineEventually();
        this.lastSyncUrl = this.syncUrl;
        this.updateEnablement(true);
    }
    async turnOff(everywhere, softTurnOffOnError, donotRemoveMachine) {
        try {
            // Remove machine
            if (this.userDataSyncAccountService.account && !donotRemoveMachine) {
                await this.userDataSyncMachinesService.removeCurrentMachine();
            }
            // Disable Auto Sync
            this.updateEnablement(false);
            // Reset Session
            this.storageService.remove(sessionIdKey, -1 /* StorageScope.APPLICATION */);
            // Reset
            if (everywhere) {
                await this.userDataSyncService.reset();
            }
            else {
                await this.userDataSyncService.resetLocal();
            }
        }
        catch (error) {
            this.logService.error(error);
            if (softTurnOffOnError) {
                this.updateEnablement(false);
            }
            else {
                throw error;
            }
        }
    }
    updateEnablement(enabled) {
        if (this.userDataSyncEnablementService.isEnabled() !== enabled) {
            this.userDataSyncEnablementService.setEnablement(enabled);
            this.updateAutoSync();
        }
    }
    hasProductQualityChanged() {
        return (!!this.previousProductQuality &&
            !!this.productQuality &&
            this.previousProductQuality !== this.productQuality);
    }
    async onDidFinishSync(error) {
        this.logService.debug('[AutoSync] Sync Finished');
        if (!error) {
            // Sync finished without errors
            this.successiveFailures = 0;
            return;
        }
        // Error while syncing
        const userDataSyncError = UserDataSyncError.toUserDataSyncError(error);
        // Session got expired
        if (userDataSyncError.code === "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because current session is expired');
        }
        // Turned off from another device
        else if (userDataSyncError.code === "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because sync is turned off in the cloud');
        }
        // Exceeded Rate Limit on Client
        else if (userDataSyncError.code === "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */) {
            this.suspendUntilRestart = true;
            this.logService.info('[AutoSync] Suspended sync because of making too many requests to server');
            this.updateAutoSync();
        }
        // Exceeded Rate Limit on Server
        else if (userDataSyncError.code === "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */) {
            await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine because disabling a machine makes request to server and can fail with TooManyRequests */);
            this.disableMachineEventually();
            this.logService.info('[AutoSync] Turned off sync because of making too many requests to server');
        }
        // Method Not Found
        else if (userDataSyncError.code === "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because current client is making requests to server that are not supported');
        }
        // Upgrade Required or Gone
        else if (userDataSyncError.code === "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */ ||
            userDataSyncError.code === "Gone" /* UserDataSyncErrorCode.Gone */) {
            await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine because disabling a machine makes request to server and can fail with upgrade required or gone */);
            this.disableMachineEventually();
            this.logService.info('[AutoSync] Turned off sync because current client is not compatible with server. Requires client upgrade.');
        }
        // Incompatible Local Content
        else if (userDataSyncError.code === "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info(`[AutoSync] Turned off sync because server has ${userDataSyncError.resource} content with newer version than of client. Requires client upgrade.`);
        }
        // Incompatible Remote Content
        else if (userDataSyncError.code === "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info(`[AutoSync] Turned off sync because server has ${userDataSyncError.resource} content with older version than of client. Requires server reset.`);
        }
        // Service changed
        else if (userDataSyncError.code === "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */ ||
            userDataSyncError.code === "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */) {
            // Check if default settings sync service has changed in web without changing the product quality
            // Then turn off settings sync and ask user to turn on again
            if (isWeb &&
                userDataSyncError.code === "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */ &&
                !this.hasProductQualityChanged()) {
                await this.turnOff(false, true /* force soft turnoff on error */);
                this.logService.info('[AutoSync] Turned off sync because default sync service is changed.');
            }
            // Service has changed by the user. So turn off and turn on sync.
            // Show a prompt to the user about service change.
            else {
                await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine */);
                await this.turnOn();
                this.logService.info('[AutoSync] Sync Service changed. Turned off auto sync, reset local state and turned on auto sync.');
            }
        }
        else {
            this.logService.error(userDataSyncError);
            this.successiveFailures++;
        }
        this._onError.fire(userDataSyncError);
    }
    async disableMachineEventually() {
        this.storageService.store(disableMachineEventuallyKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await timeout(1000 * 60 * 10);
        // Return if got stopped meanwhile.
        if (!this.hasToDisableMachineEventually()) {
            return;
        }
        this.stopDisableMachineEventually();
        // disable only if sync is disabled
        if (!this.userDataSyncEnablementService.isEnabled() &&
            this.userDataSyncAccountService.account) {
            await this.userDataSyncMachinesService.removeCurrentMachine();
        }
    }
    hasToDisableMachineEventually() {
        return this.storageService.getBoolean(disableMachineEventuallyKey, -1 /* StorageScope.APPLICATION */, false);
    }
    stopDisableMachineEventually() {
        this.storageService.remove(disableMachineEventuallyKey, -1 /* StorageScope.APPLICATION */);
    }
    async triggerSync(sources, options) {
        if (this.autoSync.value === undefined) {
            return this.syncTriggerDelayer.cancel();
        }
        if (options?.skipIfSyncedRecently &&
            this.lastSyncTriggerTime &&
            new Date().getTime() - this.lastSyncTriggerTime < 10_000) {
            this.logService.debug('[AutoSync] Skipping because sync was triggered recently.', sources);
            return;
        }
        this.sources.push(...sources);
        return this.syncTriggerDelayer.trigger(async () => {
            this.logService.trace('[AutoSync] Activity sources', ...this.sources);
            this.sources = [];
            if (this.autoSync.value) {
                await this.autoSync.value.sync('Activity', !!options?.disableCache);
            }
        }, this.successiveFailures
            ? Math.min(this.getSyncTriggerDelayTime() * this.successiveFailures, 60_000) /* Delay linearly until max 1 minute */
            : options?.immediately
                ? 0
                : this.getSyncTriggerDelayTime());
    }
    getSyncTriggerDelayTime() {
        if (this.lastSyncTriggerTime && new Date().getTime() - this.lastSyncTriggerTime > 10_000) {
            this.logService.debug('[AutoSync] Sync immediately because last sync was triggered more than 10 seconds ago.');
            return 0;
        }
        return 3_000; /* Debounce for 3 seconds if there are no failures */
    }
};
UserDataAutoSyncService = __decorate([
    __param(0, IProductService),
    __param(1, IUserDataSyncStoreManagementService),
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, IUserDataSyncService),
    __param(5, IUserDataSyncLogService),
    __param(6, IUserDataSyncAccountService),
    __param(7, ITelemetryService),
    __param(8, IUserDataSyncMachinesService),
    __param(9, IStorageService)
], UserDataAutoSyncService);
export { UserDataAutoSyncService };
class AutoSync extends Disposable {
    static { this.INTERVAL_SYNCING = 'Interval'; }
    constructor(lastSyncUrl, interval /* in milliseconds */, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncService, userDataSyncMachinesService, logService, telemetryService, storageService) {
        super();
        this.lastSyncUrl = lastSyncUrl;
        this.interval = interval;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.intervalHandler = this._register(new MutableDisposable());
        this._onDidStartSync = this._register(new Emitter());
        this.onDidStartSync = this._onDidStartSync.event;
        this._onDidFinishSync = this._register(new Emitter());
        this.onDidFinishSync = this._onDidFinishSync.event;
        this.manifest = null;
    }
    start() {
        this._register(this.onDidFinishSync(() => this.waitUntilNextIntervalAndSync()));
        this._register(toDisposable(() => {
            if (this.syncPromise) {
                this.syncPromise.cancel();
                this.logService.info('[AutoSync] Cancelled sync that is in progress');
                this.syncPromise = undefined;
            }
            this.syncTask?.stop();
            this.logService.info('[AutoSync] Stopped');
        }));
        this.sync(AutoSync.INTERVAL_SYNCING, false);
    }
    waitUntilNextIntervalAndSync() {
        this.intervalHandler.value = disposableTimeout(() => {
            this.sync(AutoSync.INTERVAL_SYNCING, false);
            this.intervalHandler.value = undefined;
        }, this.interval);
    }
    sync(reason, disableCache) {
        const syncPromise = createCancelablePromise(async (token) => {
            if (this.syncPromise) {
                try {
                    // Wait until existing sync is finished
                    this.logService.debug('[AutoSync] Waiting until sync is finished.');
                    await this.syncPromise;
                }
                catch (error) {
                    if (isCancellationError(error)) {
                        // Cancelled => Disposed. Donot continue sync.
                        return;
                    }
                }
            }
            return this.doSync(reason, disableCache, token);
        });
        this.syncPromise = syncPromise;
        this.syncPromise.finally(() => (this.syncPromise = undefined));
        return this.syncPromise;
    }
    hasSyncServiceChanged() {
        return (this.lastSyncUrl !== undefined &&
            !isEqual(this.lastSyncUrl, this.userDataSyncStoreManagementService.userDataSyncStore?.url));
    }
    async hasDefaultServiceChanged() {
        const previous = await this.userDataSyncStoreManagementService.getPreviousUserDataSyncStore();
        const current = this.userDataSyncStoreManagementService.userDataSyncStore;
        // check if defaults changed
        return (!!current &&
            !!previous &&
            (!isEqual(current.defaultUrl, previous.defaultUrl) ||
                !isEqual(current.insidersUrl, previous.insidersUrl) ||
                !isEqual(current.stableUrl, previous.stableUrl)));
    }
    async doSync(reason, disableCache, token) {
        this.logService.info(`[AutoSync] Triggered by ${reason}`);
        this._onDidStartSync.fire();
        let error;
        try {
            await this.createAndRunSyncTask(disableCache, token);
        }
        catch (e) {
            this.logService.error(e);
            error = e;
            if (UserDataSyncError.toUserDataSyncError(e).code === "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */) {
                try {
                    this.logService.info('[AutoSync] Client is making invalid requests. Cleaning up data...');
                    await this.userDataSyncService.cleanUpRemoteData();
                    this.logService.info('[AutoSync] Retrying sync...');
                    await this.createAndRunSyncTask(disableCache, token);
                    error = undefined;
                }
                catch (e1) {
                    this.logService.error(e1);
                    error = e1;
                }
            }
        }
        this._onDidFinishSync.fire(error);
    }
    async createAndRunSyncTask(disableCache, token) {
        this.syncTask = await this.userDataSyncService.createSyncTask(this.manifest, disableCache);
        if (token.isCancellationRequested) {
            return;
        }
        this.manifest = this.syncTask.manifest;
        // Server has no data but this machine was synced before
        if (this.manifest === null && (await this.userDataSyncService.hasPreviouslySynced())) {
            if (this.hasSyncServiceChanged()) {
                if (await this.hasDefaultServiceChanged()) {
                    throw new UserDataAutoSyncError(localize('default service changed', 'Cannot sync because default service has changed'), "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */);
                }
                else {
                    throw new UserDataAutoSyncError(localize('service changed', 'Cannot sync because sync service has changed'), "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */);
                }
            }
            else {
                // Sync was turned off in the cloud
                throw new UserDataAutoSyncError(localize('turned off', 'Cannot sync because syncing is turned off in the cloud'), "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            }
        }
        const sessionId = this.storageService.get(sessionIdKey, -1 /* StorageScope.APPLICATION */);
        // Server session is different from client session
        if (sessionId && this.manifest && sessionId !== this.manifest.session) {
            if (this.hasSyncServiceChanged()) {
                if (await this.hasDefaultServiceChanged()) {
                    throw new UserDataAutoSyncError(localize('default service changed', 'Cannot sync because default service has changed'), "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */);
                }
                else {
                    throw new UserDataAutoSyncError(localize('service changed', 'Cannot sync because sync service has changed'), "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */);
                }
            }
            else {
                throw new UserDataAutoSyncError(localize('session expired', 'Cannot sync because current session is expired'), "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */);
            }
        }
        const machines = await this.userDataSyncMachinesService.getMachines(this.manifest || undefined);
        // Return if cancellation is requested
        if (token.isCancellationRequested) {
            return;
        }
        const currentMachine = machines.find((machine) => machine.isCurrent);
        // Check if sync was turned off from other machine
        if (currentMachine?.disabled) {
            // Throw TurnedOff error
            throw new UserDataAutoSyncError(localize('turned off machine', 'Cannot sync because syncing is turned off on this machine from another machine.'), "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
        }
        const startTime = new Date().getTime();
        await this.syncTask.run();
        this.telemetryService.publicLog2('settingsSync:sync', { duration: new Date().getTime() - startTime });
        // After syncing, get the manifest if it was not available before
        if (this.manifest === null) {
            try {
                this.manifest = await this.userDataSyncStoreService.manifest(null);
            }
            catch (error) {
                throw new UserDataAutoSyncError(toErrorMessage(error), error instanceof UserDataSyncError ? error.code : "Unknown" /* UserDataSyncErrorCode.Unknown */);
            }
        }
        // Update local session id
        if (this.manifest && this.manifest.session !== sessionId) {
            this.storageService.store(sessionIdKey, this.manifest.session, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        // Return if cancellation is requested
        if (token.isCancellationRequested) {
            return;
        }
        // Add current machine
        if (!currentMachine) {
            await this.userDataSyncMachinesService.addCurrentMachine(this.manifest || undefined);
        }
    }
    register(t) {
        return super._register(t);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhQXV0b1N5bmNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixPQUFPLEdBQ1AsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUVWLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUlOLHVCQUF1QixFQUN2Qiw4QkFB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