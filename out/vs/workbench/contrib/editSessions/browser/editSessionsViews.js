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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { TreeView, TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { Extensions, TreeItemCollapsibleState, } from '../../../common/views.js';
import { ChangeType, EDIT_SESSIONS_DATA_VIEW_ID, EDIT_SESSIONS_SCHEME, EDIT_SESSIONS_SHOW_VIEW, EDIT_SESSIONS_TITLE, IEditSessionsStorageService, } from '../common/editSessions.js';
import { URI } from '../../../../base/common/uri.js';
import { fromNow } from '../../../../base/common/date.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename } from '../../../../base/common/path.js';
const EDIT_SESSIONS_COUNT_KEY = 'editSessionsCount';
const EDIT_SESSIONS_COUNT_CONTEXT_KEY = new RawContextKey(EDIT_SESSIONS_COUNT_KEY, 0);
let EditSessionsDataViews = class EditSessionsDataViews extends Disposable {
    constructor(container, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.registerViews(container);
    }
    registerViews(container) {
        const viewId = EDIT_SESSIONS_DATA_VIEW_ID;
        const treeView = this.instantiationService.createInstance(TreeView, viewId, EDIT_SESSIONS_TITLE.value);
        treeView.showCollapseAllAction = true;
        treeView.showRefreshAction = true;
        treeView.dataProvider = this.instantiationService.createInstance(EditSessionDataViewDataProvider);
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        viewsRegistry.registerViews([
            {
                id: viewId,
                name: EDIT_SESSIONS_TITLE,
                ctorDescriptor: new SyncDescriptor(TreeViewPane),
                canToggleVisibility: true,
                canMoveView: false,
                treeView,
                collapsed: false,
                when: ContextKeyExpr.and(EDIT_SESSIONS_SHOW_VIEW),
                order: 100,
                hideByDefault: true,
            },
        ], container);
        viewsRegistry.registerViewWelcomeContent(viewId, {
            content: localize('noStoredChanges', 'You have no stored changes in the cloud to display.\n{0}', `[${localize('storeWorkingChangesTitle', 'Store Working Changes')}](command:workbench.editSessions.actions.store)`),
            when: ContextKeyExpr.equals(EDIT_SESSIONS_COUNT_KEY, 0),
            order: 1,
        });
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resume',
                    title: localize('workbench.editSessions.actions.resume.v2', 'Resume Working Changes'),
                    icon: Codicon.desktopDownload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /edit-session/i)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const editSessionId = URI.parse(handle.$treeItemHandle).path.substring(1);
                const commandService = accessor.get(ICommandService);
                await commandService.executeCommand('workbench.editSessions.actions.resumeLatest', editSessionId, true);
                await treeView.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.store',
                    title: localize('workbench.editSessions.actions.store.v2', 'Store Working Changes'),
                    icon: Codicon.cloudUpload,
                });
            }
            async run(accessor, handle) {
                const commandService = accessor.get(ICommandService);
                await commandService.executeCommand('workbench.editSessions.actions.storeCurrent');
                await treeView.refresh();
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.delete',
                    title: localize('workbench.editSessions.actions.delete.v2', 'Delete Working Changes'),
                    icon: Codicon.trash,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.regex('viewItem', /edit-session/i)),
                        group: 'inline',
                    },
                });
            }
            async run(accessor, handle) {
                const editSessionId = URI.parse(handle.$treeItemHandle).path.substring(1);
                const dialogService = accessor.get(IDialogService);
                const editSessionStorageService = accessor.get(IEditSessionsStorageService);
                const result = await dialogService.confirm({
                    message: localize('confirm delete.v2', 'Are you sure you want to permanently delete your working changes with ref {0}?', editSessionId),
                    detail: localize('confirm delete detail.v2', ' You cannot undo this action.'),
                    type: 'warning',
                    title: EDIT_SESSIONS_TITLE.value,
                });
                if (result.confirmed) {
                    await editSessionStorageService.delete('editSessions', editSessionId);
                    await treeView.refresh();
                }
            }
        }));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.deleteAll',
                    title: localize('workbench.editSessions.actions.deleteAll', 'Delete All Working Changes from Cloud'),
                    icon: Codicon.trash,
                    menu: {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewId), ContextKeyExpr.greater(EDIT_SESSIONS_COUNT_KEY, 0)),
                    },
                });
            }
            async run(accessor) {
                const dialogService = accessor.get(IDialogService);
                const editSessionStorageService = accessor.get(IEditSessionsStorageService);
                const result = await dialogService.confirm({
                    message: localize('confirm delete all', 'Are you sure you want to permanently delete all stored changes from the cloud?'),
                    detail: localize('confirm delete all detail', ' You cannot undo this action.'),
                    type: 'warning',
                    title: EDIT_SESSIONS_TITLE.value,
                });
                if (result.confirmed) {
                    await editSessionStorageService.delete('editSessions', null);
                    await treeView.refresh();
                }
            }
        }));
    }
};
EditSessionsDataViews = __decorate([
    __param(1, IInstantiationService)
], EditSessionsDataViews);
export { EditSessionsDataViews };
let EditSessionDataViewDataProvider = class EditSessionDataViewDataProvider {
    constructor(editSessionsStorageService, contextKeyService, workspaceContextService, fileService) {
        this.editSessionsStorageService = editSessionsStorageService;
        this.contextKeyService = contextKeyService;
        this.workspaceContextService = workspaceContextService;
        this.fileService = fileService;
        this.editSessionsCount = EDIT_SESSIONS_COUNT_CONTEXT_KEY.bindTo(this.contextKeyService);
    }
    async getChildren(element) {
        if (!element) {
            return this.getAllEditSessions();
        }
        const [ref, folderName, filePath] = URI.parse(element.handle).path.substring(1).split('/');
        if (ref && !folderName) {
            return this.getEditSession(ref);
        }
        else if (ref && folderName && !filePath) {
            return this.getEditSessionFolderContents(ref, folderName);
        }
        return [];
    }
    async getAllEditSessions() {
        const allEditSessions = await this.editSessionsStorageService.list('editSessions');
        this.editSessionsCount.set(allEditSessions.length);
        const editSessions = [];
        for (const session of allEditSessions) {
            const resource = URI.from({
                scheme: EDIT_SESSIONS_SCHEME,
                authority: 'remote-session-content',
                path: `/${session.ref}`,
            });
            const sessionData = await this.editSessionsStorageService.read('editSessions', session.ref);
            if (!sessionData) {
                continue;
            }
            const content = JSON.parse(sessionData.content);
            const label = content.folders.map((folder) => folder.name).join(', ') ?? session.ref;
            const machineId = content.machine;
            const machineName = machineId
                ? await this.editSessionsStorageService.getMachineById(machineId)
                : undefined;
            const description = machineName === undefined
                ? fromNow(session.created, true)
                : `${fromNow(session.created, true)}\u00a0\u00a0\u2022\u00a0\u00a0${machineName}`;
            editSessions.push({
                handle: resource.toString(),
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label },
                description: description,
                themeIcon: Codicon.repo,
                contextValue: `edit-session`,
            });
        }
        return editSessions;
    }
    async getEditSession(ref) {
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            return [];
        }
        const content = JSON.parse(data.content);
        if (content.folders.length === 1) {
            const folder = content.folders[0];
            return this.getEditSessionFolderContents(ref, folder.name);
        }
        return content.folders.map((folder) => {
            const resource = URI.from({
                scheme: EDIT_SESSIONS_SCHEME,
                authority: 'remote-session-content',
                path: `/${data.ref}/${folder.name}`,
            });
            return {
                handle: resource.toString(),
                collapsibleState: TreeItemCollapsibleState.Collapsed,
                label: { label: folder.name },
                themeIcon: Codicon.folder,
            };
        });
    }
    async getEditSessionFolderContents(ref, folderName) {
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            return [];
        }
        const content = JSON.parse(data.content);
        const currentWorkspaceFolder = this.workspaceContextService
            .getWorkspace()
            .folders.find((folder) => folder.name === folderName);
        const editSessionFolder = content.folders.find((folder) => folder.name === folderName);
        if (!editSessionFolder) {
            return [];
        }
        return Promise.all(editSessionFolder.workingChanges.map(async (change) => {
            const cloudChangeUri = URI.from({
                scheme: EDIT_SESSIONS_SCHEME,
                authority: 'remote-session-content',
                path: `/${data.ref}/${folderName}/${change.relativeFilePath}`,
            });
            if (currentWorkspaceFolder?.uri) {
                // find the corresponding file in the workspace
                const localCopy = joinPath(currentWorkspaceFolder.uri, change.relativeFilePath);
                if (change.type === ChangeType.Addition && (await this.fileService.exists(localCopy))) {
                    return {
                        handle: cloudChangeUri.toString(),
                        resourceUri: cloudChangeUri,
                        collapsibleState: TreeItemCollapsibleState.None,
                        label: { label: change.relativeFilePath },
                        themeIcon: Codicon.file,
                        command: {
                            id: 'vscode.diff',
                            title: localize('compare changes', 'Compare Changes'),
                            arguments: [
                                localCopy,
                                cloudChangeUri,
                                `${basename(change.relativeFilePath)} (${localize('local copy', 'Local Copy')} \u2194 ${localize('cloud changes', 'Cloud Changes')})`,
                                undefined,
                            ],
                        },
                    };
                }
            }
            return {
                handle: cloudChangeUri.toString(),
                resourceUri: cloudChangeUri,
                collapsibleState: TreeItemCollapsibleState.None,
                label: { label: change.relativeFilePath },
                themeIcon: Codicon.file,
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: localize('open file', 'Open File'),
                    arguments: [cloudChangeUri, undefined, undefined],
                },
            };
        }));
    }
};
EditSessionDataViewDataProvider = __decorate([
    __param(0, IEditSessionsStorageService),
    __param(1, IContextKeyService),
    __param(2, IWorkspaceContextService),
    __param(3, IFileService)
], EditSessionDataViewDataProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9icm93c2VyL2VkaXRTZXNzaW9uc1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sVUFBVSxFQUtWLHdCQUF3QixHQUd4QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTixVQUFVLEVBQ1YsMEJBQTBCLEVBQzFCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsbUJBQW1CLEVBRW5CLDJCQUEyQixHQUMzQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0s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