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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFBdXRvU3luY1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLE9BQU8sR0FDUCxNQUFNLCtCQUErQixDQUFBO0FBRXRDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBRVYsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFP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