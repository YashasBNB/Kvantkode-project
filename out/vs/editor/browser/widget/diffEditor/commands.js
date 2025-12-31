/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { EditorAction2 } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { DiffEditorWidget } from './diffEditorWidget.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import './registrations.contribution.js';
export class ToggleCollapseUnchangedRegions extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleCollapseUnchangedRegions',
            title: localize2('toggleCollapseUnchangedRegions', 'Toggle Collapse Unchanged Regions'),
            icon: Codicon.map,
            toggled: ContextKeyExpr.has('config.diffEditor.hideUnchangedRegions.enabled'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            menu: {
                when: ContextKeyExpr.has('isInDiffEditor'),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
        configurationService.updateValue('diffEditor.hideUnchangedRegions.enabled', newValue);
    }
}
export class ToggleShowMovedCodeBlocks extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleShowMovedCodeBlocks',
            title: localize2('toggleShowMovedCodeBlocks', 'Toggle Show Moved Code Blocks'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.experimental.showMoves');
        configurationService.updateValue('diffEditor.experimental.showMoves', newValue);
    }
}
export class ToggleUseInlineViewWhenSpaceIsLimited extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.toggleUseInlineViewWhenSpaceIsLimited',
            title: localize2('toggleUseInlineViewWhenSpaceIsLimited', 'Toggle Use Inline View When Space Is Limited'),
            precondition: ContextKeyExpr.has('isInDiffEditor'),
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.useInlineViewWhenSpaceIsLimited');
        configurationService.updateValue('diffEditor.useInlineViewWhenSpaceIsLimited', newValue);
    }
}
const diffEditorCategory = localize2('diffEditor', 'Diff Editor');
export class SwitchSide extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.switchSide',
            title: localize2('switchSide', 'Switch Side'),
            icon: Codicon.arrowSwap,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, arg) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            if (arg && arg.dryRun) {
                return { destinationSelection: diffEditor.mapToOtherSide().destinationSelection };
            }
            else {
                diffEditor.switchSide();
            }
        }
        return undefined;
    }
}
export class ExitCompareMove extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.exitCompareMove',
            title: localize2('exitCompareMove', 'Exit Compare Move'),
            icon: Codicon.close,
            precondition: EditorContextKeys.comparingMovedCode,
            f1: false,
            category: diffEditorCategory,
            keybinding: {
                weight: 10000,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.exitCompareMove();
        }
    }
}
export class CollapseAllUnchangedRegions extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.collapseAllUnchangedRegions',
            title: localize2('collapseAllUnchangedRegions', 'Collapse All Unchanged Regions'),
            icon: Codicon.fold,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.collapseAllUnchangedRegions();
        }
    }
}
export class ShowAllUnchangedRegions extends EditorAction2 {
    constructor() {
        super({
            id: 'diffEditor.showAllUnchangedRegions',
            title: localize2('showAllUnchangedRegions', 'Show All Unchanged Regions'),
            icon: Codicon.unfold,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            f1: true,
            category: diffEditorCategory,
        });
    }
    runEditorCommand(accessor, editor, ...args) {
        const diffEditor = findFocusedDiffEditor(accessor);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.showAllUnchangedRegions();
        }
    }
}
export class RevertHunkOrSelection extends Action2 {
    constructor() {
        super({
            id: 'diffEditor.revert',
            title: localize2('revert', 'Revert'),
            f1: false,
            category: diffEditorCategory,
        });
    }
    run(accessor, arg) {
        const diffEditor = findDiffEditor(accessor, arg.originalUri, arg.modifiedUri);
        if (diffEditor instanceof DiffEditorWidget) {
            diffEditor.revertRangeMappings(arg.mapping.innerChanges ?? []);
        }
        return undefined;
    }
}
const accessibleDiffViewerCategory = localize2('accessibleDiffViewer', 'Accessible Diff Viewer');
export class AccessibleDiffViewerNext extends Action2 {
    static { this.id = 'editor.action.accessibleDiffViewer.next'; }
    constructor() {
        super({
            id: AccessibleDiffViewerNext.id,
            title: localize2('editor.action.accessibleDiffViewer.next', 'Go to Next Difference'),
            category: accessibleDiffViewerCategory,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            keybinding: {
                primary: 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            f1: true,
        });
    }
    run(accessor) {
        const diffEditor = findFocusedDiffEditor(accessor);
        diffEditor?.accessibleDiffViewerNext();
    }
}
export class AccessibleDiffViewerPrev extends Action2 {
    static { this.id = 'editor.action.accessibleDiffViewer.prev'; }
    constructor() {
        super({
            id: AccessibleDiffViewerPrev.id,
            title: localize2('editor.action.accessibleDiffViewer.prev', 'Go to Previous Difference'),
            category: accessibleDiffViewerCategory,
            precondition: ContextKeyExpr.has('isInDiffEditor'),
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            f1: true,
        });
    }
    run(accessor) {
        const diffEditor = findFocusedDiffEditor(accessor);
        diffEditor?.accessibleDiffViewerPrev();
    }
}
export function findDiffEditor(accessor, originalUri, modifiedUri) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const diffEditors = codeEditorService.listDiffEditors();
    return (diffEditors.find((diffEditor) => {
        const modified = diffEditor.getModifiedEditor();
        const original = diffEditor.getOriginalEditor();
        return (modified &&
            modified.getModel()?.uri.toString() === modifiedUri.toString() &&
            original &&
            original.getModel()?.uri.toString() === originalUri.toString());
    }) || null);
}
export function findFocusedDiffEditor(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const diffEditors = codeEditorService.listDiffEditors();
    const activeElement = getActiveElement();
    if (activeElement) {
        for (const d of diffEditors) {
            const container = d.getContainerDomNode();
            if (container.contains(activeElement)) {
                return d;
            }
        }
    }
    return null;
}
/**
 * If `editor` is the original or modified editor of a diff editor, it returns it.
 * It returns null otherwise.
 */
export function findDiffEditorContainingCodeEditor(accessor, editor) {
    if (!editor.getOption(63 /* EditorOption.inDiffEditor */)) {
        return null;
    }
    const codeEditorService = accessor.get(ICodeEditorService);
    for (const diffEditor of codeEditorService.listDiffEditors()) {
        const originalEditor = diffEditor.getOriginalEditor();
        const modifiedEditor = diffEditor.getModifiedEditor();
        if (originalEditor === editor || modifiedEditor === editor) {
            return diffEditor;
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHN0QsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSwyQkFBMkIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxpQ0FBaUMsQ0FBQTtBQUt4QyxNQUFNLE9BQU8sOEJBQStCLFNBQVEsT0FBTztJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQ0FBMkM7WUFDL0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxtQ0FBbUMsQ0FBQztZQUN2RixJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUc7WUFDakIsT0FBTyxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZ0RBQWdELENBQUM7WUFDN0UsWUFBWSxFQUFFLGNBQWMsQ0FBQyxH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