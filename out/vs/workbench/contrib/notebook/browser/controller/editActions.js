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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHdDQUF3QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUV2SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBQ3RCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUVOLGNBQWMsR0FDZCxNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sa0JBQWtCLEdBR2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsMEJBQTBCLEVBSzFCLG9DQUFvQyxFQUNwQyxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLHVCQUF1QixFQUN2Qix3QkFBd0IsRUFDeEIsb0JBQW9CLEdBQ3BCLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUNOLDRCQUE0QixFQUM1Qix5QkFBeUIsRUFDekIsdUJBQXVCLEVBQ3ZCLGlDQUFpQyxFQUNqQywrQkFBK0IsR0FDL0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLCtCQUErQixHQUMvQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sS0FBSyxLQUFLLE1BQU0scUJBQXFCLENBQUE7QUFDNUMsT0FBTyxFQUVOLFFBQVEsRUFFUiwwQkFBMEIsRUFDMUIsZUFBZSxHQUNmLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsNkJBQTZCLEVBQzdCLDBCQUEwQixFQUMxQixnQ0FBZ0MsRUFDaEMsa0JBQWtCLEVBQ2xCLHdCQUF3QixFQUN4Qix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUN6Qix1QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLHVDQUF1QyxHQUN2QyxNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUzRyxNQUFNLGtDQUFrQyxHQUFHLCtCQUErQixDQUFBO0FBQzFFLE1BQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUE7QUFDakQsTUFBTSxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQTtBQUNyRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyw0QkFBNEIsQ0FBQTtBQUN6RSxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyw0QkFBNEIsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRywrQkFBK0IsQ0FBQTtBQUV4RSxlQUFlLENBQ2QsTUFBTSxjQUFlLFNBQVEsa0JBQWtCO0lBQzlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixLQUFLLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFdBQVcsQ0FBQztZQUN4RCxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDBCQUEwQixFQUMxQixjQUFjLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEVBQzFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsRUFDMUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLENBQ3pDO2dCQUNELE9BQU8sdUJBQWU7Z0JBQ3RCLE1BQU0sNkNBQW1DO2FBQ3pDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO2dCQUM1QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsd0JBQXdCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUN4QyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQ3RDLGdDQUFnQyxDQUFDLFNBQVMsRUFBRSxFQUM1QyxzQkFBc0IsQ0FDdEI7Z0JBQ0QsS0FBSyxtQ0FBMkI7Z0JBQ2hDLEtBQUssRUFBRSx3QkFBd0I7YUFDL0I7WUFDRCxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQ25CLFFBQTBCLEVBQzFCLE9BQW1DO1FBRW5DLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFdBQVcsR0FBNEIsT0FBTyxDQUFDLElBQUk7WUFDeEQsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzdDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDWixJQUNDLFdBQVc7WUFDWCxXQUFXLENBQUMsWUFBWSxFQUFFO1lBQzFCLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLFVBQVU7Z0JBQ3JFLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLEVBQ3JDLENBQUM7WUFDRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQzNDLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsdUJBQXVCLENBQUMsU0FBUyxFQUFFLENBQ25DLENBQUE7QUFDRCxlQUFlLENBQ2QsTUFBTSxrQkFBbUIsU0FBUSxrQkFBa0I7SUFDbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUM7WUFDaEUsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO2dCQUM1QixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsa0JBQWtCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUN0QyxnQ0FBZ0MsRUFDaEMsc0JBQXNCLENBQ3RCO2dCQUNELEtBQUssbUNBQTJCO2dCQUNoQyxLQUFLLEVBQUUsd0JBQXdCO2FBQy9CO1lBQ0QsSUFBSSxFQUFFLEtBQUssQ0FBQyxZQUFZO1lBQ3hCLFVBQVUsRUFBRTtnQkFDWDtvQkFDQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsaUJBQWlCLEVBQ2pCLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsRUFDMUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQ2xELGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxDQUNuRDtvQkFDRCxPQUFPLHdCQUFnQjtvQkFDdkIsTUFBTSxFQUFFLG9DQUFvQyxHQUFHLENBQUM7aUJBQ2hEO2dCQUNEO29CQUNDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLHVCQUF1QixDQUFDO29CQUMxRSxPQUFPLHdCQUFnQjtvQkFDdkIsTUFBTSxFQUFFLDhDQUFvQyxDQUFDO2lCQUM3QztnQkFDRDtvQkFDQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ25GLE9BQU8sRUFBRSxnREFBOEI7b0JBQ3ZDLEdBQUcsRUFBRTt3QkFDSixPQUFPLEVBQUUsZ0RBQTJCLHdCQUFnQjtxQkFDcEQ7b0JBQ0QsTUFBTSxFQUFFLG9DQUFvQyxHQUFHLENBQUM7aUJBQ2hEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEwQixFQUFFLE9BQW1DO1FBQ25GLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9DLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBRUQsTUFBTSxPQUFPLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ3pFLFVBQVUsRUFBRSxJQUFJO1NBQ2hCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSxnQkFBaUIsU0FBUSxrQkFBa0I7SUFDaEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsYUFBYSxDQUFDO1lBQzVELFVBQVUsRUFBRTtnQkFDWCxPQUFPLHlCQUFnQjtnQkFDdkIsR0FBRyxFQUFFO29CQUNKLE9BQU8sRUFBRSxxREFBa0M7aUJBQzNDO2dCQUNELElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qix1QkFBdUIsRUFDdkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUMxQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsQ0FDekM7Z0JBQ0QsTUFBTSw2Q0FBbUM7YUFDekM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7b0JBQzdCLElBQUksRUFBRSx3QkFBd0I7b0JBQzlCLEtBQUssRUFBRSx3QkFBd0I7aUJBQy9CO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO29CQUNoQyxLQUFLLEVBQUUsd0JBQXdCO2lCQUMvQjthQUNEO1lBQ0QsSUFBSSxFQUFFLEtBQUssQ0FBQyxjQUFjO1NBQzFCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBbUM7UUFDbkYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN4QyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksWUFBaUMsQ0FBQTtRQUNyQyxNQUFNLDZCQUE2QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQTtRQUNsRixNQUFNLFFBQVEsR0FBRyw2QkFBNkIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQTtRQUN4RixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFekQsSUFDQyxRQUFRLEtBQUssMEJBQTBCLENBQUMsU0FBUztZQUNqRCxhQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUMvRCxDQUFDO1lBQ0YsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUNsRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMscUJBQXFCLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFFL0QsWUFBWSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDMUMsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLE9BQU8sRUFBRSxRQUFRLENBQ2hCLDRCQUE0QixFQUM1QiwyREFBMkQsQ0FDM0Q7Z0JBQ0QsYUFBYSxFQUFFLGFBQWE7Z0JBQzVCLFFBQVEsRUFBRTtvQkFDVCxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQztpQkFDdkQ7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM3QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLGVBQWUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxNQUFNLGFBQWEsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxlQUFlLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdEQsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLHNCQUF1QixTQUFRLGtCQUFrQjtJQUN0RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQztZQUN6RCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7b0JBQzVCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQ3BDLHdCQUF3QixFQUN4Qix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLHNCQUFzQixFQUN0Qix1Q0FBdUMsQ0FBQyxTQUFTLEVBQUUsQ0FDbkQ7b0JBQ0QsS0FBSywwQ0FBa0M7b0JBQ3ZDLEtBQUssRUFBRSwwQkFBMEI7aUJBQ2pDO2dCQUNEO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO29CQUNoQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QixzQkFBc0IsRUFDdEIsNkJBQTZCLEVBQzdCLHVDQUF1QyxDQUN2QztpQkFDRDthQUNEO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2Qix1QkFBdUIsRUFDdkIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUMxQyx5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLHNCQUFzQixDQUN0QjtnQkFDRCxPQUFPLEVBQUUsOENBQTJCO2dCQUNwQyxNQUFNLDZDQUFtQzthQUN6QztZQUNELElBQUksRUFBRSxLQUFLLENBQUMsU0FBUztTQUNyQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsUUFBMEIsRUFDMUIsT0FBbUM7UUFFbkMsTUFBTSw2QkFBNkIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDbEYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwRCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV4RCxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUMxQixDQUFDLEVBQUUsUUFBUSw2QkFBcUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQ3ZELElBQUksRUFDSixTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUNmLFNBQVMsRUFDVCxlQUFlLENBQ2YsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFBO1FBQ3hGLElBQUksUUFBUSxLQUFLLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FDMUM7Z0JBQ0M7b0JBQ0MsUUFBUSw4Q0FBc0M7b0JBQzlDLEtBQUs7b0JBQ0wsZ0JBQWdCLEVBQUU7d0JBQ2pCLFlBQVksRUFBRSxJQUFJO3dCQUNsQixzQkFBc0IsRUFBRSxJQUFJO3dCQUM1QixVQUFVLEVBQUUsSUFBSTt3QkFDaEIsY0FBYyxFQUFFLElBQUk7d0JBQ3BCLGNBQWMsRUFBRSxJQUFJO3FCQUNwQjtpQkFDRDthQUNELEVBQ0QsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULGVBQWUsQ0FDZixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSx5QkFBMEIsU0FBUSxjQUFjO0lBQ3JEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG1CQUFtQixDQUFDO1lBQzVELFlBQVksRUFBRSxvQkFBb0I7WUFDbEMsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHlCQUF5QixFQUN6QixjQUFjLENBQUMsU0FBUyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxDQUMvRDtvQkFDRCxLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1I7Z0JBQ0Q7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO29CQUMxQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsd0JBQXdCLEVBQ3hCLGNBQWMsQ0FBQyxNQUFNLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLENBQzVEO29CQUNELEtBQUssRUFBRSxvQkFBb0I7b0JBQzNCLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0Q7WUFDRCxJQUFJLEVBQUUsS0FBSyxDQUFDLFNBQVM7U0FDckIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQ25CLFFBQTBCLEVBQzFCLE9BQStCO1FBRS9CLE1BQU0sNkJBQTZCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUE7UUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEQsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUE7UUFDMUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQzFCLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDNUMsUUFBUSw2QkFBcUI7WUFDN0IsS0FBSztZQUNMLE9BQU8sRUFBRSxFQUFFO1NBQ1gsQ0FBQyxDQUFDLEVBQ0gsSUFBSSxFQUNKLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQ2YsU0FBUyxFQUNULGVBQWUsQ0FDZixDQUFBO1FBRUQsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUs7YUFDeEQsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3BCLE1BQU0sUUFBUSxHQUFHLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUE7WUFDaEYsSUFBSSxRQUFRLEtBQUssMEJBQTBCLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZELE9BQU87b0JBQ04sUUFBUSw4Q0FBc0M7b0JBQzlDLEtBQUs7b0JBQ0wsZ0JBQWdCLEVBQUU7d0JBQ2pCLFlBQVksRUFBRSxJQUFJO3dCQUNsQixzQkFBc0IsRUFBRSxJQUFJO3dCQUM1QixVQUFVLEVBQUUsSUFBSTt3QkFDaEIsY0FBYyxFQUFFLElBQUk7d0JBQ3BCLGNBQWMsRUFBRSxJQUFJO3FCQUNwQjtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQXlCLENBQUE7UUFDbEQsSUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QyxPQUFPLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQzFDLDJCQUEyQixFQUMzQixJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsZUFBZSxDQUNmLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FDeEMsaUNBQWlDLENBQUMsRUFBRSxDQUNwQyxDQUFBO1FBQ0QsVUFBVSxDQUFDLDhCQUE4QixFQUFFLENBQUE7SUFDNUMsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQWFELGVBQWUsQ0FDZCxNQUFNLHdCQUF5QixTQUFRLGtCQUE4QjtJQUNwRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQztZQUN6RCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLHdCQUFlO2dCQUM5RCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsdUJBQXVCLEVBQ3ZCLHdCQUF3QixFQUN4QixzQkFBc0IsQ0FDdEI7YUFDRDtZQUNELFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDO2dCQUMvRCxJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsSUFBSSxFQUFFLE9BQU87d0JBQ2IsV0FBVyxFQUFFLGdCQUFnQjt3QkFDN0IsTUFBTSxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7NEJBQzFCLFVBQVUsRUFBRTtnQ0FDWCxLQUFLLEVBQUU7b0NBQ04sSUFBSSxFQUFFLFFBQVE7aUNBQ2Q7Z0NBQ0QsR0FBRyxFQUFFO29DQUNKLElBQUksRUFBRSxRQUFRO2lDQUNkOzZCQUNEO3lCQUNEO3FCQUNEO29CQUNEO3dCQUNDLElBQUksRUFBRSxVQUFVO3dCQUNoQixXQUFXLEVBQUUsMEJBQTBCO3dCQUN2QyxNQUFNLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7eUJBQ2Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFa0Isc0JBQXNCLENBQ3hDLFFBQTBCLEVBQzFCLE9BQW9CLEVBQ3BCLEdBQUcsY0FBcUI7UUFFeEIsSUFDQyxDQUFDLE9BQU87WUFDUixPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUTtZQUNqQyxPQUFPLE9BQU8sQ0FBQyxHQUFHLEtBQUssUUFBUTtZQUMvQixPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQzNCLENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUNiLGNBQWMsQ0FBQyxNQUFNLElBQUksT0FBTyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtZQUM3RCxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNuQixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2IsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFM0UsSUFDQyxDQUFDLG1CQUFtQjtZQUNwQixDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUU7WUFDOUMsT0FBTyxDQUFDLEtBQUssSUFBSSxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQzlELENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELHdDQUF3QztRQUN4QyxPQUFPO1lBQ04sY0FBYyxFQUFFLG1CQUFtQixDQUFDLGNBQWM7WUFDbEQsSUFBSSxFQUFFLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBRTtZQUMvRCxRQUFRO1NBQ1IsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTBCLEVBQUUsT0FBMkI7UUFDM0UsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbEQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBMEIsRUFBRSxPQUEyQjtRQUN2RixNQUFNLFFBQVEsR0FBeUIsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sU0FBUyxHQUF5QixFQUFFLENBQUE7UUFFMUMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDaEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDeEUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBRTFELElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFBO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNyRixNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUM1RixTQUFTO2dCQUNSLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDO29CQUMvQixDQUFDLENBQUMscUJBQXFCO29CQUN2QixDQUFDLENBQUMsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDL0MsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRTdELGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3hDLElBQUksV0FBbUIsQ0FBQTtZQUN2QixJQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxNQUFNO2dCQUN4QyxDQUFDLENBQUMsVUFBVSxLQUFLLFVBQVU7Z0JBQzNCLENBQUMsQ0FBQyxVQUFVLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQ3RDLENBQUM7Z0JBQ0YsV0FBVyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUN0RixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyxHQUFHLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDaEUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQixxQ0FBcUM7Z0JBQ3JDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQXVCO2dCQUNoQyxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsV0FBVyxFQUFFLGNBQWMsQ0FDMUIsWUFBWSxFQUNaLGVBQWUsRUFDZixJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FDbkQ7Z0JBQ0QsV0FBVztnQkFDWCxVQUFVO2FBQ1YsQ0FBQTtZQUVELElBQUksVUFBVSxLQUFLLFVBQVUsSUFBSSxVQUFVLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdkUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNwQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZCLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2xELENBQUMsQ0FBQyxDQUFBO1FBRUYseUJBQXlCO1FBQ3pCLE1BQU0sY0FBYyxHQUFtQjtZQUN0QyxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7U0FDNUMsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFxQjtZQUMvQixjQUFjO1lBQ2QsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUMsRUFBRTtZQUNsRixHQUFHLFFBQVE7WUFDWCxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDckIsR0FBRyxTQUFTO1NBQ1osQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNyRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO1NBQ3hFLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUNmLFNBQVMsS0FBSyxjQUFjO1lBQzNCLENBQUMsQ0FBQyxNQUFNLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNqRSxDQUFDLENBQUUsU0FBZ0MsRUFBRSxVQUFVLENBQUE7UUFFakQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUEyQixFQUFFLFVBQWtCO1FBQ3hFLE1BQU0saUJBQWlCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxJQUFZLEVBQUUsZUFBaUM7UUFDdEUsSUFBSSxZQUE2QixDQUFBO1FBRWpDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUQsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZCLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUMxRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDdEIsWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSx3QkFBeUIsU0FBUSxrQkFBa0I7SUFDeEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0JBQW9CO1lBQ3hCLEtBQUssRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsbUNBQW1DLENBQUM7WUFDdkUsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxzQkFBc0IsQ0FBQztZQUNsRixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLDRDQUF5QiwwQkFBZTtnQkFDakQsTUFBTSw2Q0FBbUM7YUFDekM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsUUFBMEIsRUFDMUIsT0FBbUM7UUFFbkMsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDeEUsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNGLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLE1BQU0sd0JBQXdCLENBQUMsY0FBYyxDQUM5RCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFDaEIsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7YUFBTSxDQUFDO1lBQ1AsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsS0FBSyxVQUFVLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsT0FBMkI7SUFDL0UsSUFBSSxVQUFVLEtBQUssVUFBVSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3hFLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLGdCQUFnQixDQUNyQixRQUFRLENBQUMsTUFBTSxFQUNmLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUN4RSxVQUFVLEVBQ1YsS0FBSyxDQUFDLFFBQVEsQ0FDZCxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFbEQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbEUsQ0FBQztJQUNGLENBQUM7U0FBTSxJQUFJLFVBQVUsS0FBSyxVQUFVLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BGLE1BQU0sZ0JBQWdCLENBQ3JCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQ3hFLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEYsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUMxQyxDQUFDLEVBQUUsUUFBUSxtQ0FBMkIsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQ3RFLElBQUksRUFDSixTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUNmLFNBQVMsRUFDVCxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUNsQyxDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxlQUFlLENBQ2QsTUFBTSx5QkFBMEIsU0FBUSxjQUFjO0lBQ3JEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDhCQUE4QjtZQUNsQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDJCQUEyQixFQUFFLG9CQUFvQixDQUFDO1lBQ25FLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIsc0JBQXNCLENBQ3RCO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQ25CLFFBQTBCLEVBQzFCLE9BQStCO1FBRS9CLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRU8sS0FBSyxDQUFDLDZCQUE2QixDQUMxQyxRQUEwQixFQUMxQixPQUErQjtRQUUvQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RGLElBQUksQ0FBQyxjQUFjLElBQUksY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xELE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDO2dCQUM3QixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsd0NBQXdDLENBQUMsRUFBRTthQUNqRixDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDL0IsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwwQ0FBMEMsQ0FBQyxFQUFFO2FBQ3ZGLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLEtBQUssR0FBdUQ7WUFDakUsSUFBSSx1QkFBdUIsRUFBRSxFQUFFLG9CQUFvQjtZQUNuRCxJQUFJLHlCQUF5QixFQUFFLEVBQUUsc0JBQXNCO1lBQ3ZELElBQUksNEJBQTRCLEVBQUUsRUFBRSxrQkFBa0I7WUFDdEQsSUFBSSwrQkFBK0IsRUFBRSxFQUFFLDhCQUE4QjtZQUNyRSxJQUFJLGlDQUFpQyxFQUFFLEVBQUUsZ0NBQWdDO1NBQ3pFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDZCxPQUFPO2dCQUNOLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ2pDLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1Qsb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNGLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVsRixNQUFNLE1BQU0sR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDbEQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDO1lBQ3BELGFBQWEsRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ1osT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM5QixPQUFNO0lBQ1AsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLDBCQUEyQixTQUFRLHVCQUF1QjtJQUMvRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5QkFBeUI7WUFDN0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQztZQUNqRSxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLHVCQUF1QixFQUN2Qix3QkFBd0IsRUFDeEIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUMxQztnQkFDRCxPQUFPLEVBQUUsa0RBQThCO2dCQUN2QyxNQUFNLDZDQUFtQzthQUN6QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUNuQixRQUEwQixFQUMxQixPQUFnQztRQUVoQyxNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUVoRixPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUV4RCxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsY0FBYyxDQUFBO1lBQ3BELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsQ0FDaEQsNEJBQTRCLEVBQzVCLElBQUksU0FBUyxDQUNaLENBQUMsRUFDRCxDQUFDLEVBQ0QsU0FBUyxDQUFDLFlBQVksRUFBRSxFQUN4QixTQUFTLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQ3BELEVBQUUsMEJBQTBCO1lBQzdCLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLHVCQUU5QixlQUFlLENBQUMsV0FBVyxJQUFJLElBQUksRUFDbkMsZUFBZSxDQUFDLGdCQUFnQixJQUFJLElBQUksRUFDeEMsS0FBSyxDQUNMLENBQUE7WUFFRCxpR0FBaUc7WUFDakcsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDMUQsTUFBTSx1QkFBdUIsR0FBYSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDaEYsT0FBTyxTQUFTLENBQUMsZ0JBQWdCLENBQ2hDLElBQUksRUFDSixTQUFTLDZEQUVULENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUVGLGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLG9CQUFvQixFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1lBRXRGLE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCO2lCQUNsRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDVixPQUFPLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQyxDQUFDLENBQUM7aUJBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNsQixHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZCxPQUFPLElBQUksU0FBUyxDQUNuQixLQUFLLENBQUMsZUFBZSxFQUNyQixLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsU0FBUyxDQUNmLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUNILGFBQWEsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEQsQ0FBQyxDQUFDLENBQUEsQ0FBQyx1QkFBdUI7SUFDM0IsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9