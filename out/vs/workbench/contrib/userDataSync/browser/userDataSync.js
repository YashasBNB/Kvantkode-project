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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBRVosTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEVBQ2YsT0FBTyxHQUNQLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBRWxCLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FB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