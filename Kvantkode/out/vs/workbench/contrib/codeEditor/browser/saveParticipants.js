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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVBhcnRpY2lwYW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3NhdmVQYXJ0aWNpcGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBcUIsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDNUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixlQUFlLEVBQ2YsY0FBYyxHQUNkLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUNOLGNBQWMsRUFDZCx1QkFBdUIsR0FDdkIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sd0NBQXdDLEVBQ3hDLGtDQUFrQyxHQUNsQyxNQUFNLHFEQUFx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