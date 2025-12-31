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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { trimTrailingWhitespace } from '../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ApplyCodeActionReason, applyCodeAction, getCodeActions, } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../../../../editor/contrib/codeAction/common/types.js';
import { formatDocumentRangesWithSelectedProvider, formatDocumentWithSelectedProvider, } from '../../../../editor/contrib/format/browser/format.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Progress, } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchContributionsExtensions, } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { getModifiedRanges } from '../../format/browser/formatModified.js';
let TrimWhitespaceParticipant = class TrimWhitespaceParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        const trimTrailingWhitespaceOption = this.configurationService.getValue('files.trimTrailingWhitespace', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource });
        const trimInRegexAndStrings = this.configurationService.getValue('files.trimTrailingWhitespaceInRegexAndStrings', { overrideIdentifier: model.textEditorModel.getLanguageId(), resource: model.resource });
        if (trimTrailingWhitespaceOption) {
            this.doTrimTrailingWhitespace(model.textEditorModel, context.reason === 2 /* SaveReason.AUTO */, trimInRegexAndStrings);
        }
    }
    doTrimTrailingWhitespace(model, isAutoSaved, trimInRegexesAndStrings) {
        let prevSelection = [];
        let cursors = [];
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            // Find `prevSelection` in any case do ensure a good undo stack when pushing the edit
            // Collect active cursors in `cursors` only if `isAutoSaved` to avoid having the cursors jump
            prevSelection = editor.getSelections();
            if (isAutoSaved) {
                cursors = prevSelection.map((s) => s.getPosition());
                const snippetsRange = SnippetController2.get(editor)?.getSessionEnclosingRange();
                if (snippetsRange) {
                    for (let lineNumber = snippetsRange.startLineNumber; lineNumber <= snippetsRange.endLineNumber; lineNumber++) {
                        cursors.push(new Position(lineNumber, model.getLineMaxColumn(lineNumber)));
                    }
                }
            }
        }
        const ops = trimTrailingWhitespace(model, cursors, trimInRegexesAndStrings);
        if (!ops.length) {
            return; // Nothing to do
        }
        model.pushEditOperations(prevSelection, ops, (_edits) => prevSelection);
    }
};
TrimWhitespaceParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], TrimWhitespaceParticipant);
export { TrimWhitespaceParticipant };
function findEditor(model, codeEditorService) {
    let candidate = null;
    if (model.isAttachedToEditor()) {
        for (const editor of codeEditorService.listCodeEditors()) {
            if (editor.hasModel() && editor.getModel() === model) {
                if (editor.hasTextFocus()) {
                    return editor; // favour focused editor if there are multiple
                }
                candidate = editor;
            }
        }
    }
    return candidate;
}
let FinalNewLineParticipant = class FinalNewLineParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        if (this.configurationService.getValue('files.insertFinalNewline', {
            overrideIdentifier: model.textEditorModel.getLanguageId(),
            resource: model.resource,
        })) {
            this.doInsertFinalNewLine(model.textEditorModel);
        }
    }
    doInsertFinalNewLine(model) {
        const lineCount = model.getLineCount();
        const lastLine = model.getLineContent(lineCount);
        const lastLineIsEmptyOrWhitespace = strings.lastNonWhitespaceIndex(lastLine) === -1;
        if (!lineCount || lastLineIsEmptyOrWhitespace) {
            return;
        }
        const edits = [
            EditOperation.insert(new Position(lineCount, model.getLineMaxColumn(lineCount)), model.getEOL()),
        ];
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            editor.executeEdits('insertFinalNewLine', edits, editor.getSelections());
        }
        else {
            model.pushEditOperations([], edits, () => null);
        }
    }
};
FinalNewLineParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], FinalNewLineParticipant);
export { FinalNewLineParticipant };
let TrimFinalNewLinesParticipant = class TrimFinalNewLinesParticipant {
    constructor(configurationService, codeEditorService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        // Nothing
    }
    async participate(model, context) {
        if (!model.textEditorModel) {
            return;
        }
        if (this.configurationService.getValue('files.trimFinalNewlines', {
            overrideIdentifier: model.textEditorModel.getLanguageId(),
            resource: model.resource,
        })) {
            this.doTrimFinalNewLines(model.textEditorModel, context.reason === 2 /* SaveReason.AUTO */);
        }
    }
    /**
     * returns 0 if the entire file is empty
     */
    findLastNonEmptyLine(model) {
        for (let lineNumber = model.getLineCount(); lineNumber >= 1; lineNumber--) {
            const lineLength = model.getLineLength(lineNumber);
            if (lineLength > 0) {
                // this line has content
                return lineNumber;
            }
        }
        // no line has content
        return 0;
    }
    doTrimFinalNewLines(model, isAutoSaved) {
        const lineCount = model.getLineCount();
        // Do not insert new line if file does not end with new line
        if (lineCount === 1) {
            return;
        }
        let prevSelection = [];
        let cannotTouchLineNumber = 0;
        const editor = findEditor(model, this.codeEditorService);
        if (editor) {
            prevSelection = editor.getSelections();
            if (isAutoSaved) {
                for (let i = 0, len = prevSelection.length; i < len; i++) {
                    const positionLineNumber = prevSelection[i].positionLineNumber;
                    if (positionLineNumber > cannotTouchLineNumber) {
                        cannotTouchLineNumber = positionLineNumber;
                    }
                }
            }
        }
        const lastNonEmptyLine = this.findLastNonEmptyLine(model);
        const deleteFromLineNumber = Math.max(lastNonEmptyLine + 1, cannotTouchLineNumber + 1);
        const deletionRange = model.validateRange(new Range(deleteFromLineNumber, 1, lineCount, model.getLineMaxColumn(lineCount)));
        if (deletionRange.isEmpty()) {
            return;
        }
        model.pushEditOperations(prevSelection, [EditOperation.delete(deletionRange)], (_edits) => prevSelection);
        editor?.setSelections(prevSelection);
    }
};
TrimFinalNewLinesParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService)
], TrimFinalNewLinesParticipant);
export { TrimFinalNewLinesParticipant };
let FormatOnSaveParticipant = class FormatOnSaveParticipant {
    constructor(configurationService, codeEditorService, instantiationService) {
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        this.instantiationService = instantiationService;
        // Nothing
    }
    async participate(model, context, progress, token) {
        if (!model.textEditorModel) {
            return;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        const textEditorModel = model.textEditorModel;
        const overrides = {
            overrideIdentifier: textEditorModel.getLanguageId(),
            resource: textEditorModel.uri,
        };
        const nestedProgress = new Progress((provider) => {
            progress.report({
                message: localize({
                    key: 'formatting2',
                    comment: [
                        '[configure]({1}) is a link. Only translate `configure`. Do not change brackets and parentheses or {1}',
                    ],
                }, "Running '{0}' Formatter ([configure]({1})).", provider.displayName || (provider.extensionId && provider.extensionId.value) || '???', 'command:workbench.action.openSettings?%5B%22editor.formatOnSave%22%5D'),
            });
        });
        const enabled = this.configurationService.getValue('editor.formatOnSave', overrides);
        if (!enabled) {
            return undefined;
        }
        const editorOrModel = findEditor(textEditorModel, this.codeEditorService) || textEditorModel;
        const mode = this.configurationService.getValue('editor.formatOnSaveMode', overrides);
        if (mode === 'file') {
            await this.instantiationService.invokeFunction(formatDocumentWithSelectedProvider, editorOrModel, 2 /* FormattingMode.Silent */, nestedProgress, token);
        }
        else {
            const ranges = await this.instantiationService.invokeFunction(getModifiedRanges, isCodeEditor(editorOrModel) ? editorOrModel.getModel() : editorOrModel);
            if (ranges === null && mode === 'modificationsIfAvailable') {
                // no SCM, fallback to formatting the whole file iff wanted
                await this.instantiationService.invokeFunction(formatDocumentWithSelectedProvider, editorOrModel, 2 /* FormattingMode.Silent */, nestedProgress, token);
            }
            else if (ranges) {
                // formatted modified ranges
                await this.instantiationService.invokeFunction(formatDocumentRangesWithSelectedProvider, editorOrModel, ranges, 2 /* FormattingMode.Silent */, nestedProgress, token, false);
            }
        }
    }
};
FormatOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, ICodeEditorService),
    __param(2, IInstantiationService)
], FormatOnSaveParticipant);
let CodeActionOnSaveParticipant = class CodeActionOnSaveParticipant extends Disposable {
    constructor(configurationService, instantiationService, languageFeaturesService, hostService, editorService, codeEditorService) {
        super();
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.languageFeaturesService = languageFeaturesService;
        this.hostService = hostService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this._register(this.hostService.onDidChangeFocus(() => {
            this.triggerCodeActionsCommand();
        }));
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this.triggerCodeActionsCommand();
        }));
    }
    async triggerCodeActionsCommand() {
        if (this.configurationService.getValue('editor.codeActions.triggerOnFocusChange') &&
            this.configurationService.getValue('files.autoSave') === 'afterDelay') {
            const model = this.codeEditorService.getActiveCodeEditor()?.getModel();
            if (!model) {
                return undefined;
            }
            const settingsOverrides = { overrideIdentifier: model.getLanguageId(), resource: model.uri };
            const setting = this.configurationService.getValue('editor.codeActionsOnSave', settingsOverrides);
            if (!setting) {
                return undefined;
            }
            if (Array.isArray(setting)) {
                return undefined;
            }
            const settingItems = Object.keys(setting).filter((x) => setting[x] &&
                setting[x] === 'always' &&
                CodeActionKind.Source.contains(new HierarchicalKind(x)));
            const cancellationTokenSource = new CancellationTokenSource();
            const codeActionKindList = [];
            for (const item of settingItems) {
                codeActionKindList.push(new HierarchicalKind(item));
            }
            // run code actions based on what is found from setting === 'always', no exclusions.
            await this.applyOnSaveActions(model, codeActionKindList, [], Progress.None, cancellationTokenSource.token);
        }
    }
    async participate(model, context, progress, token) {
        if (!model.textEditorModel) {
            return;
        }
        const textEditorModel = model.textEditorModel;
        const settingsOverrides = {
            overrideIdentifier: textEditorModel.getLanguageId(),
            resource: textEditorModel.uri,
        };
        // Convert boolean values to strings
        const setting = this.configurationService.getValue('editor.codeActionsOnSave', settingsOverrides);
        if (!setting) {
            return undefined;
        }
        if (context.reason === 2 /* SaveReason.AUTO */) {
            return undefined;
        }
        if (context.reason !== 1 /* SaveReason.EXPLICIT */ && Array.isArray(setting)) {
            return undefined;
        }
        const settingItems = Array.isArray(setting)
            ? setting
            : Object.keys(setting).filter((x) => setting[x] && setting[x] !== 'never');
        const codeActionsOnSave = this.createCodeActionsOnSave(settingItems);
        if (!Array.isArray(setting)) {
            codeActionsOnSave.sort((a, b) => {
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
        if (!codeActionsOnSave.length) {
            return undefined;
        }
        const excludedActions = Array.isArray(setting)
            ? []
            : Object.keys(setting)
                .filter((x) => setting[x] === 'never' || false)
                .map((x) => new HierarchicalKind(x));
        progress.report({ message: localize('codeaction', 'Quick Fixes') });
        const filteredSaveList = Array.isArray(setting)
            ? codeActionsOnSave
            : codeActionsOnSave.filter((x) => setting[x.value] === 'always' ||
                ((setting[x.value] === 'explicit' || setting[x.value] === true) &&
                    context.reason === 1 /* SaveReason.EXPLICIT */));
        await this.applyOnSaveActions(textEditorModel, filteredSaveList, excludedActions, progress, token);
    }
    createCodeActionsOnSave(settingItems) {
        const kinds = settingItems.map((x) => new HierarchicalKind(x));
        // Remove subsets
        return kinds.filter((kind) => {
            return kinds.every((otherKind) => otherKind.equals(kind) || !otherKind.contains(kind));
        });
    }
    async applyOnSaveActions(model, codeActionsOnSave, excludes, progress, token) {
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
                    }, 'Getting code actions from {0} ([configure]({1})).', [...this._names].map((name) => `'${name}'`).join(', '), 'command:workbench.action.openSettings?%5B%22editor.codeActionsOnSave%22%5D'),
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
            const actionsToRun = await this.getActionsToRun(model, codeActionKind, excludes, getActionProgress, token);
            if (token.isCancellationRequested) {
                actionsToRun.dispose();
                return;
            }
            try {
                for (const action of actionsToRun.validActions) {
                    progress.report({
                        message: localize('codeAction.apply', "Applying code action '{0}'.", action.action.title),
                    });
                    await this.instantiationService.invokeFunction(applyCodeAction, action, ApplyCodeActionReason.OnSave, {}, token);
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
    getActionsToRun(model, codeActionKind, excludes, progress, token) {
        return getCodeActions(this.languageFeaturesService.codeActionProvider, model, model.getFullModelRange(), {
            type: 2 /* CodeActionTriggerType.Auto */,
            triggerAction: CodeActionTriggerSource.OnSave,
            filter: { include: codeActionKind, excludes: excludes, includeSourceActions: true },
        }, progress, token);
    }
};
CodeActionOnSaveParticipant = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, ILanguageFeaturesService),
    __param(3, IHostService),
    __param(4, IEditorService),
    __param(5, ICodeEditorService)
], CodeActionOnSaveParticipant);
let SaveParticipantsContribution = class SaveParticipantsContribution extends Disposable {
    constructor(instantiationService, textFileService) {
        super();
        this.instantiationService = instantiationService;
        this.textFileService = textFileService;
        this.registerSaveParticipants();
    }
    registerSaveParticipants() {
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimWhitespaceParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(CodeActionOnSaveParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FormatOnSaveParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(FinalNewLineParticipant)));
        this._register(this.textFileService.files.addSaveParticipant(this.instantiationService.createInstance(TrimFinalNewLinesParticipant)));
    }
};
SaveParticipantsContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextFileService)
], SaveParticipantsContribution);
export { SaveParticipantsContribution };
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SaveParticipantsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9zYXZlUGFydGljaXBhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQXFCLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSS9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZUFBZSxFQUNmLGNBQWMsR0FDZCxNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFDTixjQUFjLEVBQ2QsdUJBQXVCLEdBQ3ZCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUVOLHdDQUF3QyxFQUN4QyxrQ0FBa0MsR0FDbEMsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUs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