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
import { toAction } from '../../../../base/common/actions.js';
import { getErrorMessage, isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, ContextKeyTrueExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataAutoSyncService, IUserDataSyncService, registerConfiguration, UserDataSyncError, USER_DATA_SYNC_SCHEME, IUserDataSyncEnablementService, IUserDataSyncStoreManagementService, USER_DATA_SYNC_LOG_ID, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IActivityService, NumberBadge, ProgressBadge, } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { fromNow } from '../../../../base/common/date.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions, } from '../../../common/views.js';
import { UserDataSyncDataViews } from './userDataSyncViews.js';
import { IUserDataSyncWorkbenchService, getSyncAreaLabel, CONTEXT_SYNC_STATE, CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE, CONFIGURE_SYNC_COMMAND_ID, SHOW_SYNC_LOG_COMMAND_ID, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE, SYNC_VIEW_ICON, CONTEXT_HAS_CONFLICTS, DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR, } from '../../../services/userDataSync/common/userDataSync.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ctxIsMergeResultEditor, ctxMergeBaseUri } from '../../mergeEditor/common/mergeEditor.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { isWeb } from '../../../../base/common/platform.js';
import { PromptsConfig } from '../../../../platform/prompts/common/config.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const turnOffSyncCommand = {
    id: 'workbench.userDataSync.actions.turnOff',
    title: localize2('stop sync', 'Turn Off'),
};
const configureSyncCommand = {
    id: CONFIGURE_SYNC_COMMAND_ID,
    title: localize2('configure sync', 'Configure...'),
};
const showConflictsCommandId = 'workbench.userDataSync.actions.showConflicts';
const syncNowCommand = {
    id: 'workbench.userDataSync.actions.syncNow',
    title: localize2('sync now', 'Sync Now'),
    description(userDataSyncService) {
        if (userDataSyncService.status === "syncing" /* SyncStatus.Syncing */) {
            return localize('syncing', 'syncing');
        }
        if (userDataSyncService.lastSyncTime) {
            return localize('synced with time', 'synced {0}', fromNow(userDataSyncService.lastSyncTime, true));
        }
        return undefined;
    },
};
const showSyncSettingsCommand = {
    id: 'workbench.userDataSync.actions.settings',
    title: localize2('sync settings', 'Show Settings'),
};
const showSyncedDataCommand = {
    id: 'workbench.userDataSync.actions.showSyncedData',
    title: localize2('show synced data', 'Show Synced Data'),
};
const CONTEXT_TURNING_ON_STATE = new RawContextKey('userDataSyncTurningOn', false);
let UserDataSyncWorkbenchContribution = class UserDataSyncWorkbenchContribution extends Disposable {
    constructor(userDataSyncEnablementService, userDataSyncService, userDataSyncWorkbenchService, contextKeyService, activityService, notificationService, editorService, userDataProfileService, dialogService, quickInputService, instantiationService, outputService, userDataAutoSyncService, textModelResolverService, preferencesService, telemetryService, productService, openerService, authenticationService, userDataSyncStoreManagementService, hostService, commandService, workbenchIssueService, configService) {
        super();
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.activityService = activityService;
        this.notificationService = notificationService;
        this.editorService = editorService;
        this.userDataProfileService = userDataProfileService;
        this.dialogService = dialogService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.outputService = outputService;
        this.preferencesService = preferencesService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.openerService = openerService;
        this.authenticationService = authenticationService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.hostService = hostService;
        this.commandService = commandService;
        this.workbenchIssueService = workbenchIssueService;
        this.configService = configService;
        this.globalActivityBadgeDisposable = this._register(new MutableDisposable());
        this.accountBadgeDisposable = this._register(new MutableDisposable());
        this.conflictsDisposables = new Map();
        this.invalidContentErrorDisposables = new Map();
        this.conflictsActionDisposable = this._register(new MutableDisposable());
        this.turningOnSyncContext = CONTEXT_TURNING_ON_STATE.bindTo(contextKeyService);
        if (userDataSyncWorkbenchService.enabled) {
            registerConfiguration();
            this.updateAccountBadge();
            this.updateGlobalActivityBadge();
            this.onDidChangeConflicts(this.userDataSyncService.conflicts);
            this._register(Event.any(Event.debounce(userDataSyncService.onDidChangeStatus, () => undefined, 500), this.userDataSyncEnablementService.onDidChangeEnablement, this.userDataSyncWorkbenchService.onDidChangeAccountStatus)(() => {
                this.updateAccountBadge();
                this.updateGlobalActivityBadge();
            }));
            this._register(userDataSyncService.onDidChangeConflicts(() => this.onDidChangeConflicts(this.userDataSyncService.conflicts)));
            this._register(userDataSyncEnablementService.onDidChangeEnablement(() => this.onDidChangeConflicts(this.userDataSyncService.conflicts)));
            this._register(userDataSyncService.onSyncErrors((errors) => this.onSynchronizerErrors(errors)));
            this._register(userDataAutoSyncService.onError((error) => this.onAutoSyncError(error)));
            this.registerActions();
            this.registerViews();
            textModelResolverService.registerTextModelContentProvider(USER_DATA_SYNC_SCHEME, instantiationService.createInstance(UserDataRemoteContentProvider));
            this._register(Event.any(userDataSyncService.onDidChangeStatus, userDataSyncEnablementService.onDidChangeEnablement)(() => (this.turningOnSync =
                !userDataSyncEnablementService.isEnabled() &&
                    userDataSyncService.status !== "idle" /* SyncStatus.Idle */)));
        }
    }
    get turningOnSync() {
        return !!this.turningOnSyncContext.get();
    }
    set turningOnSync(turningOn) {
        this.turningOnSyncContext.set(turningOn);
        this.updateGlobalActivityBadge();
    }
    toKey({ syncResource: resource, profile }) {
        return `${profile.id}:${resource}`;
    }
    onDidChangeConflicts(conflicts) {
        this.updateGlobalActivityBadge();
        this.registerShowConflictsAction();
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        if (conflicts.length) {
            // Clear and dispose conflicts those were cleared
            for (const [key, disposable] of this.conflictsDisposables.entries()) {
                if (!conflicts.some((conflict) => this.toKey(conflict) === key)) {
                    disposable.dispose();
                    this.conflictsDisposables.delete(key);
                }
            }
            for (const conflict of this.userDataSyncService.conflicts) {
                const key = this.toKey(conflict);
                // Show conflicts notification if not shown before
                if (!this.conflictsDisposables.has(key)) {
                    const conflictsArea = getSyncAreaLabel(conflict.syncResource);
                    const handle = this.notificationService.prompt(Severity.Warning, localize('conflicts detected', 'Unable to sync due to conflicts in {0}. Please resolve them to continue.', conflictsArea.toLowerCase()), [
                        {
                            label: localize('replace remote', 'Replace Remote'),
                            run: () => {
                                this.acceptLocal(conflict, conflict.conflicts[0]);
                            },
                        },
                        {
                            label: localize('replace local', 'Replace Local'),
                            run: () => {
                                this.acceptRemote(conflict, conflict.conflicts[0]);
                            },
                        },
                        {
                            label: localize('show conflicts', 'Show Conflicts'),
                            run: () => {
                                this.telemetryService.publicLog2('sync/showConflicts', { source: conflict.syncResource });
                                this.userDataSyncWorkbenchService.showConflicts(conflict.conflicts[0]);
                            },
                        },
                    ], {
                        sticky: true,
                    });
                    this.conflictsDisposables.set(key, toDisposable(() => {
                        // close the conflicts warning notification
                        handle.close();
                        this.conflictsDisposables.delete(key);
                    }));
                }
            }
        }
        else {
            this.conflictsDisposables.forEach((disposable) => disposable.dispose());
            this.conflictsDisposables.clear();
        }
    }
    async acceptRemote(syncResource, conflict) {
        try {
            await this.userDataSyncService.accept(syncResource, conflict.remoteResource, undefined, this.userDataSyncEnablementService.isEnabled());
        }
        catch (e) {
            this.notificationService.error(localize('accept failed', 'Error while accepting changes. Please check [logs]({0}) for more details.', `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
        }
    }
    async acceptLocal(syncResource, conflict) {
        try {
            await this.userDataSyncService.accept(syncResource, conflict.localResource, undefined, this.userDataSyncEnablementService.isEnabled());
        }
        catch (e) {
            this.notificationService.error(localize('accept failed', 'Error while accepting changes. Please check [logs]({0}) for more details.', `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
        }
    }
    onAutoSyncError(error) {
        switch (error.code) {
            case "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('session expired', 'Settings sync was turned off because current session is expired, please sign in again to turn on sync.'),
                    actions: {
                        primary: [
                            toAction({
                                id: 'turn on sync',
                                label: localize('turn on sync', 'Turn on Settings Sync...'),
                                run: () => this.turnOn(),
                            }),
                        ],
                    },
                });
                break;
            case "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('turned off', 'Settings sync was turned off from another device, please turn on sync again.'),
                    actions: {
                        primary: [
                            toAction({
                                id: 'turn on sync',
                                label: localize('turn on sync', 'Turn on Settings Sync...'),
                                run: () => this.turnOn(),
                            }),
                        ],
                    },
                });
                break;
            case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                if (error.resource === "keybindings" /* SyncResource.Keybindings */ ||
                    error.resource === "settings" /* SyncResource.Settings */ ||
                    error.resource === "tasks" /* SyncResource.Tasks */) {
                    this.disableSync(error.resource);
                    const sourceArea = getSyncAreaLabel(error.resource);
                    this.handleTooLargeError(error.resource, localize('too large', 'Disabled syncing {0} because size of the {1} file to sync is larger than {2}. Please open the file and reduce the size and enable sync', sourceArea.toLowerCase(), sourceArea.toLowerCase(), '100kb'), error);
                }
                break;
            case "LocalTooManyProfiles" /* UserDataSyncErrorCode.LocalTooManyProfiles */:
                this.disableSync("profiles" /* SyncResource.Profiles */);
                this.notificationService.error(localize('too many profiles', 'Disabled syncing profiles because there are too many profiles to sync. Settings Sync supports syncing maximum 20 profiles. Please reduce the number of profiles and enable sync'));
                break;
            case "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */:
            case "Gone" /* UserDataSyncErrorCode.Gone */:
            case "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */: {
                const message = localize('error upgrade required', 'Settings sync is disabled because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.', this.productService.version, this.productService.commit);
                const operationId = error.operationId
                    ? localize('operationId', 'Operation Id: {0}', error.operationId)
                    : undefined;
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                });
                break;
            }
            case "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */: {
                const message = localize('method not found', 'Settings sync is disabled because the client is making invalid requests. Please report an issue with the logs.');
                const operationId = error.operationId
                    ? localize('operationId', 'Operation Id: {0}', error.operationId)
                    : undefined;
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize('show sync logs', 'Show Log'),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID),
                            }),
                            toAction({
                                id: 'Report Issue',
                                label: localize('report issue', 'Report Issue'),
                                run: () => this.workbenchIssueService.openReporter(),
                            }),
                        ],
                    },
                });
                break;
            }
            case "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */:
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: localize('error reset required', 'Settings sync is disabled because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync.'),
                    actions: {
                        primary: [
                            toAction({
                                id: 'reset',
                                label: localize('reset', 'Clear Data in Cloud...'),
                                run: () => this.userDataSyncWorkbenchService.resetSyncedData(),
                            }),
                            toAction({
                                id: 'show synced data',
                                label: localize('show synced data action', 'Show Synced Data'),
                                run: () => this.userDataSyncWorkbenchService.showSyncActivity(),
                            }),
                        ],
                    },
                });
                return;
            case "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: this.userDataSyncStoreManagementService.userDataSyncStore?.type === 'insiders'
                        ? localize('service switched to insiders', 'Settings Sync has been switched to insiders service')
                        : localize('service switched to stable', 'Settings Sync has been switched to stable service'),
                });
                return;
            case "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */:
                // Settings sync is using separate service
                if (this.userDataSyncEnablementService.isEnabled()) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: localize('using separate service', 'Settings sync now uses a separate service, more information is available in the [Settings Sync Documentation](https://aka.ms/vscode-settings-sync-help#_syncing-stable-versus-insiders).'),
                    });
                }
                // If settings sync got turned off then ask user to turn on sync again.
                else {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: localize('service changed and turned off', 'Settings sync was turned off because {0} now uses a separate service. Please turn on sync again.', this.productService.nameLong),
                        actions: {
                            primary: [
                                toAction({
                                    id: 'turn on sync',
                                    label: localize('turn on sync', 'Turn on Settings Sync...'),
                                    run: () => this.turnOn(),
                                }),
                            ],
                        },
                    });
                }
                return;
        }
    }
    handleTooLargeError(resource, message, error) {
        const operationId = error.operationId
            ? localize('operationId', 'Operation Id: {0}', error.operationId)
            : undefined;
        this.notificationService.notify({
            severity: Severity.Error,
            message: operationId ? `${message} ${operationId}` : message,
            actions: {
                primary: [
                    toAction({
                        id: 'open sync file',
                        label: localize('open file', 'Open {0} File', getSyncAreaLabel(resource)),
                        run: () => resource === "settings" /* SyncResource.Settings */
                            ? this.preferencesService.openUserSettings({ jsonEditor: true })
                            : this.preferencesService.openGlobalKeybindingSettings(true),
                    }),
                ],
            },
        });
    }
    onSynchronizerErrors(errors) {
        if (errors.length) {
            for (const { profile, syncResource: resource, error } of errors) {
                switch (error.code) {
                    case "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */:
                        this.handleInvalidContentError({ profile, syncResource: resource });
                        break;
                    default: {
                        const key = `${profile.id}:${resource}`;
                        const disposable = this.invalidContentErrorDisposables.get(key);
                        if (disposable) {
                            disposable.dispose();
                            this.invalidContentErrorDisposables.delete(key);
                        }
                    }
                }
            }
        }
        else {
            this.invalidContentErrorDisposables.forEach((disposable) => disposable.dispose());
            this.invalidContentErrorDisposables.clear();
        }
    }
    handleInvalidContentError({ profile, syncResource: source, }) {
        if (this.userDataProfileService.currentProfile.id !== profile.id) {
            return;
        }
        const key = `${profile.id}:${source}`;
        if (this.invalidContentErrorDisposables.has(key)) {
            return;
        }
        if (source !== "settings" /* SyncResource.Settings */ &&
            source !== "keybindings" /* SyncResource.Keybindings */ &&
            source !== "tasks" /* SyncResource.Tasks */) {
            return;
        }
        if (!this.hostService.hasFocus) {
            return;
        }
        const resource = source === "settings" /* SyncResource.Settings */
            ? this.userDataProfileService.currentProfile.settingsResource
            : source === "keybindings" /* SyncResource.Keybindings */
                ? this.userDataProfileService.currentProfile.keybindingsResource
                : this.userDataProfileService.currentProfile.tasksResource;
        const editorUri = EditorResourceAccessor.getCanonicalUri(this.editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (isEqual(resource, editorUri)) {
            // Do not show notification if the file in error is active
            return;
        }
        const errorArea = getSyncAreaLabel(source);
        const handle = this.notificationService.notify({
            severity: Severity.Error,
            message: localize('errorInvalidConfiguration', 'Unable to sync {0} because the content in the file is not valid. Please open the file and correct it.', errorArea.toLowerCase()),
            actions: {
                primary: [
                    toAction({
                        id: 'open sync file',
                        label: localize('open file', 'Open {0} File', errorArea),
                        run: () => source === "settings" /* SyncResource.Settings */
                            ? this.preferencesService.openUserSettings({ jsonEditor: true })
                            : this.preferencesService.openGlobalKeybindingSettings(true),
                    }),
                ],
            },
        });
        this.invalidContentErrorDisposables.set(key, toDisposable(() => {
            // close the error warning notification
            handle.close();
            this.invalidContentErrorDisposables.delete(key);
        }));
    }
    getConflictsCount() {
        return this.userDataSyncService.conflicts.reduce((result, { conflicts }) => {
            return result + conflicts.length;
        }, 0);
    }
    async updateGlobalActivityBadge() {
        this.globalActivityBadgeDisposable.clear();
        let badge = undefined;
        if (this.userDataSyncService.conflicts.length &&
            this.userDataSyncEnablementService.isEnabled()) {
            badge = new NumberBadge(this.getConflictsCount(), () => localize('has conflicts', '{0}: Conflicts Detected', SYNC_TITLE.value));
        }
        else if (this.turningOnSync) {
            badge = new ProgressBadge(() => localize('turning on syncing', 'Turning on Settings Sync...'));
        }
        if (badge) {
            this.globalActivityBadgeDisposable.value = this.activityService.showGlobalActivity({ badge });
        }
    }
    async updateAccountBadge() {
        this.accountBadgeDisposable.clear();
        let badge = undefined;
        if (this.userDataSyncService.status !== "uninitialized" /* SyncStatus.Uninitialized */ &&
            this.userDataSyncEnablementService.isEnabled() &&
            this.userDataSyncWorkbenchService.accountStatus === "unavailable" /* AccountStatus.Unavailable */) {
            badge = new NumberBadge(1, () => localize('sign in to sync', 'Sign in to Sync Settings'));
        }
        if (badge) {
            this.accountBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
        }
    }
    async turnOn() {
        try {
            if (!this.userDataSyncWorkbenchService.authenticationProviders.length) {
                throw new Error(localize('no authentication providers', 'No authentication providers are available.'));
            }
            const turnOn = await this.askToConfigure();
            if (!turnOn) {
                return;
            }
            if (this.userDataSyncStoreManagementService.userDataSyncStore?.canSwitch) {
                await this.selectSettingsSyncService(this.userDataSyncStoreManagementService.userDataSyncStore);
            }
            await this.userDataSyncWorkbenchService.turnOn();
        }
        catch (e) {
            if (isCancellationError(e)) {
                return;
            }
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                        if (e.resource === "keybindings" /* SyncResource.Keybindings */ ||
                            e.resource === "settings" /* SyncResource.Settings */ ||
                            e.resource === "tasks" /* SyncResource.Tasks */) {
                            this.handleTooLargeError(e.resource, localize('too large while starting sync', 'Settings sync cannot be turned on because size of the {0} file to sync is larger than {1}. Please open the file and reduce the size and turn on sync', getSyncAreaLabel(e.resource).toLowerCase(), '100kb'), e);
                            return;
                        }
                        break;
                    case "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */:
                    case "Gone" /* UserDataSyncErrorCode.Gone */:
                    case "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */: {
                        const message = localize('error upgrade required while starting sync', 'Settings sync cannot be turned on because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.', this.productService.version, this.productService.commit);
                        const operationId = e.operationId
                            ? localize('operationId', 'Operation Id: {0}', e.operationId)
                            : undefined;
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: operationId ? `${message} ${operationId}` : message,
                        });
                        return;
                    }
                    case "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */:
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: localize('error reset required while starting sync', 'Settings sync cannot be turned on because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync.'),
                            actions: {
                                primary: [
                                    toAction({
                                        id: 'reset',
                                        label: localize('reset', 'Clear Data in Cloud...'),
                                        run: () => this.userDataSyncWorkbenchService.resetSyncedData(),
                                    }),
                                    toAction({
                                        id: 'show synced data',
                                        label: localize('show synced data action', 'Show Synced Data'),
                                        run: () => this.userDataSyncWorkbenchService.showSyncActivity(),
                                    }),
                                ],
                            },
                        });
                        return;
                    case "Unauthorized" /* UserDataSyncErrorCode.Unauthorized */:
                    case "Forbidden" /* UserDataSyncErrorCode.Forbidden */:
                        this.notificationService.error(localize('auth failed', 'Error while turning on Settings Sync: Authentication failed.'));
                        return;
                }
                this.notificationService.error(localize('turn on failed with user data sync error', 'Error while turning on Settings Sync. Please check [logs]({0}) for more details.', `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
            }
            else {
                this.notificationService.error(localize({ key: 'turn on failed', comment: ['Substitution is for error reason'] }, 'Error while turning on Settings Sync. {0}', getErrorMessage(e)));
            }
        }
    }
    async askToConfigure() {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick();
            disposables.add(quickPick);
            quickPick.title = SYNC_TITLE.value;
            quickPick.ok = false;
            quickPick.customButton = true;
            quickPick.customLabel = localize('sign in and turn on', 'Sign in');
            quickPick.description = localize('configure and turn on sync detail', 'Please sign in to backup and sync your data across devices.');
            quickPick.canSelectMany = true;
            quickPick.ignoreFocusOut = true;
            quickPick.hideInput = true;
            quickPick.hideCheckAll = true;
            const items = this.getConfigureSyncQuickPickItems();
            quickPick.items = items;
            quickPick.selectedItems = items.filter((item) => this.userDataSyncEnablementService.isResourceEnabled(item.id, true));
            let accepted = false;
            disposables.add(Event.any(quickPick.onDidAccept, quickPick.onDidCustom)(() => {
                accepted = true;
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                try {
                    if (accepted) {
                        this.updateConfiguration(items, quickPick.selectedItems);
                    }
                    c(accepted);
                }
                catch (error) {
                    e(error);
                }
                finally {
                    disposables.dispose();
                }
            }));
            quickPick.show();
        });
    }
    getConfigureSyncQuickPickItems() {
        const result = [
            {
                id: "settings" /* SyncResource.Settings */,
                label: getSyncAreaLabel("settings" /* SyncResource.Settings */),
            },
            {
                id: "keybindings" /* SyncResource.Keybindings */,
                label: getSyncAreaLabel("keybindings" /* SyncResource.Keybindings */),
            },
            {
                id: "snippets" /* SyncResource.Snippets */,
                label: getSyncAreaLabel("snippets" /* SyncResource.Snippets */),
            },
            {
                id: "tasks" /* SyncResource.Tasks */,
                label: getSyncAreaLabel("tasks" /* SyncResource.Tasks */),
            },
            {
                id: "globalState" /* SyncResource.GlobalState */,
                label: getSyncAreaLabel("globalState" /* SyncResource.GlobalState */),
            },
            {
                id: "extensions" /* SyncResource.Extensions */,
                label: getSyncAreaLabel("extensions" /* SyncResource.Extensions */),
            },
            {
                id: "profiles" /* SyncResource.Profiles */,
                label: getSyncAreaLabel("profiles" /* SyncResource.Profiles */),
            },
        ];
        // if the `reusable prompt` feature is enabled and in vscode
        // insiders, add the `Prompts` resource item to the list
        if (PromptsConfig.enabled(this.configService) === true) {
            result.push({
                id: "prompts" /* SyncResource.Prompts */,
                label: getSyncAreaLabel("prompts" /* SyncResource.Prompts */),
            });
        }
        return result;
    }
    updateConfiguration(items, selectedItems) {
        for (const item of items) {
            const wasEnabled = this.userDataSyncEnablementService.isResourceEnabled(item.id);
            const isEnabled = !!selectedItems.filter((selected) => selected.id === item.id)[0];
            if (wasEnabled !== isEnabled) {
                this.userDataSyncEnablementService.setResourceEnablement(item.id, isEnabled);
            }
        }
    }
    async configureSyncOptions() {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick();
            disposables.add(quickPick);
            quickPick.title = localize('configure sync title', '{0}: Configure...', SYNC_TITLE.value);
            quickPick.placeholder = localize('configure sync placeholder', 'Choose what to sync');
            quickPick.canSelectMany = true;
            quickPick.ignoreFocusOut = true;
            quickPick.ok = true;
            const items = this.getConfigureSyncQuickPickItems();
            quickPick.items = items;
            quickPick.selectedItems = items.filter((item) => this.userDataSyncEnablementService.isResourceEnabled(item.id));
            disposables.add(quickPick.onDidAccept(async () => {
                if (quickPick.selectedItems.length) {
                    this.updateConfiguration(items, quickPick.selectedItems);
                    quickPick.hide();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c();
            }));
            quickPick.show();
        });
    }
    async turnOff() {
        const result = await this.dialogService.confirm({
            message: localize('turn off sync confirmation', 'Do you want to turn off sync?'),
            detail: localize('turn off sync detail', 'Your settings, keybindings, extensions, snippets and UI State will no longer be synced.'),
            primaryButton: localize({ key: 'turn off', comment: ['&& denotes a mnemonic'] }, '&&Turn off'),
            checkbox: this.userDataSyncWorkbenchService.accountStatus === "available" /* AccountStatus.Available */
                ? {
                    label: localize('turn off sync everywhere', 'Turn off sync on all your devices and clear the data from the cloud.'),
                }
                : undefined,
        });
        if (result.confirmed) {
            return this.userDataSyncWorkbenchService.turnoff(!!result.checkboxChecked);
        }
    }
    disableSync(source) {
        switch (source) {
            case "settings" /* SyncResource.Settings */:
                return this.userDataSyncEnablementService.setResourceEnablement("settings" /* SyncResource.Settings */, false);
            case "keybindings" /* SyncResource.Keybindings */:
                return this.userDataSyncEnablementService.setResourceEnablement("keybindings" /* SyncResource.Keybindings */, false);
            case "snippets" /* SyncResource.Snippets */:
                return this.userDataSyncEnablementService.setResourceEnablement("snippets" /* SyncResource.Snippets */, false);
            case "tasks" /* SyncResource.Tasks */:
                return this.userDataSyncEnablementService.setResourceEnablement("tasks" /* SyncResource.Tasks */, false);
            case "extensions" /* SyncResource.Extensions */:
                return this.userDataSyncEnablementService.setResourceEnablement("extensions" /* SyncResource.Extensions */, false);
            case "globalState" /* SyncResource.GlobalState */:
                return this.userDataSyncEnablementService.setResourceEnablement("globalState" /* SyncResource.GlobalState */, false);
            case "profiles" /* SyncResource.Profiles */:
                return this.userDataSyncEnablementService.setResourceEnablement("profiles" /* SyncResource.Profiles */, false);
        }
    }
    showSyncActivity() {
        return this.outputService.showChannel(USER_DATA_SYNC_LOG_ID);
    }
    async selectSettingsSyncService(userDataSyncStore) {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick());
            quickPick.title = localize('switchSyncService.title', '{0}: Select Service', SYNC_TITLE.value);
            quickPick.description = localize('switchSyncService.description', 'Ensure you are using the same settings sync service when syncing with multiple environments');
            quickPick.hideInput = true;
            quickPick.ignoreFocusOut = true;
            const getDescription = (url) => {
                const isDefault = isEqual(url, userDataSyncStore.defaultUrl);
                if (isDefault) {
                    return localize('default', 'Default');
                }
                return undefined;
            };
            quickPick.items = [
                {
                    id: 'insiders',
                    label: localize('insiders', 'Insiders'),
                    description: getDescription(userDataSyncStore.insidersUrl),
                },
                {
                    id: 'stable',
                    label: localize('stable', 'Stable'),
                    description: getDescription(userDataSyncStore.stableUrl),
                },
            ];
            disposables.add(quickPick.onDidAccept(async () => {
                try {
                    await this.userDataSyncStoreManagementService.switch(quickPick.selectedItems[0].id);
                    c();
                }
                catch (error) {
                    e(error);
                }
                finally {
                    quickPick.hide();
                }
            }));
            disposables.add(quickPick.onDidHide(() => disposables.dispose()));
            quickPick.show();
        });
    }
    registerActions() {
        if (this.userDataSyncEnablementService.canToggleEnablement()) {
            this.registerTurnOnSyncAction();
            this.registerTurnOffSyncAction();
        }
        this.registerTurningOnSyncAction();
        this.registerCancelTurnOnSyncAction();
        this.registerSignInAction(); // When Sync is turned on from CLI
        this.registerShowConflictsAction();
        this.registerEnableSyncViewsAction();
        this.registerManageSyncAction();
        this.registerSyncNowAction();
        this.registerConfigureSyncAction();
        this.registerShowSettingsAction();
        this.registerHelpAction();
        this.registerShowLogAction();
        this.registerResetSyncDataAction();
        this.registerAcceptMergesAction();
        if (isWeb) {
            this.registerDownloadSyncActivityAction();
        }
    }
    registerTurnOnSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT.toNegated(), CONTEXT_TURNING_ON_STATE.negate());
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.turnOn',
                    title: localize2('global activity turn on sync', 'Backup and Sync Settings...'),
                    category: SYNC_TITLE,
                    f1: true,
                    precondition: when,
                    menu: [
                        {
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when,
                            order: 2,
                        },
                        {
                            group: '3_configuration',
                            id: MenuId.MenubarPreferencesMenu,
                            when,
                            order: 2,
                        },
                        {
                            group: '1_settings',
                            id: MenuId.AccountsContext,
                            when,
                            order: 2,
                        },
                    ],
                });
            }
            async run() {
                return that.turnOn();
            }
        }));
    }
    registerTurningOnSyncAction() {
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT.toNegated(), CONTEXT_TURNING_ON_STATE);
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.turningOn',
                    title: localize('turning on sync', 'Turning on Settings Sync...'),
                    precondition: ContextKeyExpr.false(),
                    menu: [
                        {
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when,
                            order: 2,
                        },
                        {
                            group: '1_settings',
                            id: MenuId.AccountsContext,
                            when,
                        },
                    ],
                });
            }
            async run() { }
        }));
    }
    registerCancelTurnOnSyncAction() {
        const that = this;
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.cancelTurnOn',
                    title: localize('cancel turning on sync', 'Cancel'),
                    icon: Codicon.stopCircle,
                    menu: {
                        id: MenuId.ViewContainerTitle,
                        when: ContextKeyExpr.and(CONTEXT_TURNING_ON_STATE, ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID)),
                        group: 'navigation',
                        order: 1,
                    },
                });
            }
            async run() {
                return that.userDataSyncWorkbenchService.turnoff(false);
            }
        }));
    }
    registerSignInAction() {
        const that = this;
        const id = 'workbench.userData.actions.signin';
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEqualTo("unavailable" /* AccountStatus.Unavailable */));
        this._register(registerAction2(class StopSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.signin',
                    title: localize('sign in global', 'Sign in to Sync Settings'),
                    menu: {
                        group: '3_configuration',
                        id: MenuId.GlobalActivity,
                        when,
                        order: 2,
                    },
                });
            }
            async run() {
                try {
                    await that.userDataSyncWorkbenchService.signIn();
                }
                catch (e) {
                    that.notificationService.error(e);
                }
            }
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '1_settings',
            command: {
                id,
                title: localize('sign in accounts', 'Sign in to Sync Settings (1)'),
            },
            when,
        }));
    }
    getShowConflictsTitle() {
        return localize2('resolveConflicts_global', 'Show Conflicts ({0})', this.getConflictsCount());
    }
    registerShowConflictsAction() {
        this.conflictsActionDisposable.value = undefined;
        const that = this;
        this.conflictsActionDisposable.value = registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: showConflictsCommandId,
                    get title() {
                        return that.getShowConflictsTitle();
                    },
                    category: SYNC_TITLE,
                    f1: true,
                    precondition: CONTEXT_HAS_CONFLICTS,
                    menu: [
                        {
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when: CONTEXT_HAS_CONFLICTS,
                            order: 2,
                        },
                        {
                            group: '3_configuration',
                            id: MenuId.MenubarPreferencesMenu,
                            when: CONTEXT_HAS_CONFLICTS,
                            order: 2,
                        },
                    ],
                });
            }
            async run() {
                return that.userDataSyncWorkbenchService.showConflicts();
            }
        });
    }
    registerManageSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.notEqualsTo("unavailable" /* AccountStatus.Unavailable */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */));
        this._register(registerAction2(class SyncStatusAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.manage',
                    title: localize('sync is on', 'Settings Sync is On'),
                    toggled: ContextKeyTrueExpr.INSTANCE,
                    menu: [
                        {
                            id: MenuId.GlobalActivity,
                            group: '3_configuration',
                            when,
                            order: 2,
                        },
                        {
                            id: MenuId.MenubarPreferencesMenu,
                            group: '3_configuration',
                            when,
                            order: 2,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '1_settings',
                            when,
                        },
                    ],
                });
            }
            run(accessor) {
                return new Promise((c, e) => {
                    const quickInputService = accessor.get(IQuickInputService);
                    const commandService = accessor.get(ICommandService);
                    const disposables = new DisposableStore();
                    const quickPick = quickInputService.createQuickPick({ useSeparators: true });
                    disposables.add(quickPick);
                    const items = [];
                    if (that.userDataSyncService.conflicts.length) {
                        items.push({
                            id: showConflictsCommandId,
                            label: `${SYNC_TITLE.value}: ${that.getShowConflictsTitle().original}`,
                        });
                        items.push({ type: 'separator' });
                    }
                    items.push({
                        id: configureSyncCommand.id,
                        label: `${SYNC_TITLE.value}: ${configureSyncCommand.title.original}`,
                    });
                    items.push({
                        id: showSyncSettingsCommand.id,
                        label: `${SYNC_TITLE.value}: ${showSyncSettingsCommand.title.original}`,
                    });
                    items.push({
                        id: showSyncedDataCommand.id,
                        label: `${SYNC_TITLE.value}: ${showSyncedDataCommand.title.original}`,
                    });
                    items.push({ type: 'separator' });
                    items.push({
                        id: syncNowCommand.id,
                        label: `${SYNC_TITLE.value}: ${syncNowCommand.title.original}`,
                        description: syncNowCommand.description(that.userDataSyncService),
                    });
                    if (that.userDataSyncEnablementService.canToggleEnablement()) {
                        const account = that.userDataSyncWorkbenchService.current;
                        items.push({
                            id: turnOffSyncCommand.id,
                            label: `${SYNC_TITLE.value}: ${turnOffSyncCommand.title.original}`,
                            description: account
                                ? `${account.accountName} (${that.authenticationService.getProvider(account.authenticationProviderId).label})`
                                : undefined,
                        });
                    }
                    quickPick.items = items;
                    disposables.add(quickPick.onDidAccept(() => {
                        if (quickPick.selectedItems[0] && quickPick.selectedItems[0].id) {
                            commandService.executeCommand(quickPick.selectedItems[0].id);
                        }
                        quickPick.hide();
                    }));
                    disposables.add(quickPick.onDidHide(() => {
                        disposables.dispose();
                        c();
                    }));
                    quickPick.show();
                });
            }
        }));
    }
    registerEnableSyncViewsAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */));
        this._register(registerAction2(class SyncStatusAction extends Action2 {
            constructor() {
                super({
                    id: showSyncedDataCommand.id,
                    title: showSyncedDataCommand.title,
                    category: SYNC_TITLE,
                    precondition: when,
                    menu: {
                        id: MenuId.CommandPalette,
                        when,
                    },
                });
            }
            run(accessor) {
                return that.userDataSyncWorkbenchService.showSyncActivity();
            }
        }));
    }
    registerSyncNowAction() {
        const that = this;
        this._register(registerAction2(class SyncNowAction extends Action2 {
            constructor() {
                super({
                    id: syncNowCommand.id,
                    title: syncNowCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                    },
                });
            }
            run(accessor) {
                return that.userDataSyncWorkbenchService.syncNow();
            }
        }));
    }
    registerTurnOffSyncAction() {
        const that = this;
        this._register(registerAction2(class StopSyncAction extends Action2 {
            constructor() {
                super({
                    id: turnOffSyncCommand.id,
                    title: turnOffSyncCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT),
                    },
                });
            }
            async run() {
                try {
                    await that.turnOff();
                }
                catch (e) {
                    if (!isCancellationError(e)) {
                        that.notificationService.error(localize('turn off failed', 'Error while turning off Settings Sync. Please check [logs]({0}) for more details.', `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
                    }
                }
            }
        }));
    }
    registerConfigureSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT);
        this._register(registerAction2(class ConfigureSyncAction extends Action2 {
            constructor() {
                super({
                    id: configureSyncCommand.id,
                    title: configureSyncCommand.title,
                    category: SYNC_TITLE,
                    icon: Codicon.settingsGear,
                    tooltip: localize('configure', 'Configure...'),
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when,
                        },
                        {
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID)),
                            group: 'navigation',
                            order: 2,
                        },
                    ],
                });
            }
            run() {
                return that.configureSyncOptions();
            }
        }));
    }
    registerShowLogAction() {
        const that = this;
        this._register(registerAction2(class ShowSyncActivityAction extends Action2 {
            constructor() {
                super({
                    id: SHOW_SYNC_LOG_COMMAND_ID,
                    title: localize('show sync log title', '{0}: Show Log', SYNC_TITLE.value),
                    tooltip: localize('show sync log toolrip', 'Show Log'),
                    icon: Codicon.output,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                        },
                        {
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
                            group: 'navigation',
                            order: 1,
                        },
                    ],
                });
            }
            run() {
                return that.showSyncActivity();
            }
        }));
    }
    registerShowSettingsAction() {
        this._register(registerAction2(class ShowSyncSettingsAction extends Action2 {
            constructor() {
                super({
                    id: showSyncSettingsCommand.id,
                    title: showSyncSettingsCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                    },
                });
            }
            run(accessor) {
                accessor
                    .get(IPreferencesService)
                    .openUserSettings({ jsonEditor: false, query: '@tag:sync' });
            }
        }));
    }
    registerHelpAction() {
        const that = this;
        this._register(registerAction2(class HelpAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.help',
                    title: SYNC_TITLE,
                    category: Categories.Help,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                        },
                    ],
                });
            }
            run() {
                return that.openerService.open(URI.parse('https://aka.ms/vscode-settings-sync-help'));
            }
        }));
        MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
            command: {
                id: 'workbench.userDataSync.actions.help',
                title: Categories.Help.value,
            },
            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
            group: '1_help',
        });
    }
    registerAcceptMergesAction() {
        const that = this;
        this._register(registerAction2(class AcceptMergesAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.acceptMerges',
                    title: localize('complete merges title', 'Complete Merge'),
                    menu: [
                        {
                            id: MenuId.EditorContent,
                            when: ContextKeyExpr.and(ctxIsMergeResultEditor, ContextKeyExpr.regex(ctxMergeBaseUri.key, new RegExp(`^${USER_DATA_SYNC_SCHEME}:`))),
                        },
                    ],
                });
            }
            async run(accessor, previewResource) {
                const textFileService = accessor.get(ITextFileService);
                await textFileService.save(previewResource);
                const content = await textFileService.read(previewResource);
                await that.userDataSyncService.accept(this.getSyncResource(previewResource), previewResource, content.value, true);
            }
            getSyncResource(previewResource) {
                const conflict = that.userDataSyncService.conflicts.find(({ conflicts }) => conflicts.some((conflict) => isEqual(conflict.previewResource, previewResource)));
                if (conflict) {
                    return conflict;
                }
                throw new Error(`Unknown resource: ${previewResource.toString()}`);
            }
        }));
    }
    registerDownloadSyncActivityAction() {
        this._register(registerAction2(class DownloadSyncActivityAction extends Action2 {
            constructor() {
                super(DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR);
            }
            async run(accessor) {
                const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
                const notificationService = accessor.get(INotificationService);
                const folder = await userDataSyncWorkbenchService.downloadSyncActivity();
                if (folder) {
                    notificationService.info(localize('download sync activity complete', 'Successfully downloaded Settings Sync activity.'));
                }
            }
        }));
    }
    registerViews() {
        const container = this.registerViewContainer();
        this.registerDataViews(container);
    }
    registerViewContainer() {
        return Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: SYNC_VIEW_CONTAINER_ID,
            title: SYNC_TITLE,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                SYNC_VIEW_CONTAINER_ID,
                { mergeViewWithContainerWhenSingleView: true },
            ]),
            icon: SYNC_VIEW_ICON,
            hideIfEmpty: true,
        }, 0 /* ViewContainerLocation.Sidebar */);
    }
    registerResetSyncDataAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.actions.syncData.reset',
                    title: localize('workbench.actions.syncData.reset', 'Clear Data in Cloud...'),
                    menu: [
                        {
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
                            group: '0_configure',
                        },
                    ],
                });
            }
            run() {
                return that.userDataSyncWorkbenchService.resetSyncedData();
            }
        }));
    }
    registerDataViews(container) {
        this._register(this.instantiationService.createInstance(UserDataSyncDataViews, container));
    }
};
UserDataSyncWorkbenchContribution = __decorate([
    __param(0, IUserDataSyncEnablementService),
    __param(1, IUserDataSyncService),
    __param(2, IUserDataSyncWorkbenchService),
    __param(3, IContextKeyService),
    __param(4, IActivityService),
    __param(5, INotificationService),
    __param(6, IEditorService),
    __param(7, IUserDataProfileService),
    __param(8, IDialogService),
    __param(9, IQuickInputService),
    __param(10, IInstantiationService),
    __param(11, IOutputService),
    __param(12, IUserDataAutoSyncService),
    __param(13, ITextModelService),
    __param(14, IPreferencesService),
    __param(15, ITelemetryService),
    __param(16, IProductService),
    __param(17, IOpenerService),
    __param(18, IAuthenticationService),
    __param(19, IUserDataSyncStoreManagementService),
    __param(20, IHostService),
    __param(21, ICommandService),
    __param(22, IWorkbenchIssueService),
    __param(23, IConfigurationService)
], UserDataSyncWorkbenchContribution);
export { UserDataSyncWorkbenchContribution };
let UserDataRemoteContentProvider = class UserDataRemoteContentProvider {
    constructor(userDataSyncService, modelService, languageService) {
        this.userDataSyncService = userDataSyncService;
        this.modelService = modelService;
        this.languageService = languageService;
    }
    provideTextContent(uri) {
        if (uri.scheme === USER_DATA_SYNC_SCHEME) {
            return this.userDataSyncService
                .resolveContent(uri)
                .then((content) => this.modelService.createModel(content || '', this.languageService.createById('jsonc'), uri));
        }
        return null;
    }
};
UserDataRemoteContentProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], UserDataRemoteContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FFWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLEdBQ1AsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFFbEIsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFz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