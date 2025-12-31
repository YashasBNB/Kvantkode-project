/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../base/common/keyCodes.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { CommandExecutor } from '../../../../../editor/common/cursor/cursor.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { LineCommentCommand, } from '../../../../../editor/contrib/comment/browser/lineCommentCommand.js';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, InputFocusedContextKey, } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService, } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { InlineChatController } from '../../../inlineChat/browser/inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED } from '../../../inlineChat/common/inlineChat.js';
import { changeCellToKind, runDeleteAction } from './cellOperations.js';
import { CELL_TITLE_CELL_GROUP_ID, CELL_TITLE_OUTPUT_GROUP_ID, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NotebookAction, NotebookCellAction, NotebookMultiCellAction, executeNotebookCondition, findTargetCellEditor, } from './coreActions.js';
import { NotebookChangeTabDisplaySize, NotebookIndentUsingSpaces, NotebookIndentUsingTabs, NotebookIndentationToSpacesAction, NotebookIndentationToTabsAction, } from './notebookIndentationActions.js';
import { CHANGE_CELL_LANGUAGE, CellEditState, DETECT_CELL_LANGUAGE, QUIT_EDIT_CELL_COMMAND_ID, getNotebookEditorFromEditorPane, } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting, } from '../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_HAS_OUTPUTS, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON, } from '../../common/notebookContextKeys.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { NotebookInlineVariablesController } from '../contrib/notebookVariables/notebookInlineVariables.js';
const CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID = 'notebook.clearAllCellsOutputs';
const EDIT_CELL_COMMAND_ID = 'notebook.cell.edit';
const DELETE_CELL_COMMAND_ID = 'notebook.cell.delete';
export const CLEAR_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.clearOutputs';
export const SELECT_NOTEBOOK_INDENTATION_ID = 'notebook.selectIndentation';
export const COMMENT_SELECTED_CELLS_ID = 'notebook.commentSelectedCells';
registerAction2(class EditCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: EDIT_CELL_COMMAND_ID,
            title: localize('notebookActions.editCell', 'Edit Cell'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), EditorContextKeys.hoverFocused.toNegated(), NOTEBOOK_OUTPUT_INPUT_FOCUSED.toNegated()),
                primary: 3 /* KeyCode.Enter */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.toNegated(), NOTEBOOK_CELL_EDITABLE),
                order: 1 /* CellToolbarOrder.EditCell */,
                group: CELL_TITLE_CELL_GROUP_ID,
            },
            icon: icons.editIcon,
        });
    }
    async runWithContext(accessor, context) {
        if (!context.notebookEditor.hasModel()) {
            return;
        }
        await context.notebookEditor.focusNotebookCell(context.cell, 'editor');
        const foundEditor = context.cell
            ? findTargetCellEditor(context, context.cell)
            : undefined;
        if (foundEditor &&
            foundEditor.hasTextFocus() &&
            InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber ===
                foundEditor.getPosition()?.lineNumber) {
            InlineChatController.get(foundEditor)?.focus();
        }
    }
});
const quitEditCondition = ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext, CTX_INLINE_CHAT_FOCUSED.toNegated());
registerAction2(class QuitEditCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: QUIT_EDIT_CELL_COMMAND_ID,
            title: localize('notebookActions.quitEdit', 'Stop Editing Cell'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_EDITABLE),
                order: 4 /* CellToolbarOrder.SaveCell */,
                group: CELL_TITLE_CELL_GROUP_ID,
            },
            icon: icons.stopEditIcon,
            keybinding: [
                {
                    when: ContextKeyExpr.and(quitEditCondition, EditorContextKeys.hoverVisible.toNegated(), EditorContextKeys.hasNonEmptySelection.toNegated(), EditorContextKeys.hasMultipleSelections.toNegated()),
                    primary: 9 /* KeyCode.Escape */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT - 5,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                    primary: 9 /* KeyCode.Escape */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
                },
                {
                    when: ContextKeyExpr.and(quitEditCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                    win: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                    },
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT - 5,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell.cellKind === CellKind.Markup) {
            context.cell.updateEditState(CellEditState.Preview, QUIT_EDIT_CELL_COMMAND_ID);
        }
        await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
            skipReveal: true,
        });
    }
});
registerAction2(class DeleteCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: DELETE_CELL_COMMAND_ID,
            title: localize('notebookActions.deleteCell', 'Delete Cell'),
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                },
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_INPUT_FOCUSED.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.NotebookCellDelete,
                    when: NOTEBOOK_EDITOR_EDITABLE,
                    group: CELL_TITLE_CELL_GROUP_ID,
                },
                {
                    id: MenuId.InteractiveCellDelete,
                    group: CELL_TITLE_CELL_GROUP_ID,
                },
            ],
            icon: icons.deleteCellIcon,
        });
    }
    async runWithContext(accessor, context) {
        if (!context.notebookEditor.hasModel()) {
            return;
        }
        let confirmation;
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const runState = notebookExecutionStateService.getCellExecution(context.cell.uri)?.state;
        const configService = accessor.get(IConfigurationService);
        if (runState === NotebookCellExecutionState.Executing &&
            configService.getValue(NotebookSetting.confirmDeleteRunningCell)) {
            const dialogService = accessor.get(IDialogService);
            const primaryButton = localize('confirmDeleteButton', 'Delete');
            confirmation = await dialogService.confirm({
                type: 'question',
                message: localize('confirmDeleteButtonMessage', 'This cell is running, are you sure you want to delete it?'),
                primaryButton: primaryButton,
                checkbox: {
                    label: localize('doNotAskAgain', 'Do not ask me again'),
                },
            });
        }
        else {
            confirmation = { confirmed: true };
        }
        if (!confirmation.confirmed) {
            return;
        }
        if (confirmation.checkboxChecked === true) {
            await configService.updateValue(NotebookSetting.confirmDeleteRunningCell, false);
        }
        runDeleteAction(context.notebookEditor, context.cell);
    }
});
registerAction2(class ClearCellOutputsAction extends NotebookCellAction {
    constructor() {
        super({
            id: CLEAR_CELL_OUTPUTS_COMMAND_ID,
            title: localize('clearCellOutputs', 'Clear Cell Outputs'),
            menu: [
                {
                    id: MenuId.NotebookCellTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('code'), executeNotebookCondition, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON.toNegated()),
                    order: 6 /* CellToolbarOrder.ClearCellOutput */,
                    group: CELL_TITLE_OUTPUT_GROUP_ID,
                },
                {
                    id: MenuId.NotebookOutputToolbar,
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON),
                },
            ],
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            icon: icons.clearIcon,
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const editor = context.notebookEditor;
        if (!editor.hasModel() || !editor.textModel.length) {
            return;
        }
        const cell = context.cell;
        const index = editor.textModel.cells.indexOf(cell.model);
        if (index < 0) {
            return;
        }
        const computeUndoRedo = !editor.isReadOnly;
        editor.textModel.applyEdits([{ editType: 2 /* CellEditType.Output */, index, outputs: [] }], true, undefined, () => undefined, undefined, computeUndoRedo);
        const runState = notebookExecutionStateService.getCellExecution(context.cell.uri)?.state;
        if (runState !== NotebookCellExecutionState.Executing) {
            context.notebookEditor.textModel.applyEdits([
                {
                    editType: 9 /* CellEditType.PartialInternalMetadata */,
                    index,
                    internalMetadata: {
                        runStartTime: null,
                        runStartTimeAdjustment: null,
                        runEndTime: null,
                        executionOrder: null,
                        lastRunSuccess: null,
                    },
                },
            ], true, undefined, () => undefined, undefined, computeUndoRedo);
        }
    }
});
registerAction2(class ClearAllCellOutputsAction extends NotebookAction {
    constructor() {
        super({
            id: CLEAR_ALL_CELLS_OUTPUTS_COMMAND_ID,
            title: localize('clearAllCellsOutputs', 'Clear All Outputs'),
            precondition: NOTEBOOK_HAS_OUTPUTS,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0,
                },
                {
                    id: MenuId.NotebookToolbar,
                    when: ContextKeyExpr.and(executeNotebookCondition, ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 10,
                },
            ],
            icon: icons.clearIcon,
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const editor = context.notebookEditor;
        if (!editor.hasModel() || !editor.textModel.length) {
            return;
        }
        const computeUndoRedo = !editor.isReadOnly;
        editor.textModel.applyEdits(editor.textModel.cells.map((cell, index) => ({
            editType: 2 /* CellEditType.Output */,
            index,
            outputs: [],
        })), true, undefined, () => undefined, undefined, computeUndoRedo);
        const clearExecutionMetadataEdits = editor.textModel.cells
            .map((cell, index) => {
            const runState = notebookExecutionStateService.getCellExecution(cell.uri)?.state;
            if (runState !== NotebookCellExecutionState.Executing) {
                return {
                    editType: 9 /* CellEditType.PartialInternalMetadata */,
                    index,
                    internalMetadata: {
                        runStartTime: null,
                        runStartTimeAdjustment: null,
                        runEndTime: null,
                        executionOrder: null,
                        lastRunSuccess: null,
                    },
                };
            }
            else {
                return undefined;
            }
        })
            .filter((edit) => !!edit);
        if (clearExecutionMetadataEdits.length) {
            context.notebookEditor.textModel.applyEdits(clearExecutionMetadataEdits, true, undefined, () => undefined, undefined, computeUndoRedo);
        }
        const controller = editor.getContribution(NotebookInlineVariablesController.id);
        controller.clearNotebookInlineDecorations();
    }
});
registerAction2(class ChangeCellLanguageAction extends NotebookCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_LANGUAGE,
            title: localize('changeLanguage', 'Change Cell Language'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 43 /* KeyCode.KeyM */),
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
            },
            metadata: {
                description: localize('changeLanguage', 'Change Cell Language'),
                args: [
                    {
                        name: 'range',
                        description: 'The cell range',
                        schema: {
                            type: 'object',
                            required: ['start', 'end'],
                            properties: {
                                start: {
                                    type: 'number',
                                },
                                end: {
                                    type: 'number',
                                },
                            },
                        },
                    },
                    {
                        name: 'language',
                        description: 'The target cell language',
                        schema: {
                            type: 'string',
                        },
                    },
                ],
            },
        });
    }
    getCellContextFromArgs(accessor, context, ...additionalArgs) {
        if (!context ||
            typeof context.start !== 'number' ||
            typeof context.end !== 'number' ||
            context.start >= context.end) {
            return;
        }
        const language = additionalArgs.length && typeof additionalArgs[0] === 'string'
            ? additionalArgs[0]
            : undefined;
        const activeEditorContext = this.getEditorContextFromArgsOrActive(accessor);
        if (!activeEditorContext ||
            !activeEditorContext.notebookEditor.hasModel() ||
            context.start >= activeEditorContext.notebookEditor.getLength()) {
            return;
        }
        // TODO@rebornix, support multiple cells
        return {
            notebookEditor: activeEditorContext.notebookEditor,
            cell: activeEditorContext.notebookEditor.cellAt(context.start),
            language,
        };
    }
    async runWithContext(accessor, context) {
        if (context.language) {
            await this.setLanguage(context, context.language);
        }
        else {
            await this.showLanguagePicker(accessor, context);
        }
    }
    async showLanguagePicker(accessor, context) {
        const topItems = [];
        const mainItems = [];
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const quickInputService = accessor.get(IQuickInputService);
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const kernelService = accessor.get(INotebookKernelService);
        let languages = context.notebookEditor.activeKernel?.supportedLanguages;
        if (!languages) {
            const matchResult = kernelService.getMatchingKernel(context.notebookEditor.textModel);
            const allSupportedLanguages = matchResult.all.flatMap((kernel) => kernel.supportedLanguages);
            languages =
                allSupportedLanguages.length > 0
                    ? allSupportedLanguages
                    : languageService.getRegisteredLanguageIds();
        }
        const providerLanguages = new Set([...languages, 'markdown']);
        providerLanguages.forEach((languageId) => {
            let description;
            if (context.cell.cellKind === CellKind.Markup
                ? languageId === 'markdown'
                : languageId === context.cell.language) {
                description = localize('languageDescription', '({0}) - Current Language', languageId);
            }
            else {
                description = localize('languageDescriptionConfigured', '({0})', languageId);
            }
            const languageName = languageService.getLanguageName(languageId);
            if (!languageName) {
                // Notebook has unrecognized language
                return;
            }
            const item = {
                label: languageName,
                iconClasses: getIconClasses(modelService, languageService, this.getFakeResource(languageName, languageService)),
                description,
                languageId,
            };
            if (languageId === 'markdown' || languageId === context.cell.language) {
                topItems.push(item);
            }
            else {
                mainItems.push(item);
            }
        });
        mainItems.sort((a, b) => {
            return a.description.localeCompare(b.description);
        });
        // Offer to "Auto Detect"
        const autoDetectMode = {
            label: localize('autoDetect', 'Auto Detect'),
        };
        const picks = [
            autoDetectMode,
            { type: 'separator', label: localize('languagesPicks', 'languages (identifier)') },
            ...topItems,
            { type: 'separator' },
            ...mainItems,
        ];
        const selection = await quickInputService.pick(picks, {
            placeHolder: localize('pickLanguageToConfigure', 'Select Language Mode'),
        });
        const languageId = selection === autoDetectMode
            ? await languageDetectionService.detectLanguage(context.cell.uri)
            : selection?.languageId;
        if (languageId) {
            await this.setLanguage(context, languageId);
        }
    }
    async setLanguage(context, languageId) {
        await setCellToLanguage(languageId, context);
    }
    /**
     * Copied from editorStatus.ts
     */
    getFakeResource(lang, languageService) {
        let fakeResource;
        const languageId = languageService.getLanguageIdByLanguageName(lang);
        if (languageId) {
            const extensions = languageService.getExtensions(languageId);
            if (extensions.length) {
                fakeResource = URI.file(extensions[0]);
            }
            else {
                const filenames = languageService.getFilenames(languageId);
                if (filenames.length) {
                    fakeResource = URI.file(filenames[0]);
                }
            }
        }
        return fakeResource;
    }
});
registerAction2(class DetectCellLanguageAction extends NotebookCellAction {
    constructor() {
        super({
            id: DETECT_CELL_LANGUAGE,
            title: localize2('detectLanguage', 'Accept Detected Language for Cell'),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
            keybinding: {
                primary: 34 /* KeyCode.KeyD */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const languageDetectionService = accessor.get(ILanguageDetectionService);
        const notificationService = accessor.get(INotificationService);
        const kernelService = accessor.get(INotebookKernelService);
        const kernel = kernelService.getSelectedOrSuggestedKernel(context.notebookEditor.textModel);
        const providerLanguages = [...(kernel?.supportedLanguages ?? [])];
        providerLanguages.push('markdown');
        const detection = await languageDetectionService.detectLanguage(context.cell.uri, providerLanguages);
        if (detection) {
            setCellToLanguage(detection, context);
        }
        else {
            notificationService.warn(localize('noDetection', 'Unable to detect cell language'));
        }
    }
});
async function setCellToLanguage(languageId, context) {
    if (languageId === 'markdown' && context.cell?.language !== 'markdown') {
        const idx = context.notebookEditor.getCellIndex(context.cell);
        await changeCellToKind(CellKind.Markup, { cell: context.cell, notebookEditor: context.notebookEditor, ui: true }, 'markdown', Mimes.markdown);
        const newCell = context.notebookEditor.cellAt(idx);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
    else if (languageId !== 'markdown' && context.cell?.cellKind === CellKind.Markup) {
        await changeCellToKind(CellKind.Code, { cell: context.cell, notebookEditor: context.notebookEditor, ui: true }, languageId);
    }
    else {
        const index = context.notebookEditor.textModel.cells.indexOf(context.cell.model);
        context.notebookEditor.textModel.applyEdits([{ editType: 4 /* CellEditType.CellLanguage */, index, language: languageId }], true, undefined, () => undefined, undefined, !context.notebookEditor.isReadOnly);
    }
}
registerAction2(class SelectNotebookIndentation extends NotebookAction {
    constructor() {
        super({
            id: SELECT_NOTEBOOK_INDENTATION_ID,
            title: localize2('selectNotebookIndentation', 'Select Indentation'),
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
        });
    }
    async runWithContext(accessor, context) {
        await this.showNotebookIndentationPicker(accessor, context);
    }
    async showNotebookIndentationPicker(accessor, context) {
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const activeNotebook = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!activeNotebook || activeNotebook.isDisposed) {
            return quickInputService.pick([
                { label: localize('noNotebookEditor', 'No notebook editor active at this time') },
            ]);
        }
        if (activeNotebook.isReadOnly) {
            return quickInputService.pick([
                { label: localize('noWritableCodeEditor', 'The active notebook editor is read-only.') },
            ]);
        }
        const picks = [
            new NotebookIndentUsingTabs(), // indent using tabs
            new NotebookIndentUsingSpaces(), // indent using spaces
            new NotebookChangeTabDisplaySize(), // change tab size
            new NotebookIndentationToTabsAction(), // convert indentation to tabs
            new NotebookIndentationToSpacesAction(), // convert indentation to spaces
        ].map((item) => {
            return {
                id: item.desc.id,
                label: item.desc.title.toString(),
                run: () => {
                    instantiationService.invokeFunction(item.run);
                },
            };
        });
        picks.splice(3, 0, { type: 'separator', label: localize('indentConvert', 'convert file') });
        picks.unshift({ type: 'separator', label: localize('indentView', 'change view') });
        const action = await quickInputService.pick(picks, {
            placeHolder: localize('pickAction', 'Select Action'),
            matchOnDetail: true,
        });
        if (!action) {
            return;
        }
        action.run();
        context.notebookEditor.focus();
        return;
    }
});
registerAction2(class CommentSelectedCellsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COMMENT_SELECTED_CELLS_ID,
            title: localize('commentSelectedCells', 'Comment Selected Cells'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        context.selectedCells.forEach(async (cellViewModel) => {
            const textModel = await cellViewModel.resolveTextModel();
            const commentsOptions = cellViewModel.commentOptions;
            const cellCommentCommand = new LineCommentCommand(languageConfigurationService, new Selection(1, 1, textModel.getLineCount(), textModel.getLineMaxColumn(textModel.getLineCount())), // comment the entire cell
            textModel.getOptions().tabSize, 0 /* Type.Toggle */, commentsOptions.insertSpace ?? true, commentsOptions.ignoreEmptyLines ?? true, false);
            // store any selections that are in the cell, allows them to be shifted by comments and preserved
            const cellEditorSelections = cellViewModel.getSelections();
            const initialTrackedRangesIDs = cellEditorSelections.map((selection) => {
                return textModel._setTrackedRange(null, selection, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
            });
            CommandExecutor.executeCommands(textModel, cellEditorSelections, [cellCommentCommand]);
            const newTrackedSelections = initialTrackedRangesIDs
                .map((i) => {
                return textModel._getTrackedRange(i);
            })
                .filter((r) => !!r)
                .map((range) => {
                return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
            });
            cellViewModel.setSelections(newTrackedSelections ?? []);
        }); // end of cells forEach
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvZWRpdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFdkgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFP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