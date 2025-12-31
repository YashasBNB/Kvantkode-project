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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTRCaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBUzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUczRCxPQUFPLEVBQ04sZUFBZSxFQUNmLFlBQVksRUFDWixjQUFjLEVBQ2QsY0FBYyxFQUNkLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSxxQ0FBcUMsQ0FBQTtBQU81QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFNNUQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBQ25FLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksU0FBUyxDQUN6RCxNQUFNLENBQUMsaUJBQWlCLEVBQ3hCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDeEIsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUF1QjtJQUM5RCxRQUFRLEVBQUUsVUFBVTtJQUNwQixxQkFBcUIsRUFBRSxLQUFLO0lBQzVCLGlCQUFpQixFQUFFLE9BQU87SUFDMUIsd0JBQXdCLEVBQUUsSUFBSTtJQUM5Qix3QkFBd0IsRUFBRSxJQUFJO0lBQzlCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsU0FBUyxFQUFFLEtBQUs7SUFDaEIsc0JBQXNCLEVBQUUsRUFBRTtJQUMxQixzQkFBc0IsRUFBRSxHQUFHO0lBQzNCLGVBQWUsRUFBRSxRQUFRO0lBQ3pCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsU0FBUyxFQUFFLFNBQVM7SUFDcEIsd0JBQXdCLEVB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