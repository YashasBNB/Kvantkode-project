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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9zYXZlUGFydGljaXBhbnRzL3NhdmVQYXJ0aWNpcGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFcEUsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixnQkFBZ0IsR0FDaEIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBUXJFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZUFBZSxFQUNmLGNBQWMsR0FDZCxNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFFTixjQUFjLEVBQ2QsdUJBQXVCLEdBQ3ZCLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUVOLDhDQUE4QyxHQUM5QyxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNoSCxPQUFPLEVBR04sVUFBVSxJQUFJLGdDQUFnQyxHQUM5QyxNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBTXZGLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHdCQUF3QixHQUN4QixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE1BQU0sT0FBZ0IsdUJBQXVCO0lBQzVDLFlBQTZCLGNBQThCO1FBQTlCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtJQUFHLENBQUM7SUFRckQsY0FBYztRQUN2QixNQUFNLE1BQU0sR0FBRywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDcEYsTUFBTSxVQUFVLEdBQUcsTUFBTSxFQUFFLGVBQWUsQ0FDekMsNkJBQTZCLENBQUMsRUFBRSxDQUNoQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLHdCQUF3QixDQUFDLE9BQU8sQ0FBQTtJQUNsRSxDQUFDO0NBQ0Q7QUFFRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUM1QixZQUN3QyxtQkFBeUMsRUFDckMsdUJBQWlELEVBQ3BELG9CQUEyQyxFQUMvQyxnQkFBbUMsRUFDcEMsZUFBaUMsRUFDNUIsb0JBQTJDO1FBTDVDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDckMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUNwRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDcEMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzVCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLEtBQUssQ0FBQyxXQUFXLENBQ2hCLFdBQWdFLEVBQ2hFLE9BQXFELEVBQ3JELFFBQWtDLEVBQ2xDLEtBQXdCO1FBRXhCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxZQUFZLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztZQUN4RixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sNEJBQW9CLEVBQUUsQ0FBQztZQUN4QyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVyRixNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQTtRQUNoRCxNQUFNLGFBQWEsR0FBWSxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzVFLDBCQUEwQixDQUFDLDJCQUEyQixFQUN0RCxRQUFRLEVBQ1IsUUFBUSxFQUNSLEtBQUssQ0FDTCxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN4QyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDckMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO29CQUNqQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3RFLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBRW5CLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO29CQUV4QyxNQUFNLFdBQVcsR0FBRyxNQUFNLDhDQUE4QyxDQUN2RSxJQUFJLENBQUMsbUJBQW1CLEVBQ3hCLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsS0FBSyxpQ0FFTCxLQUFLLENBQ0wsQ0FBQTtvQkFFRCxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFBO29CQUVwQyxJQUFJLFdBQVcsRUFBRSxDQUFDO3dCQUNqQixLQUFLLENBQUMsSUFBSSxDQUNULEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDakIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQ3JFLENBQ0QsQ0FBQTt3QkFDRCxPQUFPLEtBQUssQ0FBQTtvQkFDYixDQUFDO29CQUVELE9BQU8sRUFBRSxDQUFBO2dCQUNWLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBRUQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFO29CQUNoRSxLQUFLLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDO29CQUNwRCxJQUFJLEVBQUUseUJBQXlCO2lCQUMvQixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqRkssdUJBQXVCO0lBRTFCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0dBUGxCLHVCQUF1QixDQWlGNUI7QUFFRCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLHVCQUF1QjtJQUM5RCxZQUN5QyxvQkFBMkMsRUFDbEQsYUFBNkIsRUFDMUIsZ0JBQW1DLEVBQ3BDLGVBQWlDO1FBRXBFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUxvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3BDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtJQUdyRSxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsV0FBZ0UsRUFDaEUsT0FBcUQsRUFDckQsUUFBa0MsRUFDbEMsTUFBeUI7UUFFekIsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUN0RSw4QkFBOEIsQ0FDOUIsQ0FBQTtRQUNELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDL0QsK0NBQStDLENBQy9DLENBQUE7UUFDRCxJQUFJLDRCQUE0QixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUNsQyxXQUFXLEVBQ1gsT0FBTyxDQUFDLE1BQU0sNEJBQW9CLEVBQ2xDLHFCQUFxQixFQUNyQixRQUFRLENBQ1IsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QixDQUNyQyxXQUFnRSxFQUNoRSxXQUFvQixFQUNwQix1QkFBZ0MsRUFDaEMsUUFBa0M7UUFFbEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLFlBQVksNEJBQTRCLENBQUMsRUFBRSxDQUFDO1lBQ3hGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQTtRQUNoRCxNQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVwRSxJQUFJLE9BQU8sR0FBZSxFQUFFLENBQUE7UUFDNUIsSUFBSSxhQUFhLEdBQWdCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3JDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDakMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsT0FBTyxFQUFFLENBQUE7Z0JBQ1YsQ0FBQztnQkFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3RFLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ25CLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO2dCQUV4QyxNQUFNLFlBQVksR0FDakIsZ0JBQWdCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3hGLElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xCLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUE7b0JBQ3RELElBQUksV0FBVyxFQUFFLENBQUM7d0JBQ2pCLE9BQU8sR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQSxDQUFDLCtCQUErQjt3QkFDbkYsTUFBTSxhQUFhLEdBQ2xCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLHdCQUF3QixFQUFFLENBQUE7d0JBQ3JFLElBQUksYUFBYSxFQUFFLENBQUM7NEJBQ25CLEtBQ0MsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLGVBQWUsRUFDOUMsVUFBVSxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQ3pDLFVBQVUsRUFBRSxFQUNYLENBQUM7Z0NBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTs0QkFDM0UsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUE7Z0JBQzNFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2pCLE9BQU8sRUFBRSxDQUFBLENBQUMsZ0JBQWdCO2dCQUMzQixDQUFDO2dCQUVELE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FDYixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ04sSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQ3RGLENBQUE7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsTUFBTSxhQUFhLEdBQUcsWUFBWTtpQkFDaEMsSUFBSSxFQUFFO2lCQUNOLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBbUIsQ0FBQTtZQUN4RCxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDL0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxtQ0FBbUMsQ0FBQztnQkFDOUUsSUFBSSxFQUFFLHlDQUF5QzthQUMvQyxDQUFDLENBQUE7UUFDSCxDQUFDO2dCQUFTLENBQUM7WUFDVixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDbkMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3JCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXZHSyx5QkFBeUI7SUFFNUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUxiLHlCQUF5QixDQXVHOUI7QUFFRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLHVCQUF1QjtJQUNqRSxZQUN5QyxvQkFBMkMsRUFDbEQsYUFBNkIsRUFDM0IsZUFBaUM7UUFFcEUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBSm9CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzNCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtJQUdyRSxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsV0FBZ0UsRUFDaEUsT0FBcUQsRUFDckQsUUFBa0MsRUFDbEMsTUFBeUI7UUFFekIsSUFDQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLHlCQUF5QixDQUFDO1lBQ3RFLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFDcEIsQ0FBQztZQUNGLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsTUFBTSw0QkFBb0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssb0JBQW9CLENBQUMsVUFBK0I7UUFDM0QsS0FBSyxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsVUFBVSxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ2hGLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDdkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsd0JBQXdCO2dCQUN4QixPQUFPLFVBQVUsQ0FBQTtZQUNsQixDQUFDO1FBQ0YsQ0FBQztRQUNELHNCQUFzQjtRQUN0QixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQ2hDLFdBQWdFLEVBQ2hFLFdBQW9CLEVBQ3BCLFFBQWtDO1FBRWxDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxZQUFZLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztZQUN4RixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDeEMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7UUFDaEQsTUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFcEUsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNyQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ2pDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3JDLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCx5RUFBeUU7Z0JBQ3pFLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO2dCQUM3QixNQUFNLFlBQVksR0FDakIsZ0JBQWdCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3hGLElBQUksV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNqQyxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUE7b0JBQ3pELEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQzlCLHFCQUFxQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7b0JBQ3RGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO2dCQUNsQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDOUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLENBQUMsRUFBRSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDdEYsSUFBSSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztvQkFDdEQsT0FBTTtnQkFDUCxDQUFDO2dCQUVELE1BQU0sYUFBYSxHQUFHLElBQUksS0FBSyxDQUM5QixvQkFBb0IsRUFDcEIsQ0FBQyxFQUNELFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFDekIsVUFBVSxDQUFDLDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUNwRSxDQUFBO2dCQUNELElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQzdCLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCx1REFBdUQ7Z0JBQ3ZELE9BQU8sSUFBSSxnQkFBZ0IsQ0FDMUIsSUFBSSxDQUFDLEdBQUcsRUFDUixFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUNsQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxDQUM5QixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sYUFBYSxHQUFHLFlBQVk7aUJBQ2hDLElBQUksRUFBRTtpQkFDTixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLENBQW1CLENBQUE7WUFDeEQsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7Z0JBQy9DLEtBQUssRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsc0JBQXNCLENBQUM7Z0JBQy9ELElBQUksRUFBRSw0QkFBNEI7YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEzR0ssNEJBQTRCO0lBRS9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGdCQUFnQixDQUFBO0dBSmIsNEJBQTRCLENBMkdqQztBQUVELElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsdUJBQXVCO0lBQ2xFLFlBQ3lDLG9CQUEyQyxFQUNoRCxlQUFpQyxFQUNuQyxhQUE2QjtRQUU5RCxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7UUFKb0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNoRCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDbkMsa0JBQWEsR0FBYixhQUFhLENBQWdCO0lBRy9ELENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNoQixXQUFnRSxFQUNoRSxPQUFxRCxFQUNyRCxRQUFrQyxFQUNsQyxNQUF5QjtRQUV6QixxR0FBcUc7UUFDckcsd0VBQXdFO1FBRXhFLElBQ0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSxlQUFlLENBQUMsa0JBQWtCLENBQUM7WUFDL0UsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUNwQixDQUFDO1lBQ0YsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxNQUFNLDRCQUFvQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzNGLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUNqQyxXQUFnRSxFQUNoRSxXQUFvQixFQUNwQixRQUFrQztRQUVsQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssWUFBWSw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7WUFDeEYsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFBO1FBRWhELCtCQUErQjtRQUMvQixNQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNwRSxJQUFJLFVBQVUsQ0FBQTtRQUNkLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixVQUFVLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFBO1FBQ3BELENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ3JDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDakMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsT0FBTTtnQkFDUCxDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7Z0JBQ2hELE1BQU0sMkJBQTJCLEdBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsK0JBQStCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUVqRSxJQUFJLENBQUMsU0FBUyxJQUFJLDJCQUEyQixFQUFFLENBQUM7b0JBQy9DLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxPQUFPLElBQUksZ0JBQWdCLENBQzFCLElBQUksQ0FBQyxHQUFHLEVBQ1I7b0JBQ0MsS0FBSyxFQUFFLElBQUksS0FBSyxDQUNmLFNBQVMsR0FBRyxDQUFDLEVBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQ3hDLFNBQVMsR0FBRyxDQUFDLEVBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQ3hDO29CQUNELElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtpQkFDOUIsRUFDRCxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxDQUM5QixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLENBQW1CLENBQUE7WUFDekYsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7Z0JBQy9DLEtBQUssRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUM7Z0JBQzlELElBQUksRUFBRSw2QkFBNkI7YUFDbkMsQ0FBQyxDQUFBO1lBRUYscUVBQXFFO1lBQ3JFLElBQUksZ0JBQWdCLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3BDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEzRkssNkJBQTZCO0lBRWhDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGNBQWMsQ0FBQTtHQUpYLDZCQUE2QixDQTJGbEM7QUFFRCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQUNoQyxZQUN5QyxvQkFBMkMsRUFDckQsVUFBdUIsRUFFcEMsK0JBQWlFLEVBQzlDLGdCQUFtQyxFQUMvQixvQkFBMkM7UUFMM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXBDLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBa0M7UUFDOUMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUMvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQ2pGLENBQUM7SUFFSixLQUFLLENBQUMsV0FBVyxDQUNoQixXQUFnRSxFQUNoRSxPQUFxRCxFQUNyRCxRQUFrQyxFQUNsQyxLQUF3QjtRQUV4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUMzRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssWUFBWSw0QkFBNEIsQ0FBQyxFQUFFLENBQUM7WUFDeEYsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDcEIsSUFBSSxPQUFPLENBQUMsTUFBTSw0QkFBb0IsRUFBRSxDQUFDO1lBQ3hDLHFKQUFxSjtZQUNySixpRUFBaUU7WUFDakUsaUVBQWlFO1lBQ2pFLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLGdDQUF3QixFQUFFLENBQUM7WUFDbkQsV0FBVyxHQUFHLFVBQVUsQ0FBQTtRQUN6QixDQUFDO2FBQU0sQ0FBQztZQUNQLDBGQUEwRjtZQUMxRixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDakQsZUFBZSxDQUFDLGlCQUFpQixDQUNqQyxDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQWEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDcEQsQ0FBQyxDQUFDLE9BQU87WUFDVCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNqRSxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUM1QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQ2pFLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsTUFBTSxDQUM1QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxXQUFXLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQ3BFLENBQUE7UUFFRCxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQ3JELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUMzQyxDQUFBO1FBQ0QsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDOUQsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQ25DLENBQUE7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsOENBQThDLEVBQzlDLGlDQUFpQyxDQUNqQzthQUNELENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQztnQkFDSixNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNuQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3RFLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBRXJCLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO2dCQUVsRCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzdDLDBCQUEwQixDQUFDLDZCQUE2QixFQUN4RCxlQUFlLEVBQ2YseUJBQXlCLEVBQ3pCLGVBQWUsRUFDZixRQUFRLEVBQ1IsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUE7WUFDdEUsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtnQkFDbkMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBRUQsOEJBQThCO1FBQzlCLElBQUksdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEMsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDckMsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUM3QyxJQUFJLGNBQWMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQzdDLE9BQU8sQ0FBQyxDQUFBO3dCQUNULENBQUM7d0JBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQTtvQkFDVixDQUFDO29CQUNELElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0MsT0FBTyxDQUFDLENBQUE7b0JBQ1QsQ0FBQztvQkFDRCxPQUFPLENBQUMsQ0FBQTtnQkFDVCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBQzVDLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsMENBQTBDLEVBQzFDLDZCQUE2QixDQUM3QjthQUNELENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQztnQkFDSixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtvQkFDdEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUN0RSxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUV2QixNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQTtvQkFFbEQsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM3QywwQkFBMEIsQ0FBQyw2QkFBNkIsRUFDeEQsZUFBZSxFQUNmLHVCQUF1QixFQUN2QixlQUFlLEVBQ2YsUUFBUSxFQUNSLEtBQUssQ0FDTCxDQUFBO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7WUFDN0QsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtnQkFDbkMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFlBQStCO1FBQzlELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxpQkFBaUI7UUFDakIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDNUIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUExSkssMkJBQTJCO0lBRTlCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQVBsQiwyQkFBMkIsQ0EwSmhDO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQUN0QyxNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUN2QyxRQUEwQixFQUMxQixhQUFnQyxFQUNoQyxRQUFrQyxFQUNsQyxLQUF3QjtRQUV4QixNQUFNLG9CQUFvQixHQUEwQixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDdkYsTUFBTSxnQkFBZ0IsR0FBc0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sVUFBVSxHQUFnQixRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sb0JBQW9CLEdBQTBCLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUV2RixNQUFNLGdCQUFnQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDOUMsSUFBSSxZQUFZLEdBQVksS0FBSyxDQUFBO1FBQ2pDLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDZixPQUFPLEVBQUUsUUFBUSxDQUNoQiw0Q0FBNEMsRUFDNUMsK0JBQStCLENBQy9CO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxNQUFNLEdBQUcsR0FBRyxNQUFNLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNqRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDekIsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7WUFFbEQsTUFBTSxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQzFELGVBQWUsQ0FBQyxnQkFBZ0IsQ0FDaEMsQ0FBQTtZQUNELFlBQVksR0FBRyxNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkQsMEJBQTBCLENBQUMsMkJBQTJCLEVBQ3RELGVBQWUsRUFDZixJQUFJLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQ3ZDLEVBQUUsRUFDRixxQkFBcUIsRUFDckIsUUFBUSxFQUNSLEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQTtRQUNuRSxDQUFDO2dCQUFTLENBQUM7WUFDVixRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDbkMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUN6QyxRQUEwQixFQUMxQixLQUFpQixFQUNqQixpQkFBOEMsRUFDOUMsUUFBcUMsRUFDckMsUUFBa0MsRUFDbEMsS0FBd0I7UUFFeEIsTUFBTSxvQkFBb0IsR0FBMEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sdUJBQXVCLEdBQTZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNoRyxNQUFNLFVBQVUsR0FBZ0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUV6RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUFBO2dCQUN0QixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtZQXNCbkMsQ0FBQztZQXJCUSxPQUFPO2dCQUNkLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FDaEI7d0JBQ0MsR0FBRyxFQUFFLGlCQUFpQjt3QkFDdEIsT0FBTyxFQUFFOzRCQUNSLHVHQUF1Rzt5QkFDdkc7cUJBQ0QsRUFDRCxxREFBcUQsRUFDckQsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELDhFQUE4RSxDQUM5RTtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFFBQTRCO2dCQUNsQyxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUNyQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FBQTtRQUVKLEtBQUssTUFBTSxjQUFjLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFlBQVksR0FBRyxNQUFNLDBCQUEwQixDQUFDLGVBQWUsQ0FDcEUsS0FBSyxFQUNMLGNBQWMsRUFDZCxRQUFRLEVBQ1IsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixLQUFLLENBQ0wsQ0FBQTtZQUNELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUM7Z0JBQ0osS0FBSyxNQUFNLE1BQU0sSUFBSSxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ2hELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQTtvQkFDakQsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO29CQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7d0JBQ2pELEtBQUssTUFBTSxJQUFJLElBQUksZUFBZSxJQUFJLEVBQUUsRUFBRSxDQUFDOzRCQUMxQyxNQUFNLGlCQUFpQixHQUFHLElBQTBCLENBQUE7NEJBQ3BELElBQUksaUJBQWlCLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0NBQ2xGLFNBQVE7NEJBQ1QsQ0FBQztpQ0FBTSxDQUFDO2dDQUNQLHlDQUF5QztnQ0FDekMsU0FBUyxHQUFHLElBQUksQ0FBQTtnQ0FDaEIsTUFBSzs0QkFDTixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO3dCQUNmLFVBQVUsQ0FBQyxJQUFJLENBQUMscUVBQXFFLENBQUMsQ0FBQTt3QkFDdEYsU0FBUTtvQkFDVCxDQUFDO29CQUNELFFBQVEsQ0FBQyxNQUFNLENBQUM7d0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsa0JBQWtCLEVBQ2xCLDZCQUE2QixFQUM3QixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDbkI7cUJBQ0QsQ0FBQyxDQUFBO29CQUNGLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUN4QyxlQUFlLEVBQ2YsTUFBTSxFQUNOLHFCQUFxQixDQUFDLE1BQU0sRUFDNUIsRUFBRSxFQUNGLEtBQUssQ0FDTCxDQUFBO29CQUNELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7d0JBQ25DLE9BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUix3RUFBd0U7WUFDekUsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUN2QyxRQUEwQixFQUMxQixLQUFpQixFQUNqQixzQkFBd0MsRUFDeEMsUUFBcUMsRUFDckMsV0FBK0IsRUFDL0IsUUFBa0MsRUFDbEMsS0FBd0I7UUFFeEIsTUFBTSxvQkFBb0IsR0FBMEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sdUJBQXVCLEdBQTZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNoRyxNQUFNLFVBQVUsR0FBZ0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUV6RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUFBO2dCQUN0QixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtZQXNCbkMsQ0FBQztZQXJCUSxPQUFPO2dCQUNkLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FDaEI7d0JBQ0MsR0FBRyxFQUFFLGlCQUFpQjt3QkFDdEIsT0FBTyxFQUFFOzRCQUNSLHVHQUF1Rzt5QkFDdkc7cUJBQ0QsRUFDRCxxREFBcUQsRUFDckQsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RELDZFQUE2RSxDQUM3RTtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFFBQTRCO2dCQUNsQyxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUNyQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FBQTtRQUVKLE1BQU0sZUFBZSxHQUFHLE1BQU0sMEJBQTBCLENBQUMsZUFBZSxDQUN2RSxLQUFLLEVBQ0wsc0JBQXNCLEVBQ3RCLFFBQVEsRUFDUix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLEtBQUssQ0FDTCxDQUFBO1FBQ0QsOEdBQThHO1FBQzlHLElBQUksZUFBZSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDN0QsVUFBVSxDQUFDLElBQUksQ0FDZCxzSkFBc0osQ0FDdEosQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBK0IsV0FBVztnQkFDckQsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUNqQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxXQUFXLEtBQUssV0FBVyxDQUN4RDtnQkFDRixDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2FBQ3pGLENBQUMsQ0FBQTtZQUNGLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUN4QyxlQUFlLEVBQ2YsTUFBTSxFQUNOLHFCQUFxQixDQUFDLE1BQU0sRUFDNUIsRUFBRSxFQUNGLEtBQUssQ0FDTCxDQUFBO1lBQ0QsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLFVBQVUsQ0FBQyxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQTtZQUN2RSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7Z0JBQVMsQ0FBQztZQUNWLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsa0pBQWtKO0lBQ2xKLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLEtBQWlCLEVBQ2pCLGNBQWdDLEVBQ2hDLFFBQXFDLEVBQ3JDLHVCQUFpRCxFQUNqRCxRQUF1QyxFQUN2QyxLQUF3QjtRQUV4QixPQUFPLGNBQWMsQ0FDcEIsdUJBQXVCLENBQUMsa0JBQWtCLEVBQzFDLEtBQUssRUFDTCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsRUFDekI7WUFDQyxJQUFJLHNDQUE4QjtZQUNsQyxhQUFhLEVBQUUsdUJBQXVCLENBQUMsTUFBTTtZQUM3QyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFO1NBQ25GLEVBQ0QsUUFBUSxFQUNSLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxhQUE2QjtJQUM3RCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7SUFDakQsTUFBTSxjQUFjLEdBQUcsK0JBQStCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLEVBQUUsZ0JBQWdCLENBQUE7SUFDekQsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN4QixDQUFDO0FBRU0sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBQzNELFlBQ3lDLG9CQUEyQyxFQUN6QyxzQkFBK0M7UUFFekYsS0FBSyxFQUFFLENBQUE7UUFIaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN6QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBR3pGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQzdDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FDbkUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQzdDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FDckUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQzdDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FDakUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQzdDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLENBQUMsQ0FDdkUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQzdDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FDdEUsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwQ1ksNEJBQTRCO0lBRXRDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtHQUhiLDRCQUE0QixDQW9DeEM7O0FBRUQsTUFBTSw4QkFBOEIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUNqRCxnQ0FBZ0MsQ0FBQyxTQUFTLENBQzFDLENBQUE7QUFDRCw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FDM0QsNEJBQTRCLGtDQUU1QixDQUFBIn0=