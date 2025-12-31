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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0dGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9mb3JtYXQvZm9ybWF0dGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFeEYsT0FBTyxFQUNOLFlBQVksRUFDWixvQkFBb0IsR0FDcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFFTixrQ0FBa0MsRUFDbEMsOENBQThDLEdBQzlDLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzNGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSxrRUFBa0UsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsUUFB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