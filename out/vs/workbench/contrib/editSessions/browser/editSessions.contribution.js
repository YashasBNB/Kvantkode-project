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
var EditSessionsContribution_1;
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IEditSessionsStorageService, ChangeType, FileType, EDIT_SESSION_SYNC_CATEGORY, EDIT_SESSIONS_CONTAINER_ID, EditSessionSchemaVersion, IEditSessionsLogService, EDIT_SESSIONS_VIEW_ICON, EDIT_SESSIONS_TITLE, EDIT_SESSIONS_SHOW_VIEW, EDIT_SESSIONS_DATA_VIEW_ID, decodeEditSessionFileContent, hashedEditSessionId, editSessionsLogId, EDIT_SESSIONS_PENDING, } from '../common/editSessions.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { basename, joinPath, relativePath } from '../../../../base/common/resources.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { EditSessionsWorkbenchService } from './editSessionsStorageService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { UserDataSyncStoreError, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { getFileNamesMessage, IDialogService, IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../services/extensions/common/extensions.js';
import { EditSessionsLogService } from '../common/editSessionsLogService.js';
import { Extensions as ViewExtensions, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditSessionsDataViews } from './editSessionsViews.js';
import { EditSessionsFileSystemProvider } from './editSessionsFileSystemProvider.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { VirtualWorkspaceContext, WorkspaceFolderCountContext, } from '../../../common/contextkeys.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { equals } from '../../../../base/common/objects.js';
import { EditSessionIdentityMatch, IEditSessionIdentityService, } from '../../../../platform/workspace/common/editSessions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { WorkspaceStateSynchroniser } from '../common/workspaceStateSync.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { EditSessionsStoreClient } from '../common/editSessionsStorageClient.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceIdentityService } from '../../../services/workspaces/common/workspaceIdentityService.js';
import { hashAsync } from '../../../../base/common/hash.js';
registerSingleton(IEditSessionsLogService, EditSessionsLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(IEditSessionsStorageService, EditSessionsWorkbenchService, 1 /* InstantiationType.Delayed */);
const continueWorkingOnCommand = {
    id: '_workbench.editSessions.actions.continueEditSession',
    title: localize2('continue working on', 'Continue Working On...'),
    precondition: WorkspaceFolderCountContext.notEqualsTo('0'),
    f1: true,
};
const openLocalFolderCommand = {
    id: '_workbench.editSessions.actions.continueEditSession.openLocalFolder',
    title: localize2('continue edit session in local folder', 'Open In Local Folder'),
    category: EDIT_SESSION_SYNC_CATEGORY,
    precondition: ContextKeyExpr.and(IsWebContext.toNegated(), VirtualWorkspaceContext),
};
const showOutputChannelCommand = {
    id: 'workbench.editSessions.actions.showOutputChannel',
    title: localize2('show log', 'Show Log'),
    category: EDIT_SESSION_SYNC_CATEGORY,
};
const installAdditionalContinueOnOptionsCommand = {
    id: 'workbench.action.continueOn.extensions',
    title: localize('continueOn.installAdditional', 'Install additional development environment options'),
};
registerAction2(class extends Action2 {
    constructor() {
        super({ ...installAdditionalContinueOnOptionsCommand, f1: false });
    }
    async run(accessor) {
        return accessor.get(IExtensionsWorkbenchService).openSearch('@tag:continueOn');
    }
});
const resumeProgressOptionsTitle = `[${localize('resuming working changes window', 'Resuming working changes...')}](command:${showOutputChannelCommand.id})`;
const resumeProgressOptions = {
    location: 10 /* ProgressLocation.Window */,
    type: 'syncing',
};
const queryParamName = 'editSessionId';
const useEditSessionsWithContinueOn = 'workbench.editSessions.continueOn';
let EditSessionsContribution = class EditSessionsContribution extends Disposable {
    static { EditSessionsContribution_1 = this; }
    static { this.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY = 'applicationLaunchedViaContinueOn'; }
    constructor(editSessionsStorageService, fileService, progressService, openerService, telemetryService, scmService, notificationService, dialogService, logService, environmentService, instantiationService, productService, configurationService, contextService, editSessionIdentityService, quickInputService, commandService, contextKeyService, fileDialogService, lifecycleService, storageService, activityService, editorService, remoteAgentService, extensionService, requestService, userDataProfilesService, uriIdentityService, workspaceIdentityService) {
        super();
        this.editSessionsStorageService = editSessionsStorageService;
        this.fileService = fileService;
        this.progressService = progressService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.scmService = scmService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.editSessionIdentityService = editSessionIdentityService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.fileDialogService = fileDialogService;
        this.lifecycleService = lifecycleService;
        this.storageService = storageService;
        this.activityService = activityService;
        this.editorService = editorService;
        this.remoteAgentService = remoteAgentService;
        this.extensionService = extensionService;
        this.requestService = requestService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceIdentityService = workspaceIdentityService;
        this.continueEditSessionOptions = [];
        this.accountsMenuBadgeDisposable = this._register(new MutableDisposable());
        this.registeredCommands = new Set();
        this.shouldShowViewsContext = EDIT_SESSIONS_SHOW_VIEW.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext = EDIT_SESSIONS_PENDING.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext.set(false);
        if (!this.productService['editSessions.store']?.url) {
            return;
        }
        this.editSessionsStorageClient = new EditSessionsStoreClient(URI.parse(this.productService['editSessions.store'].url), this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
        this.editSessionsStorageService.storeClient = this.editSessionsStorageClient;
        this.workspaceStateSynchronizer = new WorkspaceStateSynchroniser(this.userDataProfilesService.defaultProfile, undefined, this.editSessionsStorageClient, this.logService, this.fileService, this.environmentService, this.telemetryService, this.configurationService, this.storageService, this.uriIdentityService, this.workspaceIdentityService, this.editSessionsStorageService);
        this.autoResumeEditSession();
        this.registerActions();
        this.registerViews();
        this.registerContributedEditSessionOptions();
        this._register(this.fileService.registerProvider(EditSessionsFileSystemProvider.SCHEMA, new EditSessionsFileSystemProvider(this.editSessionsStorageService)));
        this.lifecycleService.onWillShutdown((e) => {
            if (e.reason !== 3 /* ShutdownReason.RELOAD */ &&
                this.editSessionsStorageService.isSignedIn &&
                this.configurationService.getValue('workbench.experimental.cloudChanges.autoStore') ===
                    'onShutdown' &&
                !isWeb) {
                e.join(this.autoStoreEditSession(), {
                    id: 'autoStoreWorkingChanges',
                    label: localize('autoStoreWorkingChanges', 'Storing current working changes...'),
                });
            }
        });
        this._register(this.editSessionsStorageService.onDidSignIn(() => this.updateAccountsMenuBadge()));
        this._register(this.editSessionsStorageService.onDidSignOut(() => this.updateAccountsMenuBadge()));
    }
    async autoResumeEditSession() {
        const shouldAutoResumeOnReload = this.configurationService.getValue('workbench.cloudChanges.autoResume') === 'onReload';
        if (this.environmentService.editSessionId !== undefined) {
            this.logService.info(`Resuming cloud changes, reason: found editSessionId ${this.environmentService.editSessionId} in environment service...`);
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(this.environmentService.editSessionId, undefined, undefined, undefined, progress).finally(() => (this.environmentService.editSessionId = undefined)));
        }
        else if (shouldAutoResumeOnReload && this.editSessionsStorageService.isSignedIn) {
            this.logService.info('Resuming cloud changes, reason: cloud changes enabled...');
            // Attempt to resume edit session based on edit workspace identifier
            // Note: at this point if the user is not signed into edit sessions,
            // we don't want them to be prompted to sign in and should just return early
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
        }
        else if (shouldAutoResumeOnReload) {
            // The application has previously launched via a protocol URL Continue On flow
            const hasApplicationLaunchedFromContinueOnFlow = this.storageService.getBoolean(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
            this.logService.info(`Prompting to enable cloud changes, has application previously launched from Continue On flow: ${hasApplicationLaunchedFromContinueOnFlow}`);
            const handlePendingEditSessions = () => {
                // display a badge in the accounts menu but do not prompt the user to sign in again
                this.logService.info('Showing badge to enable cloud changes in accounts menu...');
                this.updateAccountsMenuBadge();
                this.pendingEditSessionsContext.set(true);
                // attempt a resume if we are in a pending state and the user just signed in
                const disposable = this.editSessionsStorageService.onDidSignIn(async () => {
                    disposable.dispose();
                    this.logService.info('Showing badge to enable cloud changes in accounts menu succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                    this.storageService.remove(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                    this.environmentService.continueOn = undefined;
                });
            };
            if (this.environmentService.continueOn !== undefined &&
                !this.editSessionsStorageService.isSignedIn &&
                // and user has not yet been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === false) {
                // store the fact that we prompted the user
                this.storageService.store(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                this.logService.info('Prompting to enable cloud changes...');
                await this.editSessionsStorageService.initialize('read');
                if (this.editSessionsStorageService.isSignedIn) {
                    this.logService.info('Prompting to enable cloud changes succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                }
                else {
                    handlePendingEditSessions();
                }
            }
            else if (!this.editSessionsStorageService.isSignedIn &&
                // and user has been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === true) {
                handlePendingEditSessions();
            }
        }
        else {
            this.logService.debug('Auto resuming cloud changes disabled.');
        }
    }
    updateAccountsMenuBadge() {
        if (this.editSessionsStorageService.isSignedIn) {
            return this.accountsMenuBadgeDisposable.clear();
        }
        const badge = new NumberBadge(1, () => localize('check for pending cloud changes', 'Check for pending cloud changes'));
        this.accountsMenuBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
    }
    async autoStoreEditSession() {
        const cancellationTokenSource = new CancellationTokenSource();
        await this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            type: 'syncing',
            title: localize('store working changes', 'Storing working changes...'),
        }, async () => this.storeEditSession(false, cancellationTokenSource.token), () => {
            cancellationTokenSource.cancel();
            cancellationTokenSource.dispose();
        });
    }
    registerViews() {
        const container = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
            id: EDIT_SESSIONS_CONTAINER_ID,
            title: EDIT_SESSIONS_TITLE,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                EDIT_SESSIONS_CONTAINER_ID,
                { mergeViewWithContainerWhenSingleView: true },
            ]),
            icon: EDIT_SESSIONS_VIEW_ICON,
            hideIfEmpty: true,
        }, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
        this._register(this.instantiationService.createInstance(EditSessionsDataViews, container));
    }
    registerActions() {
        this.registerContinueEditSessionAction();
        this.registerResumeLatestEditSessionAction();
        this.registerStoreLatestEditSessionAction();
        this.registerContinueInLocalFolderAction();
        this.registerShowEditSessionViewAction();
        this.registerShowEditSessionOutputChannelAction();
    }
    registerShowEditSessionOutputChannelAction() {
        this._register(registerAction2(class ShowEditSessionOutput extends Action2 {
            constructor() {
                super(showOutputChannelCommand);
            }
            run(accessor, ...args) {
                const outputChannel = accessor.get(IOutputService);
                void outputChannel.showChannel(editSessionsLogId);
            }
        }));
    }
    registerShowEditSessionViewAction() {
        const that = this;
        this._register(registerAction2(class ShowEditSessionView extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.showEditSessions',
                    title: localize2('show cloud changes', 'Show Cloud Changes'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                that.shouldShowViewsContext.set(true);
                const viewsService = accessor.get(IViewsService);
                await viewsService.openView(EDIT_SESSIONS_DATA_VIEW_ID);
            }
        }));
    }
    registerContinueEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ContinueEditSessionAction extends Action2 {
            constructor() {
                super(continueWorkingOnCommand);
            }
            async run(accessor, workspaceUri, destination) {
                // First ask the user to pick a destination, if necessary
                let uri = workspaceUri;
                if (!destination && !uri) {
                    destination = await that.pickContinueEditSessionDestination();
                    if (!destination) {
                        that.telemetryService.publicLog2('continueOn.editSessions.pick.outcome', { outcome: 'noSelection' });
                        return;
                    }
                }
                // Determine if we need to store an edit session, asking for edit session auth if necessary
                const shouldStoreEditSession = await that.shouldContinueOnWithEditSession();
                // Run the store action to get back a ref
                let ref;
                if (shouldStoreEditSession) {
                    that.telemetryService.publicLog2('continueOn.editSessions.store');
                    const cancellationTokenSource = new CancellationTokenSource();
                    try {
                        ref = await that.progressService.withProgress({
                            location: 15 /* ProgressLocation.Notification */,
                            cancellable: true,
                            type: 'syncing',
                            title: localize('store your working changes', 'Storing your working changes...'),
                        }, async () => {
                            const ref = await that.storeEditSession(false, cancellationTokenSource.token);
                            if (ref !== undefined) {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', {
                                    outcome: 'storeSucceeded',
                                    hashedId: hashedEditSessionId(ref),
                                });
                            }
                            else {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeSkipped' });
                            }
                            return ref;
                        }, () => {
                            cancellationTokenSource.cancel();
                            cancellationTokenSource.dispose();
                            that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeCancelledByUser' });
                        });
                    }
                    catch (ex) {
                        that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeFailed' });
                        throw ex;
                    }
                }
                // Append the ref to the URI
                uri = destination ? await that.resolveDestination(destination) : uri;
                if (uri === undefined) {
                    return;
                }
                if (ref !== undefined && uri !== 'noDestinationUri') {
                    const encodedRef = encodeURIComponent(ref);
                    uri = uri.with({
                        query: uri.query.length > 0
                            ? uri.query + `&${queryParamName}=${encodedRef}&continueOn=1`
                            : `${queryParamName}=${encodedRef}&continueOn=1`,
                    });
                    // Open the URI
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if (!shouldStoreEditSession && uri !== 'noDestinationUri') {
                    // Open the URI without an edit session ref
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if (ref === undefined && shouldStoreEditSession) {
                    that.logService.warn(`Failed to store working changes when invoking ${continueWorkingOnCommand.id}.`);
                }
            }
        }));
    }
    registerResumeLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeLatest',
                    title: localize2('resume latest cloud changes', 'Resume Latest Changes from Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor, editSessionId, forceApplyUnrelatedChange) {
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, forceApplyUnrelatedChange));
            }
        }));
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeFromSerializedPayload',
                    title: localize2('resume cloud changes', 'Resume Changes from Serialized Data'),
                    category: 'Developer',
                    f1: true,
                });
            }
            async run(accessor, editSessionId) {
                const data = await that.quickInputService.input({ prompt: 'Enter serialized data' });
                if (data) {
                    that.editSessionsStorageService.lastReadResources.set('editSessions', {
                        content: data,
                        ref: '',
                    });
                }
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, undefined, undefined, undefined, data));
            }
        }));
    }
    registerStoreLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class StoreLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.storeCurrent',
                    title: localize2('store working changes in cloud', 'Store Working Changes in Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                const cancellationTokenSource = new CancellationTokenSource();
                await that.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('storing working changes', 'Storing working changes...'),
                }, async () => {
                    that.telemetryService.publicLog2('editSessions.store');
                    await that.storeEditSession(true, cancellationTokenSource.token);
                }, () => {
                    cancellationTokenSource.cancel();
                    cancellationTokenSource.dispose();
                });
            }
        }));
    }
    async resumeEditSession(ref, silent, forceApplyUnrelatedChange, applyPartialMatch, progress, serializedData) {
        // Wait for the remote environment to become available, if any
        await this.remoteAgentService.getEnvironment();
        // Edit sessions are not currently supported in empty workspaces
        // https://github.com/microsoft/vscode/issues/159220
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return;
        }
        this.logService.info(ref !== undefined
            ? `Resuming changes from cloud with ref ${ref}...`
            : 'Checking for pending cloud changes...');
        if (silent && !(await this.editSessionsStorageService.initialize('read', true))) {
            return;
        }
        this.telemetryService.publicLog2('editSessions.resume');
        performance.mark('code/willResumeEditSessionFromIdentifier');
        progress?.report({
            message: localize('checkingForWorkingChanges', 'Checking for pending cloud changes...'),
        });
        const data = serializedData
            ? { content: serializedData, ref: '' }
            : await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            if (ref === undefined && !silent) {
                this.notificationService.info(localize('no cloud changes', 'There are no changes to resume from the cloud.'));
            }
            else if (ref !== undefined) {
                this.notificationService.warn(localize('no cloud changes for ref', 'Could not resume changes from the cloud for ID {0}.', ref));
            }
            this.logService.info(ref !== undefined
                ? `Aborting resuming changes from cloud as no edit session content is available to be applied from ref ${ref}.`
                : `Aborting resuming edit session as no edit session content is available to be applied`);
            return;
        }
        progress?.report({ message: resumeProgressOptionsTitle });
        const editSession = JSON.parse(data.content);
        ref = data.ref;
        if (editSession.version > EditSessionSchemaVersion) {
            this.notificationService.error(localize('client too old', 'Please upgrade to a newer version of {0} to resume your working changes from the cloud.', this.productService.nameLong));
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'clientUpdateNeeded' });
            return;
        }
        try {
            const { changes, conflictingChanges } = await this.generateChanges(editSession, ref, forceApplyUnrelatedChange, applyPartialMatch);
            if (changes.length === 0) {
                return;
            }
            // TODO@joyceerhl Provide the option to diff files which would be overwritten by edit session contents
            if (conflictingChanges.length > 0) {
                // Allow to show edit sessions
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Warning,
                    message: conflictingChanges.length > 1
                        ? localize('resume edit session warning many', 'Resuming your working changes from the cloud will overwrite the following {0} files. Do you want to proceed?', conflictingChanges.length)
                        : localize('resume edit session warning 1', 'Resuming your working changes from the cloud will overwrite {0}. Do you want to proceed?', basename(conflictingChanges[0].uri)),
                    detail: conflictingChanges.length > 1
                        ? getFileNamesMessage(conflictingChanges.map((c) => c.uri))
                        : undefined,
                });
                if (!confirmed) {
                    return;
                }
            }
            for (const { uri, type, contents } of changes) {
                if (type === ChangeType.Addition) {
                    await this.fileService.writeFile(uri, decodeEditSessionFileContent(editSession.version, contents));
                }
                else if (type === ChangeType.Deletion && (await this.fileService.exists(uri))) {
                    await this.fileService.del(uri);
                }
            }
            await this.workspaceStateSynchronizer?.apply();
            this.logService.info(`Deleting edit session with ref ${ref} after successfully applying it to current workspace...`);
            await this.editSessionsStorageService.delete('editSessions', ref);
            this.logService.info(`Deleted edit session with ref ${ref}.`);
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'resumeSucceeded' });
        }
        catch (ex) {
            this.logService.error('Failed to resume edit session, reason: ', ex.toString());
            this.notificationService.error(localize('resume failed', 'Failed to resume your working changes from the cloud.'));
        }
        performance.mark('code/didResumeEditSessionFromIdentifier');
    }
    async generateChanges(editSession, ref, forceApplyUnrelatedChange = false, applyPartialMatch = false) {
        const changes = [];
        const conflictingChanges = [];
        const workspaceFolders = this.contextService.getWorkspace().folders;
        const cancellationTokenSource = new CancellationTokenSource();
        for (const folder of editSession.folders) {
            let folderRoot;
            if (folder.canonicalIdentity) {
                // Look for an edit session identifier that we can use
                for (const f of workspaceFolders) {
                    const identity = await this.editSessionIdentityService.getEditSessionIdentifier(f, cancellationTokenSource.token);
                    this.logService.info(`Matching identity ${identity} against edit session folder identity ${folder.canonicalIdentity}...`);
                    if (equals(identity, folder.canonicalIdentity) || forceApplyUnrelatedChange) {
                        folderRoot = f;
                        break;
                    }
                    if (identity !== undefined) {
                        const match = await this.editSessionIdentityService.provideEditSessionIdentityMatch(f, identity, folder.canonicalIdentity, cancellationTokenSource.token);
                        if (match === EditSessionIdentityMatch.Complete) {
                            folderRoot = f;
                            break;
                        }
                        else if (match === EditSessionIdentityMatch.Partial &&
                            this.configurationService.getValue('workbench.experimental.cloudChanges.partialMatches.enabled') === true) {
                            if (!applyPartialMatch) {
                                // Surface partially matching edit session
                                this.notificationService.prompt(Severity.Info, localize('editSessionPartialMatch', 'You have pending working changes in the cloud for this workspace. Would you like to resume them?'), [
                                    {
                                        label: localize('resume', 'Resume'),
                                        run: () => this.resumeEditSession(ref, false, undefined, true),
                                    },
                                ]);
                            }
                            else {
                                folderRoot = f;
                                break;
                            }
                        }
                    }
                }
            }
            else {
                folderRoot = workspaceFolders.find((f) => f.name === folder.name);
            }
            if (!folderRoot) {
                this.logService.info(`Skipping applying ${folder.workingChanges.length} changes from edit session with ref ${ref} as no matching workspace folder was found.`);
                return { changes: [], conflictingChanges: [], contributedStateHandlers: [] };
            }
            const localChanges = new Set();
            for (const repository of this.scmService.repositories) {
                if (repository.provider.rootUri !== undefined &&
                    this.contextService.getWorkspaceFolder(repository.provider.rootUri)?.name === folder.name) {
                    const repositoryChanges = this.getChangedResources(repository);
                    repositoryChanges.forEach((change) => localChanges.add(change.toString()));
                }
            }
            for (const change of folder.workingChanges) {
                const uri = joinPath(folderRoot.uri, change.relativeFilePath);
                changes.push({ uri, type: change.type, contents: change.contents });
                if (await this.willChangeLocalContents(localChanges, uri, change)) {
                    conflictingChanges.push({ uri, type: change.type, contents: change.contents });
                }
            }
        }
        return { changes, conflictingChanges };
    }
    async willChangeLocalContents(localChanges, uriWithIncomingChanges, incomingChange) {
        if (!localChanges.has(uriWithIncomingChanges.toString())) {
            return false;
        }
        const { contents, type } = incomingChange;
        switch (type) {
            case ChangeType.Addition: {
                const [originalContents, incomingContents] = await Promise.all([
                    hashAsync(contents),
                    hashAsync(encodeBase64((await this.fileService.readFile(uriWithIncomingChanges)).value)),
                ]);
                return originalContents !== incomingContents;
            }
            case ChangeType.Deletion: {
                return await this.fileService.exists(uriWithIncomingChanges);
            }
            default:
                throw new Error('Unhandled change type.');
        }
    }
    async storeEditSession(fromStoreCommand, cancellationToken) {
        const folders = [];
        let editSessionSize = 0;
        let hasEdits = false;
        // Save all saveable editors before building edit session contents
        await this.editorService.saveAll();
        for (const repository of this.scmService.repositories) {
            // Look through all resource groups and compute which files were added/modified/deleted
            const trackedUris = this.getChangedResources(repository); // A URI might appear in more than one resource group
            const workingChanges = [];
            const { rootUri } = repository.provider;
            const workspaceFolder = rootUri ? this.contextService.getWorkspaceFolder(rootUri) : undefined;
            let name = workspaceFolder?.name;
            for (const uri of trackedUris) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(uri);
                if (!workspaceFolder) {
                    this.logService.info(`Skipping working change ${uri.toString()} as no associated workspace folder was found.`);
                    continue;
                }
                await this.editSessionIdentityService.onWillCreateEditSessionIdentity(workspaceFolder, cancellationToken);
                name = name ?? workspaceFolder.name;
                const relativeFilePath = relativePath(workspaceFolder.uri, uri) ?? uri.path;
                // Only deal with file contents for now
                try {
                    if (!(await this.fileService.stat(uri)).isFile) {
                        continue;
                    }
                }
                catch { }
                hasEdits = true;
                if (await this.fileService.exists(uri)) {
                    const contents = encodeBase64((await this.fileService.readFile(uri)).value);
                    editSessionSize += contents.length;
                    if (editSessionSize > this.editSessionsStorageService.SIZE_LIMIT) {
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        return undefined;
                    }
                    workingChanges.push({
                        type: ChangeType.Addition,
                        fileType: FileType.File,
                        contents: contents,
                        relativeFilePath: relativeFilePath,
                    });
                }
                else {
                    // Assume it's a deletion
                    workingChanges.push({
                        type: ChangeType.Deletion,
                        fileType: FileType.File,
                        contents: undefined,
                        relativeFilePath: relativeFilePath,
                    });
                }
            }
            let canonicalIdentity = undefined;
            if (workspaceFolder !== null && workspaceFolder !== undefined) {
                canonicalIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            }
            // TODO@joyceerhl debt: don't store working changes as a child of the folder
            folders.push({
                workingChanges,
                name: name ?? '',
                canonicalIdentity: canonicalIdentity ?? undefined,
                absoluteUri: workspaceFolder?.uri.toString(),
            });
        }
        // Store contributed workspace state
        await this.workspaceStateSynchronizer?.sync();
        if (!hasEdits) {
            this.logService.info('Skipped storing working changes in the cloud as there are no edits to store.');
            if (fromStoreCommand) {
                this.notificationService.info(localize('no working changes to store', 'Skipped storing working changes in the cloud as there are no edits to store.'));
            }
            return undefined;
        }
        const data = {
            folders,
            version: 2,
            workspaceStateId: this.editSessionsStorageService.lastWrittenResources.get('workspaceState')?.ref,
        };
        try {
            this.logService.info(`Storing edit session...`);
            const ref = await this.editSessionsStorageService.write('editSessions', data);
            this.logService.info(`Stored edit session with ref ${ref}.`);
            return ref;
        }
        catch (ex) {
            this.logService.error(`Failed to store edit session, reason: `, ex.toString());
            if (ex instanceof UserDataSyncStoreError) {
                switch (ex.code) {
                    case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                        // Uploading a payload can fail due to server size limits
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'TooLarge' });
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        break;
                    default:
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'unknown' });
                        this.notificationService.error(localize('payload failed', 'Your working changes cannot be stored.'));
                        break;
                }
            }
        }
        return undefined;
    }
    getChangedResources(repository) {
        return repository.provider.groups.reduce((resources, resourceGroups) => {
            resourceGroups.resources.forEach((resource) => resources.add(resource.sourceUri));
            return resources;
        }, new Set()); // A URI might appear in more than one resource group
    }
    hasEditSession() {
        for (const repository of this.scmService.repositories) {
            if (this.getChangedResources(repository).size > 0) {
                return true;
            }
        }
        return false;
    }
    async shouldContinueOnWithEditSession() {
        // If the user is already signed in, we should store edit session
        if (this.editSessionsStorageService.isSignedIn) {
            return this.hasEditSession();
        }
        // If the user has been asked before and said no, don't use edit sessions
        if (this.configurationService.getValue(useEditSessionsWithContinueOn) === 'off') {
            this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'disabledEditSessionsViaSetting' });
            return false;
        }
        // Prompt the user to use edit sessions if they currently could benefit from using it
        if (this.hasEditSession()) {
            const disposables = new DisposableStore();
            const quickpick = disposables.add(this.quickInputService.createQuickPick());
            quickpick.placeholder = localize('continue with cloud changes', 'Select whether to bring your working changes with you');
            quickpick.ok = false;
            quickpick.ignoreFocusOut = true;
            const withCloudChanges = {
                label: localize('with cloud changes', 'Yes, continue with my working changes'),
            };
            const withoutCloudChanges = {
                label: localize('without cloud changes', 'No, continue without my working changes'),
            };
            quickpick.items = [withCloudChanges, withoutCloudChanges];
            const continueWithCloudChanges = await new Promise((resolve, reject) => {
                disposables.add(quickpick.onDidAccept(() => {
                    resolve(quickpick.selectedItems[0] === withCloudChanges);
                    disposables.dispose();
                }));
                disposables.add(quickpick.onDidHide(() => {
                    reject(new CancellationError());
                    disposables.dispose();
                }));
                quickpick.show();
            });
            if (!continueWithCloudChanges) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', {
                    outcome: 'didNotEnableEditSessionsWhenPrompted',
                });
                return continueWithCloudChanges;
            }
            const initialized = await this.editSessionsStorageService.initialize('write');
            if (!initialized) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', {
                    outcome: 'didNotEnableEditSessionsWhenPrompted',
                });
            }
            return initialized;
        }
        return false;
    }
    //#region Continue Edit Session extension contribution point
    registerContributedEditSessionOptions() {
        continueEditSessionExtPoint.setHandler((extensions) => {
            const continueEditSessionOptions = [];
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'contribEditSessions')) {
                    continue;
                }
                if (!Array.isArray(extension.value)) {
                    continue;
                }
                for (const contribution of extension.value) {
                    const command = MenuRegistry.getCommand(contribution.command);
                    if (!command) {
                        return;
                    }
                    const icon = command.icon;
                    const title = typeof command.title === 'string' ? command.title : command.title.value;
                    const when = ContextKeyExpr.deserialize(contribution.when);
                    continueEditSessionOptions.push(new ContinueEditSessionItem(ThemeIcon.isThemeIcon(icon) ? `$(${icon.id}) ${title}` : title, command.id, command.source?.title, when, contribution.documentation));
                    if (contribution.qualifiedName) {
                        this.generateStandaloneOptionCommand(command.id, contribution.qualifiedName, contribution.category ?? command.category, when, contribution.remoteGroup);
                    }
                }
            }
            this.continueEditSessionOptions = continueEditSessionOptions;
        });
    }
    generateStandaloneOptionCommand(commandId, qualifiedName, category, when, remoteGroup) {
        const command = {
            id: `${continueWorkingOnCommand.id}.${commandId}`,
            title: { original: qualifiedName, value: qualifiedName },
            category: typeof category === 'string' ? { original: category, value: category } : category,
            precondition: when,
            f1: true,
        };
        if (!this.registeredCommands.has(command.id)) {
            this.registeredCommands.add(command.id);
            this._register(registerAction2(class StandaloneContinueOnOption extends Action2 {
                constructor() {
                    super(command);
                }
                async run(accessor) {
                    return accessor
                        .get(ICommandService)
                        .executeCommand(continueWorkingOnCommand.id, undefined, commandId);
                }
            }));
            if (remoteGroup !== undefined) {
                MenuRegistry.appendMenuItem(MenuId.StatusBarRemoteIndicatorMenu, {
                    group: remoteGroup,
                    command: command,
                    when: command.precondition,
                });
            }
        }
    }
    registerContinueInLocalFolderAction() {
        const that = this;
        this._register(registerAction2(class ContinueInLocalFolderAction extends Action2 {
            constructor() {
                super(openLocalFolderCommand);
            }
            async run(accessor) {
                const selection = await that.fileDialogService.showOpenDialog({
                    title: localize('continueEditSession.openLocalFolder.title.v2', 'Select a local folder to continue working in'),
                    canSelectFolders: true,
                    canSelectMany: false,
                    canSelectFiles: false,
                    availableFileSystems: [Schemas.file],
                });
                return selection?.length !== 1
                    ? undefined
                    : URI.from({
                        scheme: that.productService.urlProtocol,
                        authority: Schemas.file,
                        path: selection[0].path,
                    });
            }
        }));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            this.generateStandaloneOptionCommand(openLocalFolderCommand.id, localize('continueWorkingOn.existingLocalFolder', 'Continue Working in Existing Local Folder'), undefined, openLocalFolderCommand.precondition, undefined);
        }
    }
    async pickContinueEditSessionDestination() {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const workspaceContext = this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */
            ? this.contextService.getWorkspace().folders[0].name
            : this.contextService
                .getWorkspace()
                .folders.map((folder) => folder.name)
                .join(', ');
        quickPick.placeholder = localize('continueEditSessionPick.title.v2', 'Select a development environment to continue working on {0} in', `'${workspaceContext}'`);
        quickPick.items = this.createPickItems();
        this.extensionService.onDidChangeExtensions(() => {
            quickPick.items = this.createPickItems();
        });
        const command = await new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                resolve(undefined);
            }));
            disposables.add(quickPick.onDidAccept((e) => {
                const selection = quickPick.activeItems[0].command;
                if (selection === installAdditionalContinueOnOptionsCommand.id) {
                    void this.commandService.executeCommand(installAdditionalContinueOnOptionsCommand.id);
                }
                else {
                    resolve(selection);
                    quickPick.hide();
                }
            }));
            quickPick.show();
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                if (e.item.documentation !== undefined) {
                    const uri = URI.isUri(e.item.documentation)
                        ? URI.parse(e.item.documentation)
                        : await this.commandService.executeCommand(e.item.documentation);
                    void this.openerService.open(uri, { openExternal: true });
                }
            }));
        });
        quickPick.dispose();
        return command;
    }
    async resolveDestination(command) {
        try {
            const uri = await this.commandService.executeCommand(command);
            // Some continue on commands do not return a URI
            // to support extensions which want to be in control
            // of how the destination is opened
            if (uri === undefined) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'noDestinationUri' });
                return 'noDestinationUri';
            }
            if (URI.isUri(uri)) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'resolvedUri' });
                return uri;
            }
            this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'invalidDestination' });
            return undefined;
        }
        catch (ex) {
            if (ex instanceof CancellationError) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'cancelled' });
            }
            else {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'unknownError' });
            }
            return undefined;
        }
    }
    createPickItems() {
        const items = [...this.continueEditSessionOptions].filter((option) => option.when === undefined || this.contextKeyService.contextMatchesRules(option.when));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            items.push(new ContinueEditSessionItem('$(folder) ' +
                localize('continueEditSessionItem.openInLocalFolder.v2', 'Open in Local Folder'), openLocalFolderCommand.id, localize('continueEditSessionItem.builtin', 'Built-in')));
        }
        const sortedItems = items.sort((item1, item2) => item1.label.localeCompare(item2.label));
        return sortedItems.concat({ type: 'separator' }, new ContinueEditSessionItem(installAdditionalContinueOnOptionsCommand.title, installAdditionalContinueOnOptionsCommand.id));
    }
};
EditSessionsContribution = EditSessionsContribution_1 = __decorate([
    __param(0, IEditSessionsStorageService),
    __param(1, IFileService),
    __param(2, IProgressService),
    __param(3, IOpenerService),
    __param(4, ITelemetryService),
    __param(5, ISCMService),
    __param(6, INotificationService),
    __param(7, IDialogService),
    __param(8, IEditSessionsLogService),
    __param(9, IEnvironmentService),
    __param(10, IInstantiationService),
    __param(11, IProductService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IEditSessionIdentityService),
    __param(15, IQuickInputService),
    __param(16, ICommandService),
    __param(17, IContextKeyService),
    __param(18, IFileDialogService),
    __param(19, ILifecycleService),
    __param(20, IStorageService),
    __param(21, IActivityService),
    __param(22, IEditorService),
    __param(23, IRemoteAgentService),
    __param(24, IExtensionService),
    __param(25, IRequestService),
    __param(26, IUserDataProfilesService),
    __param(27, IUriIdentityService),
    __param(28, IWorkspaceIdentityService)
], EditSessionsContribution);
export { EditSessionsContribution };
const infoButtonClass = ThemeIcon.asClassName(Codicon.info);
class ContinueEditSessionItem {
    constructor(label, command, description, when, documentation) {
        this.label = label;
        this.command = command;
        this.description = description;
        this.when = when;
        this.documentation = documentation;
        if (documentation !== undefined) {
            this.buttons = [
                {
                    iconClass: infoButtonClass,
                    tooltip: localize('learnMoreTooltip', 'Learn More'),
                },
            ];
        }
    }
}
const continueEditSessionExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'continueEditSession',
    jsonSchema: {
        description: localize('continueEditSessionExtPoint', 'Contributes options for continuing the current edit session in a different environment'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                command: {
                    description: localize('continueEditSessionExtPoint.command', "Identifier of the command to execute. The command must be declared in the 'commands'-section and return a URI representing a different environment where the current edit session can be continued."),
                    type: 'string',
                },
                group: {
                    description: localize('continueEditSessionExtPoint.group', 'Group into which this item belongs.'),
                    type: 'string',
                },
                qualifiedName: {
                    description: localize('continueEditSessionExtPoint.qualifiedName', 'A fully qualified name for this item which is used for display in menus.'),
                    type: 'string',
                },
                description: {
                    description: localize('continueEditSessionExtPoint.description', "The url, or a command that returns the url, to the option's documentation page."),
                    type: 'string',
                },
                remoteGroup: {
                    description: localize('continueEditSessionExtPoint.remoteGroup', 'Group into which this item belongs in the remote indicator.'),
                    type: 'string',
                },
                when: {
                    description: localize('continueEditSessionExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string',
                },
            },
            required: ['command'],
        },
    },
});
//#endregion
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(EditSessionsContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.experimental.cloudChanges.autoStore': {
            enum: ['onShutdown', 'off'],
            enumDescriptions: [
                localize('autoStoreWorkingChanges.onShutdown', 'Automatically store current working changes in the cloud on window close.'),
                localize('autoStoreWorkingChanges.off', 'Never attempt to automatically store working changes in the cloud.'),
            ],
            type: 'string',
            tags: ['experimental', 'usesOnlineServices'],
            default: 'off',
            markdownDescription: localize('autoStoreWorkingChangesDescription', 'Controls whether to automatically store available working changes in the cloud for the current workspace. This setting has no effect in the web.'),
        },
        'workbench.cloudChanges.autoResume': {
            enum: ['onReload', 'off'],
            enumDescriptions: [
                localize('autoResumeWorkingChanges.onReload', 'Automatically resume available working changes from the cloud on window reload.'),
                localize('autoResumeWorkingChanges.off', 'Never attempt to resume working changes from the cloud.'),
            ],
            type: 'string',
            tags: ['usesOnlineServices'],
            default: 'onReload',
            markdownDescription: localize('autoResumeWorkingChanges', 'Controls whether to automatically resume available working changes stored in the cloud for the current workspace.'),
        },
        'workbench.cloudChanges.continueOn': {
            enum: ['prompt', 'off'],
            enumDescriptions: [
                localize('continueOnCloudChanges.promptForAuth', 'Prompt the user to sign in to store working changes in the cloud with Continue Working On.'),
                localize('continueOnCloudChanges.off', 'Do not store working changes in the cloud with Continue Working On unless the user has already turned on Cloud Changes.'),
            ],
            type: 'string',
            tags: ['usesOnlineServices'],
            default: 'prompt',
            markdownDescription: localize('continueOnCloudChanges', 'Controls whether to prompt the user to store working changes in the cloud when using Continue Working On.'),
        },
        'workbench.experimental.cloudChanges.partialMatches.enabled': {
            type: 'boolean',
            tags: ['experimental', 'usesOnlineServices'],
            default: false,
            markdownDescription: localize('cloudChangesPartialMatchesEnabled', 'Controls whether to surface cloud changes which partially match the current session.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9icm93c2VyL2VkaXRTZXNzaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sT0FBTyxFQUVQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sMkJBQTJCLEVBRTNCLFVBQVUsRUFHVixRQUFRLEVBQ1IsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQix3QkFBd0IsRUFDeEIsdUJBQXVCLEVBQ3ZCLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQiw0QkFBNEIsRUFDNUIsbUJBQW1CLEVBQ25CLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQWtCLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFP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