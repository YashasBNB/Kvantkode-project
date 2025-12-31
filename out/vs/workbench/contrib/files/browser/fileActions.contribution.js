/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ToggleAutoSaveAction, FocusFilesExplorer, GlobalCompareResourcesAction, ShowActiveFileInExplorer, CompareWithClipboardAction, NEW_FILE_COMMAND_ID, NEW_FILE_LABEL, NEW_FOLDER_COMMAND_ID, NEW_FOLDER_LABEL, TRIGGER_RENAME_LABEL, MOVE_FILE_TO_TRASH_LABEL, COPY_FILE_LABEL, PASTE_FILE_LABEL, FileCopiedContext, renameHandler, moveFileToTrashHandler, copyFileHandler, pasteFileHandler, deleteFileHandler, cutFileHandler, DOWNLOAD_COMMAND_ID, openFilePreserveFocusHandler, DOWNLOAD_LABEL, OpenActiveFileInEmptyWorkspace, UPLOAD_COMMAND_ID, UPLOAD_LABEL, CompareNewUntitledTextFilesAction, SetActiveEditorReadonlyInSession, SetActiveEditorWriteableInSession, ToggleActiveEditorReadonlyInSession, ResetActiveEditorReadonlyInSession, } from './fileActions.js';
import { revertLocalChangesCommand, acceptLocalChangesCommand, CONFLICT_RESOLUTION_CONTEXT, } from './editors/textFileSaveErrorHandler.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { openWindowCommand, newWindowCommand } from './fileCommands.js';
import { COPY_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID, OPEN_TO_SIDE_COMMAND_ID, REVERT_FILE_COMMAND_ID, SAVE_FILE_COMMAND_ID, SAVE_FILE_LABEL, SAVE_FILE_AS_COMMAND_ID, SAVE_FILE_AS_LABEL, SAVE_ALL_IN_GROUP_COMMAND_ID, OpenEditorsGroupContext, COMPARE_WITH_SAVED_COMMAND_ID, COMPARE_RESOURCE_COMMAND_ID, SELECT_FOR_COMPARE_COMMAND_ID, ResourceSelectedForCompareContext, OpenEditorsDirtyEditorContext, COMPARE_SELECTED_COMMAND_ID, REMOVE_ROOT_FOLDER_COMMAND_ID, REMOVE_ROOT_FOLDER_LABEL, SAVE_FILES_COMMAND_ID, COPY_RELATIVE_PATH_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_LABEL, OpenEditorsReadonlyEditorContext, OPEN_WITH_EXPLORER_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, NEW_UNTITLED_FILE_LABEL, SAVE_ALL_COMMAND_ID, OpenEditorsSelectedFileOrUntitledContext, } from './fileConstants.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { FilesExplorerFocusCondition, ExplorerRootContext, ExplorerFolderContext, ExplorerResourceWritableContext, ExplorerResourceCut, ExplorerResourceMoveableToTrash, ExplorerResourceAvailableEditorIdsContext, FoldersViewVisibleContext, } from '../common/files.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_SAVED_EDITORS_COMMAND_ID, CLOSE_EDITORS_IN_GROUP_COMMAND_ID, CLOSE_EDITOR_COMMAND_ID, CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, REOPEN_WITH_COMMAND_ID, } from '../../../browser/parts/editor/editorCommands.js';
import { AutoSaveAfterShortDelayContext } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { WorkbenchListDoubleSelection } from '../../../../platform/list/browser/listService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DirtyWorkingCopiesContext, EnterMultiRootWorkspaceSupportContext, HasWebFileSystemAccess, WorkbenchStateContext, WorkspaceFolderCountContext, SidebarFocusContext, ActiveEditorCanRevertContext, ActiveEditorContext, ResourceContextKey, ActiveEditorAvailableEditorIdsContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey, } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExplorerService } from './files.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../void/browser/voidSettingsPane.js';
// Contribute Global Actions
registerAction2(GlobalCompareResourcesAction);
registerAction2(FocusFilesExplorer);
registerAction2(ShowActiveFileInExplorer);
registerAction2(CompareWithClipboardAction);
registerAction2(CompareNewUntitledTextFilesAction);
registerAction2(ToggleAutoSaveAction);
registerAction2(OpenActiveFileInEmptyWorkspace);
registerAction2(SetActiveEditorReadonlyInSession);
registerAction2(SetActiveEditorWriteableInSession);
registerAction2(ToggleActiveEditorReadonlyInSession);
registerAction2(ResetActiveEditorReadonlyInSession);
// Commands
CommandsRegistry.registerCommand('_files.windowOpen', openWindowCommand);
CommandsRegistry.registerCommand('_files.newWindow', newWindowCommand);
const explorerCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands
const RENAME_ID = 'renameFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: RENAME_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 60 /* KeyCode.F2 */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
    },
    handler: renameHandler,
});
const MOVE_FILE_TO_TRASH_ID = 'moveFileToTrash';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: MOVE_FILE_TO_TRASH_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        secondary: [20 /* KeyCode.Delete */],
    },
    handler: moveFileToTrashHandler,
});
const DELETE_FILE_ID = 'deleteFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: FilesExplorerFocusCondition,
    primary: 1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */,
    },
    handler: deleteFileHandler,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
    },
    handler: deleteFileHandler,
});
const CUT_FILE_ID = 'filesExplorer.cut';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CUT_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
    handler: cutFileHandler,
});
const COPY_FILE_ID = 'filesExplorer.copy';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COPY_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    handler: copyFileHandler,
});
const PASTE_FILE_ID = 'filesExplorer.paste';
CommandsRegistry.registerCommand(PASTE_FILE_ID, pasteFileHandler);
KeybindingsRegistry.registerKeybindingRule({
    id: `^${PASTE_FILE_ID}`, // the `^` enables pasting files into the explorer by preventing default bubble up
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.cancelCut',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceCut),
    primary: 9 /* KeyCode.Escape */,
    handler: async (accessor) => {
        const explorerService = accessor.get(IExplorerService);
        await explorerService.setToCopy([], true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.openFilePreserveFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext.toNegated()),
    primary: 10 /* KeyCode.Space */,
    handler: openFilePreserveFocusHandler,
});
const copyPathCommand = {
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize('copyPath', 'Copy Path'),
};
const copyRelativePathCommand = {
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize('copyRelativePath', 'Copy Relative Path'),
};
export const revealInSideBarCommand = {
    id: REVEAL_IN_EXPLORER_COMMAND_ID,
    title: nls.localize('revealInSideBar', 'Reveal in Explorer View'),
};
// Editor Title Context Menu
appendEditorTitleContextMenuItem(COPY_PATH_COMMAND_ID, copyPathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(COPY_RELATIVE_PATH_COMMAND_ID, copyRelativePathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(revealInSideBarCommand.id, revealInSideBarCommand.title, ResourceContextKey.IsFileSystemResource, '2_files', false, 1);
export function appendEditorTitleContextMenuItem(id, title, when, group, supportsMultiSelect, order) {
    const precondition = supportsMultiSelect !== true ? MultipleEditorsSelectedInGroupContext.negate() : undefined;
    // Menu
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: { id, title, precondition },
        when,
        group,
        order,
    });
}
// Editor Title Menu for Conflict Resolution
appendSaveConflictEditorTitleAction('workbench.files.action.acceptLocalChanges', nls.localize('acceptLocalChanges', 'Use your changes and overwrite file contents'), Codicon.check, -10, acceptLocalChangesCommand);
appendSaveConflictEditorTitleAction('workbench.files.action.revertLocalChanges', nls.localize('revertLocalChanges', 'Discard your changes and revert to file contents'), Codicon.discard, -9, revertLocalChangesCommand);
function appendSaveConflictEditorTitleAction(id, title, icon, order, command) {
    // Command
    CommandsRegistry.registerCommand(id, command);
    // Action
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        command: { id, title, icon },
        when: ContextKeyExpr.equals(CONFLICT_RESOLUTION_CONTEXT, true),
        group: 'navigation',
        order,
    });
}
// Menu registration - command palette
export function appendToCommandPalette({ id, title, category, metadata }, when) {
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id,
            title,
            category,
            metadata,
        },
        when,
    });
}
appendToCommandPalette({
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize2('copyPathOfActive', 'Copy Path of Active File'),
    category: Categories.File,
});
appendToCommandPalette({
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize2('copyRelativePathOfActive', 'Copy Relative Path of Active File'),
    category: Categories.File,
});
appendToCommandPalette({
    id: SAVE_FILE_COMMAND_ID,
    title: SAVE_FILE_LABEL,
    category: Categories.File,
});
appendToCommandPalette({
    id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
    title: SAVE_FILE_WITHOUT_FORMATTING_LABEL,
    category: Categories.File,
});
appendToCommandPalette({
    id: SAVE_ALL_IN_GROUP_COMMAND_ID,
    title: nls.localize2('saveAllInGroup', 'Save All in Group'),
    category: Categories.File,
});
appendToCommandPalette({
    id: SAVE_FILES_COMMAND_ID,
    title: nls.localize2('saveFiles', 'Save All Files'),
    category: Categories.File,
});
appendToCommandPalette({
    id: REVERT_FILE_COMMAND_ID,
    title: nls.localize2('revert', 'Revert File'),
    category: Categories.File,
});
appendToCommandPalette({
    id: COMPARE_WITH_SAVED_COMMAND_ID,
    title: nls.localize2('compareActiveWithSaved', 'Compare Active File with Saved'),
    category: Categories.File,
    metadata: {
        description: nls.localize2('compareActiveWithSavedMeta', 'Opens a new diff editor to compare the active file with the version on disk.'),
    },
});
appendToCommandPalette({
    id: SAVE_FILE_AS_COMMAND_ID,
    title: SAVE_FILE_AS_LABEL,
    category: Categories.File,
});
appendToCommandPalette({
    id: NEW_FILE_COMMAND_ID,
    title: NEW_FILE_LABEL,
    category: Categories.File,
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_FOLDER_COMMAND_ID,
    title: NEW_FOLDER_LABEL,
    category: Categories.File,
    metadata: {
        description: nls.localize2('newFolderDescription', 'Create a new folder or directory'),
    },
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_UNTITLED_FILE_COMMAND_ID,
    title: NEW_UNTITLED_FILE_LABEL,
    category: Categories.File,
});
// Menu registration - open editors
const isFileOrUntitledResourceContextKey = ContextKeyExpr.or(ResourceContextKey.IsFileSystemResource, ResourceContextKey.Scheme.isEqualTo(Schemas.untitled));
const openToSideCommand = {
    id: OPEN_TO_SIDE_COMMAND_ID,
    title: nls.localize('openToSide', 'Open to the Side'),
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: isFileOrUntitledResourceContextKey,
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_open',
    order: 10,
    command: {
        id: REOPEN_WITH_COMMAND_ID,
        title: nls.localize('reopenWith', 'Reopen Editor With...'),
    },
    when: ContextKeyExpr.and(
    // Editors with Available Choices to Open With
    ActiveEditorAvailableEditorIdsContext, 
    // Not: editor groups
    OpenEditorsGroupContext.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 10,
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: SAVE_FILE_LABEL,
        precondition: OpenEditorsDirtyEditorContext,
    },
    when: ContextKeyExpr.or(
    // Untitled Editors
    ResourceContextKey.Scheme.isEqualTo(Schemas.untitled), 
    // Or:
    ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated())),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 20,
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize('revert', 'Revert File'),
        precondition: OpenEditorsDirtyEditorContext,
    },
    when: ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: untitled editors (revert closes them)
    ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 30,
    command: {
        id: SAVE_ALL_IN_GROUP_COMMAND_ID,
        title: nls.localize('saveAll', 'Save All'),
        precondition: DirtyWorkingCopiesContext,
    },
    // Editor Group
    when: OpenEditorsGroupContext,
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 10,
    command: {
        id: COMPARE_WITH_SAVED_COMMAND_ID,
        title: nls.localize('compareWithSaved', 'Compare with Saved'),
        precondition: OpenEditorsDirtyEditorContext,
    },
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, AutoSaveAfterShortDelayContext.toNegated(), WorkbenchListDoubleSelection.toNegated()),
});
const compareResourceCommand = {
    id: COMPARE_RESOURCE_COMMAND_ID,
    title: nls.localize('compareWithSelected', 'Compare with Selected'),
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, ResourceSelectedForCompareContext, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated()),
});
const selectForCompareCommand = {
    id: SELECT_FOR_COMPARE_COMMAND_ID,
    title: nls.localize('compareSource', 'Select for Compare'),
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated()),
});
const compareSelectedCommand = {
    id: COMPARE_SELECTED_COMMAND_ID,
    title: nls.localize('compareSelected', 'Compare Selected'),
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, WorkbenchListDoubleSelection, OpenEditorsSelectedFileOrUntitledContext),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    group: '1_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 10,
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize('close', 'Close'),
    },
    when: OpenEditorsGroupContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 20,
    command: {
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize('closeOthers', 'Close Others'),
    },
    when: OpenEditorsGroupContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 30,
    command: {
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        title: nls.localize('closeSaved', 'Close Saved'),
    },
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 40,
    command: {
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize('closeAll', 'Close All'),
    },
});
// Menu registration - explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 4,
    command: {
        id: NEW_FILE_COMMAND_ID,
        title: NEW_FILE_LABEL,
        precondition: ExplorerResourceWritableContext,
    },
    when: ExplorerFolderContext,
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 6,
    command: {
        id: NEW_FOLDER_COMMAND_ID,
        title: NEW_FOLDER_LABEL,
        precondition: ExplorerResourceWritableContext,
    },
    when: ExplorerFolderContext,
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 20,
    command: {
        id: OPEN_WITH_EXPLORER_COMMAND_ID,
        title: nls.localize('explorerOpenWith', 'Open With...'),
    },
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ExplorerResourceAvailableEditorIdsContext),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, ResourceSelectedForCompareContext, WorkbenchListDoubleSelection.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 8,
    command: {
        id: CUT_FILE_ID,
        title: nls.localize('cut', 'Cut'),
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 10,
    command: {
        id: COPY_FILE_ID,
        title: COPY_FILE_LABEL,
    },
    when: ExplorerRootContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 20,
    command: {
        id: PASTE_FILE_ID,
        title: PASTE_FILE_LABEL,
        precondition: ContextKeyExpr.and(ExplorerResourceWritableContext, FileCopiedContext),
    },
    when: ExplorerFolderContext,
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5b_importexport',
    order: 10,
    command: {
        id: DOWNLOAD_COMMAND_ID,
        title: DOWNLOAD_LABEL,
    },
    when: ContextKeyExpr.or(
    // native: for any remote resource
    ContextKeyExpr.and(IsWebContext.toNegated(), ResourceContextKey.Scheme.notEqualsTo(Schemas.file)), 
    // web: for any files
    ContextKeyExpr.and(IsWebContext, ExplorerFolderContext.toNegated(), ExplorerRootContext.toNegated()), 
    // web: for any folders if file system API support is provided
    ContextKeyExpr.and(IsWebContext, HasWebFileSystemAccess)),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5b_importexport',
    order: 20,
    command: {
        id: UPLOAD_COMMAND_ID,
        title: UPLOAD_LABEL,
    },
    when: ContextKeyExpr.and(
    // only in web
    IsWebContext, 
    // only on folders
    ExplorerFolderContext, 
    // only on writable folders
    ExplorerResourceWritableContext),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 10,
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: ADD_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 30,
    command: {
        id: REMOVE_ROOT_FOLDER_COMMAND_ID,
        title: REMOVE_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext, ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')))),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 10,
    command: {
        id: RENAME_ID,
        title: TRIGGER_RENAME_LABEL,
        precondition: ExplorerResourceWritableContext,
    },
    when: ExplorerRootContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: MOVE_FILE_TO_TRASH_ID,
        title: MOVE_FILE_TO_TRASH_LABEL,
    },
    alt: {
        id: DELETE_FILE_ID,
        title: nls.localize('deleteFile', 'Delete Permanently'),
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: DELETE_FILE_ID,
        title: nls.localize('deleteFile', 'Delete Permanently'),
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash.toNegated()),
});
// Empty Editor Group / Editor Tabs Container Context Menu
for (const menuId of [MenuId.EmptyEditorGroupContext, MenuId.EditorTabsBarContext]) {
    MenuRegistry.appendMenuItem(menuId, {
        command: { id: NEW_UNTITLED_FILE_COMMAND_ID, title: nls.localize('newFile', 'New Text File') },
        group: '1_file',
        order: 10,
    });
    MenuRegistry.appendMenuItem(menuId, {
        command: { id: 'workbench.action.quickOpen', title: nls.localize('openFile', 'Open File...') },
        group: '1_file',
        order: 20,
    });
}
// File menu
// Void added this:
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '0_void',
    command: {
        id: VOID_OPEN_SETTINGS_ACTION_ID,
        title: nls.localize({ key: 'openVoid', comment: ['&& denotes a mnemonic'] }, '&&Open KvantKode Settings'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '1_new',
    command: {
        id: NEW_UNTITLED_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miNewFile', comment: ['&& denotes a mnemonic'] }, '&&New Text File'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miSave', comment: ['&& denotes a mnemonic'] }, '&&Save'),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_AS_COMMAND_ID,
        title: nls.localize({ key: 'miSaveAs', comment: ['&& denotes a mnemonic'] }, 'Save &&As...'),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_ALL_COMMAND_ID,
        title: nls.localize({ key: 'miSaveAll', comment: ['&& denotes a mnemonic'] }, 'Save A&&ll'),
        precondition: DirtyWorkingCopiesContext,
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '5_autosave',
    command: {
        id: ToggleAutoSaveAction.ID,
        title: nls.localize({ key: 'miAutoSave', comment: ['&& denotes a mnemonic'] }, 'A&&uto Save'),
        toggled: ContextKeyExpr.notEquals('config.files.autoSave', 'off'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize({ key: 'miRevert', comment: ['&& denotes a mnemonic'] }, 'Re&&vert File'),
        precondition: ContextKeyExpr.or(
        // Active editor can revert
        ContextKeyExpr.and(ActiveEditorCanRevertContext), 
        // Explorer focused but not on untitled
        ContextKeyExpr.and(ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize({ key: 'miCloseEditor', comment: ['&& denotes a mnemonic'] }, '&&Close Editor'),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 2,
});
// Go to menu
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '3_global_nav',
    command: {
        id: 'workbench.action.quickOpen',
        title: nls.localize({ key: 'miGotoFile', comment: ['&& denotes a mnemonic'] }, 'Go to &&File...'),
    },
    order: 1,
});
// Chat used attachment anchor context menu
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, ExplorerFolderContext.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 20,
    command: revealInSideBarCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource,
});
// Chat resource anchor attachments/anchors context menu
for (const menuId of [
    MenuId.ChatInlineResourceAnchorContext,
    MenuId.ChatInputResourceAttachmentContext,
]) {
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 10,
        command: openToSideCommand,
        when: ContextKeyExpr.and(ResourceContextKey.HasResource, ExplorerFolderContext.toNegated()),
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 20,
        command: revealInSideBarCommand,
        when: ResourceContextKey.IsFileSystemResource,
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 10,
        command: copyPathCommand,
        when: ResourceContextKey.IsFileSystemResource,
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 20,
        command: copyRelativePathCommand,
        when: ResourceContextKey.IsFileSystemResource,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlQWN0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFDNUIsd0JBQXdCLEVBQ3hCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsY0FBYyxFQUNkLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLHdCQUF3QixFQUN4QixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNqQixhQUFhLEVBQ2Isc0JBQXNCLEVBQ3RCLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxtQkFBbUIsRUFDbkIsNEJBQTRCLEVBQzVCLGNBQWMsRUFDZCw4QkFBOEIsRUFDOUIsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixpQ0FBaUMsRUFDakMsZ0NBQWdDLEVBQ2hDLGlDQUFpQyxFQUNqQyxtQ0FBbUMsRUFDbkMsa0NBQWtDLEdBQ2xDLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUNOLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsMkJBQTJCLEdBQzNCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDdkUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQiw2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