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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBdUIsb0JBQW9CLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMzRSxPQUFPLEVBQTBCLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEYsT0FBTyxFQUNOLDhCQUE4QixFQUM5Qix5QkFBeUIsRUFDekIsOEJBQThCLEVBQzlCLHlCQUF5QixFQUN6QixxQ0FBcUMsRUFDckMscUNBQXFDLEVBQ3JDLHdCQUF3QixFQUN4Qiw4QkFBOEIsRUFDOUIsa0NBQWtDLEVBQ2xDLDZCQUE2QixFQUM3Qix3QkFBd0IsRUFDeEIsOEJBQThCLEVBQzlCLHFDQUFxQyxFQUNyQywyQkFBMkIsRUFDM0Isc0JBQXNCLEVBQ3RCLDRCQUE0QixFQUM1QixpQ0FBaUMsRUFDakMscUNBQXFDLEdBQ3JDLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiwrQkFBK0IsR0FDL0IsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sZUFBZSxFQUNmLHlCQUF5QixHQUN6QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSx1QkFBdUIsRUFB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