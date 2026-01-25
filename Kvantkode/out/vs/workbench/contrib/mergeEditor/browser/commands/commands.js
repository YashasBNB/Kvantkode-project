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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvY29tbWFuZHMvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxtREFBbUQsQ0FBQTtBQUVqRyxPQUFPLEVBQW9CLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsb0JBQW9CLEVBQ3BCLHNCQUFzQixFQUN0QiwyQkFBMkIsRUFDM0IsdUNBQXVDLEVBQ3ZDLHlCQUF5QixHQUN6QixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVwRixNQUFlLGlCQUFrQixTQUFRLE9BQU87SUFDL0Ms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