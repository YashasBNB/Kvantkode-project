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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, TreeItemCollapsibleState, } from '../../../common/views.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { TreeView, TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ALL_SYNC_RESOURCES, IUserDataSyncService, IUserDataSyncEnablementService, IUserDataAutoSyncService, UserDataSyncError, getLastSyncResourceUri, IUserDataSyncResourceProviderService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { FolderThemeIcon } from '../../../../platform/theme/common/themeService.js';
import { fromNow } from '../../../../base/common/date.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toAction } from '../../../../base/common/actions.js';
import { IUserDataSyncWorkbenchService, CONTEXT_SYNC_STATE, getSyncAreaLabel, CONTEXT_ACCOUNT_STATE, CONTEXT_ENABLE_ACTIVITY_VIEWS, SYNC_TITLE, SYNC_CONFLICTS_VIEW_ID, CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS, } from '../../../services/userDataSync/common/userDataSync.js';
import { IUserDataSyncMachinesService, isWebPlatform, } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { basename } from '../../../../base/common/resources.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID, } from '../../../browser/parts/editor/editorCommands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataSyncConflictsViewPane } from './userDataSyncConflictsView.js';
let UserDataSyncDataViews = class UserDataSyncDataViews extends Disposable {
    constructor(container, instantiationService, userDataSyncEnablementService, userDataSyncMachinesService, userDataSyncService) {
        super();
        this.instantiationService = instantiationService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.userDataSyncService = userDataSyncService;
        this.registerViews(container);
    }
    registerViews(container) {
        this.registerConflictsView(container);
        this.registerActivityView(container, true);
        this.registerMachinesView(container);
        this.registerActivityView(container, false);
        this.registerTroubleShootView(container);
        this.registerExternalActivityView(container);
    }
    registerConflictsView(container) {
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewName = localize2('conflicts', 'Conflicts');
        const viewDescriptor = {
            id: SYNC_CONFLICTS_VIEW_ID,
            name: viewName,
            ctorDescriptor: new SyncDescriptor(UserDataSyncConflictsViewPane),
            when: ContextKeyExpr.and(CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS),
            canToggleVisibility: false,
            canMoveView: false,
            treeView: this.instantiationService.createInstance(TreeView, SYNC_CONFLICTS_VIEW_ID, viewName.value),
            collapsed: false,
            order: 100,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
    }
    registerMachinesView(container) {
        const id = `workbench.views.sync.machines`;
        const name = localize2('synced machines', 'Synced Machines');
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        const dataProvider = this.instantiationService.createInstance(UserDataSyncMachinesViewDataProvider, treeView);
        treeView.showRefreshAction = true;
        treeView.canSelectMany = true;
        treeView.dataProvider = dataProvider;
        this._register(Event.any(this.userDataSyncMachinesService.onDidChange, this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_ENABLE_ACTIVITY_VIEWS),
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: 300,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.editMachineName`,
                    title: localize('workbench.actions.sync.editMachineName', 'Edit Name'),
                    icon: Codicon.edit,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', id)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const changed = await dataProvider.rename(handle.$treeItemHandle);
                if (changed) {
                    await treeView.refresh();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.turnOffSyncOnMachine`,
                    title: localize('workbench.actions.sync.turnOffSyncOnMachine', 'Turn off Settings Sync'),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', id), ContextKeyExpr.equals('viewItem', 'sync-machine')),
                    },
                });
            }
            async run(accessor, handle, selected) {
                if (await dataProvider.disable((selected || [handle]).map((handle) => handle.$treeItemHandle))) {
                    await treeView.refresh();
                }
            }
        }));
    }
    registerActivityView(container, remote) {
        const id = `workbench.views.sync.${remote ? 'remote' : 'local'}Activity`;
        const name = remote
            ? localize2('remote sync activity title', 'Sync Activity (Remote)')
            : localize2('local sync activity title', 'Sync Activity (Local)');
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        treeView.showCollapseAllAction = true;
        treeView.showRefreshAction = true;
        treeView.dataProvider = remote
            ? this.instantiationService.createInstance(RemoteUserDataSyncActivityViewDataProvider)
            : this.instantiationService.createInstance(LocalUserDataSyncActivityViewDataProvider);
        this._register(Event.any(this.userDataSyncEnablementService.onDidChangeResourceEnablement, this.userDataSyncEnablementService.onDidChangeEnablement, this.userDataSyncService.onDidResetLocal, this.userDataSyncService.onDidResetRemote)(() => treeView.refresh()));
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_ENABLE_ACTIVITY_VIEWS),
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: remote ? 200 : 400,
            hideByDefault: !remote,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this.registerDataViewActions(id);
    }
    registerExternalActivityView(container) {
        const id = `workbench.views.sync.externalActivity`;
        const name = localize2('downloaded sync activity title', 'Sync Activity (Developer)');
        const dataProvider = this.instantiationService.createInstance(ExtractedUserDataSyncActivityViewDataProvider, undefined);
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        treeView.showCollapseAllAction = false;
        treeView.showRefreshAction = false;
        treeView.dataProvider = dataProvider;
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: CONTEXT_ENABLE_ACTIVITY_VIEWS,
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            hideByDefault: false,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.loadActivity`,
                    title: localize('workbench.actions.sync.loadActivity', 'Load Sync Activity'),
                    icon: Codicon.cloudUpload,
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', id),
                        group: 'navigation',
                    },
                });
            }
            async run(accessor) {
                const fileDialogService = accessor.get(IFileDialogService);
                const result = await fileDialogService.showOpenDialog({
                    title: localize('select sync activity file', 'Select Sync Activity File or Folder'),
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: false,
                });
                if (!result?.[0]) {
                    return;
                }
                dataProvider.activityDataResource = result[0];
                await treeView.refresh();
            }
        }));
    }
    registerDataViewActions(viewId) {
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.resolveResource`,
                    title: localize('workbench.actions.sync.resolveResourceRef', 'Show raw JSON sync data'),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i)),
                    },
                });
            }
            async run(accessor, handle) {
                const { resource } = JSON.parse(handle.$treeItemHandle);
                const editorService = accessor.get(IEditorService);
                await editorService.openEditor({
                    resource: URI.parse(resource),
                    options: { pinned: true },
                });
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.compareWithLocal`,
                    title: localize('workbench.actions.sync.compareWithLocal', 'Compare with Local'),
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-associatedResource-.*/i)),
                    },
                });
            }
            async run(accessor, handle) {
                const commandService = accessor.get(ICommandService);
                const { resource, comparableResource } = JSON.parse(handle.$treeItemHandle);
                const remoteResource = URI.parse(resource);
                const localResource = URI.parse(comparableResource);
                return commandService.executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, remoteResource, localResource, localize('remoteToLocalDiff', '{0} ↔ {1}', localize({ key: 'leftResourceName', comment: ['remote as in file in cloud'] }, '{0} (Remote)', basename(remoteResource)), localize({ key: 'rightResourceName', comment: ['local as in file in disk'] }, '{0} (Local)', basename(localResource))), undefined);
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.${viewId}.replaceCurrent`,
                    title: localize('workbench.actions.sync.replaceCurrent', 'Restore'),
                    icon: Codicon.discard,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i), ContextKeyExpr.notEquals('viewItem', `sync-resource-${"profiles" /* SyncResource.Profiles */}`)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const dialogService = accessor.get(IDialogService);
                const userDataSyncService = accessor.get(IUserDataSyncService);
                const { syncResourceHandle, syncResource } = JSON.parse(handle.$treeItemHandle);
                const result = await dialogService.confirm({
                    message: localize({
                        key: 'confirm replace',
                        comment: [
                            'A confirmation message to replace current user data (settings, extensions, keybindings, snippets) with selected version',
                        ],
                    }, 'Would you like to replace your current {0} with selected?', getSyncAreaLabel(syncResource)),
                    type: 'info',
                    title: SYNC_TITLE.value,
                });
                if (result.confirmed) {
                    return userDataSyncService.replace({
                        created: syncResourceHandle.created,
                        uri: URI.revive(syncResourceHandle.uri),
                    });
                }
            }
        }));
    }
    registerTroubleShootView(container) {
        const id = `workbench.views.sync.troubleshoot`;
        const name = localize2('troubleshoot', 'Troubleshoot');
        const treeView = this.instantiationService.createInstance(TreeView, id, name.value);
        const dataProvider = this.instantiationService.createInstance(UserDataSyncTroubleshootViewDataProvider);
        treeView.showRefreshAction = true;
        treeView.dataProvider = dataProvider;
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        const viewDescriptor = {
            id,
            name,
            ctorDescriptor: new SyncDescriptor(TreeViewPane),
            when: CONTEXT_ENABLE_ACTIVITY_VIEWS,
            canToggleVisibility: true,
            canMoveView: false,
            treeView,
            collapsed: false,
            order: 500,
            hideByDefault: true,
        };
        viewsRegistry.registerViews([viewDescriptor], container);
    }
};
UserDataSyncDataViews = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUserDataSyncEnablementService),
    __param(3, IUserDataSyncMachinesService),
    __param(4, IUserDataSyncService)
], UserDataSyncDataViews);
export { UserDataSyncDataViews };
let UserDataSyncActivityViewDataProvider = class UserDataSyncActivityViewDataProvider {
    constructor(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService) {
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncResourceProviderService = userDataSyncResourceProviderService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.notificationService = notificationService;
        this.userDataProfilesService = userDataProfilesService;
        this.syncResourceHandlesByProfile = new Map();
    }
    async getChildren(element) {
        try {
            if (!element) {
                return await this.getRoots();
            }
            if (element.profile ||
                element.handle === this.userDataProfilesService.defaultProfile.id) {
                let promise = this.syncResourceHandlesByProfile.get(element.handle);
                if (!promise) {
                    this.syncResourceHandlesByProfile.set(element.handle, (promise = this.getSyncResourceHandles(element.profile)));
                }
                return await promise;
            }
            if (element.syncResourceHandle) {
                return await this.getChildrenForSyncResourceTreeItem(element);
            }
            return [];
        }
        catch (error) {
            if (!(error instanceof UserDataSyncError)) {
                error = UserDataSyncError.toUserDataSyncError(error);
            }
            if (error instanceof UserDataSyncError &&
                error.code === "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */) {
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: error.message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'reset',
                                label: localize('reset', 'Reset Synced Data'),
                                run: () => this.userDataSyncWorkbenchService.resetSyncedData(),
                            }),
                        ],
                    },
                });
            }
            else {
                this.notificationService.error(error);
            }
            throw error;
        }
    }
    async getRoots() {
        this.syncResourceHandlesByProfile.clear();
        const roots = [];
        const profiles = await this.getProfiles();
        if (profiles.length) {
            const profileTreeItem = {
                handle: this.userDataProfilesService.defaultProfile.id,
                label: { label: this.userDataProfilesService.defaultProfile.name },
                collapsibleState: TreeItemCollapsibleState.Expanded,
            };
            roots.push(profileTreeItem);
        }
        else {
            const defaultSyncResourceHandles = await this.getSyncResourceHandles();
            roots.push(...defaultSyncResourceHandles);
        }
        for (const profile of profiles) {
            const profileTreeItem = {
                handle: profile.id,
                label: { label: profile.name },
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                profile,
            };
            roots.push(profileTreeItem);
        }
        return roots;
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const syncResourceHandle = element.syncResourceHandle;
        const associatedResources = await this.userDataSyncResourceProviderService.getAssociatedResources(syncResourceHandle);
        const previousAssociatedResources = syncResourceHandle.previous
            ? await this.userDataSyncResourceProviderService.getAssociatedResources(syncResourceHandle.previous)
            : [];
        return associatedResources.map(({ resource, comparableResource }) => {
            const handle = JSON.stringify({
                resource: resource.toString(),
                comparableResource: comparableResource.toString(),
            });
            const previousResource = previousAssociatedResources.find((previous) => basename(previous.resource) === basename(resource))?.resource;
            return {
                handle,
                collapsibleState: TreeItemCollapsibleState.None,
                resourceUri: resource,
                command: previousResource
                    ? {
                        id: API_OPEN_DIFF_EDITOR_COMMAND_ID,
                        title: '',
                        arguments: [
                            previousResource,
                            resource,
                            localize('sideBySideLabels', '{0} ↔ {1}', `${basename(resource)} (${fromNow(syncResourceHandle.previous.created, true)})`, `${basename(resource)} (${fromNow(syncResourceHandle.created, true)})`),
                            undefined,
                        ],
                    }
                    : {
                        id: API_OPEN_EDITOR_COMMAND_ID,
                        title: '',
                        arguments: [resource, undefined, undefined],
                    },
                contextValue: `sync-associatedResource-${syncResourceHandle.syncResource}`,
            };
        });
    }
    async getSyncResourceHandles(profile) {
        const treeItems = [];
        const result = await Promise.all(ALL_SYNC_RESOURCES.map(async (syncResource) => {
            const resourceHandles = await this.getResourceHandles(syncResource, profile);
            return resourceHandles.map((resourceHandle, index) => ({
                ...resourceHandle,
                syncResource,
                previous: resourceHandles[index + 1],
            }));
        }));
        const syncResourceHandles = result.flat().sort((a, b) => b.created - a.created);
        for (const syncResourceHandle of syncResourceHandles) {
            const handle = JSON.stringify({
                syncResourceHandle,
                syncResource: syncResourceHandle.syncResource,
            });
            treeItems.push({
                handle,
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label: getSyncAreaLabel(syncResourceHandle.syncResource) },
                description: fromNow(syncResourceHandle.created, true),
                tooltip: new Date(syncResourceHandle.created).toLocaleString(),
                themeIcon: FolderThemeIcon,
                syncResourceHandle,
                contextValue: `sync-resource-${syncResourceHandle.syncResource}`,
            });
        }
        return treeItems;
    }
};
UserDataSyncActivityViewDataProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUserDataSyncResourceProviderService),
    __param(2, IUserDataAutoSyncService),
    __param(3, IUserDataSyncWorkbenchService),
    __param(4, INotificationService),
    __param(5, IUserDataProfilesService)
], UserDataSyncActivityViewDataProvider);
class LocalUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getLocalSyncResourceHandles(syncResource, profile);
    }
    async getProfiles() {
        return this.userDataProfilesService.profiles
            .filter((p) => !p.isDefault)
            .map((p) => ({
            id: p.id,
            collection: p.id,
            name: p.name,
        }));
    }
}
let RemoteUserDataSyncActivityViewDataProvider = class RemoteUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    constructor(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncMachinesService, userDataSyncWorkbenchService, notificationService, userDataProfilesService) {
        super(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService);
        this.userDataSyncMachinesService = userDataSyncMachinesService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
        }
        return super.getChildren(element);
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncMachinesService.getMachines();
        }
        return this.machinesPromise;
    }
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getRemoteSyncResourceHandles(syncResource, profile);
    }
    getProfiles() {
        return this.userDataSyncResourceProviderService.getRemoteSyncedProfiles();
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const children = await super.getChildrenForSyncResourceTreeItem(element);
        if (children.length) {
            const machineId = await this.userDataSyncResourceProviderService.getMachineId(element.syncResourceHandle);
            if (machineId) {
                const machines = await this.getMachines();
                const machine = machines.find(({ id }) => id === machineId);
                children[0].description = machine?.isCurrent
                    ? localize({ key: 'current', comment: ['Represents current machine'] }, 'Current')
                    : machine?.name;
            }
        }
        return children;
    }
};
RemoteUserDataSyncActivityViewDataProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUserDataSyncResourceProviderService),
    __param(2, IUserDataAutoSyncService),
    __param(3, IUserDataSyncMachinesService),
    __param(4, IUserDataSyncWorkbenchService),
    __param(5, INotificationService),
    __param(6, IUserDataProfilesService)
], RemoteUserDataSyncActivityViewDataProvider);
let ExtractedUserDataSyncActivityViewDataProvider = class ExtractedUserDataSyncActivityViewDataProvider extends UserDataSyncActivityViewDataProvider {
    constructor(activityDataResource, userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService, fileService, uriIdentityService) {
        super(userDataSyncService, userDataSyncResourceProviderService, userDataAutoSyncService, userDataSyncWorkbenchService, notificationService, userDataProfilesService);
        this.activityDataResource = activityDataResource;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
            if (!this.activityDataResource) {
                return [];
            }
            const stat = await this.fileService.resolve(this.activityDataResource);
            if (stat.isDirectory) {
                this.activityDataLocation = this.activityDataResource;
            }
            else {
                this.activityDataLocation = this.uriIdentityService.extUri.joinPath(this.uriIdentityService.extUri.dirname(this.activityDataResource), 'remoteActivity');
                try {
                    await this.fileService.del(this.activityDataLocation, { recursive: true });
                }
                catch (e) {
                    /* ignore */
                }
                await this.userDataSyncService.extractActivityData(this.activityDataResource, this.activityDataLocation);
            }
        }
        return super.getChildren(element);
    }
    getResourceHandles(syncResource, profile) {
        return this.userDataSyncResourceProviderService.getLocalSyncResourceHandles(syncResource, profile, this.activityDataLocation);
    }
    async getProfiles() {
        return this.userDataSyncResourceProviderService.getLocalSyncedProfiles(this.activityDataLocation);
    }
    async getChildrenForSyncResourceTreeItem(element) {
        const children = await super.getChildrenForSyncResourceTreeItem(element);
        if (children.length) {
            const machineId = await this.userDataSyncResourceProviderService.getMachineId(element.syncResourceHandle);
            if (machineId) {
                const machines = await this.getMachines();
                const machine = machines.find(({ id }) => id === machineId);
                children[0].description = machine?.isCurrent
                    ? localize({ key: 'current', comment: ['Represents current machine'] }, 'Current')
                    : machine?.name;
            }
        }
        return children;
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncResourceProviderService.getLocalSyncedMachines(this.activityDataLocation);
        }
        return this.machinesPromise;
    }
};
ExtractedUserDataSyncActivityViewDataProvider = __decorate([
    __param(1, IUserDataSyncService),
    __param(2, IUserDataSyncResourceProviderService),
    __param(3, IUserDataAutoSyncService),
    __param(4, IUserDataSyncWorkbenchService),
    __param(5, INotificationService),
    __param(6, IUserDataProfilesService),
    __param(7, IFileService),
    __param(8, IUriIdentityService)
], ExtractedUserDataSyncActivityViewDataProvider);
let UserDataSyncMachinesViewDataProvider = class UserDataSyncMachinesViewDataProvider {
    constructor(treeView, userDataSyncMachinesService, quickInputService, notificationService, dialogService, userDataSyncWorkbenchService) {
        this.treeView = treeView;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
    }
    async getChildren(element) {
        if (!element) {
            this.machinesPromise = undefined;
        }
        try {
            let machines = await this.getMachines();
            machines = machines.filter((m) => !m.disabled).sort((m1, m2) => (m1.isCurrent ? -1 : 1));
            this.treeView.message = machines.length ? undefined : localize('no machines', 'No Machines');
            return machines.map(({ id, name, isCurrent, platform }) => ({
                handle: id,
                collapsibleState: TreeItemCollapsibleState.None,
                label: { label: name },
                description: isCurrent
                    ? localize({ key: 'current', comment: ['Current machine'] }, 'Current')
                    : undefined,
                themeIcon: platform && isWebPlatform(platform) ? Codicon.globe : Codicon.vm,
                contextValue: 'sync-machine',
            }));
        }
        catch (error) {
            this.notificationService.error(error);
            return [];
        }
    }
    getMachines() {
        if (this.machinesPromise === undefined) {
            this.machinesPromise = this.userDataSyncMachinesService.getMachines();
        }
        return this.machinesPromise;
    }
    async disable(machineIds) {
        const machines = await this.getMachines();
        const machinesToDisable = machines.filter(({ id }) => machineIds.includes(id));
        if (!machinesToDisable.length) {
            throw new Error(localize('not found', 'machine not found with id: {0}', machineIds.join(',')));
        }
        const result = await this.dialogService.confirm({
            type: 'info',
            message: machinesToDisable.length > 1
                ? localize('turn off sync on multiple machines', 'Are you sure you want to turn off sync on selected machines?')
                : localize('turn off sync on machine', 'Are you sure you want to turn off sync on {0}?', machinesToDisable[0].name),
            primaryButton: localize({ key: 'turn off', comment: ['&& denotes a mnemonic'] }, '&&Turn off'),
        });
        if (!result.confirmed) {
            return false;
        }
        if (machinesToDisable.some((machine) => machine.isCurrent)) {
            await this.userDataSyncWorkbenchService.turnoff(false);
        }
        const otherMachinesToDisable = machinesToDisable
            .filter((machine) => !machine.isCurrent)
            .map((machine) => [machine.id, false]);
        if (otherMachinesToDisable.length) {
            await this.userDataSyncMachinesService.setEnablements(otherMachinesToDisable);
        }
        return true;
    }
    async rename(machineId) {
        const disposableStore = new DisposableStore();
        const inputBox = disposableStore.add(this.quickInputService.createInputBox());
        inputBox.placeholder = localize('placeholder', 'Enter the name of the machine');
        inputBox.busy = true;
        inputBox.show();
        const machines = await this.getMachines();
        const machine = machines.find(({ id }) => id === machineId);
        const enabledMachines = machines.filter(({ disabled }) => !disabled);
        if (!machine) {
            inputBox.hide();
            disposableStore.dispose();
            throw new Error(localize('not found', 'machine not found with id: {0}', machineId));
        }
        inputBox.busy = false;
        inputBox.value = machine.name;
        const validateMachineName = (machineName) => {
            machineName = machineName.trim();
            return machineName &&
                !enabledMachines.some((m) => m.id !== machineId && m.name === machineName)
                ? machineName
                : null;
        };
        disposableStore.add(inputBox.onDidChangeValue(() => (inputBox.validationMessage = validateMachineName(inputBox.value)
            ? ''
            : localize('valid message', 'Machine name should be unique and not empty'))));
        return new Promise((c, e) => {
            disposableStore.add(inputBox.onDidAccept(async () => {
                const machineName = validateMachineName(inputBox.value);
                disposableStore.dispose();
                if (machineName && machineName !== machine.name) {
                    try {
                        await this.userDataSyncMachinesService.renameMachine(machineId, machineName);
                        c(true);
                    }
                    catch (error) {
                        e(error);
                    }
                }
                else {
                    c(false);
                }
            }));
        });
    }
};
UserDataSyncMachinesViewDataProvider = __decorate([
    __param(1, IUserDataSyncMachinesService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IDialogService),
    __param(5, IUserDataSyncWorkbenchService)
], UserDataSyncMachinesViewDataProvider);
let UserDataSyncTroubleshootViewDataProvider = class UserDataSyncTroubleshootViewDataProvider {
    constructor(fileService, userDataSyncWorkbenchService, environmentService, uriIdentityService) {
        this.fileService = fileService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
    }
    async getChildren(element) {
        if (!element) {
            return [
                {
                    handle: 'SYNC_LOGS',
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                    label: { label: localize('sync logs', 'Logs') },
                    themeIcon: Codicon.folder,
                },
                {
                    handle: 'LAST_SYNC_STATES',
                    collapsibleState: TreeItemCollapsibleState.Collapsed,
                    label: { label: localize('last sync states', 'Last Synced Remotes') },
                    themeIcon: Codicon.folder,
                },
            ];
        }
        if (element.handle === 'LAST_SYNC_STATES') {
            return this.getLastSyncStates();
        }
        if (element.handle === 'SYNC_LOGS') {
            return this.getSyncLogs();
        }
        return [];
    }
    async getLastSyncStates() {
        const result = [];
        for (const syncResource of ALL_SYNC_RESOURCES) {
            const resource = getLastSyncResourceUri(undefined, syncResource, this.environmentService, this.uriIdentityService.extUri);
            if (await this.fileService.exists(resource)) {
                result.push({
                    handle: resource.toString(),
                    label: { label: getSyncAreaLabel(syncResource) },
                    collapsibleState: TreeItemCollapsibleState.None,
                    resourceUri: resource,
                    command: {
                        id: API_OPEN_EDITOR_COMMAND_ID,
                        title: '',
                        arguments: [resource, undefined, undefined],
                    },
                });
            }
        }
        return result;
    }
    async getSyncLogs() {
        const logResources = await this.userDataSyncWorkbenchService.getAllLogResources();
        const result = [];
        for (const syncLogResource of logResources) {
            const logFolder = this.uriIdentityService.extUri.dirname(syncLogResource);
            result.push({
                handle: syncLogResource.toString(),
                collapsibleState: TreeItemCollapsibleState.None,
                resourceUri: syncLogResource,
                label: { label: this.uriIdentityService.extUri.basename(logFolder) },
                description: this.uriIdentityService.extUri.isEqual(logFolder, this.environmentService.logsHome)
                    ? localize({ key: 'current', comment: ['Represents current log file'] }, 'Current')
                    : undefined,
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [syncLogResource, undefined, undefined],
                },
            });
        }
        return result;
    }
};
UserDataSyncTroubleshootViewDataProvider = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataSyncWorkbenchService),
    __param(2, IEnvironmentService),
    __param(3, IUriIdentityService)
], UserDataSyncTroubleshootViewDataProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsRUFJVix3QkFBd0IsR0FHeEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUdwQiw4QkFBOEIsRUFDOUIsd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUVqQixzQkFBc0IsRUFHdEIsb0NBQW9DLEdBQ3BDLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxPQUFP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