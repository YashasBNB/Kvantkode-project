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
var UserDataSyncWorkbenchService_1;
import { IUserDataSyncService, isAuthenticationProvider, IUserDataAutoSyncService, IUserDataSyncStoreManagementService, IUserDataSyncEnablementService, USER_DATA_SYNC_SCHEME, USER_DATA_SYNC_LOG_ID, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncWorkbenchService, CONTEXT_SYNC_ENABLEMENT, CONTEXT_SYNC_STATE, CONTEXT_ACCOUNT_STATE, SHOW_SYNC_LOG_COMMAND_ID, CONTEXT_ENABLE_ACTIVITY_VIEWS, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE, SYNC_CONFLICTS_VIEW_ID, CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS, getSyncAreaLabel, } from '../common/userDataSync.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { getCurrentAuthenticationSessionInfo } from '../../authentication/browser/authenticationService.js';
import { IAuthenticationService, } from '../../authentication/common/authentication.js';
import { IUserDataSyncAccountService } from '../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { URI } from '../../../../base/common/uri.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../views/common/viewsService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { UserDataSyncStoreTypeSynchronizer } from '../../../../platform/userDataSync/common/globalStateSync.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isDiffEditorInput } from '../../../common/editor.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { IUserDataSyncMachinesService } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { equals } from '../../../../base/common/arrays.js';
class UserDataSyncAccount {
    constructor(authenticationProviderId, session) {
        this.authenticationProviderId = authenticationProviderId;
        this.session = session;
    }
    get sessionId() {
        return this.session.id;
    }
    get accountName() {
        return this.session.account.label;
    }
    get accountId() {
        return this.session.account.id;
    }
    get token() {
        return this.session.idToken || this.session.accessToken;
    }
}
export function isMergeEditorInput(editor) {
    const candidate = editor;
    return (URI.isUri(candidate?.base) &&
        URI.isUri(candidate?.input1?.uri) &&
        URI.isUri(candidate?.input2?.uri) &&
        URI.isUri(candidate?.result));
}
let UserDataSyncWorkbenchService = class UserDataSyncWorkbenchService extends Disposable {
    static { UserDataSyncWorkbenchService_1 = this; }
    static { this.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY = 'userDataSyncAccount.donotUseWorkbenchSession'; }
    static { this.CACHED_AUTHENTICATION_PROVIDER_KEY = 'userDataSyncAccountProvider'; }
    static { this.CACHED_SESSION_STORAGE_KEY = 'userDataSyncAccountPreference'; }
    get enabled() {
        return !!this.userDataSyncStoreManagementService.userDataSyncStore;
    }
    get authenticationProviders() {
        return this._authenticationProviders;
    }
    get accountStatus() {
        return this._accountStatus;
    }
    get current() {
        return this._current;
    }
    constructor(userDataSyncService, uriIdentityService, authenticationService, userDataSyncAccountService, quickInputService, storageService, userDataSyncEnablementService, userDataAutoSyncService, logService, productService, extensionService, environmentService, secretStorageService, notificationService, progressService, dialogService, contextKeyService, viewsService, viewDescriptorService, userDataSyncStoreManagementService, lifecycleService, instantiationService, editorService, userDataInitializationService, fileService, fileDialogService, userDataSyncMachinesService) {
        super();
        this.userDataSyncService = userDataSyncService;
        this.uriIdentityService = uriIdentityService;
        this.authenticationService = authenticationService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.quickInputService = quickInputService;
        this.storageService = storageService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.logService = logService;
        this.productService = productService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.secretStorageService = secretStorageService;
        this.notificationService = notificationService;
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.viewsService = viewsService;
        this.viewDescriptorService = viewDescriptorService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.userDataInitializationService = userDataInitializationService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this._authenticationProviders = [];
        this._accountStatus = "uninitialized" /* AccountStatus.Uninitialized */;
        this._onDidChangeAccountStatus = this._register(new Emitter());
        this.onDidChangeAccountStatus = this._onDidChangeAccountStatus.event;
        this._onDidTurnOnSync = this._register(new Emitter());
        this.onDidTurnOnSync = this._onDidTurnOnSync.event;
        this.turnOnSyncCancellationToken = undefined;
        this._cachedCurrentAuthenticationProviderId = null;
        this._cachedCurrentSessionId = null;
        this.syncEnablementContext = CONTEXT_SYNC_ENABLEMENT.bindTo(contextKeyService);
        this.syncStatusContext = CONTEXT_SYNC_STATE.bindTo(contextKeyService);
        this.accountStatusContext = CONTEXT_ACCOUNT_STATE.bindTo(contextKeyService);
        this.activityViewsEnablementContext = CONTEXT_ENABLE_ACTIVITY_VIEWS.bindTo(contextKeyService);
        this.hasConflicts = CONTEXT_HAS_CONFLICTS.bindTo(contextKeyService);
        this.enableConflictsViewContext = CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW.bindTo(contextKeyService);
        if (this.userDataSyncStoreManagementService.userDataSyncStore) {
            this.syncStatusContext.set(this.userDataSyncService.status);
            this._register(userDataSyncService.onDidChangeStatus((status) => this.syncStatusContext.set(status)));
            this.syncEnablementContext.set(userDataSyncEnablementService.isEnabled());
            this._register(userDataSyncEnablementService.onDidChangeEnablement((enabled) => this.syncEnablementContext.set(enabled)));
            this.waitAndInitialize();
        }
    }
    updateAuthenticationProviders() {
        const oldValue = this._authenticationProviders;
        this._authenticationProviders = (this.userDataSyncStoreManagementService.userDataSyncStore?.authenticationProviders || []).filter(({ id }) => this.authenticationService.declaredProviders.some((provider) => provider.id === id));
        this.logService.trace('Settings Sync: Authentication providers updated', this._authenticationProviders.map(({ id }) => id));
        return equals(oldValue, this._authenticationProviders, (a, b) => a.id === b.id);
    }
    isSupportedAuthenticationProviderId(authenticationProviderId) {
        return this.authenticationProviders.some(({ id }) => id === authenticationProviderId);
    }
    async waitAndInitialize() {
        try {
            /* wait */
            await Promise.all([
                this.extensionService.whenInstalledExtensionsRegistered(),
                this.userDataInitializationService.whenInitializationFinished(),
            ]);
            /* initialize */
            await this.initialize();
        }
        catch (error) {
            // Do not log if the current window is running extension tests
            if (!this.environmentService.extensionTestsLocationURI) {
                this.logService.error(error);
            }
        }
    }
    async initialize() {
        if (isWeb) {
            const authenticationSession = await getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService);
            if (this.currentSessionId === undefined && authenticationSession?.id) {
                if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider &&
                    this.environmentService.options.settingsSyncOptions.enabled) {
                    this.currentSessionId = authenticationSession.id;
                }
                // Backward compatibility
                else if (this.useWorkbenchSessionId) {
                    this.currentSessionId = authenticationSession.id;
                }
                this.useWorkbenchSessionId = false;
            }
        }
        const initPromise = this.update('initialize');
        this._register(this.authenticationService.onDidChangeDeclaredProviders(() => {
            if (this.updateAuthenticationProviders()) {
                // Trigger update only after the initialization is done
                initPromise.finally(() => this.update('declared authentication providers changed'));
            }
        }));
        await initPromise;
        this._register(Event.filter(Event.any(this.authenticationService.onDidRegisterAuthenticationProvider, this.authenticationService.onDidUnregisterAuthenticationProvider), (info) => this.isSupportedAuthenticationProviderId(info.id))(() => this.update('authentication provider change')));
        this._register(Event.filter(this.userDataSyncAccountService.onTokenFailed, (isSuccessive) => !isSuccessive)(() => this.update('token failure')));
        this._register(Event.filter(this.authenticationService.onDidChangeSessions, (e) => this.isSupportedAuthenticationProviderId(e.providerId))(({ event }) => this.onDidChangeSessions(event)));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, this._store)(() => this.onDidChangeStorage()));
        this._register(Event.filter(this.userDataSyncAccountService.onTokenFailed, (bailout) => bailout)(() => this.onDidAuthFailure()));
        this.hasConflicts.set(this.userDataSyncService.conflicts.length > 0);
        this._register(this.userDataSyncService.onDidChangeConflicts((conflicts) => {
            this.hasConflicts.set(conflicts.length > 0);
            if (!conflicts.length) {
                this.enableConflictsViewContext.reset();
            }
            // Close merge editors with no conflicts
            this.editorService.editors
                .filter((input) => {
                const remoteResource = isDiffEditorInput(input)
                    ? input.original.resource
                    : isMergeEditorInput(input)
                        ? input.input1.uri
                        : undefined;
                if (remoteResource?.scheme !== USER_DATA_SYNC_SCHEME) {
                    return false;
                }
                return !this.userDataSyncService.conflicts.some(({ conflicts }) => conflicts.some(({ previewResource }) => this.uriIdentityService.extUri.isEqual(previewResource, input.resource)));
            })
                .forEach((input) => input.dispose());
        }));
    }
    async update(reason) {
        this.logService.trace(`Settings Sync: Updating due to ${reason}`);
        this.updateAuthenticationProviders();
        await this.updateCurrentAccount();
        if (this._current) {
            this.currentAuthenticationProviderId = this._current.authenticationProviderId;
        }
        await this.updateToken(this._current);
        this.updateAccountStatus(this._current ? "available" /* AccountStatus.Available */ : "unavailable" /* AccountStatus.Unavailable */);
    }
    async updateCurrentAccount() {
        this.logService.trace('Settings Sync: Updating the current account');
        const currentSessionId = this.currentSessionId;
        const currentAuthenticationProviderId = this.currentAuthenticationProviderId;
        if (currentSessionId) {
            const authenticationProviders = currentAuthenticationProviderId
                ? this.authenticationProviders.filter(({ id }) => id === currentAuthenticationProviderId)
                : this.authenticationProviders;
            for (const { id, scopes } of authenticationProviders) {
                const sessions = (await this.authenticationService.getSessions(id, scopes)) || [];
                for (const session of sessions) {
                    if (session.id === currentSessionId) {
                        this._current = new UserDataSyncAccount(id, session);
                        this.logService.trace('Settings Sync: Updated the current account', this._current.accountName);
                        return;
                    }
                }
            }
        }
        this._current = undefined;
    }
    async updateToken(current) {
        let value = undefined;
        if (current) {
            try {
                this.logService.trace('Settings Sync: Updating the token for the account', current.accountName);
                const token = current.token;
                this.traceOrInfo('Settings Sync: Token updated for the account', current.accountName);
                value = { token, authenticationProviderId: current.authenticationProviderId };
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        await this.userDataSyncAccountService.updateAccount(value);
    }
    traceOrInfo(msg, ...args) {
        if (this.environmentService.isBuilt) {
            this.logService.info(msg, ...args);
        }
        else {
            this.logService.trace(msg, ...args);
        }
    }
    updateAccountStatus(accountStatus) {
        this.logService.trace(`Settings Sync: Updating the account status to ${accountStatus}`);
        if (this._accountStatus !== accountStatus) {
            const previous = this._accountStatus;
            this.traceOrInfo(`Settings Sync: Account status changed from ${previous} to ${accountStatus}`);
            this._accountStatus = accountStatus;
            this.accountStatusContext.set(accountStatus);
            this._onDidChangeAccountStatus.fire(accountStatus);
        }
    }
    async turnOn() {
        if (!this.authenticationProviders.length) {
            throw new Error(localize('no authentication providers', 'Settings sync cannot be turned on because there are no authentication providers available.'));
        }
        if (this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        if (this.userDataSyncService.status !== "idle" /* SyncStatus.Idle */) {
            throw new Error('Cannot turn on sync while syncing');
        }
        const picked = await this.pick();
        if (!picked) {
            throw new CancellationError();
        }
        // User did not pick an account or login failed
        if (this.accountStatus !== "available" /* AccountStatus.Available */) {
            throw new Error(localize('no account', 'No account available'));
        }
        const turnOnSyncCancellationToken = (this.turnOnSyncCancellationToken =
            new CancellationTokenSource());
        const disposable = isWeb
            ? Disposable.None
            : this.lifecycleService.onBeforeShutdown((e) => e.veto((async () => {
                const { confirmed } = await this.dialogService.confirm({
                    type: 'warning',
                    message: localize('sync in progress', 'Settings Sync is being turned on. Would you like to cancel it?'),
                    title: localize('settings sync', 'Settings Sync'),
                    primaryButton: localize({ key: 'yes', comment: ['&& denotes a mnemonic'] }, '&&Yes'),
                    cancelButton: localize('no', 'No'),
                });
                if (confirmed) {
                    turnOnSyncCancellationToken.cancel();
                }
                return !confirmed;
            })(), 'veto.settingsSync'));
        try {
            await this.doTurnOnSync(turnOnSyncCancellationToken.token);
        }
        finally {
            disposable.dispose();
            this.turnOnSyncCancellationToken = undefined;
        }
        await this.userDataAutoSyncService.turnOn();
        if (this.userDataSyncStoreManagementService.userDataSyncStore?.canSwitch) {
            await this.synchroniseUserDataSyncStoreType();
        }
        this.currentAuthenticationProviderId = this.current?.authenticationProviderId;
        if (this.environmentService.options?.settingsSyncOptions?.enablementHandler &&
            this.currentAuthenticationProviderId) {
            this.environmentService.options.settingsSyncOptions.enablementHandler(true, this.currentAuthenticationProviderId);
        }
        this.notificationService.info(localize('sync turned on', '{0} is turned on', SYNC_TITLE.value));
        this._onDidTurnOnSync.fire();
    }
    async turnoff(everywhere) {
        if (this.userDataSyncEnablementService.isEnabled()) {
            await this.userDataAutoSyncService.turnOff(everywhere);
            if (this.environmentService.options?.settingsSyncOptions?.enablementHandler &&
                this.currentAuthenticationProviderId) {
                this.environmentService.options.settingsSyncOptions.enablementHandler(false, this.currentAuthenticationProviderId);
            }
        }
        if (this.turnOnSyncCancellationToken) {
            this.turnOnSyncCancellationToken.cancel();
        }
    }
    async synchroniseUserDataSyncStoreType() {
        if (!this.userDataSyncAccountService.account) {
            throw new Error('Cannot update because you are signed out from settings sync. Please sign in and try again.');
        }
        if (!isWeb || !this.userDataSyncStoreManagementService.userDataSyncStore) {
            // Not supported
            return;
        }
        const userDataSyncStoreUrl = this.userDataSyncStoreManagementService.userDataSyncStore.type === 'insiders'
            ? this.userDataSyncStoreManagementService.userDataSyncStore.stableUrl
            : this.userDataSyncStoreManagementService.userDataSyncStore.insidersUrl;
        const userDataSyncStoreClient = this.instantiationService.createInstance(UserDataSyncStoreClient, userDataSyncStoreUrl);
        userDataSyncStoreClient.setAuthToken(this.userDataSyncAccountService.account.token, this.userDataSyncAccountService.account.authenticationProviderId);
        await this.instantiationService
            .createInstance(UserDataSyncStoreTypeSynchronizer, userDataSyncStoreClient)
            .sync(this.userDataSyncStoreManagementService.userDataSyncStore.type);
    }
    syncNow() {
        return this.userDataAutoSyncService.triggerSync(['Sync Now'], {
            immediately: true,
            disableCache: true,
        });
    }
    async doTurnOnSync(token) {
        const disposables = new DisposableStore();
        const manualSyncTask = await this.userDataSyncService.createManualSyncTask();
        try {
            await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                title: SYNC_TITLE.value,
                command: SHOW_SYNC_LOG_COMMAND_ID,
                delay: 500,
            }, async (progress) => {
                progress.report({ message: localize('turning on', 'Turning on...') });
                disposables.add(this.userDataSyncService.onDidChangeStatus((status) => {
                    if (status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                        progress.report({
                            message: localize('resolving conflicts', 'Resolving conflicts...'),
                        });
                    }
                    else {
                        progress.report({ message: localize('syncing...', 'Turning on...') });
                    }
                }));
                await manualSyncTask.merge();
                if (this.userDataSyncService.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                    await this.handleConflictsWhileTurningOn(token);
                }
                await manualSyncTask.apply();
            });
        }
        catch (error) {
            await manualSyncTask.stop();
            throw error;
        }
        finally {
            disposables.dispose();
        }
    }
    async handleConflictsWhileTurningOn(token) {
        const conflicts = this.userDataSyncService.conflicts;
        const andSeparator = localize('and', ' and ');
        let conflictsText = '';
        for (let i = 0; i < conflicts.length; i++) {
            if (i === conflicts.length - 1 && i !== 0) {
                conflictsText += andSeparator;
            }
            else if (i !== 0) {
                conflictsText += ', ';
            }
            conflictsText += getSyncAreaLabel(conflicts[i].syncResource);
        }
        const singleConflictResource = conflicts.length === 1 ? getSyncAreaLabel(conflicts[0].syncResource) : undefined;
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('conflicts detected', 'Conflicts Detected in {0}', conflictsText),
            detail: localize('resolve', 'Please resolve conflicts to turn on...'),
            buttons: [
                {
                    label: localize({ key: 'show conflicts', comment: ['&& denotes a mnemonic'] }, '&&Show Conflicts'),
                    run: async () => {
                        const waitUntilConflictsAreResolvedPromise = raceCancellationError(Event.toPromise(Event.filter(this.userDataSyncService.onDidChangeConflicts, (conficts) => conficts.length === 0)), token);
                        await this.showConflicts(this.userDataSyncService.conflicts[0]?.conflicts[0]);
                        await waitUntilConflictsAreResolvedPromise;
                    },
                },
                {
                    label: singleConflictResource
                        ? localize({ key: 'replace local single', comment: ['&& denotes a mnemonic'] }, 'Accept &&Remote {0}', singleConflictResource)
                        : localize({ key: 'replace local', comment: ['&& denotes a mnemonic'] }, 'Accept &&Remote'),
                    run: async () => this.replace(true),
                },
                {
                    label: singleConflictResource
                        ? localize({ key: 'replace remote single', comment: ['&& denotes a mnemonic'] }, 'Accept &&Local {0}', singleConflictResource)
                        : localize({ key: 'replace remote', comment: ['&& denotes a mnemonic'] }, 'Accept &&Local'),
                    run: () => this.replace(false),
                },
            ],
            cancelButton: {
                run: () => {
                    throw new CancellationError();
                },
            },
        });
    }
    async replace(local) {
        for (const conflict of this.userDataSyncService.conflicts) {
            for (const preview of conflict.conflicts) {
                await this.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, local ? preview.remoteResource : preview.localResource, undefined, { force: true });
            }
        }
    }
    async accept(resource, conflictResource, content, apply) {
        return this.userDataSyncService.accept(resource, conflictResource, content, apply);
    }
    async showConflicts(conflictToOpen) {
        if (!this.userDataSyncService.conflicts.length) {
            return;
        }
        this.enableConflictsViewContext.set(true);
        const view = await this.viewsService.openView(SYNC_CONFLICTS_VIEW_ID);
        if (view && conflictToOpen) {
            await view.open(conflictToOpen);
        }
    }
    async resetSyncedData() {
        const { confirmed } = await this.dialogService.confirm({
            type: 'info',
            message: localize('reset', 'This will clear your data in the cloud and stop sync on all your devices.'),
            title: localize('reset title', 'Clear'),
            primaryButton: localize({ key: 'resetButton', comment: ['&& denotes a mnemonic'] }, '&&Reset'),
        });
        if (confirmed) {
            await this.userDataSyncService.resetRemote();
        }
    }
    async getAllLogResources() {
        const logsFolders = [];
        const stat = await this.fileService.resolve(this.uriIdentityService.extUri.dirname(this.environmentService.logsHome));
        if (stat.children) {
            logsFolders.push(...stat.children
                .filter((stat) => stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name))
                .sort()
                .reverse()
                .map((d) => d.resource));
        }
        const result = [];
        for (const logFolder of logsFolders) {
            const folderStat = await this.fileService.resolve(logFolder);
            const childStat = folderStat.children?.find((stat) => this.uriIdentityService.extUri
                .basename(stat.resource)
                .startsWith(`${USER_DATA_SYNC_LOG_ID}.`));
            if (childStat) {
                result.push(childStat.resource);
            }
        }
        return result;
    }
    async showSyncActivity() {
        this.activityViewsEnablementContext.set(true);
        await this.waitForActiveSyncViews();
        await this.viewsService.openViewContainer(SYNC_VIEW_CONTAINER_ID);
    }
    async downloadSyncActivity() {
        const result = await this.fileDialogService.showOpenDialog({
            title: localize('download sync activity dialog title', 'Select folder to download Settings Sync activity'),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: localize('download sync activity dialog open label', 'Save'),
        });
        if (!result?.[0]) {
            return;
        }
        return this.progressService.withProgress({ location: 10 /* ProgressLocation.Window */ }, async () => {
            const machines = await this.userDataSyncMachinesService.getMachines();
            const currentMachine = machines.find((m) => m.isCurrent);
            const name = (currentMachine ? currentMachine.name + ' - ' : '') + 'Settings Sync Activity';
            const stat = await this.fileService.resolve(result[0]);
            const nameRegEx = new RegExp(`${escapeRegExpCharacters(name)}\\s(\\d+)`);
            const indexes = [];
            for (const child of stat.children ?? []) {
                if (child.name === name) {
                    indexes.push(0);
                }
                else {
                    const matches = nameRegEx.exec(child.name);
                    if (matches) {
                        indexes.push(parseInt(matches[1]));
                    }
                }
            }
            indexes.sort((a, b) => a - b);
            const folder = this.uriIdentityService.extUri.joinPath(result[0], indexes[0] !== 0 ? name : `${name} ${indexes[indexes.length - 1] + 1}`);
            await Promise.all([
                this.userDataSyncService.saveRemoteActivityData(this.uriIdentityService.extUri.joinPath(folder, 'remoteActivity.json')),
                (async () => {
                    const logResources = await this.getAllLogResources();
                    await Promise.all(logResources.map(async (logResource) => this.fileService.copy(logResource, this.uriIdentityService.extUri.joinPath(folder, 'logs', `${this.uriIdentityService.extUri.basename(this.uriIdentityService.extUri.dirname(logResource))}.log`))));
                })(),
                this.fileService.copy(this.environmentService.userDataSyncHome, this.uriIdentityService.extUri.joinPath(folder, 'localActivity')),
            ]);
            return folder;
        });
    }
    async waitForActiveSyncViews() {
        const viewContainer = this.viewDescriptorService.getViewContainerById(SYNC_VIEW_CONTAINER_ID);
        if (viewContainer) {
            const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
            if (!model.activeViewDescriptors.length) {
                await Event.toPromise(Event.filter(model.onDidChangeActiveViewDescriptors, (e) => model.activeViewDescriptors.length > 0));
            }
        }
    }
    async signIn() {
        const currentAuthenticationProviderId = this.currentAuthenticationProviderId;
        const authenticationProvider = currentAuthenticationProviderId
            ? this.authenticationProviders.find((p) => p.id === currentAuthenticationProviderId)
            : undefined;
        if (authenticationProvider) {
            await this.doSignIn(authenticationProvider);
        }
        else {
            if (!this.authenticationProviders.length) {
                throw new Error(localize('no authentication providers during signin', 'Cannot sign in because there are no authentication providers available.'));
            }
            await this.pick();
        }
    }
    async pick() {
        const result = await this.doPick();
        if (!result) {
            return false;
        }
        await this.doSignIn(result);
        return true;
    }
    async doPick() {
        if (this.authenticationProviders.length === 0) {
            return undefined;
        }
        const authenticationProviders = [...this.authenticationProviders].sort(({ id }) => id === this.currentAuthenticationProviderId ? -1 : 1);
        const allAccounts = new Map();
        if (authenticationProviders.length === 1) {
            const accounts = await this.getAccounts(authenticationProviders[0].id, authenticationProviders[0].scopes);
            if (accounts.length) {
                allAccounts.set(authenticationProviders[0].id, accounts);
            }
            else {
                // Single auth provider and no accounts
                return authenticationProviders[0];
            }
        }
        let result;
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const promise = new Promise((c) => {
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c(result);
            }));
        });
        quickPick.title = SYNC_TITLE.value;
        quickPick.ok = false;
        quickPick.ignoreFocusOut = true;
        quickPick.placeholder = localize('choose account placeholder', 'Select an account to sign in');
        quickPick.show();
        if (authenticationProviders.length > 1) {
            quickPick.busy = true;
            for (const { id, scopes } of authenticationProviders) {
                const accounts = await this.getAccounts(id, scopes);
                if (accounts.length) {
                    allAccounts.set(id, accounts);
                }
            }
            quickPick.busy = false;
        }
        quickPick.items = this.createQuickpickItems(authenticationProviders, allAccounts);
        disposables.add(quickPick.onDidAccept(() => {
            result = quickPick.selectedItems[0]?.account
                ? quickPick.selectedItems[0]?.account
                : quickPick.selectedItems[0]?.authenticationProvider;
            quickPick.hide();
        }));
        return promise;
    }
    async getAccounts(authenticationProviderId, scopes) {
        const accounts = new Map();
        let currentAccount = null;
        const sessions = (await this.authenticationService.getSessions(authenticationProviderId, scopes)) || [];
        for (const session of sessions) {
            const account = new UserDataSyncAccount(authenticationProviderId, session);
            accounts.set(account.accountId, account);
            if (account.sessionId === this.currentSessionId) {
                currentAccount = account;
            }
        }
        if (currentAccount) {
            // Always use current account if available
            accounts.set(currentAccount.accountId, currentAccount);
        }
        return currentAccount
            ? [...accounts.values()]
            : [...accounts.values()].sort(({ sessionId }) => sessionId === this.currentSessionId ? -1 : 1);
    }
    createQuickpickItems(authenticationProviders, allAccounts) {
        const quickPickItems = [];
        // Signed in Accounts
        if (allAccounts.size) {
            quickPickItems.push({ type: 'separator', label: localize('signed in', 'Signed in') });
            for (const authenticationProvider of authenticationProviders) {
                const accounts = (allAccounts.get(authenticationProvider.id) || []).sort(({ sessionId }) => sessionId === this.currentSessionId ? -1 : 1);
                const providerName = this.authenticationService.getProvider(authenticationProvider.id).label;
                for (const account of accounts) {
                    quickPickItems.push({
                        label: `${account.accountName} (${providerName})`,
                        description: account.sessionId === this.current?.sessionId
                            ? localize('last used', 'Last Used with Sync')
                            : undefined,
                        account,
                        authenticationProvider,
                    });
                }
            }
            quickPickItems.push({ type: 'separator', label: localize('others', 'Others') });
        }
        // Account Providers
        for (const authenticationProvider of authenticationProviders) {
            const provider = this.authenticationService.getProvider(authenticationProvider.id);
            if (!allAccounts.has(authenticationProvider.id) || provider.supportsMultipleAccounts) {
                const providerName = provider.label;
                quickPickItems.push({
                    label: localize('sign in using account', 'Sign in with {0}', providerName),
                    authenticationProvider,
                });
            }
        }
        return quickPickItems;
    }
    async doSignIn(accountOrAuthProvider) {
        let sessionId;
        if (isAuthenticationProvider(accountOrAuthProvider)) {
            if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.id ===
                accountOrAuthProvider.id) {
                sessionId =
                    await this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.signIn();
            }
            else {
                sessionId = (await this.authenticationService.createSession(accountOrAuthProvider.id, accountOrAuthProvider.scopes)).id;
            }
            this.currentAuthenticationProviderId = accountOrAuthProvider.id;
        }
        else {
            if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.id ===
                accountOrAuthProvider.authenticationProviderId) {
                sessionId =
                    await this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.signIn();
            }
            else {
                sessionId = accountOrAuthProvider.sessionId;
            }
            this.currentAuthenticationProviderId = accountOrAuthProvider.authenticationProviderId;
        }
        this.currentSessionId = sessionId;
        await this.update('sign in');
    }
    async onDidAuthFailure() {
        this.currentSessionId = undefined;
        await this.update('auth failure');
    }
    onDidChangeSessions(e) {
        if (this.currentSessionId &&
            e.removed?.find((session) => session.id === this.currentSessionId)) {
            this.currentSessionId = undefined;
        }
        this.update('change in sessions');
    }
    onDidChangeStorage() {
        if (this.currentSessionId !==
            this.getStoredCachedSessionId() /* This checks if current window changed the value or not */) {
            this._cachedCurrentSessionId = null;
            this.update('change in storage');
        }
    }
    get currentAuthenticationProviderId() {
        if (this._cachedCurrentAuthenticationProviderId === null) {
            this._cachedCurrentAuthenticationProviderId = this.storageService.get(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, -1 /* StorageScope.APPLICATION */);
        }
        return this._cachedCurrentAuthenticationProviderId;
    }
    set currentAuthenticationProviderId(currentAuthenticationProviderId) {
        if (this._cachedCurrentAuthenticationProviderId !== currentAuthenticationProviderId) {
            this._cachedCurrentAuthenticationProviderId = currentAuthenticationProviderId;
            if (currentAuthenticationProviderId === undefined) {
                this.storageService.remove(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, -1 /* StorageScope.APPLICATION */);
            }
            else {
                this.storageService.store(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, currentAuthenticationProviderId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    get currentSessionId() {
        if (this._cachedCurrentSessionId === null) {
            this._cachedCurrentSessionId = this.getStoredCachedSessionId();
        }
        return this._cachedCurrentSessionId;
    }
    set currentSessionId(cachedSessionId) {
        if (this._cachedCurrentSessionId !== cachedSessionId) {
            this._cachedCurrentSessionId = cachedSessionId;
            if (cachedSessionId === undefined) {
                this.logService.info('Settings Sync: Reset current session');
                this.storageService.remove(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            else {
                this.logService.info('Settings Sync: Updated current session', cachedSessionId);
                this.storageService.store(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, cachedSessionId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    getStoredCachedSessionId() {
        return this.storageService.get(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
    }
    get useWorkbenchSessionId() {
        return !this.storageService.getBoolean(UserDataSyncWorkbenchService_1.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
    }
    set useWorkbenchSessionId(useWorkbenchSession) {
        this.storageService.store(UserDataSyncWorkbenchService_1.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, !useWorkbenchSession, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
};
UserDataSyncWorkbenchService = UserDataSyncWorkbenchService_1 = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUriIdentityService),
    __param(2, IAuthenticationService),
    __param(3, IUserDataSyncAccountService),
    __param(4, IQuickInputService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IUserDataAutoSyncService),
    __param(8, ILogService),
    __param(9, IProductService),
    __param(10, IExtensionService),
    __param(11, IBrowserWorkbenchEnvironmentService),
    __param(12, ISecretStorageService),
    __param(13, INotificationService),
    __param(14, IProgressService),
    __param(15, IDialogService),
    __param(16, IContextKeyService),
    __param(17, IViewsService),
    __param(18, IViewDescriptorService),
    __param(19, IUserDataSyncStoreManagementService),
    __param(20, ILifecycleService),
    __param(21, IInstantiationService),
    __param(22, IEditorService),
    __param(23, IUserDataInitializationService),
    __param(24, IFileService),
    __param(25, IFileDialogService),
    __param(26, IUserDataSyncMachinesService)
], UserDataSyncWorkbenchService);
export { UserDataSyncWorkbenchService };
registerSingleton(IUserDataSyncWorkbenchService, UserDataSyncWorkbenchService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jV29ya2JlbmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNXb3JrYmVuY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sb0JBQW9CLEVBRXBCLHdCQUF3QixFQUN4Qix3QkFBd0IsRUFDeEIsbUNBQW1DLEVBRW5DLDhCQUE4QixFQUc5QixxQkFBcUIsRUFDckIscUJBQXFCLEdBQ3JCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTiw2QkFBNkIsRUFHN0IsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsd0JBQXdCLEVBQ3hCLDZCQUE2QixFQUM3QixzQkFBc0IsRUFDdEIsVUFBVSxFQUNWLHNCQUFzQixFQUN0QixrQ0FBa0MsRUFDbEMscUJBQXFCLEVBRXJCLGdCQUFnQixHQUNoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRyxPQUFPLEVBR04sc0JBQXNCLEdBQ3RCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDN0csT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdE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