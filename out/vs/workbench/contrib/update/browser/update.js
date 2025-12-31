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
var ProductContribution_1;
import * as nls from '../../../../nls.js';
import severity from '../../../../base/common/severity.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IActivityService, NumberBadge, ProgressBadge, } from '../../../services/activity/common/activity.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUpdateService, } from '../../../../platform/update/common/update.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { ReleaseNotesManager } from './releaseNotesEditor.js';
import { isMacintosh, isWeb, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuRegistry, MenuId, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { Promises } from '../../../../base/common/async.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { Event } from '../../../../base/common/event.js';
import { toAction } from '../../../../base/common/actions.js';
export const CONTEXT_UPDATE_STATE = new RawContextKey('updateState', "uninitialized" /* StateType.Uninitialized */);
export const MAJOR_MINOR_UPDATE_AVAILABLE = new RawContextKey('majorMinorUpdateAvailable', false);
export const RELEASE_NOTES_URL = new RawContextKey('releaseNotesUrl', '');
export const DOWNLOAD_URL = new RawContextKey('downloadUrl', '');
let releaseNotesManager = undefined;
export function showReleaseNotesInEditor(instantiationService, version, useCurrentFile) {
    if (!releaseNotesManager) {
        releaseNotesManager = instantiationService.createInstance(ReleaseNotesManager);
    }
    return releaseNotesManager.show(version, useCurrentFile);
}
async function openLatestReleaseNotesInBrowser(accessor) {
    const openerService = accessor.get(IOpenerService);
    const productService = accessor.get(IProductService);
    if (productService.releaseNotesUrl) {
        const uri = URI.parse(productService.releaseNotesUrl);
        await openerService.open(uri);
    }
    else {
        throw new Error(nls.localize('update.noReleaseNotesOnline', 'This version of {0} does not have release notes online', productService.nameLong));
    }
}
async function showReleaseNotes(accessor, version) {
    const instantiationService = accessor.get(IInstantiationService);
    try {
        await showReleaseNotesInEditor(instantiationService, version, false);
    }
    catch (err) {
        try {
            await instantiationService.invokeFunction(openLatestReleaseNotesInBrowser);
        }
        catch (err2) {
            throw new Error(`${err.message} and ${err2.message}`);
        }
    }
}
function parseVersion(version) {
    const match = /([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(version);
    if (!match) {
        return undefined;
    }
    return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
    };
}
function isMajorMinorUpdate(before, after) {
    return before.major < after.major || before.minor < after.minor;
}
let ProductContribution = class ProductContribution {
    static { ProductContribution_1 = this; }
    static { this.KEY = 'releaseNotes/lastVersion'; }
    constructor(storageService, instantiationService, notificationService, environmentService, openerService, configurationService, hostService, productService, contextKeyService) {
        if (productService.releaseNotesUrl) {
            const releaseNotesUrlKey = RELEASE_NOTES_URL.bindTo(contextKeyService);
            releaseNotesUrlKey.set(productService.releaseNotesUrl);
        }
        if (productService.downloadUrl) {
            const downloadUrlKey = DOWNLOAD_URL.bindTo(contextKeyService);
            downloadUrlKey.set(productService.downloadUrl);
        }
        if (isWeb) {
            return;
        }
        hostService.hadLastFocus().then(async (hadLastFocus) => {
            if (!hadLastFocus) {
                return;
            }
            const lastVersion = parseVersion(storageService.get(ProductContribution_1.KEY, -1 /* StorageScope.APPLICATION */, ''));
            const currentVersion = parseVersion(productService.version);
            const shouldShowReleaseNotes = configurationService.getValue('update.showReleaseNotes');
            const releaseNotesUrl = productService.releaseNotesUrl;
            // was there a major/minor update? if so, open release notes
            if (shouldShowReleaseNotes &&
                !environmentService.skipReleaseNotes &&
                releaseNotesUrl &&
                lastVersion &&
                currentVersion &&
                isMajorMinorUpdate(lastVersion, currentVersion)) {
                showReleaseNotesInEditor(instantiationService, productService.version, false).then(undefined, () => {
                    notificationService.prompt(severity.Info, nls.localize('read the release notes', 'Welcome to {0} v{1}! Would you like to read the Release Notes?', productService.nameLong, productService.version), [
                        {
                            label: nls.localize('releaseNotes', 'Release Notes'),
                            run: () => {
                                const uri = URI.parse(releaseNotesUrl);
                                openerService.open(uri);
                            },
                        },
                    ]);
                });
            }
            storageService.store(ProductContribution_1.KEY, productService.version, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        });
    }
};
ProductContribution = ProductContribution_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IBrowserWorkbenchEnvironmentService),
    __param(4, IOpenerService),
    __param(5, IConfigurationService),
    __param(6, IHostService),
    __param(7, IProductService),
    __param(8, IContextKeyService)
], ProductContribution);
export { ProductContribution };
let UpdateContribution = class UpdateContribution extends Disposable {
    constructor(storageService, instantiationService, notificationService, dialogService, updateService, activityService, contextKeyService, productService, openerService, configurationService, hostService) {
        super();
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.updateService = updateService;
        this.activityService = activityService;
        this.contextKeyService = contextKeyService;
        this.productService = productService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.state = updateService.state;
        this.updateStateContextKey = CONTEXT_UPDATE_STATE.bindTo(this.contextKeyService);
        this.majorMinorUpdateAvailableContextKey = MAJOR_MINOR_UPDATE_AVAILABLE.bindTo(this.contextKeyService);
        this._register(updateService.onStateChange(this.onUpdateStateChange, this));
        this.onUpdateStateChange(this.updateService.state);
        /*
        The `update/lastKnownVersion` and `update/updateNotificationTime` storage keys are used in
        combination to figure out when to show a message to the user that he should update.

        This message should appear if the user has received an update notification but hasn't
        updated since 5 days.
        */
        const currentVersion = this.productService.commit;
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if current version != stored version, clear both fields
        if (currentVersion !== lastKnownVersion) {
            this.storageService.remove('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
            this.storageService.remove('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */);
        }
        this.registerGlobalActivityActions();
    }
    async onUpdateStateChange(state) {
        this.updateStateContextKey.set(state.type);
        switch (state.type) {
            case "disabled" /* StateType.Disabled */:
                if (state.reason === 5 /* DisablementReason.RunningAsAdmin */) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: nls.localize('update service disabled', 'Updates are disabled because you are running the user-scope installation of {0} as Administrator.', this.productService.nameLong),
                        actions: {
                            primary: [
                                toAction({
                                    id: '',
                                    label: nls.localize('learn more', 'Learn More'),
                                    run: () => this.openerService.open('https://aka.ms/vscode-windows-setup'),
                                }),
                            ],
                        },
                        neverShowAgain: { id: 'no-updates-running-as-admin' },
                    });
                }
                break;
            case "idle" /* StateType.Idle */:
                if (state.error) {
                    this.onError(state.error);
                }
                else if (this.state.type === "checking for updates" /* StateType.CheckingForUpdates */ &&
                    this.state.explicit &&
                    (await this.hostService.hadLastFocus())) {
                    this.onUpdateNotAvailable();
                }
                break;
            case "available for download" /* StateType.AvailableForDownload */:
                this.onUpdateAvailable(state.update);
                break;
            case "downloaded" /* StateType.Downloaded */:
                this.onUpdateDownloaded(state.update);
                break;
            case "ready" /* StateType.Ready */: {
                const productVersion = state.update.productVersion;
                if (productVersion) {
                    const currentVersion = parseVersion(this.productService.version);
                    const nextVersion = parseVersion(productVersion);
                    this.majorMinorUpdateAvailableContextKey.set(Boolean(currentVersion && nextVersion && isMajorMinorUpdate(currentVersion, nextVersion)));
                    this.onUpdateReady(state.update);
                }
                break;
            }
        }
        let badge = undefined;
        if (state.type === "available for download" /* StateType.AvailableForDownload */ ||
            state.type === "downloaded" /* StateType.Downloaded */ ||
            state.type === "ready" /* StateType.Ready */) {
            badge = new NumberBadge(1, () => nls.localize('updateIsReady', 'New {0} update available.', this.productService.nameShort));
        }
        else if (state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
            badge = new ProgressBadge(() => nls.localize('checkingForUpdates', 'Checking for {0} updates...', this.productService.nameShort));
        }
        else if (state.type === "downloading" /* StateType.Downloading */) {
            badge = new ProgressBadge(() => nls.localize('downloading', 'Downloading {0} update...', this.productService.nameShort));
        }
        else if (state.type === "updating" /* StateType.Updating */) {
            badge = new ProgressBadge(() => nls.localize('updating', 'Updating {0}...', this.productService.nameShort));
        }
        this.badgeDisposable.clear();
        if (badge) {
            this.badgeDisposable.value = this.activityService.showGlobalActivity({ badge });
        }
        this.state = state;
    }
    onError(error) {
        if (/The request timed out|The network connection was lost/i.test(error)) {
            return;
        }
        error = error.replace(/See https:\/\/github\.com\/Squirrel\/Squirrel\.Mac\/issues\/182 for more information/, 'This might mean the application was put on quarantine by macOS. See [this link](https://github.com/microsoft/vscode/issues/7426#issuecomment-425093469) for more information');
        this.notificationService.notify({
            severity: Severity.Error,
            message: error,
            source: nls.localize('update service', 'Update Service'),
        });
    }
    onUpdateNotAvailable() {
        this.dialogService.info(nls.localize('noUpdatesAvailable', 'There are currently no updates available.'));
    }
    // linux
    onUpdateAvailable(update) {
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize('thereIsUpdateAvailable', 'There is an available update.'), [
            {
                label: nls.localize('download update', 'Download Update'),
                run: () => this.updateService.downloadUpdate(),
            },
            {
                label: nls.localize('later', 'Later'),
                run: () => { },
            },
            {
                label: nls.localize('releaseNotes', 'Release Notes'),
                run: () => {
                    this.instantiationService.invokeFunction((accessor) => showReleaseNotes(accessor, productVersion));
                },
            },
        ]);
    }
    // windows fast updates
    onUpdateDownloaded(update) {
        if (isMacintosh) {
            return;
        }
        if (this.configurationService.getValue('update.enableWindowsBackgroundUpdates') &&
            this.productService.target === 'user') {
            return;
        }
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize('updateAvailable', "There's an update available: {0} {1}", this.productService.nameLong, productVersion), [
            {
                label: nls.localize('installUpdate', 'Install Update'),
                run: () => this.updateService.applyUpdate(),
            },
            {
                label: nls.localize('later', 'Later'),
                run: () => { },
            },
            {
                label: nls.localize('releaseNotes', 'Release Notes'),
                run: () => {
                    this.instantiationService.invokeFunction((accessor) => showReleaseNotes(accessor, productVersion));
                },
            },
        ]);
    }
    // windows and mac
    onUpdateReady(update) {
        if (!(isWindows && this.productService.target !== 'user') && !this.shouldShowNotification()) {
            return;
        }
        const actions = [
            {
                label: nls.localize('updateNow', 'Update Now'),
                run: () => this.updateService.quitAndInstall(),
            },
            {
                label: nls.localize('later', 'Later'),
                run: () => { },
            },
        ];
        const productVersion = update.productVersion;
        if (productVersion) {
            actions.push({
                label: nls.localize('releaseNotes', 'Release Notes'),
                run: () => {
                    this.instantiationService.invokeFunction((accessor) => showReleaseNotes(accessor, productVersion));
                },
            });
        }
        // windows user fast updates and mac
        this.notificationService.prompt(severity.Info, nls.localize('updateAvailableAfterRestart', 'Restart {0} to apply the latest update.', this.productService.nameLong), actions, { sticky: true });
    }
    shouldShowNotification() {
        const currentVersion = this.productService.commit;
        const currentMillis = new Date().getTime();
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if version != stored version, save version and date
        if (currentVersion !== lastKnownVersion) {
            this.storageService.store('update/lastKnownVersion', currentVersion, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store('update/updateNotificationTime', currentMillis, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        const updateNotificationMillis = this.storageService.getNumber('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */, currentMillis);
        const diffDays = (currentMillis - updateNotificationMillis) / (1000 * 60 * 60 * 24);
        return diffDays > 5;
    }
    registerGlobalActivityActions() {
        CommandsRegistry.registerCommand('update.check', () => this.updateService.checkForUpdates(true));
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.check',
                title: nls.localize('checkForUpdates', 'Check for Updates...'),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */),
        });
        CommandsRegistry.registerCommand('update.checking', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.checking',
                title: nls.localize('checkingForUpdates2', 'Checking for Updates...'),
                precondition: ContextKeyExpr.false(),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("checking for updates" /* StateType.CheckingForUpdates */),
        });
        CommandsRegistry.registerCommand('update.downloadNow', () => this.updateService.downloadUpdate());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.downloadNow',
                title: nls.localize('download update_1', 'Download Update (1)'),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */),
        });
        CommandsRegistry.registerCommand('update.downloading', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.downloading',
                title: nls.localize('DownloadingUpdate', 'Downloading Update...'),
                precondition: ContextKeyExpr.false(),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("downloading" /* StateType.Downloading */),
        });
        CommandsRegistry.registerCommand('update.install', () => this.updateService.applyUpdate());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.install',
                title: nls.localize('installUpdate...', 'Install Update... (1)'),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */),
        });
        CommandsRegistry.registerCommand('update.updating', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.updating',
                title: nls.localize('installingUpdate', 'Installing Update...'),
                precondition: ContextKeyExpr.false(),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("updating" /* StateType.Updating */),
        });
        if (this.productService.quality === 'stable') {
            CommandsRegistry.registerCommand('update.showUpdateReleaseNotes', () => {
                if (this.updateService.state.type !== "ready" /* StateType.Ready */) {
                    return;
                }
                const productVersion = this.updateService.state.update.productVersion;
                if (productVersion) {
                    this.instantiationService.invokeFunction((accessor) => showReleaseNotes(accessor, productVersion));
                }
            });
            MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
                group: '7_update',
                order: 1,
                command: {
                    id: 'update.showUpdateReleaseNotes',
                    title: nls.localize('showUpdateReleaseNotes', 'Show Update Release Notes'),
                },
                when: ContextKeyExpr.and(CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */), MAJOR_MINOR_UPDATE_AVAILABLE),
            });
        }
        CommandsRegistry.registerCommand('update.restart', () => this.updateService.quitAndInstall());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            order: 2,
            command: {
                id: 'update.restart',
                title: nls.localize('restartToUpdate', 'Restart to Update (1)'),
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */),
        });
        CommandsRegistry.registerCommand('_update.state', () => {
            return this.state;
        });
    }
};
UpdateContribution = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IDialogService),
    __param(4, IUpdateService),
    __param(5, IActivityService),
    __param(6, IContextKeyService),
    __param(7, IProductService),
    __param(8, IOpenerService),
    __param(9, IConfigurationService),
    __param(10, IHostService)
], UpdateContribution);
export { UpdateContribution };
let SwitchProductQualityContribution = class SwitchProductQualityContribution extends Disposable {
    constructor(productService, environmentService) {
        super();
        this.productService = productService;
        this.environmentService = environmentService;
        this.registerGlobalActivityActions();
    }
    registerGlobalActivityActions() {
        const quality = this.productService.quality;
        const productQualityChangeHandler = this.environmentService.options?.productQualityChangeHandler;
        if (productQualityChangeHandler && (quality === 'stable' || quality === 'insider')) {
            const newQuality = quality === 'stable' ? 'insider' : 'stable';
            const commandId = `update.switchQuality.${newQuality}`;
            const isSwitchingToInsiders = newQuality === 'insider';
            this._register(registerAction2(class SwitchQuality extends Action2 {
                constructor() {
                    super({
                        id: commandId,
                        title: isSwitchingToInsiders
                            ? nls.localize('switchToInsiders', 'Switch to Insiders Version...')
                            : nls.localize('switchToStable', 'Switch to Stable Version...'),
                        precondition: IsWebContext,
                        menu: {
                            id: MenuId.GlobalActivity,
                            when: IsWebContext,
                            group: '7_update',
                        },
                    });
                }
                async run(accessor) {
                    const dialogService = accessor.get(IDialogService);
                    const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
                    const userDataSyncStoreManagementService = accessor.get(IUserDataSyncStoreManagementService);
                    const storageService = accessor.get(IStorageService);
                    const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
                    const userDataSyncService = accessor.get(IUserDataSyncService);
                    const notificationService = accessor.get(INotificationService);
                    try {
                        const selectSettingsSyncServiceDialogShownKey = 'switchQuality.selectSettingsSyncServiceDialogShown';
                        const userDataSyncStore = userDataSyncStoreManagementService.userDataSyncStore;
                        let userDataSyncStoreType;
                        if (userDataSyncStore &&
                            isSwitchingToInsiders &&
                            userDataSyncEnablementService.isEnabled() &&
                            !storageService.getBoolean(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */, false)) {
                            userDataSyncStoreType = await this.selectSettingsSyncService(dialogService);
                            if (!userDataSyncStoreType) {
                                return;
                            }
                            storageService.store(selectSettingsSyncServiceDialogShownKey, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                            if (userDataSyncStoreType === 'stable') {
                                // Update the stable service type in the current window, so that it uses stable service after switched to insiders version (after reload).
                                await userDataSyncStoreManagementService.switch(userDataSyncStoreType);
                            }
                        }
                        const res = await dialogService.confirm({
                            type: 'info',
                            message: nls.localize('relaunchMessage', 'Changing the version requires a reload to take effect'),
                            detail: newQuality === 'insider'
                                ? nls.localize('relaunchDetailInsiders', 'Press the reload button to switch to the Insiders version of VS Code.')
                                : nls.localize('relaunchDetailStable', 'Press the reload button to switch to the Stable version of VS Code.'),
                            primaryButton: nls.localize({ key: 'reload', comment: ['&& denotes a mnemonic'] }, '&&Reload'),
                        });
                        if (res.confirmed) {
                            const promises = [];
                            // If sync is happening wait until it is finished before reload
                            if (userDataSyncService.status === "syncing" /* SyncStatus.Syncing */) {
                                promises.push(Event.toPromise(Event.filter(userDataSyncService.onDidChangeStatus, (status) => status !== "syncing" /* SyncStatus.Syncing */)));
                            }
                            // If user chose the sync service then synchronise the store type option in insiders service, so that other clients using insiders service are also updated.
                            if (isSwitchingToInsiders && userDataSyncStoreType) {
                                promises.push(userDataSyncWorkbenchService.synchroniseUserDataSyncStoreType());
                            }
                            await Promises.settled(promises);
                            productQualityChangeHandler(newQuality);
                        }
                        else {
                            // Reset
                            if (userDataSyncStoreType) {
                                storageService.remove(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */);
                            }
                        }
                    }
                    catch (error) {
                        notificationService.error(error);
                    }
                }
                async selectSettingsSyncService(dialogService) {
                    const { result } = await dialogService.prompt({
                        type: Severity.Info,
                        message: nls.localize('selectSyncService.message', 'Choose the settings sync service to use after changing the version'),
                        detail: nls.localize('selectSyncService.detail', 'The Insiders version of VS Code will synchronize your settings, keybindings, extensions, snippets and UI State using separate insiders settings sync service by default.'),
                        buttons: [
                            {
                                label: nls.localize({ key: 'use insiders', comment: ['&& denotes a mnemonic'] }, '&&Insiders'),
                                run: () => 'insiders',
                            },
                            {
                                label: nls.localize({ key: 'use stable', comment: ['&& denotes a mnemonic'] }, '&&Stable (current)'),
                                run: () => 'stable',
                            },
                        ],
                        cancelButton: true,
                    });
                    return result;
                }
            }));
        }
    }
};
SwitchProductQualityContribution = __decorate([
    __param(0, IProductService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], SwitchProductQualityContribution);
export { SwitchProductQualityContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXBkYXRlL2Jyb3dzZXIvdXBkYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixXQUFXLEVBRVgsYUFBYSxHQUNiLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUU3RSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGNBQWMsR0FLZCxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0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