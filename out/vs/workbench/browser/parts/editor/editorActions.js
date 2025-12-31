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
import { localize, localize2 } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { CLOSE_EDITOR_COMMAND_ID, MOVE_ACTIVE_EDITOR_COMMAND_ID, SPLIT_EDITOR_LEFT, SPLIT_EDITOR_RIGHT, SPLIT_EDITOR_UP, SPLIT_EDITOR_DOWN, splitEditor, LAYOUT_EDITOR_GROUPS_COMMAND_ID, UNPIN_EDITOR_COMMAND_ID, COPY_ACTIVE_EDITOR_COMMAND_ID, SPLIT_EDITOR, TOGGLE_MAXIMIZE_EDITOR_GROUP, MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID as NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID, } from './editorCommands.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IFileDialogService, IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { ItemActivation, IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { AllEditorsByMostRecentlyUsedQuickAccess, ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppearanceQuickAccess, } from './editorQuickAccess.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IFilesConfigurationService, } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { isLinux, isNative, isWindows } from '../../../../base/common/platform.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ActiveEditorAvailableEditorIdsContext, ActiveEditorContext, ActiveEditorGroupEmptyContext, AuxiliaryBarVisibleContext, EditorPartMaximizedEditorGroupContext, EditorPartMultipleEditorGroupsContext, IsAuxiliaryWindowFocusedContext, MultipleEditorGroupsContext, SideBarVisibleContext, } from '../../../common/contextkeys.js';
import { getActiveDocument } from '../../../../base/browser/dom.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { resolveCommandsContext } from './editorCommandsContext.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { prepareMoveCopyEditors } from './editor.js';
class ExecuteCommandAction extends Action2 {
    constructor(desc, commandId, commandArgs) {
        super(desc);
        this.commandId = commandId;
        this.commandArgs = commandArgs;
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(this.commandId, this.commandArgs);
    }
}
class AbstractSplitEditorAction extends Action2 {
    getDirection(configurationService) {
        return preferredSideBySideGroupDirection(configurationService);
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const direction = this.getDirection(configurationService);
        const commandContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        splitEditor(editorGroupsService, direction, commandContext);
    }
}
export class SplitEditorAction extends AbstractSplitEditorAction {
    static { this.ID = SPLIT_EDITOR; }
    constructor() {
        super({
            id: SplitEditorAction.ID,
            title: localize2('splitEditor', 'Split Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
            },
            category: Categories.View,
        });
    }
}
export class SplitEditorOrthogonalAction extends AbstractSplitEditorAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorOrthogonal',
            title: localize2('splitEditorOrthogonal', 'Split Editor Orthogonal'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */),
            },
            category: Categories.View,
        });
    }
    getDirection(configurationService) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        return direction === 3 /* GroupDirection.RIGHT */ ? 1 /* GroupDirection.DOWN */ : 3 /* GroupDirection.RIGHT */;
    }
}
export class SplitEditorLeftAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: SPLIT_EDITOR_LEFT,
            title: localize2('splitEditorGroupLeft', 'Split Editor Left'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */),
            },
            category: Categories.View,
        }, SPLIT_EDITOR_LEFT);
    }
}
export class SplitEditorRightAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: SPLIT_EDITOR_RIGHT,
            title: localize2('splitEditorGroupRight', 'Split Editor Right'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */),
            },
            category: Categories.View,
        }, SPLIT_EDITOR_RIGHT);
    }
}
export class SplitEditorUpAction extends ExecuteCommandAction {
    static { this.LABEL = localize('splitEditorGroupUp', 'Split Editor Up'); }
    constructor() {
        super({
            id: SPLIT_EDITOR_UP,
            title: localize2('splitEditorGroupUp', 'Split Editor Up'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */),
            },
            category: Categories.View,
        }, SPLIT_EDITOR_UP);
    }
}
export class SplitEditorDownAction extends ExecuteCommandAction {
    static { this.LABEL = localize('splitEditorGroupDown', 'Split Editor Down'); }
    constructor() {
        super({
            id: SPLIT_EDITOR_DOWN,
            title: localize2('splitEditorGroupDown', 'Split Editor Down'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */),
            },
            category: Categories.View,
        }, SPLIT_EDITOR_DOWN);
    }
}
export class JoinTwoGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.joinTwoGroups',
            title: localize2('joinTwoGroups', 'Join Editor Group with Next Group'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        let sourceGroup;
        if (context && typeof context.groupId === 'number') {
            sourceGroup = editorGroupService.getGroup(context.groupId);
        }
        else {
            sourceGroup = editorGroupService.activeGroup;
        }
        if (sourceGroup) {
            const targetGroupDirections = [
                3 /* GroupDirection.RIGHT */,
                1 /* GroupDirection.DOWN */,
                2 /* GroupDirection.LEFT */,
                0 /* GroupDirection.UP */,
            ];
            for (const targetGroupDirection of targetGroupDirections) {
                const targetGroup = editorGroupService.findGroup({ direction: targetGroupDirection }, sourceGroup);
                if (targetGroup && sourceGroup !== targetGroup) {
                    editorGroupService.mergeGroup(sourceGroup, targetGroup);
                    break;
                }
            }
        }
    }
}
export class JoinAllGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.joinAllGroups',
            title: localize2('joinAllGroups', 'Join All Editor Groups'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.mergeAllGroups(editorGroupService.activeGroup);
    }
}
export class NavigateBetweenGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateEditorGroups',
            title: localize2('navigateEditorGroups', 'Navigate Between Editor Groups'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const nextGroup = editorGroupService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, editorGroupService.activeGroup, true);
        nextGroup?.focus();
    }
}
export class FocusActiveGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusActiveEditorGroup',
            title: localize2('focusActiveEditorGroup', 'Focus Active Editor Group'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.activeGroup.focus();
    }
}
class AbstractFocusGroupAction extends Action2 {
    constructor(desc, scope) {
        super(desc);
        this.scope = scope;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const group = editorGroupService.findGroup(this.scope, editorGroupService.activeGroup, true);
        group?.focus();
    }
}
export class FocusFirstGroupAction extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusFirstEditorGroup',
            title: localize2('focusFirstEditorGroup', 'Focus First Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
            },
            category: Categories.View,
        }, { location: 0 /* GroupLocation.FIRST */ });
    }
}
export class FocusLastGroupAction extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusLastEditorGroup',
            title: localize2('focusLastEditorGroup', 'Focus Last Editor Group'),
            f1: true,
            category: Categories.View,
        }, { location: 1 /* GroupLocation.LAST */ });
    }
}
export class FocusNextGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusNextGroup',
            title: localize2('focusNextGroup', 'Focus Next Editor Group'),
            f1: true,
            category: Categories.View,
        }, { location: 2 /* GroupLocation.NEXT */ });
    }
}
export class FocusPreviousGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusPreviousGroup',
            title: localize2('focusPreviousGroup', 'Focus Previous Editor Group'),
            f1: true,
            category: Categories.View,
        }, { location: 3 /* GroupLocation.PREVIOUS */ });
    }
}
export class FocusLeftGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusLeftGroup',
            title: localize2('focusLeftGroup', 'Focus Left Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */),
            },
            category: Categories.View,
        }, { direction: 2 /* GroupDirection.LEFT */ });
    }
}
export class FocusRightGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusRightGroup',
            title: localize2('focusRightGroup', 'Focus Right Editor Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */),
            },
            category: Categories.View,
        }, { direction: 3 /* GroupDirection.RIGHT */ });
    }
}
export class FocusAboveGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusAboveGroup',
            title: localize2('focusAboveGroup', 'Focus Editor Group Above'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */),
            },
            category: Categories.View,
        }, { direction: 0 /* GroupDirection.UP */ });
    }
}
export class FocusBelowGroup extends AbstractFocusGroupAction {
    constructor() {
        super({
            id: 'workbench.action.focusBelowGroup',
            title: localize2('focusBelowGroup', 'Focus Editor Group Below'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */),
            },
            category: Categories.View,
        }, { direction: 1 /* GroupDirection.DOWN */ });
    }
}
let CloseEditorAction = class CloseEditorAction extends Action {
    static { this.ID = 'workbench.action.closeActiveEditor'; }
    static { this.LABEL = localize('closeEditor', 'Close Editor'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.close));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(CLOSE_EDITOR_COMMAND_ID, undefined, context);
    }
};
CloseEditorAction = __decorate([
    __param(2, ICommandService)
], CloseEditorAction);
export { CloseEditorAction };
let UnpinEditorAction = class UnpinEditorAction extends Action {
    static { this.ID = 'workbench.action.unpinActiveEditor'; }
    static { this.LABEL = localize('unpinEditor', 'Unpin Editor'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.pinned));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(UNPIN_EDITOR_COMMAND_ID, undefined, context);
    }
};
UnpinEditorAction = __decorate([
    __param(2, ICommandService)
], UnpinEditorAction);
export { UnpinEditorAction };
let CloseEditorTabAction = class CloseEditorTabAction extends Action {
    static { this.ID = 'workbench.action.closeActiveEditor'; }
    static { this.LABEL = localize('closeOneEditor', 'Close'); }
    constructor(id, label, editorGroupService) {
        super(id, label, ThemeIcon.asClassName(Codicon.close));
        this.editorGroupService = editorGroupService;
    }
    async run(context) {
        const group = context
            ? this.editorGroupService.getGroup(context.groupId)
            : this.editorGroupService.activeGroup;
        if (!group) {
            // group mentioned in context does not exist
            return;
        }
        const targetEditor = context?.editorIndex !== undefined
            ? group.getEditorByIndex(context.editorIndex)
            : group.activeEditor;
        if (!targetEditor) {
            // No editor open or editor at index does not exist
            return;
        }
        const editors = [];
        if (group.isSelected(targetEditor)) {
            editors.push(...group.selectedEditors);
        }
        else {
            editors.push(targetEditor);
        }
        // Close specific editors in group
        for (const editor of editors) {
            await group.closeEditor(editor, { preserveFocus: context?.preserveFocus });
        }
    }
};
CloseEditorTabAction = __decorate([
    __param(2, IEditorGroupsService)
], CloseEditorTabAction);
export { CloseEditorTabAction };
export class RevertAndCloseEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.revertAndCloseActiveEditor',
            title: localize2('revertAndCloseActiveEditor', 'Revert and Close Editor'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane) {
            const editor = activeEditorPane.input;
            const group = activeEditorPane.group;
            // first try a normal revert where the contents of the editor are restored
            try {
                await editorService.revert({ editor, groupId: group.id });
            }
            catch (error) {
                logService.error(error);
                // if that fails, since we are about to close the editor, we accept that
                // the editor cannot be reverted and instead do a soft revert that just
                // enables us to close the editor. With this, a user can always close a
                // dirty editor even when reverting fails.
                await editorService.revert({ editor, groupId: group.id }, { soft: true });
            }
            await group.closeEditor(editor);
        }
    }
}
export class CloseLeftEditorsInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorsToTheLeft',
            title: localize2('closeEditorsToTheLeft', 'Close Editors to the Left in Group'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const { group, editor } = this.getTarget(editorGroupService, context);
        if (group && editor) {
            await group.closeEditors({
                direction: 0 /* CloseDirection.LEFT */,
                except: editor,
                excludeSticky: true,
            });
        }
    }
    getTarget(editorGroupService, context) {
        if (context) {
            return { editor: context.editor, group: editorGroupService.getGroup(context.groupId) };
        }
        // Fallback to active group
        return {
            group: editorGroupService.activeGroup,
            editor: editorGroupService.activeGroup.activeEditor,
        };
    }
}
class AbstractCloseAllAction extends Action2 {
    groupsToClose(editorGroupService) {
        const groupsToClose = [];
        // Close editors in reverse order of their grid appearance so that the editor
        // group that is the first (top-left) remains. This helps to keep view state
        // for editors around that have been opened in this visually first group.
        const groups = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        for (let i = groups.length - 1; i >= 0; i--) {
            groupsToClose.push(groups[i]);
        }
        return groupsToClose;
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        const progressService = accessor.get(IProgressService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        const fileDialogService = accessor.get(IFileDialogService);
        // Depending on the editor and auto save configuration,
        // split editors into buckets for handling confirmation
        const dirtyEditorsWithDefaultConfirm = new Set();
        const dirtyAutoSaveOnFocusChangeEditors = new Set();
        const dirtyAutoSaveOnWindowChangeEditors = new Set();
        const editorsWithCustomConfirm = new Map();
        for (const { editor, groupId } of editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */, {
            excludeSticky: this.excludeSticky,
        })) {
            let confirmClose = false;
            if (editor.closeHandler) {
                confirmClose = editor.closeHandler.showConfirm(); // custom handling of confirmation on close
            }
            else {
                confirmClose = editor.isDirty() && !editor.isSaving(); // default confirm only when dirty and not saving
            }
            if (!confirmClose) {
                continue;
            }
            // Editor has custom confirm implementation
            if (typeof editor.closeHandler?.confirm === 'function') {
                let customEditorsToConfirm = editorsWithCustomConfirm.get(editor.typeId);
                if (!customEditorsToConfirm) {
                    customEditorsToConfirm = new Set();
                    editorsWithCustomConfirm.set(editor.typeId, customEditorsToConfirm);
                }
                customEditorsToConfirm.add({ editor, groupId });
            }
            // Editor will be saved on focus change when a
            // dialog appears, so just track that separate
            else if (!editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) &&
                filesConfigurationService.getAutoSaveMode(editor).mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */) {
                dirtyAutoSaveOnFocusChangeEditors.add({ editor, groupId });
            }
            // Windows, Linux: editor will be saved on window change
            // when a native dialog appears, so just track that separate
            // (see https://github.com/microsoft/vscode/issues/134250)
            else if (isNative &&
                (isWindows || isLinux) &&
                !editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) &&
                filesConfigurationService.getAutoSaveMode(editor).mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */) {
                dirtyAutoSaveOnWindowChangeEditors.add({ editor, groupId });
            }
            // Editor will show in generic file based dialog
            else {
                dirtyEditorsWithDefaultConfirm.add({ editor, groupId });
            }
        }
        // 1.) Show default file based dialog
        if (dirtyEditorsWithDefaultConfirm.size > 0) {
            const editors = Array.from(dirtyEditorsWithDefaultConfirm.values());
            await this.revealEditorsToConfirm(editors, editorGroupService); // help user make a decision by revealing editors
            const confirmation = await fileDialogService.showSaveConfirm(editors.map(({ editor }) => {
                if (editor instanceof SideBySideEditorInput) {
                    return editor.primary.getName(); // prefer shorter names by using primary's name in this case
                }
                return editor.getName();
            }));
            switch (confirmation) {
                case 2 /* ConfirmResult.CANCEL */:
                    return;
                case 1 /* ConfirmResult.DONT_SAVE */:
                    await this.revertEditors(editorService, logService, progressService, editors);
                    break;
                case 0 /* ConfirmResult.SAVE */:
                    await editorService.save(editors, { reason: 1 /* SaveReason.EXPLICIT */ });
                    break;
            }
        }
        // 2.) Show custom confirm based dialog
        for (const [, editorIdentifiers] of editorsWithCustomConfirm) {
            const editors = Array.from(editorIdentifiers.values());
            await this.revealEditorsToConfirm(editors, editorGroupService); // help user make a decision by revealing editors
            const confirmation = await editors.at(0)?.editor.closeHandler?.confirm?.(editors);
            if (typeof confirmation === 'number') {
                switch (confirmation) {
                    case 2 /* ConfirmResult.CANCEL */:
                        return;
                    case 1 /* ConfirmResult.DONT_SAVE */:
                        await this.revertEditors(editorService, logService, progressService, editors);
                        break;
                    case 0 /* ConfirmResult.SAVE */:
                        await editorService.save(editors, { reason: 1 /* SaveReason.EXPLICIT */ });
                        break;
                }
            }
        }
        // 3.) Save autosaveable editors (focus change)
        if (dirtyAutoSaveOnFocusChangeEditors.size > 0) {
            const editors = Array.from(dirtyAutoSaveOnFocusChangeEditors.values());
            await editorService.save(editors, { reason: 3 /* SaveReason.FOCUS_CHANGE */ });
        }
        // 4.) Save autosaveable editors (window change)
        if (dirtyAutoSaveOnWindowChangeEditors.size > 0) {
            const editors = Array.from(dirtyAutoSaveOnWindowChangeEditors.values());
            await editorService.save(editors, { reason: 4 /* SaveReason.WINDOW_CHANGE */ });
        }
        // 5.) Finally close all editors: even if an editor failed to
        // save or revert and still reports dirty, the editor part makes
        // sure to bring up another confirm dialog for those editors
        // specifically.
        return this.doCloseAll(editorGroupService);
    }
    revertEditors(editorService, logService, progressService, editors) {
        return progressService.withProgress({
            location: 10 /* ProgressLocation.Window */, // use window progress to not be too annoying about this operation
            delay: 800, // delay so that it only appears when operation takes a long time
            title: localize('reverting', 'Reverting Editors...'),
        }, () => this.doRevertEditors(editorService, logService, editors));
    }
    async doRevertEditors(editorService, logService, editors) {
        try {
            // We first attempt to revert all editors with `soft: false`, to ensure that
            // working copies revert to their state on disk. Even though we close editors,
            // it is possible that other parties hold a reference to the working copy
            // and expect it to be in a certain state after the editor is closed without
            // saving.
            await editorService.revert(editors);
        }
        catch (error) {
            logService.error(error);
            // if that fails, since we are about to close the editor, we accept that
            // the editor cannot be reverted and instead do a soft revert that just
            // enables us to close the editor. With this, a user can always close a
            // dirty editor even when reverting fails.
            await editorService.revert(editors, { soft: true });
        }
    }
    async revealEditorsToConfirm(editors, editorGroupService) {
        try {
            const handledGroups = new Set();
            for (const { editor, groupId } of editors) {
                if (handledGroups.has(groupId)) {
                    continue;
                }
                handledGroups.add(groupId);
                const group = editorGroupService.getGroup(groupId);
                await group?.openEditor(editor);
            }
        }
        catch (error) {
            // ignore any error as the revealing is just convinience
        }
    }
    async doCloseAll(editorGroupService) {
        await Promise.all(this.groupsToClose(editorGroupService).map((group) => group.closeAllEditors({ excludeSticky: this.excludeSticky })));
    }
}
export class CloseAllEditorsAction extends AbstractCloseAllAction {
    static { this.ID = 'workbench.action.closeAllEditors'; }
    static { this.LABEL = localize2('closeAllEditors', 'Close All Editors'); }
    constructor() {
        super({
            id: CloseAllEditorsAction.ID,
            title: CloseAllEditorsAction.LABEL,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */),
            },
            icon: Codicon.closeAll,
            category: Categories.View,
        });
    }
    get excludeSticky() {
        return true; // exclude sticky from this mass-closing operation
    }
}
export class CloseAllEditorGroupsAction extends AbstractCloseAllAction {
    constructor() {
        super({
            id: 'workbench.action.closeAllGroups',
            title: localize2('closeAllGroups', 'Close All Editor Groups'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */),
            },
            category: Categories.View,
        });
    }
    get excludeSticky() {
        return false; // the intent to close groups means, even sticky are included
    }
    async doCloseAll(editorGroupService) {
        await super.doCloseAll(editorGroupService);
        for (const groupToClose of this.groupsToClose(editorGroupService)) {
            editorGroupService.removeGroup(groupToClose);
        }
    }
}
export class CloseEditorsInOtherGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorsInOtherGroups',
            title: localize2('closeEditorsInOtherGroups', 'Close Editors in Other Groups'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const groupToSkip = context
            ? editorGroupService.getGroup(context.groupId)
            : editorGroupService.activeGroup;
        await Promise.all(editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).map(async (group) => {
            if (groupToSkip && group.id === groupToSkip.id) {
                return;
            }
            return group.closeAllEditors({ excludeSticky: true });
        }));
    }
}
export class CloseEditorInAllGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeEditorInAllGroups',
            title: localize2('closeEditorInAllGroups', 'Close Editor in All Groups'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const activeEditor = editorService.activeEditor;
        if (activeEditor) {
            await Promise.all(editorGroupService
                .getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)
                .map((group) => group.closeEditor(activeEditor)));
        }
    }
}
class AbstractMoveCopyGroupAction extends Action2 {
    constructor(desc, direction, isMove) {
        super(desc);
        this.direction = direction;
        this.isMove = isMove;
    }
    async run(accessor, context) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        let sourceGroup;
        if (context && typeof context.groupId === 'number') {
            sourceGroup = editorGroupService.getGroup(context.groupId);
        }
        else {
            sourceGroup = editorGroupService.activeGroup;
        }
        if (sourceGroup) {
            let resultGroup = undefined;
            if (this.isMove) {
                const targetGroup = this.findTargetGroup(editorGroupService, sourceGroup);
                if (targetGroup) {
                    resultGroup = editorGroupService.moveGroup(sourceGroup, targetGroup, this.direction);
                }
            }
            else {
                resultGroup = editorGroupService.copyGroup(sourceGroup, sourceGroup, this.direction);
            }
            if (resultGroup) {
                editorGroupService.activateGroup(resultGroup);
            }
        }
    }
    findTargetGroup(editorGroupService, sourceGroup) {
        const targetNeighbours = [this.direction];
        // Allow the target group to be in alternative locations to support more
        // scenarios of moving the group to the taret location.
        // Helps for https://github.com/microsoft/vscode/issues/50741
        switch (this.direction) {
            case 2 /* GroupDirection.LEFT */:
            case 3 /* GroupDirection.RIGHT */:
                targetNeighbours.push(0 /* GroupDirection.UP */, 1 /* GroupDirection.DOWN */);
                break;
            case 0 /* GroupDirection.UP */:
            case 1 /* GroupDirection.DOWN */:
                targetNeighbours.push(2 /* GroupDirection.LEFT */, 3 /* GroupDirection.RIGHT */);
                break;
        }
        for (const targetNeighbour of targetNeighbours) {
            const targetNeighbourGroup = editorGroupService.findGroup({ direction: targetNeighbour }, sourceGroup);
            if (targetNeighbourGroup) {
                return targetNeighbourGroup;
            }
        }
        return undefined;
    }
}
class AbstractMoveGroupAction extends AbstractMoveCopyGroupAction {
    constructor(desc, direction) {
        super(desc, direction, true);
    }
}
export class MoveGroupLeftAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupLeft',
            title: localize2('moveActiveGroupLeft', 'Move Editor Group Left'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 15 /* KeyCode.LeftArrow */),
            },
            category: Categories.View,
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class MoveGroupRightAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupRight',
            title: localize2('moveActiveGroupRight', 'Move Editor Group Right'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 17 /* KeyCode.RightArrow */),
            },
            category: Categories.View,
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class MoveGroupUpAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupUp',
            title: localize2('moveActiveGroupUp', 'Move Editor Group Up'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 16 /* KeyCode.UpArrow */),
            },
            category: Categories.View,
        }, 0 /* GroupDirection.UP */);
    }
}
export class MoveGroupDownAction extends AbstractMoveGroupAction {
    constructor() {
        super({
            id: 'workbench.action.moveActiveEditorGroupDown',
            title: localize2('moveActiveGroupDown', 'Move Editor Group Down'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 18 /* KeyCode.DownArrow */),
            },
            category: Categories.View,
        }, 1 /* GroupDirection.DOWN */);
    }
}
class AbstractDuplicateGroupAction extends AbstractMoveCopyGroupAction {
    constructor(desc, direction) {
        super(desc, direction, false);
    }
}
export class DuplicateGroupLeftAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupLeft',
            title: localize2('duplicateActiveGroupLeft', 'Duplicate Editor Group Left'),
            f1: true,
            category: Categories.View,
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class DuplicateGroupRightAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupRight',
            title: localize2('duplicateActiveGroupRight', 'Duplicate Editor Group Right'),
            f1: true,
            category: Categories.View,
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class DuplicateGroupUpAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupUp',
            title: localize2('duplicateActiveGroupUp', 'Duplicate Editor Group Up'),
            f1: true,
            category: Categories.View,
        }, 0 /* GroupDirection.UP */);
    }
}
export class DuplicateGroupDownAction extends AbstractDuplicateGroupAction {
    constructor() {
        super({
            id: 'workbench.action.duplicateActiveEditorGroupDown',
            title: localize2('duplicateActiveGroupDown', 'Duplicate Editor Group Down'),
            f1: true,
            category: Categories.View,
        }, 1 /* GroupDirection.DOWN */);
    }
}
export class MinimizeOtherGroupsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.minimizeOtherEditors',
            title: localize2('minimizeOtherEditorGroups', 'Expand Editor Group'),
            f1: true,
            category: Categories.View,
            precondition: MultipleEditorGroupsContext,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
    }
}
export class MinimizeOtherGroupsHideSidebarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.minimizeOtherEditorsHideSidebar',
            title: localize2('minimizeOtherEditorGroupsHideSidebar', 'Expand Editor Group and Hide Side Bars'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(MultipleEditorGroupsContext, SideBarVisibleContext, AuxiliaryBarVisibleContext),
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        editorGroupService.arrangeGroups(1 /* GroupsArrangement.EXPAND */);
    }
}
export class ResetGroupSizesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.evenEditorWidths',
            title: localize2('evenEditorGroups', 'Reset Editor Group Sizes'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.arrangeGroups(2 /* GroupsArrangement.EVEN */);
    }
}
export class ToggleGroupSizesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorWidths',
            title: localize2('toggleEditorWidths', 'Toggle Editor Group Sizes'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.toggleExpandGroup();
    }
}
export class MaximizeGroupHideSidebarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.maximizeEditorHideSidebar',
            title: localize2('maximizeEditorHideSidebar', 'Maximize Editor Group and Hide Side Bars'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(ContextKeyExpr.and(EditorPartMaximizedEditorGroupContext.negate(), EditorPartMultipleEditorGroupsContext), SideBarVisibleContext, AuxiliaryBarVisibleContext),
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditor) {
            layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            editorGroupService.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */);
        }
    }
}
export class ToggleMaximizeEditorGroupAction extends Action2 {
    constructor() {
        super({
            id: TOGGLE_MAXIMIZE_EDITOR_GROUP,
            title: localize2('toggleMaximizeEditorGroup', 'Toggle Maximize Editor Group'),
            f1: true,
            category: Categories.View,
            precondition: ContextKeyExpr.or(EditorPartMultipleEditorGroupsContext, EditorPartMaximizedEditorGroupContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */),
            },
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -10000, // towards the front
                    group: 'navigation',
                    when: EditorPartMaximizedEditorGroupContext,
                },
                {
                    id: MenuId.EmptyEditorGroup,
                    order: -10000, // towards the front
                    group: 'navigation',
                    when: EditorPartMaximizedEditorGroupContext,
                },
            ],
            icon: Codicon.screenFull,
            toggled: EditorPartMaximizedEditorGroupContext,
        });
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        if (resolvedContext.groupedEditors.length) {
            editorGroupsService.toggleMaximizeGroup(resolvedContext.groupedEditors[0].group);
        }
    }
}
class AbstractNavigateEditorAction extends Action2 {
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const result = this.navigate(editorGroupService);
        if (!result) {
            return;
        }
        const { groupId, editor } = result;
        if (!editor) {
            return;
        }
        const group = editorGroupService.getGroup(groupId);
        if (group) {
            await group.openEditor(editor);
        }
    }
}
export class OpenNextEditor extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.nextEditor',
            title: localize2('openNextEditor', 'Open Next Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */],
                },
            },
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        // Navigate in active group if possible
        const activeGroup = editorGroupService.activeGroup;
        const activeGroupEditors = activeGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const activeEditorIndex = activeGroup.activeEditor
            ? activeGroupEditors.indexOf(activeGroup.activeEditor)
            : -1;
        if (activeEditorIndex + 1 < activeGroupEditors.length) {
            return { editor: activeGroupEditors[activeEditorIndex + 1], groupId: activeGroup.id };
        }
        // Otherwise try in next group that has editors
        const handledGroups = new Set();
        let currentGroup = editorGroupService.activeGroup;
        while (currentGroup && !handledGroups.has(currentGroup.id)) {
            currentGroup = editorGroupService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, currentGroup, true);
            if (currentGroup) {
                handledGroups.add(currentGroup.id);
                const groupEditors = currentGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
                if (groupEditors.length > 0) {
                    return { editor: groupEditors[0], groupId: currentGroup.id };
                }
            }
        }
        return undefined;
    }
}
export class OpenPreviousEditor extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.previousEditor',
            title: localize2('openPreviousEditor', 'Open Previous Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */],
                },
            },
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        // Navigate in active group if possible
        const activeGroup = editorGroupService.activeGroup;
        const activeGroupEditors = activeGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const activeEditorIndex = activeGroup.activeEditor
            ? activeGroupEditors.indexOf(activeGroup.activeEditor)
            : -1;
        if (activeEditorIndex > 0) {
            return { editor: activeGroupEditors[activeEditorIndex - 1], groupId: activeGroup.id };
        }
        // Otherwise try in previous group that has editors
        const handledGroups = new Set();
        let currentGroup = editorGroupService.activeGroup;
        while (currentGroup && !handledGroups.has(currentGroup.id)) {
            currentGroup = editorGroupService.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, currentGroup, true);
            if (currentGroup) {
                handledGroups.add(currentGroup.id);
                const groupEditors = currentGroup.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
                if (groupEditors.length > 0) {
                    return { editor: groupEditors[groupEditors.length - 1], groupId: currentGroup.id };
                }
            }
        }
        return undefined;
    }
}
export class OpenNextEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.nextEditorInGroup',
            title: localize2('nextEditorInGroup', 'Open Next Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */),
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */),
                },
            },
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;
        return {
            editor: index + 1 < editors.length ? editors[index + 1] : editors[0],
            groupId: group.id,
        };
    }
}
export class OpenPreviousEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.previousEditorInGroup',
            title: localize2('openPreviousEditorInGroup', 'Open Previous Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */),
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */),
                },
            },
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        const index = group.activeEditor ? editors.indexOf(group.activeEditor) : -1;
        return {
            editor: index > 0 ? editors[index - 1] : editors[editors.length - 1],
            groupId: group.id,
        };
    }
}
export class OpenFirstEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.firstEditorInGroup',
            title: localize2('firstEditorInGroup', 'Open First Editor in Group'),
            f1: true,
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        return { editor: editors[0], groupId: group.id };
    }
}
export class OpenLastEditorInGroup extends AbstractNavigateEditorAction {
    constructor() {
        super({
            id: 'workbench.action.lastEditorInGroup',
            title: localize2('lastEditorInGroup', 'Open Last Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */],
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 21 /* KeyCode.Digit0 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 30 /* KeyCode.Digit9 */],
                },
            },
            category: Categories.View,
        });
    }
    navigate(editorGroupService) {
        const group = editorGroupService.activeGroup;
        const editors = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
        return { editor: editors[editors.length - 1], groupId: group.id };
    }
}
export class NavigateForwardAction extends Action2 {
    static { this.ID = 'workbench.action.navigateForward'; }
    static { this.LABEL = localize('navigateForward', 'Go Forward'); }
    constructor() {
        super({
            id: NavigateForwardAction.ID,
            title: {
                ...localize2('navigateForward', 'Go Forward'),
                mnemonicTitle: localize({ key: 'miForward', comment: ['&& denotes a mnemonic'] }, '&&Forward'),
            },
            f1: true,
            icon: Codicon.arrowRight,
            precondition: ContextKeyExpr.has('canNavigateForward'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                win: { primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */, secondary: [123 /* KeyCode.BrowserForward */] },
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */,
                    secondary: [123 /* KeyCode.BrowserForward */],
                },
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */,
                    secondary: [123 /* KeyCode.BrowserForward */],
                },
            },
            menu: [
                { id: MenuId.MenubarGoMenu, group: '1_history_nav', order: 2 },
                {
                    id: MenuId.CommandCenter,
                    order: 2,
                    when: ContextKeyExpr.has('config.workbench.navigationControl.enabled'),
                },
            ],
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(0 /* GoFilter.NONE */);
    }
}
export class NavigateBackwardsAction extends Action2 {
    static { this.ID = 'workbench.action.navigateBack'; }
    static { this.LABEL = localize('navigateBack', 'Go Back'); }
    constructor() {
        super({
            id: NavigateBackwardsAction.ID,
            title: {
                ...localize2('navigateBack', 'Go Back'),
                mnemonicTitle: localize({ key: 'miBack', comment: ['&& denotes a mnemonic'] }, '&&Back'),
            },
            f1: true,
            precondition: ContextKeyExpr.has('canNavigateBack'),
            icon: Codicon.arrowLeft,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                win: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */, secondary: [122 /* KeyCode.BrowserBack */] },
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 88 /* KeyCode.Minus */, secondary: [122 /* KeyCode.BrowserBack */] },
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 88 /* KeyCode.Minus */,
                    secondary: [122 /* KeyCode.BrowserBack */],
                },
            },
            menu: [
                { id: MenuId.MenubarGoMenu, group: '1_history_nav', order: 1 },
                {
                    id: MenuId.CommandCenter,
                    order: 1,
                    when: ContextKeyExpr.has('config.workbench.navigationControl.enabled'),
                },
            ],
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(0 /* GoFilter.NONE */);
    }
}
export class NavigatePreviousAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateLast',
            title: localize2('navigatePrevious', 'Go Previous'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(0 /* GoFilter.NONE */);
    }
}
export class NavigateForwardInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateForwardInEditLocations',
            title: localize2('navigateForwardInEdits', 'Go Forward in Edit Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(1 /* GoFilter.EDITS */);
    }
}
export class NavigateBackwardsInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateBackInEditLocations',
            title: localize2('navigateBackInEdits', 'Go Back in Edit Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(1 /* GoFilter.EDITS */);
    }
}
export class NavigatePreviousInEditsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigatePreviousInEditLocations',
            title: localize2('navigatePreviousInEdits', 'Go Previous in Edit Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(1 /* GoFilter.EDITS */);
    }
}
export class NavigateToLastEditLocationAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateToLastEditLocation',
            title: localize2('navigateToLastEditLocation', 'Go to Last Edit Location'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */),
            },
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goLast(1 /* GoFilter.EDITS */);
    }
}
export class NavigateForwardInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateForwardInNavigationLocations',
            title: localize2('navigateForwardInNavigations', 'Go Forward in Navigation Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goForward(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigateBackwardsInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateBackInNavigationLocations',
            title: localize2('navigateBackInNavigations', 'Go Back in Navigation Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goBack(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigatePreviousInNavigationsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigatePreviousInNavigationLocations',
            title: localize2('navigatePreviousInNavigationLocations', 'Go Previous in Navigation Locations'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goPrevious(2 /* GoFilter.NAVIGATION */);
    }
}
export class NavigateToLastNavigationLocationAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.navigateToLastNavigationLocation',
            title: localize2('navigateToLastNavigationLocation', 'Go to Last Navigation Location'),
            f1: true,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.goLast(2 /* GoFilter.NAVIGATION */);
    }
}
export class ReopenClosedEditorAction extends Action2 {
    static { this.ID = 'workbench.action.reopenClosedEditor'; }
    constructor() {
        super({
            id: ReopenClosedEditorAction.ID,
            title: localize2('reopenClosedEditor', 'Reopen Closed Editor'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 50 /* KeyCode.KeyT */,
            },
            category: Categories.View,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        await historyService.reopenLastClosedEditor();
    }
}
export class ClearRecentFilesAction extends Action2 {
    static { this.ID = 'workbench.action.clearRecentFiles'; }
    constructor() {
        super({
            id: ClearRecentFilesAction.ID,
            title: localize2('clearRecentFiles', 'Clear Recently Opened...'),
            f1: true,
            category: Categories.File,
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const workspacesService = accessor.get(IWorkspacesService);
        const historyService = accessor.get(IHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmClearRecentsMessage', 'Do you want to clear all recently opened files and workspaces?'),
            detail: localize('confirmClearDetail', 'This action is irreversible!'),
            primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Clear'),
        });
        if (!confirmed) {
            return;
        }
        // Clear global recently opened
        workspacesService.clearRecentlyOpened();
        // Clear workspace specific recently opened
        historyService.clearRecentlyOpened();
    }
}
export class ShowEditorsInActiveGroupByMostRecentlyUsedAction extends Action2 {
    static { this.ID = 'workbench.action.showEditorsInActiveGroup'; }
    constructor() {
        super({
            id: ShowEditorsInActiveGroupByMostRecentlyUsedAction.ID,
            title: localize2('showEditorsInActiveGroup', 'Show Editors in Active Group By Most Recently Used'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
    }
}
export class ShowAllEditorsByAppearanceAction extends Action2 {
    static { this.ID = 'workbench.action.showAllEditors'; }
    constructor() {
        super({
            id: ShowAllEditorsByAppearanceAction.ID,
            title: localize2('showAllEditors', 'Show All Editors By Appearance'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 46 /* KeyCode.KeyP */),
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 2 /* KeyCode.Tab */,
                },
            },
            category: Categories.File,
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(AllEditorsByAppearanceQuickAccess.PREFIX);
    }
}
export class ShowAllEditorsByMostRecentlyUsedAction extends Action2 {
    static { this.ID = 'workbench.action.showAllEditorsByMostRecentlyUsed'; }
    constructor() {
        super({
            id: ShowAllEditorsByMostRecentlyUsedAction.ID,
            title: localize2('showAllEditorsByMostRecentlyUsed', 'Show All Editors By Most Recently Used'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(AllEditorsByMostRecentlyUsedQuickAccess.PREFIX);
    }
}
class AbstractQuickAccessEditorAction extends Action2 {
    constructor(desc, prefix, itemActivation) {
        super(desc);
        this.prefix = prefix;
        this.itemActivation = itemActivation;
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keybindings = keybindingService.lookupKeybindings(this.desc.id);
        quickInputService.quickAccess.show(this.prefix, {
            quickNavigateConfiguration: { keybindings },
            itemActivation: this.itemActivation,
        });
    }
}
export class QuickAccessPreviousRecentlyUsedEditorAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenPreviousRecentlyUsedEditor',
            title: localize2('quickOpenPreviousRecentlyUsedEditor', 'Quick Open Previous Recently Used Editor'),
            f1: true,
            category: Categories.View,
        }, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessLeastRecentlyUsedEditorAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenLeastRecentlyUsedEditor',
            title: localize2('quickOpenLeastRecentlyUsedEditor', 'Quick Open Least Recently Used Editor'),
            f1: true,
            category: Categories.View,
        }, AllEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessPreviousRecentlyUsedEditorInGroupAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup',
            title: localize2('quickOpenPreviousRecentlyUsedEditorInGroup', 'Quick Open Previous Recently Used Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 2 /* KeyCode.Tab */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 2 /* KeyCode.Tab */,
                },
            },
            precondition: ActiveEditorGroupEmptyContext.toNegated(),
            category: Categories.View,
        }, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, undefined);
    }
}
export class QuickAccessLeastRecentlyUsedEditorInGroupAction extends AbstractQuickAccessEditorAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenLeastRecentlyUsedEditorInGroup',
            title: localize2('quickOpenLeastRecentlyUsedEditorInGroup', 'Quick Open Least Recently Used Editor in Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
                },
            },
            precondition: ActiveEditorGroupEmptyContext.toNegated(),
            category: Categories.View,
        }, ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX, ItemActivation.LAST);
    }
}
export class QuickAccessPreviousEditorFromHistoryAction extends Action2 {
    static { this.ID = 'workbench.action.openPreviousEditorFromHistory'; }
    constructor() {
        super({
            id: QuickAccessPreviousEditorFromHistoryAction.ID,
            title: localize2('navigateEditorHistoryByInput', 'Quick Open Previous Editor from History'),
            f1: true,
        });
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const keybindings = keybindingService.lookupKeybindings(QuickAccessPreviousEditorFromHistoryAction.ID);
        // Enforce to activate the first item in quick access if
        // the currently active editor group has n editor opened
        let itemActivation = undefined;
        if (editorGroupService.activeGroup.count === 0) {
            itemActivation = ItemActivation.FIRST;
        }
        quickInputService.quickAccess.show('', {
            quickNavigateConfiguration: { keybindings },
            itemActivation,
        });
    }
}
export class OpenNextRecentlyUsedEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openNextRecentlyUsedEditor',
            title: localize2('openNextRecentlyUsedEditor', 'Open Next Recently Used Editor'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        historyService.openNextRecentlyUsedEditor();
    }
}
export class OpenPreviousRecentlyUsedEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openPreviousRecentlyUsedEditor',
            title: localize2('openPreviousRecentlyUsedEditor', 'Open Previous Recently Used Editor'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        historyService.openPreviouslyUsedEditor();
    }
}
export class OpenNextRecentlyUsedEditorInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openNextRecentlyUsedEditorInGroup',
            title: localize2('openNextRecentlyUsedEditorInGroup', 'Open Next Recently Used Editor In Group'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        historyService.openNextRecentlyUsedEditor(editorGroupsService.activeGroup.id);
    }
}
export class OpenPreviousRecentlyUsedEditorInGroupAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openPreviousRecentlyUsedEditorInGroup',
            title: localize2('openPreviousRecentlyUsedEditorInGroup', 'Open Previous Recently Used Editor In Group'),
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const historyService = accessor.get(IHistoryService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        historyService.openPreviouslyUsedEditor(editorGroupsService.activeGroup.id);
    }
}
export class ClearEditorHistoryAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.clearEditorHistory',
            title: localize2('clearEditorHistory', 'Clear Editor History'),
            f1: true,
        });
    }
    async run(accessor) {
        const dialogService = accessor.get(IDialogService);
        const historyService = accessor.get(IHistoryService);
        // Ask for confirmation
        const { confirmed } = await dialogService.confirm({
            type: 'warning',
            message: localize('confirmClearEditorHistoryMessage', 'Do you want to clear the history of recently opened editors?'),
            detail: localize('confirmClearDetail', 'This action is irreversible!'),
            primaryButton: localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Clear'),
        });
        if (!confirmed) {
            return;
        }
        // Clear editor history
        historyService.clear();
    }
}
export class MoveEditorLeftInGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorLeftInGroup',
            title: localize2('moveEditorLeft', 'Move Editor Left'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */),
                },
            },
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'left' });
    }
}
export class MoveEditorRightInGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorRightInGroup',
            title: localize2('moveEditorRight', 'Move Editor Right'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
                mac: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */),
                },
            },
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'right' });
    }
}
export class MoveEditorToPreviousGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToPreviousGroup',
            title: localize2('moveEditorToPreviousGroup', 'Move Editor into Previous Group'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 15 /* KeyCode.LeftArrow */,
                },
            },
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'previous', by: 'group' });
    }
}
export class MoveEditorToNextGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToNextGroup',
            title: localize2('moveEditorToNextGroup', 'Move Editor into Next Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 17 /* KeyCode.RightArrow */,
                },
            },
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'next', by: 'group' });
    }
}
export class MoveEditorToAboveGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToAboveGroup',
            title: localize2('moveEditorToAboveGroup', 'Move Editor into Group Above'),
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'up', by: 'group' });
    }
}
export class MoveEditorToBelowGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToBelowGroup',
            title: localize2('moveEditorToBelowGroup', 'Move Editor into Group Below'),
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'down', by: 'group' });
    }
}
export class MoveEditorToLeftGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToLeftGroup',
            title: localize2('moveEditorToLeftGroup', 'Move Editor into Left Group'),
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'left', by: 'group' });
    }
}
export class MoveEditorToRightGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToRightGroup',
            title: localize2('moveEditorToRightGroup', 'Move Editor into Right Group'),
            f1: true,
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'right', by: 'group' });
    }
}
export class MoveEditorToFirstGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToFirstGroup',
            title: localize2('moveEditorToFirstGroup', 'Move Editor into First Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 22 /* KeyCode.Digit1 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 22 /* KeyCode.Digit1 */,
                },
            },
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'first', by: 'group' });
    }
}
export class MoveEditorToLastGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.moveEditorToLastGroup',
            title: localize2('moveEditorToLastGroup', 'Move Editor into Last Group'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 30 /* KeyCode.Digit9 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 30 /* KeyCode.Digit9 */,
                },
            },
            category: Categories.View,
        }, MOVE_ACTIVE_EDITOR_COMMAND_ID, { to: 'last', by: 'group' });
    }
}
export class SplitEditorToPreviousGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToPreviousGroup',
            title: localize2('splitEditorToPreviousGroup', 'Split Editor into Previous Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'previous', by: 'group' });
    }
}
export class SplitEditorToNextGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToNextGroup',
            title: localize2('splitEditorToNextGroup', 'Split Editor into Next Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'next', by: 'group' });
    }
}
export class SplitEditorToAboveGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToAboveGroup',
            title: localize2('splitEditorToAboveGroup', 'Split Editor into Group Above'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'up', by: 'group' });
    }
}
export class SplitEditorToBelowGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToBelowGroup',
            title: localize2('splitEditorToBelowGroup', 'Split Editor into Group Below'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'down', by: 'group' });
    }
}
export class SplitEditorToLeftGroupAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.splitEditorToLeftGroup'; }
    static { this.LABEL = localize('splitEditorToLeftGroup', 'Split Editor into Left Group'); }
    constructor() {
        super({
            id: 'workbench.action.splitEditorToLeftGroup',
            title: localize2('splitEditorToLeftGroup', 'Split Editor into Left Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'left', by: 'group' });
    }
}
export class SplitEditorToRightGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToRightGroup',
            title: localize2('splitEditorToRightGroup', 'Split Editor into Right Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'right', by: 'group' });
    }
}
export class SplitEditorToFirstGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToFirstGroup',
            title: localize2('splitEditorToFirstGroup', 'Split Editor into First Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'first', by: 'group' });
    }
}
export class SplitEditorToLastGroupAction extends ExecuteCommandAction {
    constructor() {
        super({
            id: 'workbench.action.splitEditorToLastGroup',
            title: localize2('splitEditorToLastGroup', 'Split Editor into Last Group'),
            f1: true,
            category: Categories.View,
        }, COPY_ACTIVE_EDITOR_COMMAND_ID, { to: 'last', by: 'group' });
    }
}
export class EditorLayoutSingleAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutSingle'; }
    constructor() {
        super({
            id: EditorLayoutSingleAction.ID,
            title: localize2('editorLayoutSingle', 'Single Column Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutTwoColumnsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoColumns'; }
    constructor() {
        super({
            id: EditorLayoutTwoColumnsAction.ID,
            title: localize2('editorLayoutTwoColumns', 'Two Columns Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}], orientation: 0 /* GroupOrientation.HORIZONTAL */ });
    }
}
export class EditorLayoutThreeColumnsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutThreeColumns'; }
    constructor() {
        super({
            id: EditorLayoutThreeColumnsAction.ID,
            title: localize2('editorLayoutThreeColumns', 'Three Columns Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, {
            groups: [{}, {}, {}],
            orientation: 0 /* GroupOrientation.HORIZONTAL */,
        });
    }
}
export class EditorLayoutTwoRowsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoRows'; }
    constructor() {
        super({
            id: EditorLayoutTwoRowsAction.ID,
            title: localize2('editorLayoutTwoRows', 'Two Rows Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
    }
}
export class EditorLayoutThreeRowsAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutThreeRows'; }
    constructor() {
        super({
            id: EditorLayoutThreeRowsAction.ID,
            title: localize2('editorLayoutThreeRows', 'Three Rows Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, { groups: [{}, {}, {}], orientation: 1 /* GroupOrientation.VERTICAL */ });
    }
}
export class EditorLayoutTwoByTwoGridAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoByTwoGrid'; }
    constructor() {
        super({
            id: EditorLayoutTwoByTwoGridAction.ID,
            title: localize2('editorLayoutTwoByTwoGrid', 'Grid Editor Layout (2x2)'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, {
            groups: [{ groups: [{}, {}] }, { groups: [{}, {}] }],
            orientation: 0 /* GroupOrientation.HORIZONTAL */,
        });
    }
}
export class EditorLayoutTwoColumnsBottomAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoColumnsBottom'; }
    constructor() {
        super({
            id: EditorLayoutTwoColumnsBottomAction.ID,
            title: localize2('editorLayoutTwoColumnsBottom', 'Two Columns Bottom Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, {
            groups: [{}, { groups: [{}, {}] }],
            orientation: 1 /* GroupOrientation.VERTICAL */,
        });
    }
}
export class EditorLayoutTwoRowsRightAction extends ExecuteCommandAction {
    static { this.ID = 'workbench.action.editorLayoutTwoRowsRight'; }
    constructor() {
        super({
            id: EditorLayoutTwoRowsRightAction.ID,
            title: localize2('editorLayoutTwoRowsRight', 'Two Rows Right Editor Layout'),
            f1: true,
            category: Categories.View,
        }, LAYOUT_EDITOR_GROUPS_COMMAND_ID, {
            groups: [{}, { groups: [{}, {}] }],
            orientation: 0 /* GroupOrientation.HORIZONTAL */,
        });
    }
}
class AbstractCreateEditorGroupAction extends Action2 {
    constructor(desc, direction) {
        super(desc);
        this.direction = direction;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // We are about to create a new empty editor group. We make an opiniated
        // decision here whether to focus that new editor group or not based
        // on what is currently focused. If focus is outside the editor area not
        // in the <body>, we do not focus, with the rationale that a user might
        // have focus on a tree/list with the intention to pick an element to
        // open in the new group from that tree/list.
        //
        // If focus is inside the editor area, we want to prevent the situation
        // of an editor having keyboard focus in an inactive editor group
        // (see https://github.com/microsoft/vscode/issues/189256)
        const activeDocument = getActiveDocument();
        const focusNewGroup = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */) ||
            activeDocument.activeElement === activeDocument.body;
        const group = editorGroupService.addGroup(editorGroupService.activeGroup, this.direction);
        editorGroupService.activateGroup(group);
        if (focusNewGroup) {
            group.focus();
        }
    }
}
export class NewEditorGroupLeftAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupLeft',
            title: localize2('newGroupLeft', 'New Editor Group to the Left'),
            f1: true,
            category: Categories.View,
        }, 2 /* GroupDirection.LEFT */);
    }
}
export class NewEditorGroupRightAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupRight',
            title: localize2('newGroupRight', 'New Editor Group to the Right'),
            f1: true,
            category: Categories.View,
        }, 3 /* GroupDirection.RIGHT */);
    }
}
export class NewEditorGroupAboveAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupAbove',
            title: localize2('newGroupAbove', 'New Editor Group Above'),
            f1: true,
            category: Categories.View,
        }, 0 /* GroupDirection.UP */);
    }
}
export class NewEditorGroupBelowAction extends AbstractCreateEditorGroupAction {
    constructor() {
        super({
            id: 'workbench.action.newGroupBelow',
            title: localize2('newGroupBelow', 'New Editor Group Below'),
            f1: true,
            category: Categories.View,
        }, 1 /* GroupDirection.DOWN */);
    }
}
export class ToggleEditorTypeAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorType',
            title: localize2('toggleEditorType', 'Toggle Editor Type'),
            f1: true,
            category: Categories.View,
            precondition: ActiveEditorAvailableEditorIdsContext,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorResolverService = accessor.get(IEditorResolverService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            return;
        }
        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
        if (!activeEditorResource) {
            return;
        }
        const editorIds = editorResolverService
            .getEditors(activeEditorResource)
            .map((editor) => editor.id)
            .filter((id) => id !== activeEditorPane.input.editorId);
        if (editorIds.length === 0) {
            return;
        }
        // Replace the current editor with the next avaiable editor type
        await editorService.replaceEditors([
            {
                editor: activeEditorPane.input,
                replacement: {
                    resource: activeEditorResource,
                    options: {
                        override: editorIds[0],
                    },
                },
            },
        ], activeEditorPane.group);
    }
}
export class ReOpenInTextEditorAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.reopenTextEditor',
            title: localize2('reopenTextEditor', 'Reopen Editor with Text Editor'),
            f1: true,
            category: Categories.View,
            precondition: ActiveEditorAvailableEditorIdsContext,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!activeEditorPane) {
            return;
        }
        const activeEditorResource = EditorResourceAccessor.getCanonicalUri(activeEditorPane.input);
        if (!activeEditorResource) {
            return;
        }
        // Replace the current editor with the text editor
        await editorService.replaceEditors([
            {
                editor: activeEditorPane.input,
                replacement: {
                    resource: activeEditorResource,
                    options: {
                        override: DEFAULT_EDITOR_ASSOCIATION.id,
                    },
                },
            },
        ], activeEditorPane.group);
    }
}
class BaseMoveCopyEditorToNewWindowAction extends Action2 {
    constructor(id, title, keybinding, move) {
        super({
            id,
            title,
            category: Categories.View,
            precondition: ActiveEditorContext,
            keybinding,
            f1: true,
        });
        this.move = move;
    }
    async run(accessor, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const auxiliaryEditorPart = await editorGroupsService.createAuxiliaryEditorPart();
        const { group, editors } = resolvedContext.groupedEditors[0]; // only single group supported for move/copy for now
        const editorsWithOptions = prepareMoveCopyEditors(group, editors, resolvedContext.preserveFocus);
        if (this.move) {
            group.moveEditors(editorsWithOptions, auxiliaryEditorPart.activeGroup);
        }
        else {
            group.copyEditors(editorsWithOptions, auxiliaryEditorPart.activeGroup);
        }
        auxiliaryEditorPart.activeGroup.focus();
    }
}
export class MoveEditorToNewWindowAction extends BaseMoveCopyEditorToNewWindowAction {
    constructor() {
        super(MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('moveEditorToNewWindow', 'Move Editor into New Window'),
            mnemonicTitle: localize({ key: 'miMoveEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Move Editor into New Window'),
        }, undefined, true);
    }
}
export class CopyEditorToNewindowAction extends BaseMoveCopyEditorToNewWindowAction {
    constructor() {
        super(COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('copyEditorToNewWindow', 'Copy Editor into New Window'),
            mnemonicTitle: localize({ key: 'miCopyEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Copy Editor into New Window'),
        }, {
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 45 /* KeyCode.KeyO */),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        }, false);
    }
}
class BaseMoveCopyEditorGroupToNewWindowAction extends Action2 {
    constructor(id, title, move) {
        super({
            id,
            title,
            category: Categories.View,
            f1: true,
        });
        this.move = move;
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const activeGroup = editorGroupService.activeGroup;
        const auxiliaryEditorPart = await editorGroupService.createAuxiliaryEditorPart();
        editorGroupService.mergeGroup(activeGroup, auxiliaryEditorPart.activeGroup, {
            mode: this.move ? 1 /* MergeGroupMode.MOVE_EDITORS */ : 0 /* MergeGroupMode.COPY_EDITORS */,
        });
        auxiliaryEditorPart.activeGroup.focus();
    }
}
export class MoveEditorGroupToNewWindowAction extends BaseMoveCopyEditorGroupToNewWindowAction {
    constructor() {
        super(MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('moveEditorGroupToNewWindow', 'Move Editor Group into New Window'),
            mnemonicTitle: localize({ key: 'miMoveEditorGroupToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Move Editor Group into New Window'),
        }, true);
    }
}
export class CopyEditorGroupToNewWindowAction extends BaseMoveCopyEditorGroupToNewWindowAction {
    constructor() {
        super(COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, {
            ...localize2('copyEditorGroupToNewWindow', 'Copy Editor Group into New Window'),
            mnemonicTitle: localize({ key: 'miCopyEditorGroupToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Copy Editor Group into New Window'),
        }, false);
    }
}
export class RestoreEditorsToMainWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.restoreEditorsToMainWindow',
            title: {
                ...localize2('restoreEditorsToMainWindow', 'Restore Editors into Main Window'),
                mnemonicTitle: localize({ key: 'miRestoreEditorsToMainWindow', comment: ['&& denotes a mnemonic'] }, '&&Restore Editors into Main Window'),
            },
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        editorGroupService.mergeAllGroups(editorGroupService.mainPart.activeGroup);
    }
}
export class NewEmptyEditorWindowAction extends Action2 {
    constructor() {
        super({
            id: NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID,
            title: {
                ...localize2('newEmptyEditorWindow', 'New Empty Editor Window'),
                mnemonicTitle: localize({ key: 'miNewEmptyEditorWindow', comment: ['&& denotes a mnemonic'] }, '&&New Empty Editor Window'),
            },
            f1: true,
            category: Categories.View,
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const auxiliaryEditorPart = await editorGroupService.createAuxiliaryEditorPart();
        auxiliaryEditorPart.activeGroup.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFPTiwwQkFBMEIsRUFFMUIsc0JBQXNCLEdBQ3RCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFZLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLDZCQUE2QixFQUU3QixpQkFBaUIsRUFDakIsa0JBQWtCLEVBQ2xCLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLCtCQUErQixFQUMvQix1QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLFlBQVksRUFDWiw0QkFBNEIsRUFDNUIsc0NBQXNDLEVBQ3RDLHNDQUFzQyxFQUN0Qyw0Q0FBNEMsRUFDNUMsNENBQTRDLEVBQzVDLGtDQUFrQyxJQUFJLGtDQUFrQyxHQUN4RSxNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFDTixvQkFBb0IsRUFLcEIsaUNBQWlDLEdBTWpDLE1BQU0sd0RBQXdELENB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