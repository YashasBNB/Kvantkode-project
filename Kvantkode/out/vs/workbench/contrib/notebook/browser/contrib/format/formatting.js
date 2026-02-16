/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize, localize2 } from '../../../../../../nls.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, } from '../../../../../../editor/browser/editorExtensions.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../../editor/browser/services/bulkEditService.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { formatDocumentWithSelectedProvider, getDocumentFormattingEditsWithSelectedProvider, } from '../../../../../../editor/contrib/format/browser/format.js';
import { Action2, MenuId, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../../platform/instantiation/common/instantiation.js';
import { Progress } from '../../../../../../platform/progress/common/progress.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../../controller/coreActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../../common/notebookContextKeys.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { INotebookExecutionService, } from '../../../common/notebookExecutionService.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchContributionsExtensions, } from '../../../../../common/contributions.js';
import { INotebookService } from '../../../common/notebookService.js';
import { CodeActionParticipantUtils } from '../saveParticipants/saveParticipants.js';
// format notebook
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.format',
            title: localize2('format.title', 'Format Notebook'),
            category: NOTEBOOK_ACTIONS_CATEGORY,
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE),
            keybinding: {
                when: EditorContextKeys.editorTextFocus.toNegated(),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            f1: true,
            menu: {
                id: MenuId.EditorContext,
                when: ContextKeyExpr.and(EditorContextKeys.inCompositeEditor, EditorContextKeys.hasDocumentFormattingProvider),
                group: '1_modification',
                order: 1.3,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const textModelService = accessor.get(ITextModelService);
        const editorWorkerService = accessor.get(IEditorWorkerService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const bulkEditService = accessor.get(IBulkEditService);
        const instantiationService = accessor.get(IInstantiationService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor || !editor.hasModel()) {
            return;
        }
        const notebook = editor.textModel;
        const formatApplied = await instantiationService.invokeFunction(CodeActionParticipantUtils.checkAndRunFormatCodeAction, notebook, Progress.None, CancellationToken.None);
        const disposable = new DisposableStore();
        try {
            if (!formatApplied) {
                const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                    const ref = await textModelService.createModelReference(cell.uri);
                    disposable.add(ref);
                    const model = ref.object.textEditorModel;
                    const formatEdits = await getDocumentFormattingEditsWithSelectedProvider(editorWorkerService, languageFeaturesService, model, 1 /* FormattingMode.Explicit */, CancellationToken.None);
                    const edits = [];
                    if (formatEdits) {
                        for (const edit of formatEdits) {
                            edits.push(new ResourceTextEdit(model.uri, edit, model.getVersionId()));
                        }
                        return edits;
                    }
                    return [];
                }));
                await bulkEditService.apply(/* edit */ allCellEdits.flat(), {
                    label: localize('label', 'Format Notebook'),
                    code: 'undoredo.formatNotebook',
                });
            }
        }
        finally {
            disposable.dispose();
        }
    }
});
// format cell
registerEditorAction(class FormatCellAction extends EditorAction {
    constructor() {
        super({
            id: 'notebook.formatCell',
            label: localize2('formatCell.label', 'Format Cell'),
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, EditorContextKeys.inCompositeEditor, EditorContextKeys.writable, EditorContextKeys.hasDocumentFormattingProvider),
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.301,
            },
        });
    }
    async run(accessor, editor) {
        if (editor.hasModel()) {
            const instaService = accessor.get(IInstantiationService);
            await instaService.invokeFunction(formatDocumentWithSelectedProvider, editor, 1 /* FormattingMode.Explicit */, Progress.None, CancellationToken.None, true);
        }
    }
});
let FormatOnCellExecutionParticipant = class FormatOnCellExecutionParticipant {
    constructor(bulkEditService, languageFeaturesService, textModelService, editorWorkerService, configurationService, _notebookService) {
        this.bulkEditService = bulkEditService;
        this.languageFeaturesService = languageFeaturesService;
        this.textModelService = textModelService;
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this._notebookService = _notebookService;
    }
    async onWillExecuteCell(executions) {
        const enabled = this.configurationService.getValue(NotebookSetting.formatOnCellExecution);
        if (!enabled) {
            return;
        }
        const disposable = new DisposableStore();
        try {
            const allCellEdits = await Promise.all(executions.map(async (cellExecution) => {
                const nbModel = this._notebookService.getNotebookTextModel(cellExecution.notebook);
                if (!nbModel) {
                    return [];
                }
                let activeCell;
                for (const cell of nbModel.cells) {
                    if (cell.handle === cellExecution.cellHandle) {
                        activeCell = cell;
                        break;
                    }
                }
                if (!activeCell) {
                    return [];
                }
                const ref = await this.textModelService.createModelReference(activeCell.uri);
                disposable.add(ref);
                const model = ref.object.textEditorModel;
                const formatEdits = await getDocumentFormattingEditsWithSelectedProvider(this.editorWorkerService, this.languageFeaturesService, model, 2 /* FormattingMode.Silent */, CancellationToken.None);
                const edits = [];
                if (formatEdits) {
                    edits.push(...formatEdits.map((edit) => new ResourceTextEdit(model.uri, edit, model.getVersionId())));
                    return edits;
                }
                return [];
            }));
            await this.bulkEditService.apply(/* edit */ allCellEdits.flat(), {
                label: localize('formatCells.label', 'Format Cells'),
                code: 'undoredo.notebooks.onWillExecuteFormat',
            });
        }
        finally {
            disposable.dispose();
        }
    }
};
FormatOnCellExecutionParticipant = __decorate([
    __param(0, IBulkEditService),
    __param(1, ILanguageFeaturesService),
    __param(2, ITextModelService),
    __param(3, IEditorWorkerService),
    __param(4, IConfigurationService),
    __param(5, INotebookService)
], FormatOnCellExecutionParticipant);
let CellExecutionParticipantsContribution = class CellExecutionParticipantsContribution extends Disposable {
    constructor(instantiationService, notebookExecutionService) {
        super();
        this.instantiationService = instantiationService;
        this.notebookExecutionService = notebookExecutionService;
        this.registerKernelExecutionParticipants();
    }
    registerKernelExecutionParticipants() {
        this._register(this.notebookExecutionService.registerExecutionParticipant(this.instantiationService.createInstance(FormatOnCellExecutionParticipant)));
    }
};
CellExecutionParticipantsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookExecutionService)
], CellExecutionParticipantsContribution);
export { CellExecutionParticipantsContribution };
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(CellExecutionParticipantsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2Zvcm1hdC9mb3JtYXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV4RixPQUFPLEVBQ04sWUFBWSxFQUNaLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDdkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUVOLGtDQUFrQyxFQUNsQyw4Q0FBOEMsR0FDOUMsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixlQUFlLEdBQ2YsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0YsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLGtFQUFrRSxD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