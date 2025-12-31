/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { registerColor, editorBackground, contrastBorder, transparent, editorWidgetBackground, textLinkForeground, lighten, darken, focusBorder, activeContrastBorder, editorWidgetForeground, editorErrorForeground, editorWarningForeground, editorInfoForeground, treeIndentGuidesStroke, errorForeground, listActiveSelectionBackground, listActiveSelectionForeground, editorForeground, toolbarHoverBackground, inputBorder, widgetBorder, scrollbarShadow, } from '../../platform/theme/common/colorRegistry.js';
import { Color } from '../../base/common/color.js';
import { ColorScheme } from '../../platform/theme/common/theme.js';
// < --- Workbench (not customizable) --- >
export function WORKBENCH_BACKGROUND(theme) {
    switch (theme.type) {
        case ColorScheme.LIGHT:
            return Color.fromHex('#F3F3F3');
        case ColorScheme.HIGH_CONTRAST_LIGHT:
            return Color.fromHex('#FFFFFF');
        case ColorScheme.HIGH_CONTRAST_DARK:
            return Color.fromHex('#000000');
        default:
            return Color.fromHex('#252526');
    }
}
// < --- Tabs --- >
//#region Tab Background
export const TAB_ACTIVE_BACKGROUND = registerColor('tab.activeBackground', editorBackground, localize('tabActiveBackground', 'Active tab background color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('tab.unfocusedActiveBackground', TAB_ACTIVE_BACKGROUND, localize('tabUnfocusedActiveBackground', 'Active tab background color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_INACTIVE_BACKGROUND = registerColor('tab.inactiveBackground', {
    dark: '#2D2D2D',
    light: '#ECECEC',
    hcDark: null,
    hcLight: null,
}, localize('tabInactiveBackground', 'Inactive tab background color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('tab.unfocusedInactiveBackground', TAB_INACTIVE_BACKGROUND, localize('tabUnfocusedInactiveBackground', 'Inactive tab background color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
//#region Tab Foreground
export const TAB_ACTIVE_FOREGROUND = registerColor('tab.activeForeground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.white,
    hcLight: '#292929',
}, localize('tabActiveForeground', 'Active tab foreground color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_INACTIVE_FOREGROUND = registerColor('tab.inactiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929',
}, localize('tabInactiveForeground', 'Inactive tab foreground color in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('tab.unfocusedActiveForeground', {
    dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
    hcDark: Color.white,
    hcLight: '#292929',
}, localize('tabUnfocusedActiveForeground', 'Active tab foreground color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('tab.unfocusedInactiveForeground', {
    dark: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    light: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
    hcDark: Color.white,
    hcLight: '#292929',
}, localize('tabUnfocusedInactiveForeground', 'Inactive tab foreground color in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
//#region Tab Hover Foreground/Background
export const TAB_HOVER_BACKGROUND = registerColor('tab.hoverBackground', null, localize('tabHoverBackground', 'Tab background color when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('tab.unfocusedHoverBackground', {
    dark: transparent(TAB_HOVER_BACKGROUND, 0.5),
    light: transparent(TAB_HOVER_BACKGROUND, 0.7),
    hcDark: null,
    hcLight: null,
}, localize('tabUnfocusedHoverBackground', 'Tab background color in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_HOVER_FOREGROUND = registerColor('tab.hoverForeground', null, localize('tabHoverForeground', 'Tab foreground color when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('tab.unfocusedHoverForeground', {
    dark: transparent(TAB_HOVER_FOREGROUND, 0.5),
    light: transparent(TAB_HOVER_FOREGROUND, 0.5),
    hcDark: null,
    hcLight: null,
}, localize('tabUnfocusedHoverForeground', 'Tab foreground color in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
//#region Tab Borders
export const TAB_BORDER = registerColor('tab.border', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('tabBorder', 'Border to separate tabs from each other. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_LAST_PINNED_BORDER = registerColor('tab.lastPinnedBorder', {
    dark: treeIndentGuidesStroke,
    light: treeIndentGuidesStroke,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('lastPinnedTabBorder', 'Border to separate pinned tabs from other tabs. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_ACTIVE_BORDER = registerColor('tab.activeBorder', null, localize('tabActiveBorder', 'Border on the bottom of an active tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('tab.unfocusedActiveBorder', {
    dark: transparent(TAB_ACTIVE_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_BORDER, 0.7),
    hcDark: null,
    hcLight: null,
}, localize('tabActiveUnfocusedBorder', 'Border on the bottom of an active tab in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_ACTIVE_BORDER_TOP = registerColor('tab.activeBorderTop', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D',
}, localize('tabActiveBorderTop', 'Border to the top of an active tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('tab.unfocusedActiveBorderTop', {
    dark: transparent(TAB_ACTIVE_BORDER_TOP, 0.5),
    light: transparent(TAB_ACTIVE_BORDER_TOP, 0.7),
    hcDark: null,
    hcLight: '#B5200D',
}, localize('tabActiveUnfocusedBorderTop', 'Border to the top of an active tab in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_SELECTED_BORDER_TOP = registerColor('tab.selectedBorderTop', TAB_ACTIVE_BORDER_TOP, localize('tabSelectedBorderTop', 'Border to the top of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_SELECTED_BACKGROUND = registerColor('tab.selectedBackground', TAB_ACTIVE_BACKGROUND, localize('tabSelectedBackground', 'Background of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_SELECTED_FOREGROUND = registerColor('tab.selectedForeground', TAB_ACTIVE_FOREGROUND, localize('tabSelectedForeground', 'Foreground of a selected tab. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_HOVER_BORDER = registerColor('tab.hoverBorder', null, localize('tabHoverBorder', 'Border to highlight tabs when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('tab.unfocusedHoverBorder', {
    dark: transparent(TAB_HOVER_BORDER, 0.5),
    light: transparent(TAB_HOVER_BORDER, 0.7),
    hcDark: null,
    hcLight: contrastBorder,
}, localize('tabUnfocusedHoverBorder', 'Border to highlight tabs in an unfocused group when hovering. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
//#region Tab Drag and Drop Border
export const TAB_DRAG_AND_DROP_BORDER = registerColor('tab.dragAndDropBorder', {
    dark: TAB_ACTIVE_FOREGROUND,
    light: TAB_ACTIVE_FOREGROUND,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
}, localize('tabDragAndDropBorder', 'Border between tabs to indicate that a tab can be inserted between two tabs. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
//#region Tab Modified Border
export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('tab.activeModifiedBorder', {
    dark: '#3399CC',
    light: '#33AAEE',
    hcDark: null,
    hcLight: contrastBorder,
}, localize('tabActiveModifiedBorder', 'Border on the top of modified active tabs in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('tab.inactiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder,
}, localize('tabInactiveModifiedBorder', 'Border on the top of modified inactive tabs in an active group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedActiveModifiedBorder', {
    dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
    hcDark: Color.white,
    hcLight: contrastBorder,
}, localize('unfocusedActiveModifiedBorder', 'Border on the top of modified active tabs in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('tab.unfocusedInactiveModifiedBorder', {
    dark: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    light: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
    hcDark: Color.white,
    hcLight: contrastBorder,
}, localize('unfocusedINactiveModifiedBorder', 'Border on the top of modified inactive tabs in an unfocused group. Tabs are the containers for editors in the editor area. Multiple tabs can be opened in one editor group. There can be multiple editor groups.'));
//#endregion
// < --- Editors --- >
export const EDITOR_PANE_BACKGROUND = registerColor('editorPane.background', editorBackground, localize('editorPaneBackground', 'Background color of the editor pane visible on the left and right side of the centered editor layout.'));
export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBackground', null, localize('editorGroupEmptyBackground', 'Background color of an empty editor group. Editor groups are the containers of editors.'));
export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder,
}, localize('editorGroupFocusedEmptyBorder', 'Border color of an empty editor group that is focused. Editor groups are the containers of editors.'));
export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeader.tabsBackground', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: null,
    hcLight: null,
}, localize('tabsContainerBackground', 'Background color of the editor group title header when tabs are enabled. Editor groups are the containers of editors.'));
export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeader.tabsBorder', null, localize('tabsContainerBorder', 'Border color of the editor group title header when tabs are enabled. Editor groups are the containers of editors.'));
export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeader.noTabsBackground', editorBackground, localize('editorGroupHeaderBackground', 'Background color of the editor group title header when (`"workbench.editor.showTabs": "single"`). Editor groups are the containers of editors.'));
export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeader.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('editorTitleContainerBorder', 'Border color of the editor group title header. Editor groups are the containers of editors.'));
export const EDITOR_GROUP_BORDER = registerColor('editorGroup.border', {
    dark: '#444444',
    light: '#E7E7E7',
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('editorGroupBorder', 'Color to separate multiple editor groups from each other. Editor groups are the containers of editors.'));
export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBackground', {
    dark: Color.fromHex('#53595D').transparent(0.5),
    light: Color.fromHex('#2677CB').transparent(0.18),
    hcDark: null,
    hcLight: Color.fromHex('#0F4A85').transparent(0.5),
}, localize('editorDragAndDropBackground', 'Background color when dragging editors around. The color should have transparency so that the editor contents can still shine through.'));
export const EDITOR_DROP_INTO_PROMPT_FOREGROUND = registerColor('editorGroup.dropIntoPromptForeground', editorWidgetForeground, localize('editorDropIntoPromptForeground', 'Foreground color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.'));
export const EDITOR_DROP_INTO_PROMPT_BACKGROUND = registerColor('editorGroup.dropIntoPromptBackground', editorWidgetBackground, localize('editorDropIntoPromptBackground', 'Background color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.'));
export const EDITOR_DROP_INTO_PROMPT_BORDER = registerColor('editorGroup.dropIntoPromptBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('editorDropIntoPromptBorder', 'Border color of text shown over editors when dragging files. This text informs the user that they can hold shift to drop into the editor.'));
export const SIDE_BY_SIDE_EDITOR_HORIZONTAL_BORDER = registerColor('sideBySideEditor.horizontalBorder', EDITOR_GROUP_BORDER, localize('sideBySideEditor.horizontalBorder', 'Color to separate two editors from each other when shown side by side in an editor group from top to bottom.'));
export const SIDE_BY_SIDE_EDITOR_VERTICAL_BORDER = registerColor('sideBySideEditor.verticalBorder', EDITOR_GROUP_BORDER, localize('sideBySideEditor.verticalBorder', 'Color to separate two editors from each other when shown side by side in an editor group from left to right.'));
// < --- Output Editor -->
const OUTPUT_VIEW_BACKGROUND = registerColor('outputView.background', null, localize('outputViewBackground', 'Output view background color.'));
registerColor('outputViewStickyScroll.background', OUTPUT_VIEW_BACKGROUND, localize('outputViewStickyScrollBackground', 'Output view sticky scroll background color.'));
// < --- Banner --- >
export const BANNER_BACKGROUND = registerColor('banner.background', {
    dark: listActiveSelectionBackground,
    light: darken(listActiveSelectionBackground, 0.3),
    hcDark: listActiveSelectionBackground,
    hcLight: listActiveSelectionBackground,
}, localize('banner.background', 'Banner background color. The banner is shown under the title bar of the window.'));
export const BANNER_FOREGROUND = registerColor('banner.foreground', listActiveSelectionForeground, localize('banner.foreground', 'Banner foreground color. The banner is shown under the title bar of the window.'));
export const BANNER_ICON_FOREGROUND = registerColor('banner.iconForeground', editorInfoForeground, localize('banner.iconForeground', 'Banner icon color. The banner is shown under the title bar of the window.'));
// < --- Status --- >
export const STATUS_BAR_FOREGROUND = registerColor('statusBar.foreground', {
    dark: '#FFFFFF',
    light: '#FFFFFF',
    hcDark: '#FFFFFF',
    hcLight: editorForeground,
}, localize('statusBarForeground', 'Status bar foreground color when a workspace or folder is opened. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('statusBar.noFolderForeground', STATUS_BAR_FOREGROUND, localize('statusBarNoFolderForeground', 'Status bar foreground color when no folder is opened. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_BACKGROUND = registerColor('statusBar.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: null,
    hcLight: null,
}, localize('statusBarBackground', 'Status bar background color when a workspace or folder is opened. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('statusBar.noFolderBackground', {
    dark: '#68217A',
    light: '#68217A',
    hcDark: null,
    hcLight: null,
}, localize('statusBarNoFolderBackground', 'Status bar background color when no folder is opened. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_BORDER = registerColor('statusBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('statusBarBorder', 'Status bar border color separating to the sidebar and editor. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_FOCUS_BORDER = registerColor('statusBar.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: STATUS_BAR_FOREGROUND,
}, localize('statusBarFocusBorder', 'Status bar border color when focused on keyboard navigation. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('statusBar.noFolderBorder', STATUS_BAR_BORDER, localize('statusBarNoFolderBorder', 'Status bar border color separating to the sidebar and editor when no folder is opened. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('statusBarItem.activeBackground', {
    dark: Color.white.transparent(0.18),
    light: Color.white.transparent(0.18),
    hcDark: Color.white.transparent(0.18),
    hcLight: Color.black.transparent(0.18),
}, localize('statusBarItemActiveBackground', 'Status bar item background color when clicking. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ITEM_FOCUS_BORDER = registerColor('statusBarItem.focusBorder', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: null,
    hcLight: activeContrastBorder,
}, localize('statusBarItemFocusBorder', 'Status bar item border color when focused on keyboard navigation. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.hoverBackground', {
    dark: Color.white.transparent(0.12),
    light: Color.white.transparent(0.12),
    hcDark: Color.white.transparent(0.12),
    hcLight: Color.black.transparent(0.12),
}, localize('statusBarItemHoverBackground', 'Status bar item background color when hovering. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.hoverForeground', STATUS_BAR_FOREGROUND, localize('statusBarItemHoverForeground', 'Status bar item foreground color when hovering. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ITEM_COMPACT_HOVER_BACKGROUND = registerColor('statusBarItem.compactHoverBackground', {
    dark: Color.white.transparent(0.2),
    light: Color.white.transparent(0.2),
    hcDark: Color.white.transparent(0.2),
    hcLight: Color.black.transparent(0.2),
}, localize('statusBarItemCompactHoverBackground', 'Status bar item background color when hovering an item that contains two hovers. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('statusBarItem.prominentForeground', STATUS_BAR_FOREGROUND, localize('statusBarProminentItemForeground', 'Status bar prominent items foreground color. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('statusBarItem.prominentBackground', Color.black.transparent(0.5), localize('statusBarProminentItemBackground', 'Status bar prominent items background color. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.prominentHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarProminentItemHoverForeground', 'Status bar prominent items foreground color when hovering. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.prominentHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarProminentItemHoverBackground', 'Status bar prominent items background color when hovering. Prominent items stand out from other status bar entries to indicate importance. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ERROR_ITEM_BACKGROUND = registerColor('statusBarItem.errorBackground', {
    dark: darken(errorForeground, 0.4),
    light: darken(errorForeground, 0.4),
    hcDark: null,
    hcLight: '#B5200D',
}, localize('statusBarErrorItemBackground', 'Status bar error items background color. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ERROR_ITEM_FOREGROUND = registerColor('statusBarItem.errorForeground', Color.white, localize('statusBarErrorItemForeground', 'Status bar error items foreground color. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ERROR_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.errorHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarErrorItemHoverForeground', 'Status bar error items foreground color when hovering. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_ERROR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.errorHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarErrorItemHoverBackground', 'Status bar error items background color when hovering. Error items stand out from other status bar entries to indicate error conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_WARNING_ITEM_BACKGROUND = registerColor('statusBarItem.warningBackground', {
    dark: darken(editorWarningForeground, 0.4),
    light: darken(editorWarningForeground, 0.4),
    hcDark: null,
    hcLight: '#895503',
}, localize('statusBarWarningItemBackground', 'Status bar warning items background color. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_WARNING_ITEM_FOREGROUND = registerColor('statusBarItem.warningForeground', Color.white, localize('statusBarWarningItemForeground', 'Status bar warning items foreground color. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_WARNING_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.warningHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarWarningItemHoverForeground', 'Status bar warning items foreground color when hovering. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window.'));
export const STATUS_BAR_WARNING_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.warningHoverBackground', STATUS_BAR_ITEM_HOVER_BACKGROUND, localize('statusBarWarningItemHoverBackground', 'Status bar warning items background color when hovering. Warning items stand out from other status bar entries to indicate warning conditions. The status bar is shown in the bottom of the window.'));
// < --- Activity Bar --- >
export const ACTIVITY_BAR_BACKGROUND = registerColor('activityBar.background', {
    dark: '#333333',
    light: '#2C2C2C',
    hcDark: '#000000',
    hcLight: '#FFFFFF',
}, localize('activityBarBackground', 'Activity bar background color. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_FOREGROUND = registerColor('activityBar.foreground', {
    dark: Color.white,
    light: Color.white,
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('activityBarForeground', 'Activity bar item foreground color when it is active. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('activityBar.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    light: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('activityBarInActiveForeground', 'Activity bar item foreground color when it is inactive. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_BORDER = registerColor('activityBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('activityBarBorder', 'Activity bar border color separating to the side bar. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('activityBar.activeBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('activityBarActiveBorder', 'Activity bar border color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('activityBar.activeFocusBorder', {
    dark: null,
    light: null,
    hcDark: null,
    hcLight: '#B5200D',
}, localize('activityBarActiveFocusBorder', 'Activity bar focus border color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('activityBar.activeBackground', null, localize('activityBarActiveBackground', 'Activity bar background color for the active item. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('activityBar.dropBorder', {
    dark: ACTIVITY_BAR_FOREGROUND,
    light: ACTIVITY_BAR_FOREGROUND,
    hcDark: null,
    hcLight: null,
}, localize('activityBarDragAndDropBorder', 'Drag and drop feedback color for the activity bar items. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('activityBarBadge.background', {
    dark: '#007ACC',
    light: '#007ACC',
    hcDark: '#000000',
    hcLight: '#0F4A85',
}, localize('activityBarBadgeBackground', 'Activity notification badge background color. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('activityBarBadge.foreground', Color.white, localize('activityBarBadgeForeground', 'Activity notification badge foreground color. The activity bar is showing on the far left or right and allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_FOREGROUND = registerColor('activityBarTop.foreground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('activityBarTop', 'Active foreground color of the item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_ACTIVE_BORDER = registerColor('activityBarTop.activeBorder', {
    dark: ACTIVITY_BAR_TOP_FOREGROUND,
    light: ACTIVITY_BAR_TOP_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D',
}, localize('activityBarTopActiveFocusBorder', 'Focus border color for the active item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_ACTIVE_BACKGROUND = registerColor('activityBarTop.activeBackground', null, localize('activityBarTopActiveBackground', 'Background color for the active item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_INACTIVE_FOREGROUND = registerColor('activityBarTop.inactiveForeground', {
    dark: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.6),
    light: transparent(ACTIVITY_BAR_TOP_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('activityBarTopInActiveForeground', 'Inactive foreground color of the item in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_DRAG_AND_DROP_BORDER = registerColor('activityBarTop.dropBorder', ACTIVITY_BAR_TOP_FOREGROUND, localize('activityBarTopDragAndDropBorder', 'Drag and drop feedback color for the items in the Activity bar when it is on top / bottom. The activity allows to switch between views of the side bar.'));
export const ACTIVITY_BAR_TOP_BACKGROUND = registerColor('activityBarTop.background', null, localize('activityBarTopBackground', 'Background color of the activity bar when set to top / bottom.'));
// < --- Panels --- >
export const PANEL_BACKGROUND = registerColor('panel.background', editorBackground, localize('panelBackground', 'Panel background color. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_BORDER = registerColor('panel.border', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('panelBorder', 'Panel border color to separate the panel from the editor. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_TITLE_BORDER = registerColor('panelTitle.border', {
    dark: null,
    light: null,
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER,
}, localize('panelTitleBorder', 'Panel title border color on the bottom, separating the title from the views. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.activeForeground', {
    dark: '#E7E7E7',
    light: '#424242',
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('panelActiveTitleForeground', 'Title color for the active panel. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.inactiveForeground', {
    dark: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
    light: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
    hcDark: Color.white,
    hcLight: editorForeground,
}, localize('panelInactiveTitleForeground', 'Title color for the inactive panel. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_ACTIVE_TITLE_BORDER = registerColor('panelTitle.activeBorder', {
    dark: PANEL_ACTIVE_TITLE_FOREGROUND,
    light: PANEL_ACTIVE_TITLE_FOREGROUND,
    hcDark: contrastBorder,
    hcLight: '#B5200D',
}, localize('panelActiveTitleBorder', 'Border color for the active panel title. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_TITLE_BADGE_BACKGROUND = registerColor('panelTitleBadge.background', ACTIVITY_BAR_BADGE_BACKGROUND, localize('panelTitleBadgeBackground', 'Panel title badge background color. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_TITLE_BADGE_FOREGROUND = registerColor('panelTitleBadge.foreground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('panelTitleBadgeForeground', 'Panel title badge foreground color. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_INPUT_BORDER = registerColor('panelInput.border', {
    dark: inputBorder,
    light: Color.fromHex('#ddd'),
    hcDark: inputBorder,
    hcLight: inputBorder,
}, localize('panelInputBorder', 'Input box border for inputs in the panel.'));
export const PANEL_DRAG_AND_DROP_BORDER = registerColor('panel.dropBorder', PANEL_ACTIVE_TITLE_FOREGROUND, localize('panelDragAndDropBorder', 'Drag and drop feedback color for the panel titles. Panels are shown below the editor area and contain views like output and integrated terminal.'));
export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('panelSection.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize('panelSectionDragAndDropBackground', 'Drag and drop feedback color for the panel sections. The color should have transparency so that the panel sections can still shine through. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels.'));
export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('panelSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null,
}, localize('panelSectionHeaderBackground', 'Panel section header background color. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels.'));
export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('panelSectionHeader.foreground', null, localize('panelSectionHeaderForeground', 'Panel section header foreground color. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels.'));
export const PANEL_SECTION_HEADER_BORDER = registerColor('panelSectionHeader.border', contrastBorder, localize('panelSectionHeaderBorder', 'Panel section header border color used when multiple views are stacked vertically in the panel. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels.'));
export const PANEL_SECTION_BORDER = registerColor('panelSection.border', PANEL_BORDER, localize('panelSectionBorder', 'Panel section border color used when multiple views are stacked horizontally in the panel. Panels are shown below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels.'));
export const PANEL_STICKY_SCROLL_BACKGROUND = registerColor('panelStickyScroll.background', PANEL_BACKGROUND, localize('panelStickyScrollBackground', 'Background color of sticky scroll in the panel.'));
export const PANEL_STICKY_SCROLL_BORDER = registerColor('panelStickyScroll.border', null, localize('panelStickyScrollBorder', 'Border color of sticky scroll in the panel.'));
export const PANEL_STICKY_SCROLL_SHADOW = registerColor('panelStickyScroll.shadow', scrollbarShadow, localize('panelStickyScrollShadow', 'Shadow color of sticky scroll in the panel.'));
// < --- Profiles --- >
export const PROFILE_BADGE_BACKGROUND = registerColor('profileBadge.background', {
    dark: '#4D4D4D',
    light: '#C4C4C4',
    hcDark: Color.white,
    hcLight: Color.black,
}, localize('profileBadgeBackground', 'Profile badge background color. The profile badge shows on top of the settings gear icon in the activity bar.'));
export const PROFILE_BADGE_FOREGROUND = registerColor('profileBadge.foreground', {
    dark: Color.white,
    light: '#333333',
    hcDark: Color.black,
    hcLight: Color.white,
}, localize('profileBadgeForeground', 'Profile badge foreground color. The profile badge shows on top of the settings gear icon in the activity bar.'));
// < --- Remote --- >
export const STATUS_BAR_REMOTE_ITEM_BACKGROUND = registerColor('statusBarItem.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize('statusBarItemRemoteBackground', 'Background color for the remote indicator on the status bar.'));
export const STATUS_BAR_REMOTE_ITEM_FOREGROUND = registerColor('statusBarItem.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('statusBarItemRemoteForeground', 'Foreground color for the remote indicator on the status bar.'));
export const STATUS_BAR_REMOTE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.remoteHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarRemoteItemHoverForeground', 'Foreground color for the remote indicator on the status bar when hovering.'));
export const STATUS_BAR_REMOTE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.remoteHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null,
}, localize('statusBarRemoteItemHoverBackground', 'Background color for the remote indicator on the status bar when hovering.'));
export const STATUS_BAR_OFFLINE_ITEM_BACKGROUND = registerColor('statusBarItem.offlineBackground', '#6c1717', localize('statusBarItemOfflineBackground', 'Status bar item background color when the workbench is offline.'));
export const STATUS_BAR_OFFLINE_ITEM_FOREGROUND = registerColor('statusBarItem.offlineForeground', STATUS_BAR_REMOTE_ITEM_FOREGROUND, localize('statusBarItemOfflineForeground', 'Status bar item foreground color when the workbench is offline.'));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_FOREGROUND = registerColor('statusBarItem.offlineHoverForeground', STATUS_BAR_ITEM_HOVER_FOREGROUND, localize('statusBarOfflineItemHoverForeground', 'Status bar item foreground hover color when the workbench is offline.'));
export const STATUS_BAR_OFFLINE_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.offlineHoverBackground', {
    dark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    light: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcDark: STATUS_BAR_ITEM_HOVER_BACKGROUND,
    hcLight: null,
}, localize('statusBarOfflineItemHoverBackground', 'Status bar item background hover color when the workbench is offline.'));
export const EXTENSION_BADGE_REMOTE_BACKGROUND = registerColor('extensionBadge.remoteBackground', ACTIVITY_BAR_BADGE_BACKGROUND, localize('extensionBadge.remoteBackground', 'Background color for the remote badge in the extensions view.'));
export const EXTENSION_BADGE_REMOTE_FOREGROUND = registerColor('extensionBadge.remoteForeground', ACTIVITY_BAR_BADGE_FOREGROUND, localize('extensionBadge.remoteForeground', 'Foreground color for the remote badge in the extensions view.'));
// < --- Side Bar --- >
export const SIDE_BAR_BACKGROUND = registerColor('sideBar.background', {
    dark: '#252526',
    light: '#F3F3F3',
    hcDark: '#000000',
    hcLight: '#FFFFFF',
}, localize('sideBarBackground', 'Side bar background color. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_FOREGROUND = registerColor('sideBar.foreground', null, localize('sideBarForeground', 'Side bar foreground color. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_BORDER = registerColor('sideBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('sideBarBorder', 'Side bar border color on the side separating to the editor. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_TITLE_BACKGROUND = registerColor('sideBarTitle.background', SIDE_BAR_BACKGROUND, localize('sideBarTitleBackground', 'Side bar title background color. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBarTitle.foreground', SIDE_BAR_FOREGROUND, localize('sideBarTitleForeground', 'Side bar title foreground color. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_TITLE_BORDER = registerColor('sideBarTitle.border', {
    dark: null,
    light: null,
    hcDark: SIDE_BAR_BORDER,
    hcLight: SIDE_BAR_BORDER,
}, localize('sideBarTitleBorder', 'Side bar title border color on the bottom, separating the title from the views. The side bar is the container for views like explorer and search.'));
export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBar.dropBackground', EDITOR_DRAG_AND_DROP_BACKGROUND, localize('sideBarDragAndDropBackground', 'Drag and drop feedback color for the side bar sections. The color should have transparency so that the side bar sections can still shine through. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar.'));
export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBarSectionHeader.background', {
    dark: Color.fromHex('#808080').transparent(0.2),
    light: Color.fromHex('#808080').transparent(0.2),
    hcDark: null,
    hcLight: null,
}, localize('sideBarSectionHeaderBackground', 'Side bar section header background color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar.'));
export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBarSectionHeader.foreground', SIDE_BAR_FOREGROUND, localize('sideBarSectionHeaderForeground', 'Side bar section header foreground color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar.'));
export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBarSectionHeader.border', contrastBorder, localize('sideBarSectionHeaderBorder', 'Side bar section header border color. The side bar is the container for views like explorer and search. Side bar sections are views nested within the side bar.'));
export const ACTIVITY_BAR_TOP_BORDER = registerColor('sideBarActivityBarTop.border', SIDE_BAR_SECTION_HEADER_BORDER, localize('sideBarActivityBarTopBorder', 'Border color between the activity bar at the top/bottom and the views.'));
export const SIDE_BAR_STICKY_SCROLL_BACKGROUND = registerColor('sideBarStickyScroll.background', SIDE_BAR_BACKGROUND, localize('sideBarStickyScrollBackground', 'Background color of sticky scroll in the side bar.'));
export const SIDE_BAR_STICKY_SCROLL_BORDER = registerColor('sideBarStickyScroll.border', null, localize('sideBarStickyScrollBorder', 'Border color of sticky scroll in the side bar.'));
export const SIDE_BAR_STICKY_SCROLL_SHADOW = registerColor('sideBarStickyScroll.shadow', scrollbarShadow, localize('sideBarStickyScrollShadow', 'Shadow color of sticky scroll in the side bar.'));
// < --- Title Bar --- >
export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBar.activeForeground', {
    dark: '#CCCCCC',
    light: '#333333',
    hcDark: '#FFFFFF',
    hcLight: '#292929',
}, localize('titleBarActiveForeground', 'Title bar foreground when the window is active.'));
export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBar.inactiveForeground', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
    hcDark: null,
    hcLight: '#292929',
}, localize('titleBarInactiveForeground', 'Title bar foreground when the window is inactive.'));
export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBar.activeBackground', {
    dark: '#3C3C3C',
    light: '#DDDDDD',
    hcDark: '#000000',
    hcLight: '#FFFFFF',
}, localize('titleBarActiveBackground', 'Title bar background when the window is active.'));
export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBar.inactiveBackground', {
    dark: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    light: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
    hcDark: null,
    hcLight: null,
}, localize('titleBarInactiveBackground', 'Title bar background when the window is inactive.'));
export const TITLE_BAR_BORDER = registerColor('titleBar.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('titleBarBorder', 'Title bar border color.'));
// < --- Menubar --- >
export const MENUBAR_SELECTION_FOREGROUND = registerColor('menubar.selectionForeground', TITLE_BAR_ACTIVE_FOREGROUND, localize('menubarSelectionForeground', 'Foreground color of the selected menu item in the menubar.'));
export const MENUBAR_SELECTION_BACKGROUND = registerColor('menubar.selectionBackground', {
    dark: toolbarHoverBackground,
    light: toolbarHoverBackground,
    hcDark: null,
    hcLight: null,
}, localize('menubarSelectionBackground', 'Background color of the selected menu item in the menubar.'));
export const MENUBAR_SELECTION_BORDER = registerColor('menubar.selectionBorder', {
    dark: null,
    light: null,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
}, localize('menubarSelectionBorder', 'Border color of the selected menu item in the menubar.'));
// < --- Command Center --- >
// foreground (inactive and active)
export const COMMAND_CENTER_FOREGROUND = registerColor('commandCenter.foreground', TITLE_BAR_ACTIVE_FOREGROUND, localize('commandCenter-foreground', 'Foreground color of the command center'), false);
export const COMMAND_CENTER_ACTIVEFOREGROUND = registerColor('commandCenter.activeForeground', MENUBAR_SELECTION_FOREGROUND, localize('commandCenter-activeForeground', 'Active foreground color of the command center'), false);
export const COMMAND_CENTER_INACTIVEFOREGROUND = registerColor('commandCenter.inactiveForeground', TITLE_BAR_INACTIVE_FOREGROUND, localize('commandCenter-inactiveForeground', 'Foreground color of the command center when the window is inactive'), false);
// background (inactive and active)
export const COMMAND_CENTER_BACKGROUND = registerColor('commandCenter.background', {
    dark: Color.white.transparent(0.05),
    hcDark: null,
    light: Color.black.transparent(0.05),
    hcLight: null,
}, localize('commandCenter-background', 'Background color of the command center'), false);
export const COMMAND_CENTER_ACTIVEBACKGROUND = registerColor('commandCenter.activeBackground', {
    dark: Color.white.transparent(0.08),
    hcDark: MENUBAR_SELECTION_BACKGROUND,
    light: Color.black.transparent(0.08),
    hcLight: MENUBAR_SELECTION_BACKGROUND,
}, localize('commandCenter-activeBackground', 'Active background color of the command center'), false);
// border: active and inactive. defaults to active background
export const COMMAND_CENTER_BORDER = registerColor('commandCenter.border', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.2),
    hcDark: contrastBorder,
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.2),
    hcLight: contrastBorder,
}, localize('commandCenter-border', 'Border color of the command center'), false);
export const COMMAND_CENTER_ACTIVEBORDER = registerColor('commandCenter.activeBorder', {
    dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.3),
    hcDark: TITLE_BAR_ACTIVE_FOREGROUND,
    light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.3),
    hcLight: TITLE_BAR_ACTIVE_FOREGROUND,
}, localize('commandCenter-activeBorder', 'Active border color of the command center'), false);
// border: defaults to active background
export const COMMAND_CENTER_INACTIVEBORDER = registerColor('commandCenter.inactiveBorder', transparent(TITLE_BAR_INACTIVE_FOREGROUND, 0.25), localize('commandCenter-inactiveBorder', 'Border color of the command center when the window is inactive'), false);
// < --- Notifications --- >
export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificationCenter.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('notificationCenterBorder', 'Notifications center border color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificationToast.border', {
    dark: widgetBorder,
    light: widgetBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('notificationToastBorder', 'Notification toast border color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_FOREGROUND = registerColor('notifications.foreground', editorWidgetForeground, localize('notificationsForeground', 'Notifications foreground color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_BACKGROUND = registerColor('notifications.background', editorWidgetBackground, localize('notificationsBackground', 'Notifications background color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_LINKS = registerColor('notificationLink.foreground', textLinkForeground, localize('notificationsLink', 'Notification links foreground color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificationCenterHeader.foreground', null, localize('notificationCenterHeaderForeground', 'Notifications center header foreground color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificationCenterHeader.background', {
    dark: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
    light: darken(NOTIFICATIONS_BACKGROUND, 0.05),
    hcDark: NOTIFICATIONS_BACKGROUND,
    hcLight: NOTIFICATIONS_BACKGROUND,
}, localize('notificationCenterHeaderBackground', 'Notifications center header background color. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_BORDER = registerColor('notifications.border', NOTIFICATIONS_CENTER_HEADER_BACKGROUND, localize('notificationsBorder', 'Notifications border color separating from other notifications in the notifications center. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificationsErrorIcon.foreground', editorErrorForeground, localize('notificationsErrorIconForeground', 'The color used for the icon of error notifications. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificationsWarningIcon.foreground', editorWarningForeground, localize('notificationsWarningIconForeground', 'The color used for the icon of warning notifications. Notifications slide in from the bottom right of the window.'));
export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificationsInfoIcon.foreground', editorInfoForeground, localize('notificationsInfoIconForeground', 'The color used for the icon of info notifications. Notifications slide in from the bottom right of the window.'));
export const WINDOW_ACTIVE_BORDER = registerColor('window.activeBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('windowActiveBorder', 'The color used for the border of the window when it is active on macOS or Linux. Requires custom title bar style and custom or hidden window controls on Linux.'));
export const WINDOW_INACTIVE_BORDER = registerColor('window.inactiveBorder', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('windowInactiveBorder', 'The color used for the border of the window when it is inactive on macOS or Linux. Requires custom title bar style and custom or hidden window controls on Linux.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL3RoZW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUNOLGFBQWEsRUFDYixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFdBQVcsRUFDWCxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLE9BQU8sRUFDUCxNQUFNLEVBQ04sV0FBVyxFQUNYLG9CQUFvQixFQUNwQixzQkFBc0IsRUFDdEIscUJBQXFCLEVBQ3JCLHVCQUF1QixFQUN2QixvQkFBb0IsRUFDcEIsc0JBQXNCLEVBQ3RCLGVBQWUsRUFDZiw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBQzdCLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsV0FBVyxFQUNYLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWxFLDJDQUEyQztBQUUzQyxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBa0I7SUFDdEQsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsS0FBSyxXQUFXLENBQUMsS0FBSztZQUNyQixPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEMsS0FBSyxXQUFXLENBQUMsbUJBQW1CO1lBQ25DLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxLQUFLLFdBQVcsQ0FBQyxrQkFBa0I7WUFDbEMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxD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