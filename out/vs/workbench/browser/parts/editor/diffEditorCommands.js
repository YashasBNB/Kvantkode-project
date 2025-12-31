/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { TextDiffEditor } from './textDiffEditor.js';
import { ActiveCompareEditorCanSwapContext, TextCompareEditorActiveContext, TextCompareEditorVisibleContext, } from '../../../common/contextkeys.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
export const TOGGLE_DIFF_SIDE_BY_SIDE = 'toggle.diff.renderSideBySide';
export const GOTO_NEXT_CHANGE = 'workbench.action.compareEditor.nextChange';
export const GOTO_PREVIOUS_CHANGE = 'workbench.action.compareEditor.previousChange';
export const DIFF_FOCUS_PRIMARY_SIDE = 'workbench.action.compareEditor.focusPrimarySide';
export const DIFF_FOCUS_SECONDARY_SIDE = 'workbench.action.compareEditor.focusSecondarySide';
export const DIFF_FOCUS_OTHER_SIDE = 'workbench.action.compareEditor.focusOtherSide';
export const DIFF_OPEN_SIDE = 'workbench.action.compareEditor.openSide';
export const TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE = 'toggle.diff.ignoreTrimWhitespace';
export const DIFF_SWAP_SIDES = 'workbench.action.compareEditor.swapSides';
export function registerDiffEditorCommands() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: GOTO_NEXT_CHANGE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: TextCompareEditorVisibleContext,
        primary: 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */,
        handler: (accessor, ...args) => navigateInDiffEditor(accessor, args, true),
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: GOTO_NEXT_CHANGE,
            title: localize2('compare.nextChange', 'Go to Next Change'),
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: GOTO_PREVIOUS_CHANGE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: TextCompareEditorVisibleContext,
        primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
        handler: (accessor, ...args) => navigateInDiffEditor(accessor, args, false),
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: GOTO_PREVIOUS_CHANGE,
            title: localize2('compare.previousChange', 'Go to Previous Change'),
        },
    });
    function getActiveTextDiffEditor(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const resource = args.length > 0 && args[0] instanceof URI ? args[0] : undefined;
        for (const editor of [editorService.activeEditorPane, ...editorService.visibleEditorPanes]) {
            if (editor instanceof TextDiffEditor &&
                (!resource ||
                    (editor.input instanceof DiffEditorInput &&
                        isEqual(editor.input.primary.resource, resource)))) {
                return editor;
            }
        }
        return undefined;
    }
    function navigateInDiffEditor(accessor, args, next) {
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        if (activeTextDiffEditor) {
            activeTextDiffEditor.getControl()?.goToDiff(next ? 'next' : 'previous');
        }
    }
    let FocusTextDiffEditorMode;
    (function (FocusTextDiffEditorMode) {
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Original"] = 0] = "Original";
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Modified"] = 1] = "Modified";
        FocusTextDiffEditorMode[FocusTextDiffEditorMode["Toggle"] = 2] = "Toggle";
    })(FocusTextDiffEditorMode || (FocusTextDiffEditorMode = {}));
    function focusInDiffEditor(accessor, args, mode) {
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        if (activeTextDiffEditor) {
            switch (mode) {
                case FocusTextDiffEditorMode.Original:
                    activeTextDiffEditor.getControl()?.getOriginalEditor().focus();
                    break;
                case FocusTextDiffEditorMode.Modified:
                    activeTextDiffEditor.getControl()?.getModifiedEditor().focus();
                    break;
                case FocusTextDiffEditorMode.Toggle:
                    if (activeTextDiffEditor.getControl()?.getModifiedEditor().hasWidgetFocus()) {
                        return focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Original);
                    }
                    else {
                        return focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Modified);
                    }
            }
        }
    }
    function toggleDiffSideBySide(accessor, args) {
        const configService = accessor.get(ITextResourceConfigurationService);
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        const m = activeTextDiffEditor?.getControl()?.getModifiedEditor()?.getModel();
        if (!m) {
            return;
        }
        const key = 'diffEditor.renderSideBySide';
        const val = configService.getValue(m.uri, key);
        configService.updateValue(m.uri, key, !val);
    }
    function toggleDiffIgnoreTrimWhitespace(accessor, args) {
        const configService = accessor.get(ITextResourceConfigurationService);
        const activeTextDiffEditor = getActiveTextDiffEditor(accessor, args);
        const m = activeTextDiffEditor?.getControl()?.getModifiedEditor()?.getModel();
        if (!m) {
            return;
        }
        const key = 'diffEditor.ignoreTrimWhitespace';
        const val = configService.getValue(m.uri, key);
        configService.updateValue(m.uri, key, !val);
    }
    async function swapDiffSides(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const diffEditor = getActiveTextDiffEditor(accessor, args);
        const activeGroup = diffEditor?.group;
        const diffInput = diffEditor?.input;
        if (!diffEditor ||
            typeof activeGroup === 'undefined' ||
            !(diffInput instanceof DiffEditorInput) ||
            !diffInput.modified.resource) {
            return;
        }
        const untypedDiffInput = diffInput.toUntyped({
            preserveViewState: activeGroup.id,
            preserveResource: true,
        });
        if (!untypedDiffInput) {
            return;
        }
        // Since we are about to replace the diff editor, make
        // sure to first open the modified side if it is not
        // yet opened. This ensures that the swapping is not
        // bringing up a confirmation dialog to save.
        if (diffInput.modified.isModified() &&
            editorService.findEditors({
                resource: diffInput.modified.resource,
                typeId: diffInput.modified.typeId,
                editorId: diffInput.modified.editorId,
            }).length === 0) {
            await editorService.openEditor({
                ...untypedDiffInput.modified,
                options: {
                    ...untypedDiffInput.modified.options,
                    pinned: true,
                    inactive: true,
                },
            }, activeGroup);
        }
        // Replace the input with the swapped variant
        await editorService.replaceEditors([
            {
                editor: diffInput,
                replacement: {
                    ...untypedDiffInput,
                    original: untypedDiffInput.modified,
                    modified: untypedDiffInput.original,
                    options: {
                        ...untypedDiffInput.options,
                        pinned: true,
                    },
                },
            },
        ], activeGroup);
    }
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_DIFF_SIDE_BY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => toggleDiffSideBySide(accessor, args),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_PRIMARY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Modified),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_SECONDARY_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Original),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_FOCUS_OTHER_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => focusInDiffEditor(accessor, args, FocusTextDiffEditorMode.Toggle),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => toggleDiffIgnoreTrimWhitespace(accessor, args),
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_SWAP_SIDES,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => swapDiffSides(accessor, args),
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: TOGGLE_DIFF_SIDE_BY_SIDE,
            title: localize2('toggleInlineView', 'Toggle Inline View'),
            category: localize('compare', 'Compare'),
        },
        when: TextCompareEditorActiveContext,
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: DIFF_SWAP_SIDES,
            title: localize2('swapDiffSides', 'Swap Left and Right Editor Side'),
            category: localize('compare', 'Compare'),
        },
        when: ContextKeyExpr.and(TextCompareEditorActiveContext, ActiveCompareEditorCanSwapContext),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2RpZmZFZGl0b3JDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLDhCQUE4QixDQUFBO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLDJDQUEyQyxDQUFBO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLCtDQUErQyxDQUFBO0FBQ25GLE1BQU0sQ0FBQyxNQUFNLHVCQUF1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