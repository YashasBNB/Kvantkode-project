/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { IWorkspaceContextService, hasWorkspaceFileExtension, } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, PICK_WORKSPACE_FOLDER_COMMAND_ID, SET_ROOT_FOLDER_COMMAND_ID, } from './workspaceCommands.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { MenuRegistry, MenuId, Action2, registerAction2, } from '../../../platform/actions/common/actions.js';
import { EmptyWorkspaceSupportContext, EnterMultiRootWorkspaceSupportContext, OpenFolderWorkspaceSupportContext, WorkbenchStateContext, WorkspaceFolderCountContext, } from '../../common/contextkeys.js';
import { IHostService } from '../../services/host/browser/host.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IsMacNativeContext } from '../../../platform/contextkey/common/contextkeys.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
const workspacesCategory = localize2('workspaces', 'Workspaces');
export class OpenFileAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFile'; }
    constructor() {
        super({
            id: OpenFileAction.ID,
            title: localize2('openFile', 'Open File...'),
            category: Categories.File,
            f1: true,
            keybinding: {
                when: IsMacNativeContext.toNegated(),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
            },
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFolder'; }
    constructor() {
        super({
            id: OpenFolderAction.ID,
            title: localize2('openFolder', 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: OpenFolderWorkspaceSupportContext,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: undefined,
                linux: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
                },
                win: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
                },
            },
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderViaWorkspaceAction extends Action2 {
    // This action swaps the folders of a workspace with
    // the selected folder and is a workaround for providing
    // "Open Folder..." in environments that do not support
    // this without having a workspace open (e.g. web serverless)
    static { this.ID = 'workbench.action.files.openFolderViaWorkspace'; }
    constructor() {
        super({
            id: OpenFolderViaWorkspaceAction.ID,
            title: localize2('openFolder', 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace')),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
            },
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(SET_ROOT_FOLDER_COMMAND_ID);
    }
}
export class OpenFileFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFileFolder'; }
    static { this.LABEL = localize2('openFileFolder', 'Open...'); }
    constructor() {
        super({
            id: OpenFileFolderAction.ID,
            title: OpenFileFolderAction.LABEL,
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
            },
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileFolderAndOpen({
            forceNewWindow: false,
            telemetryExtraData: data,
        });
    }
}
class OpenWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspace'; }
    constructor() {
        super({
            id: OpenWorkspaceAction.ID,
            title: localize2('openWorkspaceAction', 'Open Workspace from File...'),
            category: Categories.File,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext,
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickWorkspaceAndOpen({ telemetryExtraData: data });
    }
}
class CloseWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.closeFolder'; }
    constructor() {
        super({
            id: CloseWorkspaceAction.ID,
            title: localize2('closeWorkspace', 'Close Workspace'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), EmptyWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 36 /* KeyCode.KeyF */),
            },
        });
    }
    async run(accessor) {
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        return hostService.openWindow({
            forceReuseWindow: true,
            remoteAuthority: environmentService.remoteAuthority,
        });
    }
}
class OpenWorkspaceConfigFileAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspaceConfigFile'; }
    constructor() {
        super({
            id: OpenWorkspaceConfigFileAction.ID,
            title: localize2('openWorkspaceConfigFile', 'Open Workspace Configuration File'),
            category: workspacesCategory,
            f1: true,
            precondition: WorkbenchStateContext.isEqualTo('workspace'),
        });
    }
    async run(accessor) {
        const contextService = accessor.get(IWorkspaceContextService);
        const editorService = accessor.get(IEditorService);
        const configuration = contextService.getWorkspace().configuration;
        if (configuration) {
            await editorService.openEditor({ resource: configuration, options: { pinned: true } });
        }
    }
}
export class AddRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.addRootFolder'; }
    constructor() {
        super({
            id: AddRootFolderAction.ID,
            title: ADD_ROOT_FOLDER_LABEL,
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')),
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(ADD_ROOT_FOLDER_COMMAND_ID);
    }
}
export class RemoveRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.removeRootFolder'; }
    constructor() {
        super({
            id: RemoveRootFolderAction.ID,
            title: localize2('globalRemoveFolderFromWorkspace', 'Remove Folder from Workspace...'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))),
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        if (folder) {
            await workspaceEditingService.removeFolders([folder.uri]);
        }
    }
}
class SaveWorkspaceAsAction extends Action2 {
    static { this.ID = 'workbench.action.saveWorkspaceAs'; }
    constructor() {
        super({
            id: SaveWorkspaceAsAction.ID,
            title: localize2('saveWorkspaceAsAction', 'Save Workspace As...'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext,
        });
    }
    async run(accessor) {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const configPathUri = await workspaceEditingService.pickNewWorkspacePath();
        if (configPathUri && hasWorkspaceFileExtension(configPathUri)) {
            switch (contextService.getWorkbenchState()) {
                case 1 /* WorkbenchState.EMPTY */:
                case 2 /* WorkbenchState.FOLDER */: {
                    const folders = contextService
                        .getWorkspace()
                        .folders.map((folder) => ({ uri: folder.uri }));
                    return workspaceEditingService.createAndEnterWorkspace(folders, configPathUri);
                }
                case 3 /* WorkbenchState.WORKSPACE */:
                    return workspaceEditingService.saveAndEnterWorkspace(configPathUri);
            }
        }
    }
}
class DuplicateWorkspaceInNewWindowAction extends Action2 {
    static { this.ID = 'workbench.action.duplicateWorkspaceInNewWindow'; }
    constructor() {
        super({
            id: DuplicateWorkspaceInNewWindowAction.ID,
            title: localize2('duplicateWorkspaceInNewWindow', 'Duplicate As Workspace in New Window'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext,
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const hostService = accessor.get(IHostService);
        const workspacesService = accessor.get(IWorkspacesService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        const folders = workspaceContextService.getWorkspace().folders;
        const remoteAuthority = environmentService.remoteAuthority;
        const newWorkspace = await workspacesService.createUntitledWorkspace(folders, remoteAuthority);
        await workspaceEditingService.copyWorkspaceSettings(newWorkspace);
        return hostService.openWindow([{ workspaceUri: newWorkspace.configPath }], {
            forceNewWindow: true,
            remoteAuthority,
        });
    }
}
// --- Actions Registration
registerAction2(AddRootFolderAction);
registerAction2(RemoveRootFolderAction);
registerAction2(OpenFileAction);
registerAction2(OpenFolderAction);
registerAction2(OpenFolderViaWorkspaceAction);
registerAction2(OpenFileFolderAction);
registerAction2(OpenWorkspaceAction);
registerAction2(OpenWorkspaceConfigFileAction);
registerAction2(CloseWorkspaceAction);
registerAction2(SaveWorkspaceAsAction);
registerAction2(DuplicateWorkspaceInNewWindowAction);
// --- Menu Registration
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileAction.ID,
        title: localize({ key: 'miOpenFile', comment: ['&& denotes a mnemonic'] }, '&&Open File...'),
    },
    order: 1,
    when: IsMacNativeContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderAction.ID,
        title: localize({ key: 'miOpenFolder', comment: ['&& denotes a mnemonic'] }, 'Open &&Folder...'),
    },
    order: 2,
    when: OpenFolderWorkspaceSupportContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderViaWorkspaceAction.ID,
        title: localize({ key: 'miOpenFolder', comment: ['&& denotes a mnemonic'] }, 'Open &&Folder...'),
    },
    order: 2,
    when: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace')),
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileFolderAction.ID,
        title: localize({ key: 'miOpen', comment: ['&& denotes a mnemonic'] }, '&&Open...'),
    },
    order: 1,
    when: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext),
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenWorkspaceAction.ID,
        title: localize({ key: 'miOpenWorkspace', comment: ['&& denotes a mnemonic'] }, 'Open Wor&&kspace from File...'),
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: localize({ key: 'miAddFolderToWorkspace', comment: ['&& denotes a mnemonic'] }, 'A&&dd Folder to Workspace...'),
    },
    when: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')),
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: SaveWorkspaceAsAction.ID,
        title: localize('miSaveWorkspaceAs', 'Save Workspace As...'),
    },
    order: 2,
    when: EnterMultiRootWorkspaceSupportContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: DuplicateWorkspaceInNewWindowAction.ID,
        title: localize('duplicateWorkspace', 'Duplicate Workspace'),
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize({ key: 'miCloseFolder', comment: ['&& denotes a mnemonic'] }, 'Close &&Folder'),
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), EmptyWorkspaceSupportContext),
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize({ key: 'miCloseWorkspace', comment: ['&& denotes a mnemonic'] }, 'Close &&Workspace'),
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), EmptyWorkspaceSupportContext),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd29ya3NwYWNlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRXJELE9BQU8sRUFDTix3QkFBd0IsRUFHeEIseUJBQXlCLEdBQ3pCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHFCQUFxQixFQUNyQixnQ0FBZ0MsRUFDaEMsMEJBQTBCLEdBQzFCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDaEYsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sT0FBTyxFQUNQLGVBQWUsR0FDZixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIscUNBQXFDLEVBQ3JDLGlDQUFpQyxFQUNqQyxxQkFBcUIsRUFDckIsMkJBQTJCLEdBQzNCLE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIs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