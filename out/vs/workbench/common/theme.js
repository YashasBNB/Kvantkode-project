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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vdGhlbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sYUFBYSxFQUNiLGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsV0FBVyxFQUNYLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsT0FBTyxFQUNQLE1BQU0sRUFDTixXQUFXLEVBQ1gsb0JBQW9CLEVBQ3BCLHNCQUFzQixFQUN0QixxQkFBcUIsRUFDckIsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEVBQ2hCLHNCQUFzQixFQUN0QixXQUFXLEVBQ1gsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLDhDQUE4QyxDQUFBO0FBRXJELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsMkNBQTJDO0FBRTNDLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFrQjtJQUN0RCxRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQixLQUFLLFdBQVcsQ0FBQyxLQUFLO1lBQ3JCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxLQUFLLFdBQVcsQ0FBQyxtQkFBbUI7WUFDbkMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hDLEtBQUssV0FBVyxDQUFDLGtCQUFrQjtZQUNsQyxPQUFPLEtBQUssQ0FB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