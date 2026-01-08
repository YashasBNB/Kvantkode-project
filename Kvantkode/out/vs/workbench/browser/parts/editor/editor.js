/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Dimension } from '../../../../base/browser/dom.js';
import { isObject } from '../../../../base/common/types.js';
import { BooleanVerifier, EnumVerifier, NumberVerifier, ObjectVerifier, SetVerifier, verifyObject, } from '../../../../base/common/verifier.js';
import { coalesce } from '../../../../base/common/arrays.js';
export const DEFAULT_EDITOR_MIN_DIMENSIONS = new Dimension(220, 70);
export const DEFAULT_EDITOR_MAX_DIMENSIONS = new Dimension(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
export const DEFAULT_EDITOR_PART_OPTIONS = {
    showTabs: 'multiple',
    highlightModifiedTabs: false,
    tabActionLocation: 'right',
    tabActionCloseVisibility: true,
    tabActionUnpinVisibility: true,
    alwaysShowEditorActions: false,
    tabSizing: 'fit',
    tabSizingFixedMinWidth: 50,
    tabSizingFixedMaxWidth: 160,
    pinnedTabSizing: 'normal',
    pinnedTabsOnSeparateRow: false,
    tabHeight: 'default',
    preventPinnedEditorClose: 'keyboardAndMouse',
    titleScrollbarSizing: 'default',
    focusRecentEditorAfterClose: true,
    showIcons: true,
    hasIcons: true, // 'vs-seti' is our default icon theme
    enablePreview: true,
    openPositioning: 'right',
    openSideBySideDirection: 'right',
    closeEmptyGroups: true,
    labelFormat: 'default',
    splitSizing: 'auto',
    splitOnDragAndDrop: true,
    dragToOpenWindow: true,
    centeredLayoutFixedWidth: false,
    doubleClickTabToToggleEditorGroupSizes: 'expand',
    editorActionsLocation: 'default',
    wrapTabs: false,
    enablePreviewFromQuickOpen: false,
    scrollToSwitchTabs: false,
    enablePreviewFromCodeNavigation: false,
    closeOnFileDelete: false,
    mouseBackForwardToNavigate: true,
    restoreViewState: true,
    splitInGroupLayout: 'horizontal',
    revealIfOpen: false,
    // Properties that are Objects have to be defined as getters
    // to ensure no consumer modifies the default values
    get limit() {
        return { enabled: false, value: 10, perEditorGroup: false, excludeDirty: false };
    },
    get decorations() {
        return { badges: true, colors: true };
    },
    get autoLockGroups() {
        return new Set();
    },
};
export function impactsEditorPartOptions(event) {
    return (event.affectsConfiguration('workbench.editor') ||
        event.affectsConfiguration('workbench.iconTheme') ||
        event.affectsConfiguration('window.density'));
}
export function getEditorPartOptions(configurationService, themeService) {
    const options = {
        ...DEFAULT_EDITOR_PART_OPTIONS,
        hasIcons: themeService.getFileIconTheme().hasFileIcons,
    };
    const config = configurationService.getValue();
    if (config?.workbench?.editor) {
        // Assign all primitive configuration over
        Object.assign(options, config.workbench.editor);
        // Special handle array types and convert to Set
        if (isObject(config.workbench.editor.autoLockGroups)) {
            options.autoLockGroups = DEFAULT_EDITOR_PART_OPTIONS.autoLockGroups;
            for (const [editorId, enablement] of Object.entries(config.workbench.editor.autoLockGroups)) {
                if (enablement === true) {
                    options.autoLockGroups.add(editorId);
                }
            }
        }
        else {
            options.autoLockGroups = DEFAULT_EDITOR_PART_OPTIONS.autoLockGroups;
        }
    }
    const windowConfig = configurationService.getValue();
    if (windowConfig?.window?.density?.editorTabHeight) {
        options.tabHeight = windowConfig.window.density.editorTabHeight;
    }
    return validateEditorPartOptions(options);
}
function validateEditorPartOptions(options) {
    // Migrate: Show tabs (config migration kicks in very late and can cause flicker otherwise)
    if (typeof options.showTabs === 'boolean') {
        options.showTabs = options.showTabs ? 'multiple' : 'single';
    }
    return verifyObject({
        wrapTabs: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['wrapTabs']),
        scrollToSwitchTabs: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['scrollToSwitchTabs']),
        highlightModifiedTabs: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['highlightModifiedTabs']),
        tabActionCloseVisibility: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionCloseVisibility']),
        tabActionUnpinVisibility: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionUnpinVisibility']),
        alwaysShowEditorActions: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['alwaysShowEditorActions']),
        pinnedTabsOnSeparateRow: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['pinnedTabsOnSeparateRow']),
        focusRecentEditorAfterClose: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['focusRecentEditorAfterClose']),
        showIcons: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['showIcons']),
        enablePreview: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreview']),
        enablePreviewFromQuickOpen: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreviewFromQuickOpen']),
        enablePreviewFromCodeNavigation: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['enablePreviewFromCodeNavigation']),
        closeOnFileDelete: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['closeOnFileDelete']),
        closeEmptyGroups: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['closeEmptyGroups']),
        revealIfOpen: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['revealIfOpen']),
        mouseBackForwardToNavigate: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['mouseBackForwardToNavigate']),
        restoreViewState: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['restoreViewState']),
        splitOnDragAndDrop: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitOnDragAndDrop']),
        dragToOpenWindow: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['dragToOpenWindow']),
        centeredLayoutFixedWidth: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['centeredLayoutFixedWidth']),
        hasIcons: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['hasIcons']),
        tabSizingFixedMinWidth: new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizingFixedMinWidth']),
        tabSizingFixedMaxWidth: new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizingFixedMaxWidth']),
        showTabs: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['showTabs'], [
            'multiple',
            'single',
            'none',
        ]),
        tabActionLocation: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabActionLocation'], [
            'left',
            'right',
        ]),
        tabSizing: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabSizing'], [
            'fit',
            'shrink',
            'fixed',
        ]),
        pinnedTabSizing: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['pinnedTabSizing'], [
            'normal',
            'compact',
            'shrink',
        ]),
        tabHeight: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['tabHeight'], ['default', 'compact']),
        preventPinnedEditorClose: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['preventPinnedEditorClose'], ['keyboardAndMouse', 'keyboard', 'mouse', 'never']),
        titleScrollbarSizing: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['titleScrollbarSizing'], [
            'default',
            'large',
        ]),
        openPositioning: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['openPositioning'], [
            'left',
            'right',
            'first',
            'last',
        ]),
        openSideBySideDirection: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['openSideBySideDirection'], ['right', 'down']),
        labelFormat: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['labelFormat'], [
            'default',
            'short',
            'medium',
            'long',
        ]),
        splitInGroupLayout: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitInGroupLayout'], [
            'vertical',
            'horizontal',
        ]),
        splitSizing: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['splitSizing'], [
            'distribute',
            'split',
            'auto',
        ]),
        doubleClickTabToToggleEditorGroupSizes: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['doubleClickTabToToggleEditorGroupSizes'], ['maximize', 'expand', 'off']),
        editorActionsLocation: new EnumVerifier(DEFAULT_EDITOR_PART_OPTIONS['editorActionsLocation'], ['default', 'titleBar', 'hidden']),
        autoLockGroups: new SetVerifier(DEFAULT_EDITOR_PART_OPTIONS['autoLockGroups']),
        limit: new ObjectVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit'], {
            enabled: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['enabled']),
            value: new NumberVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['value']),
            perEditorGroup: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['perEditorGroup']),
            excludeDirty: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['limit']['excludeDirty']),
        }),
        decorations: new ObjectVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations'], {
            badges: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations']['badges']),
            colors: new BooleanVerifier(DEFAULT_EDITOR_PART_OPTIONS['decorations']['colors']),
        }),
    }, options);
}
export function fillActiveEditorViewState(group, expectedActiveEditor, presetOptions) {
    if (!expectedActiveEditor ||
        !group.activeEditor ||
        expectedActiveEditor.matches(group.activeEditor)) {
        const options = {
            ...presetOptions,
            viewState: group.activeEditorPane?.getViewState(),
        };
        return options;
    }
    return presetOptions || Object.create(null);
}
export function prepareMoveCopyEditors(sourceGroup, editors, preserveFocus) {
    if (editors.length === 0) {
        return [];
    }
    const editorsWithOptions = [];
    let activeEditor;
    const inactiveEditors = [];
    for (const editor of editors) {
        if (!activeEditor && sourceGroup.isActive(editor)) {
            activeEditor = editor;
        }
        else {
            inactiveEditors.push(editor);
        }
    }
    if (!activeEditor) {
        activeEditor = inactiveEditors.shift(); // just take the first editor as active if none is active
    }
    // ensure inactive editors are then sorted by inverse visual order
    // so that we can preserve the order in the target group. we inverse
    // because editors will open to the side of the active editor as
    // inactive editors, and the active editor is always the reference
    inactiveEditors.sort((a, b) => sourceGroup.getIndexOfEditor(b) - sourceGroup.getIndexOfEditor(a));
    const sortedEditors = coalesce([activeEditor, ...inactiveEditors]);
    for (let i = 0; i < sortedEditors.length; i++) {
        const editor = sortedEditors[i];
        editorsWithOptions.push({
            editor,
            options: {
                pinned: true,
                sticky: sourceGroup.isSticky(editor),
                inactive: i > 0,
                preserveFocus,
            },
        });
    }
    return editorsWithOptions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBNEJoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFTM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzNELE9BQU8sRUFDTixlQUFlLEVBQ2YsWUFBWSxFQUNaLGNBQWMsRUFDZCxjQUFjLEVBQ2QsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLHFDQUFxQyxDQUFBO0FBTzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU01RCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxTQUFTLENBQ3pELE1BQU0sQ0FBQyxpQkFBaUIsRUFDeEIsTUFBTSxDQUFDLGlCQUFpQixDQUN4QixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQXVCO0lBQzlELFFBQVEsRUFBRSxVQUFVO0lBQ3BCLHFCQUFxQixFQUFFLEtBQUs7SUFDNUIsaUJBQWlCLEVBQUUsT0FBTztJQUMxQix3QkFBd0IsRUFBRSxJQUFJO0lBQzlCLHdCQUF3QixFQUFFLElBQUk7SUFDOUIsdUJBQXVCLEVBQUUsS0FBSztJQUM5QixTQUFTLEVBQUUsS0FBSztJQUNoQixzQkFBc0IsRUFBRSxFQUFFO0lBQzFCLHNCQUFzQixFQUFFLEdBQUc7SUFDM0IsZUFBZSxFQUFFLFFBQVE7SUFDekIsdUJBQXVCLEVBQUUsS0FBSztJQUM5QixTQUFTLEVBQUUsU0FBUztJQUNwQix3QkFB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