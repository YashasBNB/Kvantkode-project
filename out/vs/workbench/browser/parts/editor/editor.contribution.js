/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { localize, localize2 } from '../../../../nls.js';
import { EditorPaneDescriptor } from '../../editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { TextCompareEditorActiveContext, ActiveEditorPinnedContext, EditorGroupEditorsCountContext, ActiveEditorStickyContext, ActiveEditorAvailableEditorIdsContext, EditorPartMultipleEditorGroupsContext, ActiveEditorDirtyContext, ActiveEditorGroupLockedContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, EditorTabsVisibleContext, ActiveEditorLastInGroupContext, EditorPartMaximizedEditorGroupContext, MultipleEditorGroupsContext, InEditorZenModeContext, IsAuxiliaryEditorPartContext, ActiveCompareEditorCanSwapContext, MultipleEditorsSelectedInGroupContext, } from '../../../common/contextkeys.js';
import { SideBySideEditorInput, SideBySideEditorInputSerializer, } from '../../../common/editor/sideBySideEditorInput.js';
import { TextResourceEditor } from './textResourceEditor.js';
import { SideBySideEditor } from './sideBySideEditor.js';
import { DiffEditorInput, DiffEditorInputSerializer, } from '../../../common/editor/diffEditorInput.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { TextDiffEditor } from './textDiffEditor.js';
import { BinaryResourceDiffEditor } from './binaryDiffEditor.js';
import { ChangeEncodingAction, ChangeEOLAction, ChangeLanguageAction, EditorStatusContribution, } from './editorStatus.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuRegistry, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { CloseEditorsInOtherGroupsAction, CloseAllEditorsAction, MoveGroupLeftAction, MoveGroupRightAction, SplitEditorAction, JoinTwoGroupsAction, RevertAndCloseEditorAction, NavigateBetweenGroupsAction, FocusActiveGroupAction, FocusFirstGroupAction, ResetGroupSizesAction, MinimizeOtherGroupsAction, FocusPreviousGroup, FocusNextGroup, CloseLeftEditorsInGroupAction, OpenNextEditor, OpenPreviousEditor, NavigateBackwardsAction, NavigateForwardAction, NavigatePreviousAction, ReopenClosedEditorAction, QuickAccessPreviousRecentlyUsedEditorInGroupAction, QuickAccessPreviousEditorFromHistoryAction, ShowAllEditorsByAppearanceAction, ClearEditorHistoryAction, MoveEditorRightInGroupAction, OpenNextEditorInGroup, OpenPreviousEditorInGroup, OpenNextRecentlyUsedEditorAction, OpenPreviousRecentlyUsedEditorAction, MoveEditorToPreviousGroupAction, MoveEditorToNextGroupAction, MoveEditorToFirstGroupAction, MoveEditorLeftInGroupAction, ClearRecentFilesAction, OpenLastEditorInGroup, ShowEditorsInActiveGroupByMostRecentlyUsedAction, MoveEditorToLastGroupAction, OpenFirstEditorInGroup, MoveGroupUpAction, MoveGroupDownAction, FocusLastGroupAction, SplitEditorLeftAction, SplitEditorRightAction, SplitEditorUpAction, SplitEditorDownAction, MoveEditorToLeftGroupAction, MoveEditorToRightGroupAction, MoveEditorToAboveGroupAction, MoveEditorToBelowGroupAction, CloseAllEditorGroupsAction, JoinAllGroupsAction, FocusLeftGroup, FocusAboveGroup, FocusRightGroup, FocusBelowGroup, EditorLayoutSingleAction, EditorLayoutTwoColumnsAction, EditorLayoutThreeColumnsAction, EditorLayoutTwoByTwoGridAction, EditorLayoutTwoRowsAction, EditorLayoutThreeRowsAction, EditorLayoutTwoColumnsBottomAction, EditorLayoutTwoRowsRightAction, NewEditorGroupLeftAction, NewEditorGroupRightAction, NewEditorGroupAboveAction, NewEditorGroupBelowAction, SplitEditorOrthogonalAction, CloseEditorInAllGroupsAction, NavigateToLastEditLocationAction, ToggleGroupSizesAction, ShowAllEditorsByMostRecentlyUsedAction, QuickAccessPreviousRecentlyUsedEditorAction, OpenPreviousRecentlyUsedEditorInGroupAction, OpenNextRecentlyUsedEditorInGroupAction, QuickAccessLeastRecentlyUsedEditorAction, QuickAccessLeastRecentlyUsedEditorInGroupAction, ReOpenInTextEditorAction, DuplicateGroupDownAction, DuplicateGroupLeftAction, DuplicateGroupRightAction, DuplicateGroupUpAction, ToggleEditorTypeAction, SplitEditorToAboveGroupAction, SplitEditorToBelowGroupAction, SplitEditorToFirstGroupAction, SplitEditorToLastGroupAction, SplitEditorToLeftGroupAction, SplitEditorToNextGroupAction, SplitEditorToPreviousGroupAction, SplitEditorToRightGroupAction, NavigateForwardInEditsAction, NavigateBackwardsInEditsAction, NavigateForwardInNavigationsAction, NavigateBackwardsInNavigationsAction, NavigatePreviousInNavigationsAction, NavigatePreviousInEditsAction, NavigateToLastNavigationLocationAction, MaximizeGroupHideSidebarAction, MoveEditorToNewWindowAction, CopyEditorToNewindowAction, RestoreEditorsToMainWindowAction, ToggleMaximizeEditorGroupAction, MinimizeOtherGroupsHideSidebarAction, CopyEditorGroupToNewWindowAction, MoveEditorGroupToNewWindowAction, NewEmptyEditorWindowAction, } from './editorActions.js';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID, CLOSE_EDITORS_IN_GROUP_COMMAND_ID, CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID, CLOSE_EDITOR_COMMAND_ID, CLOSE_EDITOR_GROUP_COMMAND_ID, CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, CLOSE_PINNED_EDITOR_COMMAND_ID, CLOSE_SAVED_EDITORS_COMMAND_ID, KEEP_EDITOR_COMMAND_ID, PIN_EDITOR_COMMAND_ID, SHOW_EDITORS_IN_GROUP, SPLIT_EDITOR_DOWN, SPLIT_EDITOR_LEFT, SPLIT_EDITOR_RIGHT, SPLIT_EDITOR_UP, TOGGLE_KEEP_EDITORS_COMMAND_ID, UNPIN_EDITOR_COMMAND_ID, setup as registerEditorCommands, REOPEN_WITH_COMMAND_ID, TOGGLE_LOCK_GROUP_COMMAND_ID, UNLOCK_GROUP_COMMAND_ID, SPLIT_EDITOR_IN_GROUP, JOIN_EDITOR_IN_GROUP, FOCUS_FIRST_SIDE_EDITOR, FOCUS_SECOND_SIDE_EDITOR, TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT, LOCK_GROUP_COMMAND_ID, SPLIT_EDITOR, TOGGLE_MAXIMIZE_EDITOR_GROUP, MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID, MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID, NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID, } from './editorCommands.js';
import { GOTO_NEXT_CHANGE, GOTO_PREVIOUS_CHANGE, TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE, TOGGLE_DIFF_SIDE_BY_SIDE, DIFF_SWAP_SIDES, } from './diffEditorCommands.js';
import { inQuickPickContext, getQuickNavigateHandler } from '../../quickaccess.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { FloatingEditorClickMenu } from '../../codeeditor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorAutoSave } from './editorAutoSave.js';
import { Extensions as QuickAccessExtensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess, AllEditorsByAppearanceQuickAccess, AllEditorsByMostRecentlyUsedQuickAccess, } from './editorQuickAccess.js';
import { FileAccess } from '../../../../base/common/network.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { UntitledTextEditorInputSerializer, UntitledTextEditorWorkingCopyEditorHandler, } from '../../../services/untitled/common/untitledTextEditorHandler.js';
import { DynamicEditorConfigurations } from './editorConfiguration.js';
import { ConfigureEditorAction, ConfigureEditorTabsAction, EditorActionsDefaultAction, EditorActionsTitleBarAction, HideEditorActionsAction, HideEditorTabsAction, ShowMultipleEditorTabsAction, ShowSingleEditorTabAction, ZenHideEditorTabsAction, ZenShowMultipleEditorTabsAction, ZenShowSingleEditorTabAction, } from '../../actions/layoutActions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { getFontSnippets } from '../../../../base/browser/fonts.js';
import { registerEditorFontConfigurations } from '../../../../editor/common/config/editorConfigurationSchema.js';
//#region Editor Registrations
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextResourceEditor, TextResourceEditor.ID, localize('textEditor', 'Text Editor')), [new SyncDescriptor(UntitledTextEditorInput), new SyncDescriptor(TextResourceEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextDiffEditor, TextDiffEditor.ID, localize('textDiffEditor', 'Text Diff Editor')), [new SyncDescriptor(DiffEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BinaryResourceDiffEditor, BinaryResourceDiffEditor.ID, localize('binaryDiffEditor', 'Binary Diff Editor')), [new SyncDescriptor(DiffEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SideBySideEditor, SideBySideEditor.ID, localize('sideBySideEditor', 'Side by Side Editor')), [new SyncDescriptor(SideBySideEditorInput)]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(UntitledTextEditorInput.ID, UntitledTextEditorInputSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(SideBySideEditorInput.ID, SideBySideEditorInputSerializer);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(DiffEditorInput.ID, DiffEditorInputSerializer);
//#endregion
//#region Workbench Contributions
registerWorkbenchContribution2(EditorAutoSave.ID, EditorAutoSave, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(EditorStatusContribution.ID, EditorStatusContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(UntitledTextEditorWorkingCopyEditorHandler.ID, UntitledTextEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(DynamicEditorConfigurations.ID, DynamicEditorConfigurations, 2 /* WorkbenchPhase.BlockRestore */);
registerEditorContribution(FloatingEditorClickMenu.ID, FloatingEditorClickMenu, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//#endregion
//#region Quick Access
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
const editorPickerContextKey = 'inEditorsPicker';
const editorPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(editorPickerContextKey));
quickAccessRegistry.registerQuickAccessProvider({
    ctor: ActiveGroupEditorsByMostRecentlyUsedQuickAccess,
    prefix: ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX,
    contextKey: editorPickerContextKey,
    placeholder: localize('editorQuickAccessPlaceholder', 'Type the name of an editor to open it.'),
    helpEntries: [
        {
            description: localize('activeGroupEditorsByMostRecentlyUsedQuickAccess', 'Show Editors in Active Group by Most Recently Used'),
            commandId: ShowEditorsInActiveGroupByMostRecentlyUsedAction.ID,
        },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AllEditorsByAppearanceQuickAccess,
    prefix: AllEditorsByAppearanceQuickAccess.PREFIX,
    contextKey: editorPickerContextKey,
    placeholder: localize('editorQuickAccessPlaceholder', 'Type the name of an editor to open it.'),
    helpEntries: [
        {
            description: localize('allEditorsByAppearanceQuickAccess', 'Show All Opened Editors By Appearance'),
            commandId: ShowAllEditorsByAppearanceAction.ID,
        },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AllEditorsByMostRecentlyUsedQuickAccess,
    prefix: AllEditorsByMostRecentlyUsedQuickAccess.PREFIX,
    contextKey: editorPickerContextKey,
    placeholder: localize('editorQuickAccessPlaceholder', 'Type the name of an editor to open it.'),
    helpEntries: [
        {
            description: localize('allEditorsByMostRecentlyUsedQuickAccess', 'Show All Opened Editors By Most Recently Used'),
            commandId: ShowAllEditorsByMostRecentlyUsedAction.ID,
        },
    ],
});
//#endregion
//#region Actions & Commands
registerAction2(ChangeLanguageAction);
registerAction2(ChangeEOLAction);
registerAction2(ChangeEncodingAction);
registerAction2(NavigateForwardAction);
registerAction2(NavigateBackwardsAction);
registerAction2(OpenNextEditor);
registerAction2(OpenPreviousEditor);
registerAction2(OpenNextEditorInGroup);
registerAction2(OpenPreviousEditorInGroup);
registerAction2(OpenFirstEditorInGroup);
registerAction2(OpenLastEditorInGroup);
registerAction2(OpenNextRecentlyUsedEditorAction);
registerAction2(OpenPreviousRecentlyUsedEditorAction);
registerAction2(OpenNextRecentlyUsedEditorInGroupAction);
registerAction2(OpenPreviousRecentlyUsedEditorInGroupAction);
registerAction2(ReopenClosedEditorAction);
registerAction2(ClearRecentFilesAction);
registerAction2(ShowAllEditorsByAppearanceAction);
registerAction2(ShowAllEditorsByMostRecentlyUsedAction);
registerAction2(ShowEditorsInActiveGroupByMostRecentlyUsedAction);
registerAction2(CloseAllEditorsAction);
registerAction2(CloseAllEditorGroupsAction);
registerAction2(CloseLeftEditorsInGroupAction);
registerAction2(CloseEditorsInOtherGroupsAction);
registerAction2(CloseEditorInAllGroupsAction);
registerAction2(RevertAndCloseEditorAction);
registerAction2(SplitEditorAction);
registerAction2(SplitEditorOrthogonalAction);
registerAction2(SplitEditorLeftAction);
registerAction2(SplitEditorRightAction);
registerAction2(SplitEditorUpAction);
registerAction2(SplitEditorDownAction);
registerAction2(JoinTwoGroupsAction);
registerAction2(JoinAllGroupsAction);
registerAction2(NavigateBetweenGroupsAction);
registerAction2(ResetGroupSizesAction);
registerAction2(ToggleGroupSizesAction);
registerAction2(MaximizeGroupHideSidebarAction);
registerAction2(ToggleMaximizeEditorGroupAction);
registerAction2(MinimizeOtherGroupsAction);
registerAction2(MinimizeOtherGroupsHideSidebarAction);
registerAction2(MoveEditorLeftInGroupAction);
registerAction2(MoveEditorRightInGroupAction);
registerAction2(MoveGroupLeftAction);
registerAction2(MoveGroupRightAction);
registerAction2(MoveGroupUpAction);
registerAction2(MoveGroupDownAction);
registerAction2(DuplicateGroupLeftAction);
registerAction2(DuplicateGroupRightAction);
registerAction2(DuplicateGroupUpAction);
registerAction2(DuplicateGroupDownAction);
registerAction2(MoveEditorToPreviousGroupAction);
registerAction2(MoveEditorToNextGroupAction);
registerAction2(MoveEditorToFirstGroupAction);
registerAction2(MoveEditorToLastGroupAction);
registerAction2(MoveEditorToLeftGroupAction);
registerAction2(MoveEditorToRightGroupAction);
registerAction2(MoveEditorToAboveGroupAction);
registerAction2(MoveEditorToBelowGroupAction);
registerAction2(SplitEditorToPreviousGroupAction);
registerAction2(SplitEditorToNextGroupAction);
registerAction2(SplitEditorToFirstGroupAction);
registerAction2(SplitEditorToLastGroupAction);
registerAction2(SplitEditorToLeftGroupAction);
registerAction2(SplitEditorToRightGroupAction);
registerAction2(SplitEditorToAboveGroupAction);
registerAction2(SplitEditorToBelowGroupAction);
registerAction2(FocusActiveGroupAction);
registerAction2(FocusFirstGroupAction);
registerAction2(FocusLastGroupAction);
registerAction2(FocusPreviousGroup);
registerAction2(FocusNextGroup);
registerAction2(FocusLeftGroup);
registerAction2(FocusRightGroup);
registerAction2(FocusAboveGroup);
registerAction2(FocusBelowGroup);
registerAction2(NewEditorGroupLeftAction);
registerAction2(NewEditorGroupRightAction);
registerAction2(NewEditorGroupAboveAction);
registerAction2(NewEditorGroupBelowAction);
registerAction2(NavigatePreviousAction);
registerAction2(NavigateForwardInEditsAction);
registerAction2(NavigateBackwardsInEditsAction);
registerAction2(NavigatePreviousInEditsAction);
registerAction2(NavigateToLastEditLocationAction);
registerAction2(NavigateForwardInNavigationsAction);
registerAction2(NavigateBackwardsInNavigationsAction);
registerAction2(NavigatePreviousInNavigationsAction);
registerAction2(NavigateToLastNavigationLocationAction);
registerAction2(ClearEditorHistoryAction);
registerAction2(EditorLayoutSingleAction);
registerAction2(EditorLayoutTwoColumnsAction);
registerAction2(EditorLayoutThreeColumnsAction);
registerAction2(EditorLayoutTwoRowsAction);
registerAction2(EditorLayoutThreeRowsAction);
registerAction2(EditorLayoutTwoByTwoGridAction);
registerAction2(EditorLayoutTwoRowsRightAction);
registerAction2(EditorLayoutTwoColumnsBottomAction);
registerAction2(ToggleEditorTypeAction);
registerAction2(ReOpenInTextEditorAction);
registerAction2(QuickAccessPreviousRecentlyUsedEditorAction);
registerAction2(QuickAccessLeastRecentlyUsedEditorAction);
registerAction2(QuickAccessPreviousRecentlyUsedEditorInGroupAction);
registerAction2(QuickAccessLeastRecentlyUsedEditorInGroupAction);
registerAction2(QuickAccessPreviousEditorFromHistoryAction);
registerAction2(MoveEditorToNewWindowAction);
registerAction2(CopyEditorToNewindowAction);
registerAction2(MoveEditorGroupToNewWindowAction);
registerAction2(CopyEditorGroupToNewWindowAction);
registerAction2(RestoreEditorsToMainWindowAction);
registerAction2(NewEmptyEditorWindowAction);
const quickAccessNavigateNextInEditorPickerId = 'workbench.action.quickOpenNavigateNextInEditorPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigateNextInEditorPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInEditorPickerId, true),
    when: editorPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 2 /* KeyCode.Tab */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 2 /* KeyCode.Tab */ },
});
const quickAccessNavigatePreviousInEditorPickerId = 'workbench.action.quickOpenNavigatePreviousInEditorPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickAccessNavigatePreviousInEditorPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInEditorPickerId, false),
    when: editorPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */ },
});
registerEditorCommands();
//#endregion
//#region Menus
// macOS: Touchbar
if (isMacintosh) {
    MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
        command: {
            id: NavigateBackwardsAction.ID,
            title: NavigateBackwardsAction.LABEL,
            icon: { dark: FileAccess.asFileUri('vs/workbench/browser/parts/editor/media/back-tb.png') },
        },
        group: 'navigation',
        order: 0,
    });
    MenuRegistry.appendMenuItem(MenuId.TouchBarContext, {
        command: {
            id: NavigateForwardAction.ID,
            title: NavigateForwardAction.LABEL,
            icon: {
                dark: FileAccess.asFileUri('vs/workbench/browser/parts/editor/media/forward-tb.png'),
            },
        },
        group: 'navigation',
        order: 1,
    });
}
// Empty Editor Group Toolbar
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroup, {
    command: {
        id: LOCK_GROUP_COMMAND_ID,
        title: localize('lockGroupAction', 'Lock Group'),
        icon: Codicon.unlock,
    },
    group: 'navigation',
    order: 10,
    when: ContextKeyExpr.and(IsAuxiliaryEditorPartContext, ActiveEditorGroupLockedContext.toNegated()),
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroup, {
    command: {
        id: UNLOCK_GROUP_COMMAND_ID,
        title: localize('unlockGroupAction', 'Unlock Group'),
        icon: Codicon.lock,
        toggled: ContextKeyExpr.true(),
    },
    group: 'navigation',
    order: 10,
    when: ActiveEditorGroupLockedContext,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroup, {
    command: {
        id: CLOSE_EDITOR_GROUP_COMMAND_ID,
        title: localize('closeGroupAction', 'Close Group'),
        icon: Codicon.close,
    },
    group: 'navigation',
    order: 20,
    when: ContextKeyExpr.or(IsAuxiliaryEditorPartContext, EditorPartMultipleEditorGroupsContext),
});
// Empty Editor Group Context Menu
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: SPLIT_EDITOR_UP, title: localize('splitUp', 'Split Up') },
    group: '2_split',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: SPLIT_EDITOR_DOWN, title: localize('splitDown', 'Split Down') },
    group: '2_split',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: SPLIT_EDITOR_LEFT, title: localize('splitLeft', 'Split Left') },
    group: '2_split',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: SPLIT_EDITOR_RIGHT, title: localize('splitRight', 'Split Right') },
    group: '2_split',
    order: 40,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID, title: localize('newWindow', 'New Window') },
    group: '3_window',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: {
        id: TOGGLE_LOCK_GROUP_COMMAND_ID,
        title: localize('toggleLockGroup', 'Lock Group'),
        toggled: ActiveEditorGroupLockedContext,
    },
    group: '4_lock',
    order: 10,
    when: IsAuxiliaryEditorPartContext.toNegated() /* already a primary action for aux windows */,
});
MenuRegistry.appendMenuItem(MenuId.EmptyEditorGroupContext, {
    command: { id: CLOSE_EDITOR_GROUP_COMMAND_ID, title: localize('close', 'Close') },
    group: '5_close',
    order: 10,
    when: MultipleEditorGroupsContext,
});
// Editor Tab Container Context Menu
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: { id: SPLIT_EDITOR_UP, title: localize('splitUp', 'Split Up') },
    group: '2_split',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: { id: SPLIT_EDITOR_DOWN, title: localize('splitDown', 'Split Down') },
    group: '2_split',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: { id: SPLIT_EDITOR_LEFT, title: localize('splitLeft', 'Split Left') },
    group: '2_split',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: { id: SPLIT_EDITOR_RIGHT, title: localize('splitRight', 'Split Right') },
    group: '2_split',
    order: 40,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: {
        id: MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID,
        title: localize('moveEditorGroupToNewWindow', 'Move into New Window'),
    },
    group: '3_window',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: {
        id: COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID,
        title: localize('copyEditorGroupToNewWindow', 'Copy into New Window'),
    },
    group: '3_window',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    submenu: MenuId.EditorTabsBarShowTabsSubmenu,
    title: localize('tabBar', 'Tab Bar'),
    group: '4_config',
    order: 10,
    when: InEditorZenModeContext.negate(),
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsSubmenu, {
    command: {
        id: ShowMultipleEditorTabsAction.ID,
        title: localize('multipleTabs', 'Multiple Tabs'),
        toggled: ContextKeyExpr.equals('config.workbench.editor.showTabs', 'multiple'),
    },
    group: '1_config',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsSubmenu, {
    command: {
        id: ShowSingleEditorTabAction.ID,
        title: localize('singleTab', 'Single Tab'),
        toggled: ContextKeyExpr.equals('config.workbench.editor.showTabs', 'single'),
    },
    group: '1_config',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsSubmenu, {
    command: {
        id: HideEditorTabsAction.ID,
        title: localize('hideTabs', 'Hidden'),
        toggled: ContextKeyExpr.equals('config.workbench.editor.showTabs', 'none'),
    },
    group: '1_config',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    submenu: MenuId.EditorTabsBarShowTabsZenModeSubmenu,
    title: localize('tabBar', 'Tab Bar'),
    group: '4_config',
    order: 10,
    when: InEditorZenModeContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsZenModeSubmenu, {
    command: {
        id: ZenShowMultipleEditorTabsAction.ID,
        title: localize('multipleTabs', 'Multiple Tabs'),
        toggled: ContextKeyExpr.equals('config.zenMode.showTabs', 'multiple'),
    },
    group: '1_config',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsZenModeSubmenu, {
    command: {
        id: ZenShowSingleEditorTabAction.ID,
        title: localize('singleTab', 'Single Tab'),
        toggled: ContextKeyExpr.equals('config.zenMode.showTabs', 'single'),
    },
    group: '1_config',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarShowTabsZenModeSubmenu, {
    command: {
        id: ZenHideEditorTabsAction.ID,
        title: localize('hideTabs', 'Hidden'),
        toggled: ContextKeyExpr.equals('config.zenMode.showTabs', 'none'),
    },
    group: '1_config',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    submenu: MenuId.EditorActionsPositionSubmenu,
    title: localize('editorActionsPosition', 'Editor Actions Position'),
    group: '4_config',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorActionsPositionSubmenu, {
    command: {
        id: EditorActionsDefaultAction.ID,
        title: localize('tabBar', 'Tab Bar'),
        toggled: ContextKeyExpr.equals('config.workbench.editor.editorActionsLocation', 'default'),
    },
    group: '1_config',
    order: 10,
    when: ContextKeyExpr.equals('config.workbench.editor.showTabs', 'none').negate(),
});
MenuRegistry.appendMenuItem(MenuId.EditorActionsPositionSubmenu, {
    command: {
        id: EditorActionsTitleBarAction.ID,
        title: localize('titleBar', 'Title Bar'),
        toggled: ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.editor.editorActionsLocation', 'titleBar'), ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.editor.showTabs', 'none'), ContextKeyExpr.equals('config.workbench.editor.editorActionsLocation', 'default'))),
    },
    group: '1_config',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorActionsPositionSubmenu, {
    command: {
        id: HideEditorActionsAction.ID,
        title: localize('hidden', 'Hidden'),
        toggled: ContextKeyExpr.equals('config.workbench.editor.editorActionsLocation', 'hidden'),
    },
    group: '1_config',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EditorTabsBarContext, {
    command: { id: ConfigureEditorTabsAction.ID, title: localize('configureTabs', 'Configure Tabs') },
    group: '9_configure',
    order: 10,
});
// Editor Title Context Menu
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: CLOSE_EDITOR_COMMAND_ID, title: localize('close', 'Close') },
    group: '1_close',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        title: localize('closeOthers', 'Close Others'),
        precondition: EditorGroupEditorsCountContext.notEqualsTo('1'),
    },
    group: '1_close',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
        title: localize('closeRight', 'Close to the Right'),
        precondition: ContextKeyExpr.and(ActiveEditorLastInGroupContext.toNegated(), MultipleEditorsSelectedInGroupContext.negate()),
    },
    group: '1_close',
    order: 30,
    when: EditorTabsVisibleContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: CLOSE_SAVED_EDITORS_COMMAND_ID, title: localize('closeAllSaved', 'Close Saved') },
    group: '1_close',
    order: 40,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID, title: localize('closeAll', 'Close All') },
    group: '1_close',
    order: 50,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: REOPEN_WITH_COMMAND_ID, title: localize('reopenWith', 'Reopen Editor With...') },
    group: '1_open',
    order: 10,
    when: ActiveEditorAvailableEditorIdsContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: KEEP_EDITOR_COMMAND_ID,
        title: localize('keepOpen', 'Keep Open'),
        precondition: ActiveEditorPinnedContext.toNegated(),
    },
    group: '3_preview',
    order: 10,
    when: ContextKeyExpr.has('config.workbench.editor.enablePreview'),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: PIN_EDITOR_COMMAND_ID, title: localize('pin', 'Pin') },
    group: '3_preview',
    order: 20,
    when: ActiveEditorStickyContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: UNPIN_EDITOR_COMMAND_ID, title: localize('unpin', 'Unpin') },
    group: '3_preview',
    order: 20,
    when: ActiveEditorStickyContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: SPLIT_EDITOR_UP, title: localize('splitUp', 'Split Up') },
    group: '5_split',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: SPLIT_EDITOR_DOWN, title: localize('splitDown', 'Split Down') },
    group: '5_split',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: SPLIT_EDITOR_LEFT, title: localize('splitLeft', 'Split Left') },
    group: '5_split',
    order: 30,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: { id: SPLIT_EDITOR_RIGHT, title: localize('splitRight', 'Split Right') },
    group: '5_split',
    order: 40,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: SPLIT_EDITOR_IN_GROUP,
        title: localize('splitInGroup', 'Split in Group'),
        precondition: MultipleEditorsSelectedInGroupContext.negate(),
    },
    group: '6_split_in_group',
    order: 10,
    when: ActiveEditorCanSplitInGroupContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: JOIN_EDITOR_IN_GROUP,
        title: localize('joinInGroup', 'Join in Group'),
        precondition: MultipleEditorsSelectedInGroupContext.negate(),
    },
    group: '6_split_in_group',
    order: 10,
    when: SideBySideEditorActiveContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID,
        title: localize('moveToNewWindow', 'Move into New Window'),
    },
    group: '7_new_window',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    command: {
        id: COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID,
        title: localize('copyToNewWindow', 'Copy into New Window'),
    },
    group: '7_new_window',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    submenu: MenuId.EditorTitleContextShare,
    title: localize('share', 'Share'),
    group: '11_share',
    order: -1,
    when: MultipleEditorsSelectedInGroupContext.negate(),
});
// Editor Title Menu
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_DIFF_SIDE_BY_SIDE,
        title: localize('inlineView', 'Inline View'),
        toggled: ContextKeyExpr.equals('config.diffEditor.renderSideBySide', false),
    },
    group: '1_diff',
    order: 10,
    when: ContextKeyExpr.has('isInDiffEditor'),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: SHOW_EDITORS_IN_GROUP,
        title: localize('showOpenedEditors', 'Show Opened Editors'),
    },
    group: '3_open',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: { id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID, title: localize('closeAll', 'Close All') },
    group: '5_close',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: { id: CLOSE_SAVED_EDITORS_COMMAND_ID, title: localize('closeAllSaved', 'Close Saved') },
    group: '5_close',
    order: 20,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_KEEP_EDITORS_COMMAND_ID,
        title: localize('togglePreviewMode', 'Enable Preview Editors'),
        toggled: ContextKeyExpr.has('config.workbench.editor.enablePreview'),
    },
    group: '7_settings',
    order: 10,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: { id: TOGGLE_MAXIMIZE_EDITOR_GROUP, title: localize('maximizeGroup', 'Maximize Group') },
    group: '8_group_operations',
    order: 5,
    when: ContextKeyExpr.and(EditorPartMaximizedEditorGroupContext.negate(), EditorPartMultipleEditorGroupsContext),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_MAXIMIZE_EDITOR_GROUP,
        title: localize('unmaximizeGroup', 'Unmaximize Group'),
    },
    group: '8_group_operations',
    order: 5,
    when: EditorPartMaximizedEditorGroupContext,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_LOCK_GROUP_COMMAND_ID,
        title: localize('lockGroup', 'Lock Group'),
        toggled: ActiveEditorGroupLockedContext,
    },
    group: '8_group_operations',
    order: 10,
    when: IsAuxiliaryEditorPartContext.toNegated() /* already a primary action for aux windows */,
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: ConfigureEditorAction.ID,
        title: localize('configureEditors', 'Configure Editors'),
    },
    group: '9_configure',
    order: 10,
});
function appendEditorToolItem(primary, when, order, alternative, precondition) {
    const item = {
        command: {
            id: primary.id,
            title: primary.title,
            icon: primary.icon,
            toggled: primary.toggled,
            precondition,
        },
        group: 'navigation',
        when,
        order,
    };
    if (alternative) {
        item.alt = {
            id: alternative.id,
            title: alternative.title,
            icon: alternative.icon,
        };
    }
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, item);
}
const SPLIT_ORDER = 100000; // towards the end
const CLOSE_ORDER = 1000000; // towards the far end
// Editor Title Menu: Split Editor
appendEditorToolItem({
    id: SPLIT_EDITOR,
    title: localize('splitEditorRight', 'Split Editor Right'),
    icon: Codicon.splitHorizontal,
}, ContextKeyExpr.not('splitEditorsVertically'), SPLIT_ORDER, {
    id: SPLIT_EDITOR_DOWN,
    title: localize('splitEditorDown', 'Split Editor Down'),
    icon: Codicon.splitVertical,
});
appendEditorToolItem({
    id: SPLIT_EDITOR,
    title: localize('splitEditorDown', 'Split Editor Down'),
    icon: Codicon.splitVertical,
}, ContextKeyExpr.has('splitEditorsVertically'), SPLIT_ORDER, {
    id: SPLIT_EDITOR_RIGHT,
    title: localize('splitEditorRight', 'Split Editor Right'),
    icon: Codicon.splitHorizontal,
});
// Side by side: layout
appendEditorToolItem({
    id: TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT,
    title: localize('toggleSplitEditorInGroupLayout', 'Toggle Layout'),
    icon: Codicon.editorLayout,
}, SideBySideEditorActiveContext, SPLIT_ORDER - 1);
// Editor Title Menu: Close (tabs disabled, normal editor)
appendEditorToolItem({
    id: CLOSE_EDITOR_COMMAND_ID,
    title: localize('close', 'Close'),
    icon: Codicon.close,
}, ContextKeyExpr.and(EditorTabsVisibleContext.toNegated(), ActiveEditorDirtyContext.toNegated(), ActiveEditorStickyContext.toNegated()), CLOSE_ORDER, {
    id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
    title: localize('closeAll', 'Close All'),
    icon: Codicon.closeAll,
});
// Editor Title Menu: Close (tabs disabled, dirty editor)
appendEditorToolItem({
    id: CLOSE_EDITOR_COMMAND_ID,
    title: localize('close', 'Close'),
    icon: Codicon.closeDirty,
}, ContextKeyExpr.and(EditorTabsVisibleContext.toNegated(), ActiveEditorDirtyContext, ActiveEditorStickyContext.toNegated()), CLOSE_ORDER, {
    id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
    title: localize('closeAll', 'Close All'),
    icon: Codicon.closeAll,
});
// Editor Title Menu: Close (tabs disabled, sticky editor)
appendEditorToolItem({
    id: UNPIN_EDITOR_COMMAND_ID,
    title: localize('unpin', 'Unpin'),
    icon: Codicon.pinned,
}, ContextKeyExpr.and(EditorTabsVisibleContext.toNegated(), ActiveEditorDirtyContext.toNegated(), ActiveEditorStickyContext), CLOSE_ORDER, {
    id: CLOSE_EDITOR_COMMAND_ID,
    title: localize('close', 'Close'),
    icon: Codicon.close,
});
// Editor Title Menu: Close (tabs disabled, dirty & sticky editor)
appendEditorToolItem({
    id: UNPIN_EDITOR_COMMAND_ID,
    title: localize('unpin', 'Unpin'),
    icon: Codicon.pinnedDirty,
}, ContextKeyExpr.and(EditorTabsVisibleContext.toNegated(), ActiveEditorDirtyContext, ActiveEditorStickyContext), CLOSE_ORDER, {
    id: CLOSE_EDITOR_COMMAND_ID,
    title: localize('close', 'Close'),
    icon: Codicon.close,
});
// Lock Group: only on auxiliary window and when group is unlocked
appendEditorToolItem({
    id: LOCK_GROUP_COMMAND_ID,
    title: localize('lockEditorGroup', 'Lock Group'),
    icon: Codicon.unlock,
}, ContextKeyExpr.and(IsAuxiliaryEditorPartContext, ActiveEditorGroupLockedContext.toNegated()), CLOSE_ORDER - 1);
// Unlock Group: only when group is locked
appendEditorToolItem({
    id: UNLOCK_GROUP_COMMAND_ID,
    title: localize('unlockEditorGroup', 'Unlock Group'),
    icon: Codicon.lock,
    toggled: ContextKeyExpr.true(),
}, ActiveEditorGroupLockedContext, CLOSE_ORDER - 1);
// Diff Editor Title Menu: Previous Change
const previousChangeIcon = registerIcon('diff-editor-previous-change', Codicon.arrowUp, localize('previousChangeIcon', 'Icon for the previous change action in the diff editor.'));
appendEditorToolItem({
    id: GOTO_PREVIOUS_CHANGE,
    title: localize('navigate.prev.label', 'Previous Change'),
    icon: previousChangeIcon,
}, TextCompareEditorActiveContext, 10, undefined, EditorContextKeys.hasChanges);
// Diff Editor Title Menu: Next Change
const nextChangeIcon = registerIcon('diff-editor-next-change', Codicon.arrowDown, localize('nextChangeIcon', 'Icon for the next change action in the diff editor.'));
appendEditorToolItem({
    id: GOTO_NEXT_CHANGE,
    title: localize('navigate.next.label', 'Next Change'),
    icon: nextChangeIcon,
}, TextCompareEditorActiveContext, 11, undefined, EditorContextKeys.hasChanges);
// Diff Editor Title Menu: Swap Sides
appendEditorToolItem({
    id: DIFF_SWAP_SIDES,
    title: localize('swapDiffSides', 'Swap Left and Right Side'),
    icon: Codicon.arrowSwap,
}, ContextKeyExpr.and(TextCompareEditorActiveContext, ActiveCompareEditorCanSwapContext), 15, undefined, undefined);
const toggleWhitespace = registerIcon('diff-editor-toggle-whitespace', Codicon.whitespace, localize('toggleWhitespace', 'Icon for the toggle whitespace action in the diff editor.'));
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
        title: localize('ignoreTrimWhitespace.label', 'Show Leading/Trailing Whitespace Differences'),
        icon: toggleWhitespace,
        precondition: TextCompareEditorActiveContext,
        toggled: ContextKeyExpr.equals('config.diffEditor.ignoreTrimWhitespace', false),
    },
    group: 'navigation',
    when: TextCompareEditorActiveContext,
    order: 20,
});
// Editor Commands for Command Palette
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: KEEP_EDITOR_COMMAND_ID,
        title: localize2('keepEditor', 'Keep Editor'),
        category: Categories.View,
    },
    when: ContextKeyExpr.has('config.workbench.editor.enablePreview'),
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: PIN_EDITOR_COMMAND_ID,
        title: localize2('pinEditor', 'Pin Editor'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: UNPIN_EDITOR_COMMAND_ID,
        title: localize2('unpinEditor', 'Unpin Editor'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: localize2('closeEditor', 'Close Editor'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_PINNED_EDITOR_COMMAND_ID,
        title: localize2('closePinnedEditor', 'Close Pinned Editor'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        title: localize2('closeEditorsInGroup', 'Close All Editors in Group'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        title: localize2('closeSavedEditors', 'Close Saved Editors in Group'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        title: localize2('closeOtherEditors', 'Close Other Editors in Group'),
        category: Categories.View,
    },
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
        title: localize2('closeRightEditors', 'Close Editors to the Right in Group'),
        category: Categories.View,
    },
    when: ActiveEditorLastInGroupContext.toNegated(),
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: CLOSE_EDITORS_AND_GROUP_COMMAND_ID,
        title: localize2('closeEditorGroup', 'Close Editor Group'),
        category: Categories.View,
    },
    when: MultipleEditorGroupsContext,
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: REOPEN_WITH_COMMAND_ID,
        title: localize2('reopenWith', 'Reopen Editor With...'),
        category: Categories.View,
    },
    when: ActiveEditorAvailableEditorIdsContext,
});
// File menu
MenuRegistry.appendMenuItem(MenuId.MenubarRecentMenu, {
    group: '1_editor',
    command: {
        id: ReopenClosedEditorAction.ID,
        title: localize({ key: 'miReopenClosedEditor', comment: ['&& denotes a mnemonic'] }, '&&Reopen Closed Editor'),
        precondition: ContextKeyExpr.has('canReopenClosedEditor'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarRecentMenu, {
    group: 'z_clear',
    command: {
        id: ClearRecentFilesAction.ID,
        title: localize({ key: 'miClearRecentOpen', comment: ['&& denotes a mnemonic'] }, '&&Clear Recently Opened...'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    title: localize('miShare', 'Share'),
    submenu: MenuId.MenubarShare,
    group: '45_share',
    order: 1,
});
// Layout menu
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '2_appearance',
    title: localize({ key: 'miEditorLayout', comment: ['&& denotes a mnemonic'] }, 'Editor &&Layout'),
    submenu: MenuId.MenubarLayoutMenu,
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '1_split',
    command: {
        id: SPLIT_EDITOR_UP,
        title: {
            ...localize2('miSplitEditorUpWithoutMnemonic', 'Split Up'),
            mnemonicTitle: localize({ key: 'miSplitEditorUp', comment: ['&& denotes a mnemonic'] }, 'Split &&Up'),
        },
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '1_split',
    command: {
        id: SPLIT_EDITOR_DOWN,
        title: {
            ...localize2('miSplitEditorDownWithoutMnemonic', 'Split Down'),
            mnemonicTitle: localize({ key: 'miSplitEditorDown', comment: ['&& denotes a mnemonic'] }, 'Split &&Down'),
        },
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '1_split',
    command: {
        id: SPLIT_EDITOR_LEFT,
        title: {
            ...localize2('miSplitEditorLeftWithoutMnemonic', 'Split Left'),
            mnemonicTitle: localize({ key: 'miSplitEditorLeft', comment: ['&& denotes a mnemonic'] }, 'Split &&Left'),
        },
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '1_split',
    command: {
        id: SPLIT_EDITOR_RIGHT,
        title: {
            ...localize2('miSplitEditorRightWithoutMnemonic', 'Split Right'),
            mnemonicTitle: localize({ key: 'miSplitEditorRight', comment: ['&& denotes a mnemonic'] }, 'Split &&Right'),
        },
    },
    order: 4,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '2_split_in_group',
    command: {
        id: SPLIT_EDITOR_IN_GROUP,
        title: {
            ...localize2('miSplitEditorInGroupWithoutMnemonic', 'Split in Group'),
            mnemonicTitle: localize({ key: 'miSplitEditorInGroup', comment: ['&& denotes a mnemonic'] }, 'Split in &&Group'),
        },
    },
    when: ActiveEditorCanSplitInGroupContext,
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '2_split_in_group',
    command: {
        id: JOIN_EDITOR_IN_GROUP,
        title: {
            ...localize2('miJoinEditorInGroupWithoutMnemonic', 'Join in Group'),
            mnemonicTitle: localize({ key: 'miJoinEditorInGroup', comment: ['&& denotes a mnemonic'] }, 'Join in &&Group'),
        },
    },
    when: SideBySideEditorActiveContext,
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '3_new_window',
    command: {
        id: MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID,
        title: {
            ...localize2('moveEditorToNewWindow', 'Move Editor into New Window'),
            mnemonicTitle: localize({ key: 'miMoveEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Move Editor into New Window'),
        },
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '3_new_window',
    command: {
        id: COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID,
        title: {
            ...localize2('copyEditorToNewWindow', 'Copy Editor into New Window'),
            mnemonicTitle: localize({ key: 'miCopyEditorToNewWindow', comment: ['&& denotes a mnemonic'] }, '&&Copy Editor into New Window'),
        },
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutSingleAction.ID,
        title: {
            ...localize2('miSingleColumnEditorLayoutWithoutMnemonic', 'Single'),
            mnemonicTitle: localize({ key: 'miSingleColumnEditorLayout', comment: ['&& denotes a mnemonic'] }, '&&Single'),
        },
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutTwoColumnsAction.ID,
        title: {
            ...localize2('miTwoColumnsEditorLayoutWithoutMnemonic', 'Two Columns'),
            mnemonicTitle: localize({ key: 'miTwoColumnsEditorLayout', comment: ['&& denotes a mnemonic'] }, '&&Two Columns'),
        },
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutThreeColumnsAction.ID,
        title: {
            ...localize2('miThreeColumnsEditorLayoutWithoutMnemonic', 'Three Columns'),
            mnemonicTitle: localize({ key: 'miThreeColumnsEditorLayout', comment: ['&& denotes a mnemonic'] }, 'T&&hree Columns'),
        },
    },
    order: 4,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutTwoRowsAction.ID,
        title: {
            ...localize2('miTwoRowsEditorLayoutWithoutMnemonic', 'Two Rows'),
            mnemonicTitle: localize({ key: 'miTwoRowsEditorLayout', comment: ['&& denotes a mnemonic'] }, 'T&&wo Rows'),
        },
    },
    order: 5,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutThreeRowsAction.ID,
        title: {
            ...localize2('miThreeRowsEditorLayoutWithoutMnemonic', 'Three Rows'),
            mnemonicTitle: localize({ key: 'miThreeRowsEditorLayout', comment: ['&& denotes a mnemonic'] }, 'Three &&Rows'),
        },
    },
    order: 6,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutTwoByTwoGridAction.ID,
        title: {
            ...localize2('miTwoByTwoGridEditorLayoutWithoutMnemonic', 'Grid (2x2)'),
            mnemonicTitle: localize({ key: 'miTwoByTwoGridEditorLayout', comment: ['&& denotes a mnemonic'] }, '&&Grid (2x2)'),
        },
    },
    order: 7,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutTwoRowsRightAction.ID,
        title: {
            ...localize2('miTwoRowsRightEditorLayoutWithoutMnemonic', 'Two Rows Right'),
            mnemonicTitle: localize({ key: 'miTwoRowsRightEditorLayout', comment: ['&& denotes a mnemonic'] }, 'Two R&&ows Right'),
        },
    },
    order: 8,
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '4_layouts',
    command: {
        id: EditorLayoutTwoColumnsBottomAction.ID,
        title: {
            ...localize2('miTwoColumnsBottomEditorLayoutWithoutMnemonic', 'Two Columns Bottom'),
            mnemonicTitle: localize({ key: 'miTwoColumnsBottomEditorLayout', comment: ['&& denotes a mnemonic'] }, 'Two &&Columns Bottom'),
        },
    },
    order: 9,
});
// Main Menu Bar Contributions:
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '1_history_nav',
    command: {
        id: 'workbench.action.navigateToLastEditLocation',
        title: localize({ key: 'miLastEditLocation', comment: ['&& denotes a mnemonic'] }, '&&Last Edit Location'),
        precondition: ContextKeyExpr.has('canNavigateToLastEditLocation'),
    },
    order: 3,
});
// Switch Editor
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '1_sideBySide',
    command: {
        id: FOCUS_FIRST_SIDE_EDITOR,
        title: localize({ key: 'miFirstSideEditor', comment: ['&& denotes a mnemonic'] }, '&&First Side in Editor'),
    },
    when: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '1_sideBySide',
    command: {
        id: FOCUS_SECOND_SIDE_EDITOR,
        title: localize({ key: 'miSecondSideEditor', comment: ['&& denotes a mnemonic'] }, '&&Second Side in Editor'),
    },
    when: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '2_any',
    command: {
        id: 'workbench.action.nextEditor',
        title: localize({ key: 'miNextEditor', comment: ['&& denotes a mnemonic'] }, '&&Next Editor'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '2_any',
    command: {
        id: 'workbench.action.previousEditor',
        title: localize({ key: 'miPreviousEditor', comment: ['&& denotes a mnemonic'] }, '&&Previous Editor'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '3_any_used',
    command: {
        id: 'workbench.action.openNextRecentlyUsedEditor',
        title: localize({ key: 'miNextRecentlyUsedEditor', comment: ['&& denotes a mnemonic'] }, '&&Next Used Editor'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '3_any_used',
    command: {
        id: 'workbench.action.openPreviousRecentlyUsedEditor',
        title: localize({ key: 'miPreviousRecentlyUsedEditor', comment: ['&& denotes a mnemonic'] }, '&&Previous Used Editor'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '4_group',
    command: {
        id: 'workbench.action.nextEditorInGroup',
        title: localize({ key: 'miNextEditorInGroup', comment: ['&& denotes a mnemonic'] }, '&&Next Editor in Group'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '4_group',
    command: {
        id: 'workbench.action.previousEditorInGroup',
        title: localize({ key: 'miPreviousEditorInGroup', comment: ['&& denotes a mnemonic'] }, '&&Previous Editor in Group'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '5_group_used',
    command: {
        id: 'workbench.action.openNextRecentlyUsedEditorInGroup',
        title: localize({ key: 'miNextUsedEditorInGroup', comment: ['&& denotes a mnemonic'] }, '&&Next Used Editor in Group'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchEditorMenu, {
    group: '5_group_used',
    command: {
        id: 'workbench.action.openPreviousRecentlyUsedEditorInGroup',
        title: localize({ key: 'miPreviousUsedEditorInGroup', comment: ['&& denotes a mnemonic'] }, '&&Previous Used Editor in Group'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '2_editor_nav',
    title: localize({ key: 'miSwitchEditor', comment: ['&& denotes a mnemonic'] }, 'Switch &&Editor'),
    submenu: MenuId.MenubarSwitchEditorMenu,
    order: 1,
});
// Switch Group
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '1_focus_index',
    command: {
        id: 'workbench.action.focusFirstEditorGroup',
        title: localize({ key: 'miFocusFirstGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&1'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '1_focus_index',
    command: {
        id: 'workbench.action.focusSecondEditorGroup',
        title: localize({ key: 'miFocusSecondGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&2'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '1_focus_index',
    command: {
        id: 'workbench.action.focusThirdEditorGroup',
        title: localize({ key: 'miFocusThirdGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&3'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '1_focus_index',
    command: {
        id: 'workbench.action.focusFourthEditorGroup',
        title: localize({ key: 'miFocusFourthGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&4'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 4,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '1_focus_index',
    command: {
        id: 'workbench.action.focusFifthEditorGroup',
        title: localize({ key: 'miFocusFifthGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&5'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 5,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '2_next_prev',
    command: {
        id: 'workbench.action.focusNextGroup',
        title: localize({ key: 'miNextGroup', comment: ['&& denotes a mnemonic'] }, '&&Next Group'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '2_next_prev',
    command: {
        id: 'workbench.action.focusPreviousGroup',
        title: localize({ key: 'miPreviousGroup', comment: ['&& denotes a mnemonic'] }, '&&Previous Group'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '3_directional',
    command: {
        id: 'workbench.action.focusLeftGroup',
        title: localize({ key: 'miFocusLeftGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&Left'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '3_directional',
    command: {
        id: 'workbench.action.focusRightGroup',
        title: localize({ key: 'miFocusRightGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&Right'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '3_directional',
    command: {
        id: 'workbench.action.focusAboveGroup',
        title: localize({ key: 'miFocusAboveGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&Above'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarSwitchGroupMenu, {
    group: '3_directional',
    command: {
        id: 'workbench.action.focusBelowGroup',
        title: localize({ key: 'miFocusBelowGroup', comment: ['&& denotes a mnemonic'] }, 'Group &&Below'),
        precondition: MultipleEditorGroupsContext,
    },
    order: 4,
});
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '2_editor_nav',
    title: localize({ key: 'miSwitchGroup', comment: ['&& denotes a mnemonic'] }, 'Switch &&Group'),
    submenu: MenuId.MenubarSwitchGroupMenu,
    order: 2,
});
//#endregion
registerEditorFontConfigurations(getFontSnippets);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUF1QixvQkFBb0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzNFLE9BQU8sRUFBMEIsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQ04sOEJBQThCLEVBQzlCLHlCQUF5QixFQUN6Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBQ3pCLHFDQUFxQyxFQUNyQyxxQ0FBcUMsRUFDckMsd0JBQXdCLEVBQ3hCLDhCQUE4QixFQUM5QixrQ0FBa0MsRUFDbEMsNkJBQTZCLEVBQzdCLHdCQUF3QixFQUN4Qiw4QkFBOEIsRUFDOUIscUNBQXFDLEVBQ3JDLDJCQUEyQixFQUMzQixzQkFBc0IsRUFDdEIsNEJBQTRCLEVBQzVCLGlDQUFpQyxFQUNqQyxxQ0FBcUMsR0FDckMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLCtCQUErQixHQUMvQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFDTixlQUFlLEVBQ2YseUJBQXlCLEdBQ3pCLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUFFLHVCQUF1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