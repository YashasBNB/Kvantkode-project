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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luY1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxFQUlWLHdCQUF3QixHQUd4QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBR3BCLDhCQUE4QixFQUM5Qix3QkFBd0IsRUFDeEIsaUJBQWlCLEVBRWpCLHNCQUFzQixFQUd0QixvQ0FBb0MsR0FDcEMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBVSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFF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