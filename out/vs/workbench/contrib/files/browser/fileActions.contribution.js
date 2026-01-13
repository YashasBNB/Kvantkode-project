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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVBY3Rpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLDRCQUE0QixFQUM1Qix3QkFBd0IsRUFDeEIsMEJBQTBCLEVBQzFCLG1CQUFtQixFQUNuQixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixvQkFBb0IsRUFDcEIsd0JBQXdCLEVBQ3hCLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLG1CQUFtQixFQUNuQiw0QkFBNEIsRUFDNUIsY0FBYyxFQUNkLDhCQUE4QixFQUM5QixpQkFBaUIsRUFDakIsWUFBWSxFQUNaLGlDQUFpQyxFQUNqQyxnQ0FBZ0MsRUFDaEMsaUNBQWlDLEVBQ2pDLG1DQUFtQyxFQUNuQyxrQ0FBa0MsR0FDbEMsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QiwyQkFBMkIsR0FDM0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUd2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN2RSxP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