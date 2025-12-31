/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { MergeEditorInputData } from '../mergeEditorInput.js';
import { MergeEditor } from '../view/mergeEditor.js';
import { ctxIsMergeEditor, ctxMergeEditorLayout, ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop, ctxMergeEditorShowNonConflictingChanges, StorageCloseWithConflicts, } from '../../common/mergeEditor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
class MergeEditorAction extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            this.runWithViewModel(vm, accessor);
        }
    }
}
class MergeEditorAction2 extends Action2 {
    constructor(desc) {
        super(desc);
    }
    run(accessor, ...args) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            const vm = activeEditorPane.viewModel.get();
            if (!vm) {
                return;
            }
            return this.runWithMergeEditor({
                viewModel: vm,
                inputModel: activeEditorPane.inputModel.get(),
                input: activeEditorPane.input,
                editorIdentifier: {
                    editor: activeEditorPane.input,
                    groupId: activeEditorPane.group.id,
                },
            }, accessor, ...args);
        }
    }
}
export class OpenMergeEditor extends Action2 {
    constructor() {
        super({
            id: '_open.mergeEditor',
            title: localize2('title', 'Open Merge Editor'),
        });
    }
    run(accessor, ...args) {
        const validatedArgs = IRelaxedOpenArgs.validate(args[0]);
        const input = {
            base: { resource: validatedArgs.base },
            input1: {
                resource: validatedArgs.input1.uri,
                label: validatedArgs.input1.title,
                description: validatedArgs.input1.description,
                detail: validatedArgs.input1.detail,
            },
            input2: {
                resource: validatedArgs.input2.uri,
                label: validatedArgs.input2.title,
                description: validatedArgs.input2.description,
                detail: validatedArgs.input2.detail,
            },
            result: { resource: validatedArgs.output },
            options: { preserveFocus: true },
        };
        accessor.get(IEditorService).openEditor(input);
    }
}
var IRelaxedOpenArgs;
(function (IRelaxedOpenArgs) {
    function validate(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new TypeError('invalid argument');
        }
        const o = obj;
        const base = toUri(o.base);
        const output = toUri(o.output);
        const input1 = toInputData(o.input1);
        const input2 = toInputData(o.input2);
        return { base, input1, input2, output };
    }
    IRelaxedOpenArgs.validate = validate;
    function toInputData(obj) {
        if (typeof obj === 'string') {
            return new MergeEditorInputData(URI.parse(obj, true), undefined, undefined, undefined);
        }
        if (!obj || typeof obj !== 'object') {
            throw new TypeError('invalid argument');
        }
        if (isUriComponents(obj)) {
            return new MergeEditorInputData(URI.revive(obj), undefined, undefined, undefined);
        }
        const o = obj;
        const title = o.title;
        const uri = toUri(o.uri);
        const detail = o.detail;
        const description = o.description;
        return new MergeEditorInputData(uri, title, detail, description);
    }
    function toUri(obj) {
        if (typeof obj === 'string') {
            return URI.parse(obj, true);
        }
        else if (obj && typeof obj === 'object') {
            return URI.revive(obj);
        }
        throw new TypeError('invalid argument');
    }
    function isUriComponents(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        const o = obj;
        return (typeof o.scheme === 'string' &&
            typeof o.authority === 'string' &&
            typeof o.path === 'string' &&
            typeof o.query === 'string' &&
            typeof o.fragment === 'string');
    }
})(IRelaxedOpenArgs || (IRelaxedOpenArgs = {}));
export class SetMixedLayout extends Action2 {
    constructor() {
        super({
            id: 'merge.mixedLayout',
            title: localize2('layout.mixed', 'Mixed Layout'),
            toggled: ctxMergeEditorLayout.isEqualTo('mixed'),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '1_merge',
                    order: 9,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.setLayoutKind('mixed');
        }
    }
}
export class SetColumnLayout extends Action2 {
    constructor() {
        super({
            id: 'merge.columnLayout',
            title: localize2('layout.column', 'Column Layout'),
            toggled: ctxMergeEditorLayout.isEqualTo('columns'),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '1_merge',
                    order: 10,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.setLayoutKind('columns');
        }
    }
}
export class ShowNonConflictingChanges extends Action2 {
    constructor() {
        super({
            id: 'merge.showNonConflictingChanges',
            title: localize2('showNonConflictingChanges', 'Show Non-Conflicting Changes'),
            toggled: ctxMergeEditorShowNonConflictingChanges.isEqualTo(true),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: '3_merge',
                    order: 9,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowNonConflictingChanges();
        }
    }
}
export class ShowHideBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBase',
            title: localize2('layout.showBase', 'Show Base'),
            toggled: ctxMergeEditorShowBase.isEqualTo(true),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('columns')),
                    group: '2_merge',
                    order: 9,
                },
            ],
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleBase();
        }
    }
}
export class ShowHideTopBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBaseTop',
            title: localize2('layout.showBaseTop', 'Show Base Top'),
            toggled: ContextKeyExpr.and(ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('mixed')),
                    group: '2_merge',
                    order: 10,
                },
            ],
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowBaseTop();
        }
    }
}
export class ShowHideCenterBase extends Action2 {
    constructor() {
        super({
            id: 'merge.showBaseCenter',
            title: localize2('layout.showBaseCenter', 'Show Base Center'),
            toggled: ContextKeyExpr.and(ctxMergeEditorShowBase, ctxMergeEditorShowBaseAtTop.negate()),
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ctxIsMergeEditor, ctxMergeEditorLayout.isEqualTo('mixed')),
                    group: '2_merge',
                    order: 11,
                },
            ],
        });
    }
    run(accessor) {
        const { activeEditorPane } = accessor.get(IEditorService);
        if (activeEditorPane instanceof MergeEditor) {
            activeEditorPane.toggleShowBaseCenter();
        }
    }
}
const mergeEditorCategory = localize2('mergeEditor', 'Merge Editor');
export class OpenResultResource extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.openResult',
            icon: Codicon.goToFile,
            title: localize2('openfile', 'Open File'),
            category: mergeEditorCategory,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 1,
                },
            ],
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({ resource: viewModel.model.resultTextModel.uri });
    }
}
export class GoToNextUnhandledConflict extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.goToNextUnhandledConflict',
            category: mergeEditorCategory,
            title: localize2('merge.goToNextUnhandledConflict', 'Go to Next Unhandled Conflict'),
            icon: Codicon.arrowDown,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 3,
                },
            ],
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.model.telemetry.reportNavigationToNextConflict();
        viewModel.goToNextModifiedBaseRange((r) => !viewModel.model.isHandled(r).get());
    }
}
export class GoToPreviousUnhandledConflict extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.goToPreviousUnhandledConflict',
            category: mergeEditorCategory,
            title: localize2('merge.goToPreviousUnhandledConflict', 'Go to Previous Unhandled Conflict'),
            icon: Codicon.arrowUp,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ctxIsMergeEditor,
                    group: 'navigation',
                    order: 2,
                },
            ],
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.model.telemetry.reportNavigationToPreviousConflict();
        viewModel.goToPreviousModifiedBaseRange((r) => !viewModel.model.isHandled(r).get());
    }
}
export class ToggleActiveConflictInput1 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.toggleActiveConflictInput1',
            category: mergeEditorCategory,
            title: localize2('merge.toggleCurrentConflictFromLeft', 'Toggle Current Conflict from Left'),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.toggleActiveConflict(1);
    }
}
export class ToggleActiveConflictInput2 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.toggleActiveConflictInput2',
            category: mergeEditorCategory,
            title: localize2('merge.toggleCurrentConflictFromRight', 'Toggle Current Conflict from Right'),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.toggleActiveConflict(2);
    }
}
export class CompareInput1WithBaseCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.compareInput1WithBase',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.compareInput1WithBase', 'Compare Input 1 With Base'),
            shortTitle: localize('mergeEditor.compareWithBase', 'Compare With Base'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput1Toolbar, group: 'primary' },
            icon: Codicon.compareChanges,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        mergeEditorCompare(viewModel, editorService, 1);
    }
}
export class CompareInput2WithBaseCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.compareInput2WithBase',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.compareInput2WithBase', 'Compare Input 2 With Base'),
            shortTitle: localize('mergeEditor.compareWithBase', 'Compare With Base'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput2Toolbar, group: 'primary' },
            icon: Codicon.compareChanges,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const editorService = accessor.get(IEditorService);
        mergeEditorCompare(viewModel, editorService, 2);
    }
}
async function mergeEditorCompare(viewModel, editorService, inputNumber) {
    editorService.openEditor(editorService.activeEditor, { pinned: true });
    const model = viewModel.model;
    const base = model.base;
    const input = inputNumber === 1
        ? viewModel.inputCodeEditorView1.editor
        : viewModel.inputCodeEditorView2.editor;
    const lineNumber = input.getPosition().lineNumber;
    await editorService.openEditor({
        original: { resource: base.uri },
        modified: { resource: input.getModel().uri },
        options: {
            selection: {
                startLineNumber: lineNumber,
                startColumn: 1,
            },
            revealIfOpened: true,
            revealIfVisible: true,
        },
    });
}
export class OpenBaseFile extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.openBaseEditor',
            category: mergeEditorCategory,
            title: localize2('merge.openBaseEditor', 'Open Base File'),
            f1: true,
            precondition: ctxIsMergeEditor,
        });
    }
    runWithViewModel(viewModel, accessor) {
        const openerService = accessor.get(IOpenerService);
        openerService.open(viewModel.model.base.uri);
    }
}
export class AcceptAllInput1 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.acceptAllInput1',
            category: mergeEditorCategory,
            title: localize2('merge.acceptAllInput1', 'Accept All Changes from Left'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput1Toolbar, group: 'primary' },
            icon: Codicon.checkAll,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.acceptAll(1);
    }
}
export class AcceptAllInput2 extends MergeEditorAction {
    constructor() {
        super({
            id: 'merge.acceptAllInput2',
            category: mergeEditorCategory,
            title: localize2('merge.acceptAllInput2', 'Accept All Changes from Right'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInput2Toolbar, group: 'primary' },
            icon: Codicon.checkAll,
        });
    }
    runWithViewModel(viewModel) {
        viewModel.acceptAll(2);
    }
}
export class ResetToBaseAndAutoMergeCommand extends MergeEditorAction {
    constructor() {
        super({
            id: 'mergeEditor.resetResultToBaseAndAutoMerge',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.resetResultToBaseAndAutoMerge', 'Reset Result'),
            shortTitle: localize('mergeEditor.resetResultToBaseAndAutoMerge.short', 'Reset'),
            f1: true,
            precondition: ctxIsMergeEditor,
            menu: { id: MenuId.MergeInputResultToolbar, group: 'primary' },
            icon: Codicon.discard,
        });
    }
    runWithViewModel(viewModel, accessor) {
        viewModel.model.reset();
    }
}
export class ResetCloseWithConflictsChoice extends Action2 {
    constructor() {
        super({
            id: 'mergeEditor.resetCloseWithConflictsChoice',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.resetChoice', "Reset Choice for \'Close with Conflicts\'"),
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove(StorageCloseWithConflicts, 0 /* StorageScope.PROFILE */);
    }
}
// this is an API command
export class AcceptMerge extends MergeEditorAction2 {
    constructor() {
        super({
            id: 'mergeEditor.acceptMerge',
            category: mergeEditorCategory,
            title: localize2('mergeEditor.acceptMerge', 'Complete Merge'),
            f1: false,
            precondition: ctxIsMergeEditor,
        });
    }
    async runWithMergeEditor({ inputModel, editorIdentifier, viewModel }, accessor) {
        const dialogService = accessor.get(IDialogService);
        const editorService = accessor.get(IEditorService);
        if (viewModel.model.unhandledConflictsCount.get() > 0) {
            const { confirmed } = await dialogService.confirm({
                message: localize('mergeEditor.acceptMerge.unhandledConflicts.message', 'Do you want to complete the merge of {0}?', basename(inputModel.resultUri)),
                detail: localize('mergeEditor.acceptMerge.unhandledConflicts.detail', 'The file contains unhandled conflicts.'),
                primaryButton: localize({
                    key: 'mergeEditor.acceptMerge.unhandledConflicts.accept',
                    comment: ['&& denotes a mnemonic'],
                }, '&&Complete with Conflicts'),
            });
            if (!confirmed) {
                return {
                    successful: false,
                };
            }
        }
        await inputModel.accept();
        await editorService.closeEditor(editorIdentifier);
        return {
            successful: true,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL2NvbW1hbmRzL2NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sbURBQW1ELENBQUE7QUFFakcsT0FBTyxFQUFvQixvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRS9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVwRCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQixzQkFBc0IsRUFDdEIsMkJBQTJCLEVBQzNCLHVDQUF1QyxFQUN2Qyx5QkFBeUIsR0FDekIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFcEYsTUFBZSxpQkFBa0IsU0FBUSxPQUFPO0lBQy9DLFlBQVks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