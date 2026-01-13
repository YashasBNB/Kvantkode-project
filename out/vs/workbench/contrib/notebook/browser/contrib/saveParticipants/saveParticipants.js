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
import { HierarchicalKind } from '../../../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../../editor/browser/services/bulkEditService.js';
import { trimTrailingWhitespace } from '../../../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { ApplyCodeActionReason, applyCodeAction, getCodeActions, } from '../../../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../../../../../../editor/contrib/codeAction/common/types.js';
import { getDocumentFormattingEditsWithSelectedProvider, } from '../../../../../../editor/contrib/format/browser/format.js';
import { SnippetController2 } from '../../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService, } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IWorkspaceTrustManagementService } from '../../../../../../platform/workspace/common/workspaceTrust.js';
import { Extensions as WorkbenchContributionsExtensions, } from '../../../../../common/contributions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { NotebookFileWorkingCopyModel } from '../../../common/notebookEditorModel.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IWorkingCopyFileService, } from '../../../../../services/workingCopy/common/workingCopyFileService.js';
import { NotebookMultiCursorController, NotebookMultiCursorState, } from '../multicursor/notebookMulticursor.js';
export class NotebookSaveParticipant {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    canParticipate() {
        const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        const controller = editor?.getContribution(NotebookMultiCursorController.id);
        if (!controller) {
            return true;
        }
        return controller.getState() !== NotebookMultiCursorState.Editing;
    }
}
let FormatOnSaveParticipant = class FormatOnSaveParticipant {
    constructor(editorWorkerService, languageFeaturesService, instantiationService, textModelService, bulkEditService, configurationService) {
        this.editorWorkerService = editorWorkerService;
        this.languageFeaturesService = languageFeaturesService;
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.bulkEditService = bulkEditService;
        this.configurationService = configurationService;
    }
    async participate(workingCopy, context, progress, token) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        const enabled = this.configurationService.getValue(NotebookSetting.formatOnSave);
        if (!enabled) {
            return undefined;
        }
        progress.report({ message: localize('notebookFormatSave.formatting', 'Formatting') });
        const notebook = workingCopy.model.notebookModel;
        const formatApplied = await this.instantiationService.invokeFunction(CodeActionParticipantUtils.checkAndRunFormatCodeAction, notebook, progress, token);
        const disposable = new DisposableStore();
        try {
            if (!formatApplied) {
                const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                    const ref = await this.textModelService.createModelReference(cell.uri);
                    disposable.add(ref);
                    const model = ref.object.textEditorModel;
                    const formatEdits = await getDocumentFormattingEditsWithSelectedProvider(this.editorWorkerService, this.languageFeaturesService, model, 2 /* FormattingMode.Silent */, token);
                    const edits = [];
                    if (formatEdits) {
                        edits.push(...formatEdits.map((edit) => new ResourceTextEdit(model.uri, edit, model.getVersionId())));
                        return edits;
                    }
                    return [];
                }));
                await this.bulkEditService.apply(/* edit */ allCellEdits.flat(), {
                    label: localize('formatNotebook', 'Format Notebook'),
                    code: 'undoredo.formatNotebook',
                });
            }
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
FormatOnSaveParticipant = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, ILanguageFeaturesService),
    __param(2, IInstantiationService),
    __param(3, ITextModelService),
    __param(4, IBulkEditService),
    __param(5, IConfigurationService)
], FormatOnSaveParticipant);
let TrimWhitespaceParticipant = class TrimWhitespaceParticipant extends NotebookSaveParticipant {
    constructor(configurationService, editorService, textModelService, bulkEditService) {
        super(editorService);
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.bulkEditService = bulkEditService;
    }
    async participate(workingCopy, context, progress, _token) {
        const trimTrailingWhitespaceOption = this.configurationService.getValue('files.trimTrailingWhitespace');
        const trimInRegexAndStrings = this.configurationService.getValue('files.trimTrailingWhitespaceInRegexAndStrings');
        if (trimTrailingWhitespaceOption && this.canParticipate()) {
            await this.doTrimTrailingWhitespace(workingCopy, context.reason === 2 /* SaveReason.AUTO */, trimInRegexAndStrings, progress);
        }
    }
    async doTrimTrailingWhitespace(workingCopy, isAutoSaved, trimInRegexesAndStrings, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        let cursors = [];
        let prevSelection = [];
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return [];
                }
                const ref = await this.textModelService.createModelReference(cell.uri);
                disposable.add(ref);
                const model = ref.object.textEditorModel;
                const isActiveCell = activeCellEditor && cell.uri.toString() === activeCellEditor.getModel()?.uri.toString();
                if (isActiveCell) {
                    prevSelection = activeCellEditor.getSelections() ?? [];
                    if (isAutoSaved) {
                        cursors = prevSelection.map((s) => s.getPosition()); // get initial cursor positions
                        const snippetsRange = SnippetController2.get(activeCellEditor)?.getSessionEnclosingRange();
                        if (snippetsRange) {
                            for (let lineNumber = snippetsRange.startLineNumber; lineNumber <= snippetsRange.endLineNumber; lineNumber++) {
                                cursors.push(new Position(lineNumber, model.getLineMaxColumn(lineNumber)));
                            }
                        }
                    }
                }
                const ops = trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings);
                if (!ops.length) {
                    return []; // Nothing to do
                }
                return ops.map((op) => new ResourceTextEdit(model.uri, { ...op, text: op.text || '' }, model.getVersionId()));
            }));
            const filteredEdits = allCellEdits
                .flat()
                .filter((edit) => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, {
                label: localize('trimNotebookWhitespace', 'Notebook Trim Trailing Whitespace'),
                code: 'undoredo.notebookTrimTrailingWhitespace',
            });
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
TrimWhitespaceParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IBulkEditService)
], TrimWhitespaceParticipant);
let TrimFinalNewLinesParticipant = class TrimFinalNewLinesParticipant extends NotebookSaveParticipant {
    constructor(configurationService, editorService, bulkEditService) {
        super(editorService);
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.bulkEditService = bulkEditService;
    }
    async participate(workingCopy, context, progress, _token) {
        if (this.configurationService.getValue('files.trimFinalNewlines') &&
            this.canParticipate()) {
            await this.doTrimFinalNewLines(workingCopy, context.reason === 2 /* SaveReason.AUTO */, progress);
        }
    }
    /**
     * returns 0 if the entire file is empty
     */
    findLastNonEmptyLine(textBuffer) {
        for (let lineNumber = textBuffer.getLineCount(); lineNumber >= 1; lineNumber--) {
            const lineLength = textBuffer.getLineLength(lineNumber);
            if (lineLength) {
                // this line has content
                return lineNumber;
            }
        }
        // no line has content
        return 0;
    }
    async doTrimFinalNewLines(workingCopy, isAutoSaved, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return;
                }
                // autosave -- don't trim every trailing line, just up to the cursor line
                let cannotTouchLineNumber = 0;
                const isActiveCell = activeCellEditor && cell.uri.toString() === activeCellEditor.getModel()?.uri.toString();
                if (isAutoSaved && isActiveCell) {
                    const selections = activeCellEditor.getSelections() ?? [];
                    for (const sel of selections) {
                        cannotTouchLineNumber = Math.max(cannotTouchLineNumber, sel.selectionStartLineNumber);
                    }
                }
                const textBuffer = cell.textBuffer;
                const lastNonEmptyLine = this.findLastNonEmptyLine(textBuffer);
                const deleteFromLineNumber = Math.max(lastNonEmptyLine + 1, cannotTouchLineNumber + 1);
                if (deleteFromLineNumber > textBuffer.getLineCount()) {
                    return;
                }
                const deletionRange = new Range(deleteFromLineNumber, 1, textBuffer.getLineCount(), textBuffer.getLineLastNonWhitespaceColumn(textBuffer.getLineCount()));
                if (deletionRange.isEmpty()) {
                    return;
                }
                // create the edit to delete all lines in deletionRange
                return new ResourceTextEdit(cell.uri, { range: deletionRange, text: '' }, cell.textModel?.getVersionId());
            }));
            const filteredEdits = allCellEdits
                .flat()
                .filter((edit) => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, {
                label: localize('trimNotebookNewlines', 'Trim Final New Lines'),
                code: 'undoredo.trimFinalNewLines',
            });
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
TrimFinalNewLinesParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IBulkEditService)
], TrimFinalNewLinesParticipant);
let InsertFinalNewLineParticipant = class InsertFinalNewLineParticipant extends NotebookSaveParticipant {
    constructor(configurationService, bulkEditService, editorService) {
        super(editorService);
        this.configurationService = configurationService;
        this.bulkEditService = bulkEditService;
        this.editorService = editorService;
    }
    async participate(workingCopy, context, progress, _token) {
        // waiting on notebook-specific override before this feature can sync with 'files.insertFinalNewline'
        // if (this.configurationService.getValue('files.insertFinalNewline')) {
        if (this.configurationService.getValue(NotebookSetting.insertFinalNewline) &&
            this.canParticipate()) {
            await this.doInsertFinalNewLine(workingCopy, context.reason === 2 /* SaveReason.AUTO */, progress);
        }
    }
    async doInsertFinalNewLine(workingCopy, isAutoSaved, progress) {
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        const disposable = new DisposableStore();
        const notebook = workingCopy.model.notebookModel;
        // get initial cursor positions
        const activeCellEditor = getActiveCellCodeEditor(this.editorService);
        let selections;
        if (activeCellEditor) {
            selections = activeCellEditor.getSelections() ?? [];
        }
        try {
            const allCellEdits = await Promise.all(notebook.cells.map(async (cell) => {
                if (cell.cellKind !== CellKind.Code) {
                    return;
                }
                const lineCount = cell.textBuffer.getLineCount();
                const lastLineIsEmptyOrWhitespace = cell.textBuffer.getLineFirstNonWhitespaceColumn(lineCount) === 0;
                if (!lineCount || lastLineIsEmptyOrWhitespace) {
                    return;
                }
                return new ResourceTextEdit(cell.uri, {
                    range: new Range(lineCount + 1, cell.textBuffer.getLineLength(lineCount), lineCount + 1, cell.textBuffer.getLineLength(lineCount)),
                    text: cell.textBuffer.getEOL(),
                }, cell.textModel?.getVersionId());
            }));
            const filteredEdits = allCellEdits.filter((edit) => edit !== undefined);
            await this.bulkEditService.apply(filteredEdits, {
                label: localize('insertFinalNewLine', 'Insert Final New Line'),
                code: 'undoredo.insertFinalNewLine',
            });
            // set cursor back to initial position after inserting final new line
            if (activeCellEditor && selections) {
                activeCellEditor.setSelections(selections);
            }
        }
        finally {
            progress.report({ increment: 100 });
            disposable.dispose();
        }
    }
};
InsertFinalNewLineParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IBulkEditService),
    __param(2, IEditorService)
], InsertFinalNewLineParticipant);
let CodeActionOnSaveParticipant = class CodeActionOnSaveParticipant {
    constructor(configurationService, logService, workspaceTrustManagementService, textModelService, instantiationService) {
        this.configurationService = configurationService;
        this.logService = logService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
    }
    async participate(workingCopy, context, progress, token) {
        const isTrusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
        if (!isTrusted) {
            return;
        }
        if (!workingCopy.model || !(workingCopy.model instanceof NotebookFileWorkingCopyModel)) {
            return;
        }
        let saveTrigger = '';
        if (context.reason === 2 /* SaveReason.AUTO */) {
            // currently this won't happen, as vs/editor/contrib/codeAction/browser/codeAction.ts L#104 filters out codeactions on autosave. Just future-proofing
            // ? notebook CodeActions on autosave seems dangerous (perf-wise)
            // saveTrigger = 'always'; // TODO@Yoyokrazy, support during debt
            return undefined;
        }
        else if (context.reason === 1 /* SaveReason.EXPLICIT */) {
            saveTrigger = 'explicit';
        }
        else {
            // 	SaveReason.FOCUS_CHANGE, WINDOW_CHANGE need to be addressed when autosaves are enabled
            return undefined;
        }
        const notebookModel = workingCopy.model.notebookModel;
        const setting = this.configurationService.getValue(NotebookSetting.codeActionsOnSave);
        const settingItems = Array.isArray(setting)
            ? setting
            : Object.keys(setting).filter((x) => setting[x]);
        const allCodeActions = this.createCodeActionsOnSave(settingItems);
        const excludedActions = allCodeActions.filter((x) => setting[x.value] === 'never' || setting[x.value] === false);
        const includedActions = allCodeActions.filter((x) => setting[x.value] === saveTrigger || setting[x.value] === true);
        const editorCodeActionsOnSave = includedActions.filter((x) => !CodeActionKind.Notebook.contains(x));
        const notebookCodeActionsOnSave = includedActions.filter((x) => CodeActionKind.Notebook.contains(x));
        // run notebook code actions
        if (notebookCodeActionsOnSave.length) {
            const nbDisposable = new DisposableStore();
            progress.report({
                message: localize('notebookSaveParticipants.notebookCodeActions', "Running 'Notebook' code actions"),
            });
            try {
                const cell = notebookModel.cells[0];
                const ref = await this.textModelService.createModelReference(cell.uri);
                nbDisposable.add(ref);
                const textEditorModel = ref.object.textEditorModel;
                await this.instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveGenericCodeActions, textEditorModel, notebookCodeActionsOnSave, excludedActions, progress, token);
            }
            catch {
                this.logService.error('Failed to apply notebook code action on save');
            }
            finally {
                progress.report({ increment: 100 });
                nbDisposable.dispose();
            }
        }
        // run cell level code actions
        if (editorCodeActionsOnSave.length) {
            // prioritize `source.fixAll` code actions
            if (!Array.isArray(setting)) {
                editorCodeActionsOnSave.sort((a, b) => {
                    if (CodeActionKind.SourceFixAll.contains(a)) {
                        if (CodeActionKind.SourceFixAll.contains(b)) {
                            return 0;
                        }
                        return -1;
                    }
                    if (CodeActionKind.SourceFixAll.contains(b)) {
                        return 1;
                    }
                    return 0;
                });
            }
            const cellDisposable = new DisposableStore();
            progress.report({
                message: localize('notebookSaveParticipants.cellCodeActions', "Running 'Cell' code actions"),
            });
            try {
                await Promise.all(notebookModel.cells.map(async (cell) => {
                    const ref = await this.textModelService.createModelReference(cell.uri);
                    cellDisposable.add(ref);
                    const textEditorModel = ref.object.textEditorModel;
                    await this.instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveGenericCodeActions, textEditorModel, editorCodeActionsOnSave, excludedActions, progress, token);
                }));
            }
            catch {
                this.logService.error('Failed to apply code action on save');
            }
            finally {
                progress.report({ increment: 100 });
                cellDisposable.dispose();
            }
        }
    }
    createCodeActionsOnSave(settingItems) {
        const kinds = settingItems.map((x) => new HierarchicalKind(x));
        // Remove subsets
        return kinds.filter((kind) => {
            return kinds.every((otherKind) => otherKind.equals(kind) || !otherKind.contains(kind));
        });
    }
};
CodeActionOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILogService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, ITextModelService),
    __param(4, IInstantiationService)
], CodeActionOnSaveParticipant);
export class CodeActionParticipantUtils {
    static async checkAndRunFormatCodeAction(accessor, notebookModel, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const configurationService = accessor.get(IConfigurationService);
        const formatDisposable = new DisposableStore();
        let formatResult = false;
        progress.report({
            message: localize('notebookSaveParticipants.formatCodeActions', "Running 'Format' code actions"),
        });
        try {
            const cell = notebookModel.cells[0];
            const ref = await textModelService.createModelReference(cell.uri);
            formatDisposable.add(ref);
            const textEditorModel = ref.object.textEditorModel;
            const defaultFormatterExtId = configurationService.getValue(NotebookSetting.defaultFormatter);
            formatResult = await instantiationService.invokeFunction(CodeActionParticipantUtils.applyOnSaveFormatCodeAction, textEditorModel, new HierarchicalKind('notebook.format'), [], defaultFormatterExtId, progress, token);
        }
        catch {
            logService.error('Failed to apply notebook format action on save');
        }
        finally {
            progress.report({ increment: 100 });
            formatDisposable.dispose();
        }
        return formatResult;
    }
    static async applyOnSaveGenericCodeActions(accessor, model, codeActionsOnSave, excludes, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const logService = accessor.get(ILogService);
        const getActionProgress = new (class {
            constructor() {
                this._names = new Set();
            }
            _report() {
                progress.report({
                    message: localize({
                        key: 'codeaction.get2',
                        comment: [
                            '[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}',
                        ],
                    }, "Getting code actions from '{0}' ([configure]({1})).", [...this._names].map((name) => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22notebook.codeActionsOnSave%22%5D'),
                });
            }
            report(provider) {
                if (provider.displayName && !this._names.has(provider.displayName)) {
                    this._names.add(provider.displayName);
                    this._report();
                }
            }
        })();
        for (const codeActionKind of codeActionsOnSave) {
            const actionsToRun = await CodeActionParticipantUtils.getActionsToRun(model, codeActionKind, excludes, languageFeaturesService, getActionProgress, token);
            if (token.isCancellationRequested) {
                actionsToRun.dispose();
                return;
            }
            try {
                for (const action of actionsToRun.validActions) {
                    const codeActionEdits = action.action.edit?.edits;
                    let breakFlag = false;
                    if (!action.action.kind?.startsWith('notebook')) {
                        for (const edit of codeActionEdits ?? []) {
                            const workspaceTextEdit = edit;
                            if (workspaceTextEdit.resource && isEqual(workspaceTextEdit.resource, model.uri)) {
                                continue;
                            }
                            else {
                                // error -> applied to multiple resources
                                breakFlag = true;
                                break;
                            }
                        }
                    }
                    if (breakFlag) {
                        logService.warn('Failed to apply code action on save, applied to multiple resources.');
                        continue;
                    }
                    progress.report({
                        message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title),
                    });
                    await instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
                    if (token.isCancellationRequested) {
                        return;
                    }
                }
            }
            catch {
                // Failure to apply a code action should not block other on save actions
            }
            finally {
                actionsToRun.dispose();
            }
        }
    }
    static async applyOnSaveFormatCodeAction(accessor, model, formatCodeActionOnSave, excludes, extensionId, progress, token) {
        const instantiationService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const logService = accessor.get(ILogService);
        const getActionProgress = new (class {
            constructor() {
                this._names = new Set();
            }
            _report() {
                progress.report({
                    message: localize({
                        key: 'codeaction.get2',
                        comment: [
                            '[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}',
                        ],
                    }, "Getting code actions from '{0}' ([configure]({1})).", [...this._names].map((name) => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22notebook.defaultFormatter%22%5D'),
                });
            }
            report(provider) {
                if (provider.displayName && !this._names.has(provider.displayName)) {
                    this._names.add(provider.displayName);
                    this._report();
                }
            }
        })();
        const providedActions = await CodeActionParticipantUtils.getActionsToRun(model, formatCodeActionOnSave, excludes, languageFeaturesService, getActionProgress, token);
        // warn the user if there are more than one provided format action, and there is no specified defaultFormatter
        if (providedActions.validActions.length > 1 && !extensionId) {
            logService.warn('More than one format code action is provided, the 0th one will be used. A default can be specified via `notebook.defaultFormatter` in your settings.');
        }
        if (token.isCancellationRequested) {
            providedActions.dispose();
            return false;
        }
        try {
            const action = extensionId
                ? providedActions.validActions.find((action) => action.provider?.extensionId === extensionId)
                : providedActions.validActions[0];
            if (!action) {
                return false;
            }
            progress.report({
                message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title),
            });
            await instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
            if (token.isCancellationRequested) {
                return false;
            }
        }
        catch {
            logService.error('Failed to apply notebook format code action on save');
            return false;
        }
        finally {
            providedActions.dispose();
        }
        return true;
    }
    // @Yoyokrazy this could likely be modified to leverage the extensionID, therefore not getting actions from providers unnecessarily -- future work
    static getActionsToRun(model, codeActionKind, excludes, languageFeaturesService, progress, token) {
        return getCodeActions(languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
            type: 1 /* CodeActionTriggerType.Invoke */,
            triggerAction: CodeActionTriggerSource.OnSave,
            filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
        }, progress, token);
    }
}
function getActiveCellCodeEditor(editorService) {
    const activePane = editorService.activeEditorPane;
    const notebookEditor = getNotebookEditorFromEditorPane(activePane);
    const activeCodeEditor = notebookEditor?.activeCodeEditor;
    return activeCodeEditor;
}
let SaveParticipantsContribution = class SaveParticipantsContribution extends Disposable {
    constructor(instantiationService, workingCopyFileService) {
        super();
        this.instantiationService = instantiationService;
        this.workingCopyFileService = workingCopyFileService;
        this.registerSaveParticipants();
    }
    registerSaveParticipants() {
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(TrimWhitespaceParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(CodeActionOnSaveParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(FormatOnSaveParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(InsertFinalNewLineParticipant)));
        this._register(this.workingCopyFileService.addSaveParticipant(this.instantiationService.createInstance(TrimFinalNewLinesParticipant)));
    }
};
SaveParticipantsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyFileService)
], SaveParticipantsContribution);
export { SaveParticipantsContribution };
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SaveParticipantsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL3NhdmVQYXJ0aWNpcGFudHMvc2F2ZVBhcnRpY2lwYW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVwRSxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGdCQUFnQixHQUNoQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFRckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDdkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDL0YsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixlQUFlLEVBQ2YsY0FBYyxHQUNkLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUVOLGNBQWMsRUFDZCx1QkFBdUIsR0FDdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sOENBQThDLEdBQzlDLE1BQU0sMkRBQTJELENB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