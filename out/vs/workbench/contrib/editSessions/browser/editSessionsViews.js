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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zVmlld3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvYnJvd3Nlci9lZGl0U2Vzc2lvbnNWaWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsRUFLVix3QkFBd0IsR0FHeEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sVUFBVSxFQUNWLDBCQUEwQixFQUMxQixvQkFBb0IsRUFDcEIsdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUVuQiwyQkFBMkIsR0FDM0IsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtB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