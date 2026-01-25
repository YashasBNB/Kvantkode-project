var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { isEqual } from '../../../../../base/common/resources.js';
import * as strings from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProgressService, } from '../../../../../platform/progress/common/progress.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { reviewEdits } from '../../../inlineChat/browser/inlineChatController.js';
import { insertCell } from '../../../notebook/browser/controller/cellOperations.js';
import { CellKind, NOTEBOOK_EDITOR_ID } from '../../../notebook/common/notebookCommon.js';
import { ICodeMapperService, } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let InsertCodeBlockOperation = class InsertCodeBlockOperation {
    constructor(editorService, textFileService, bulkEditService, codeEditorService, chatService, languageService, dialogService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.bulkEditService = bulkEditService;
        this.codeEditorService = codeEditorService;
        this.chatService = chatService;
        this.languageService = languageService;
        this.dialogService = dialogService;
    }
    async run(context) {
        const activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        if (activeEditorControl) {
            await this.handleTextEditor(activeEditorControl, context);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                await this.handleNotebookEditor(activeNotebookEditor, context);
            }
            else {
                this.notify(localize('insertCodeBlock.noActiveEditor', 'To insert the code block, open a code editor or notebook editor and set the cursor at the location where to insert the code block.'));
            }
        }
        notifyUserAction(this.chatService, context, {
            kind: 'insert',
            codeBlockIndex: context.codeBlockIndex,
            totalCharacters: context.code.length,
        });
    }
    async handleNotebookEditor(notebookEditor, codeBlockContext) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('insertCodeBlock.readonlyNotebook', 'Cannot insert the code block to read-only notebook editor.'));
            return false;
        }
        const focusRange = notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        insertCell(this.languageService, notebookEditor, next, CellKind.Code, 'below', codeBlockContext.code, true);
        return true;
    }
    async handleTextEditor(codeEditor, codeBlockContext) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('insertCodeBlock.readonly', 'Cannot insert the code block to read-only code editor.'));
            return false;
        }
        const range = codeEditor.getSelection() ??
            new Range(activeModel.getLineCount(), 1, activeModel.getLineCount(), 1);
        const text = reindent(codeBlockContext.code, activeModel, range.startLineNumber);
        const edits = [new ResourceTextEdit(activeModel.uri, { range, text })];
        await this.bulkEditService.apply(edits);
        this.codeEditorService
            .listCodeEditors()
            .find((editor) => editor.getModel()?.uri.toString() === activeModel.uri.toString())
            ?.focus();
        return true;
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
InsertCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IBulkEditService),
    __param(3, ICodeEditorService),
    __param(4, IChatService),
    __param(5, ILanguageService),
    __param(6, IDialogService)
], InsertCodeBlockOperation);
export { InsertCodeBlockOperation };
let ApplyCodeBlockOperation = class ApplyCodeBlockOperation {
    constructor(editorService, textFileService, chatService, languageService, fileService, dialogService, logService, codeMapperService, progressService, quickInputService, labelService, instantiationService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.chatService = chatService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.codeMapperService = codeMapperService;
        this.progressService = progressService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
    }
    async run(context) {
        let activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        const codemapperUri = await this.evaluateURIToUse(context.codemapperUri, activeEditorControl);
        if (!codemapperUri) {
            return;
        }
        if (codemapperUri && !isEqual(activeEditorControl?.getModel().uri, codemapperUri)) {
            // reveal the target file
            try {
                const editorPane = await this.editorService.openEditor({ resource: codemapperUri });
                const codeEditor = getCodeEditor(editorPane?.getControl());
                if (codeEditor && codeEditor.hasModel()) {
                    this.tryToRevealCodeBlock(codeEditor, context.code);
                    activeEditorControl = codeEditor;
                }
                else {
                    this.notify(localize('applyCodeBlock.errorOpeningFile', 'Failed to open {0} in a code editor.', codemapperUri.toString()));
                    return;
                }
            }
            catch (e) {
                this.logService.info('[ApplyCodeBlockOperation] error opening code mapper file', codemapperUri, e);
                return;
            }
        }
        let result = undefined;
        if (activeEditorControl) {
            result = await this.handleTextEditor(activeEditorControl, context.code);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                result = await this.handleNotebookEditor(activeNotebookEditor, context.code);
            }
            else {
                this.notify(localize('applyCodeBlock.noActiveEditor', 'To apply this code block, open a code or notebook editor.'));
            }
        }
        notifyUserAction(this.chatService, context, {
            kind: 'apply',
            codeBlockIndex: context.codeBlockIndex,
            totalCharacters: context.code.length,
            codeMapper: result?.codeMapper,
            editsProposed: !!result?.editsProposed,
        });
    }
    async evaluateURIToUse(resource, activeEditorControl) {
        if (resource && (await this.fileService.exists(resource))) {
            return resource;
        }
        const activeEditorOption = activeEditorControl?.getModel().uri
            ? {
                label: localize('activeEditor', "Active editor '{0}'", this.labelService.getUriLabel(activeEditorControl.getModel().uri, { relative: true })),
                id: 'activeEditor',
            }
            : undefined;
        const untitledEditorOption = {
            label: localize('newUntitledFile', 'New untitled editor'),
            id: 'newUntitledFile',
        };
        const options = [];
        if (resource) {
            // code block had an URI, but it doesn't exist
            options.push({
                label: localize('createFile', "New file '{0}'", this.labelService.getUriLabel(resource, { relative: true })),
                id: 'createFile',
            });
            options.push(untitledEditorOption);
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
        }
        else {
            // code block had no URI
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
            options.push(untitledEditorOption);
        }
        const selected = options.length > 1
            ? await this.quickInputService.pick(options, {
                placeHolder: localize('selectOption', 'Select where to apply the code block'),
            })
            : options[0];
        if (selected) {
            switch (selected.id) {
                case 'createFile':
                    if (resource) {
                        try {
                            await this.fileService.writeFile(resource, VSBuffer.fromString(''));
                        }
                        catch (error) {
                            this.notify(localize('applyCodeBlock.fileWriteError', 'Failed to create file: {0}', error.message));
                            return URI.from({ scheme: 'untitled', path: resource.path });
                        }
                    }
                    return resource;
                case 'newUntitledFile':
                    return URI.from({ scheme: 'untitled', path: resource ? resource.path : 'Untitled-1' });
                case 'activeEditor':
                    return activeEditorControl?.getModel().uri;
            }
        }
        return undefined;
    }
    async handleNotebookEditor(notebookEditor, code) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('applyCodeBlock.readonlyNotebook', 'Cannot apply code block to read-only notebook editor.'));
            return undefined;
        }
        const focusRange = notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        insertCell(this.languageService, notebookEditor, next, CellKind.Code, 'below', code, true);
        return undefined;
    }
    async handleTextEditor(codeEditor, code) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('applyCodeBlock.readonly', 'Cannot apply code block to read-only file.'));
            return undefined;
        }
        const codeBlock = { code, resource: activeModel.uri, markdownBeforeBlock: undefined };
        const codeMapper = this.codeMapperService.providers[0]?.displayName;
        if (!codeMapper) {
            this.notify(localize('applyCodeBlock.noCodeMapper', 'No code mapper available.'));
            return undefined;
        }
        let editsProposed = false;
        const cancellationTokenSource = new CancellationTokenSource();
        try {
            const iterable = await this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, delay: 500, sticky: true, cancellable: true }, async (progress) => {
                progress.report({
                    message: localize('applyCodeBlock.progress', 'Applying code block using {0}...', codeMapper),
                });
                const editsIterable = this.getEdits(codeBlock, cancellationTokenSource.token);
                return await this.waitForFirstElement(editsIterable);
            }, () => cancellationTokenSource.cancel());
            editsProposed = await this.applyWithInlinePreview(iterable, codeEditor, cancellationTokenSource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.notify(localize('applyCodeBlock.error', 'Failed to apply code block: {0}', e.message));
            }
        }
        finally {
            cancellationTokenSource.dispose();
        }
        return {
            editsProposed,
            codeMapper,
        };
    }
    getEdits(codeBlock, token) {
        return new AsyncIterableObject(async (executor) => {
            const request = {
                codeBlocks: [codeBlock],
            };
            const response = {
                textEdit: (target, edit) => {
                    executor.emitOne(edit);
                },
                notebookEdit(_resource, _edit) {
                    //
                },
            };
            const result = await this.codeMapperService.mapCode(request, response, token);
            if (result?.errorMessage) {
                executor.reject(new Error(result.errorMessage));
            }
        });
    }
    async waitForFirstElement(iterable) {
        const iterator = iterable[Symbol.asyncIterator]();
        let result = await iterator.next();
        if (result.done) {
            return {
                async *[Symbol.asyncIterator]() {
                    return;
                },
            };
        }
        return {
            async *[Symbol.asyncIterator]() {
                while (!result.done) {
                    yield result.value;
                    result = await iterator.next();
                }
            },
        };
    }
    async applyWithInlinePreview(edits, codeEditor, tokenSource) {
        return this.instantiationService.invokeFunction(reviewEdits, codeEditor, edits, tokenSource.token);
    }
    tryToRevealCodeBlock(codeEditor, codeBlock) {
        const match = codeBlock.match(/(\S[^\n]*)\n/); // substring that starts with a non-whitespace character and ends with a newline
        if (match && match[1].length > 10) {
            const findMatch = codeEditor
                .getModel()
                .findNextMatch(match[1], { lineNumber: 1, column: 1 }, false, false, null, false);
            if (findMatch) {
                codeEditor.revealRangeInCenter(findMatch.range);
            }
        }
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
ApplyCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IChatService),
    __param(3, ILanguageService),
    __param(4, IFileService),
    __param(5, IDialogService),
    __param(6, ILogService),
    __param(7, ICodeMapperService),
    __param(8, IProgressService),
    __param(9, IQuickInputService),
    __param(10, ILabelService),
    __param(11, IInstantiationService)
], ApplyCodeBlockOperation);
export { ApplyCodeBlockOperation };
function notifyUserAction(chatService, context, action) {
    if (isResponseVM(context.element)) {
        chatService.notifyUserAction({
            agentId: context.element.agent?.id,
            command: context.element.slashCommand?.name,
            sessionId: context.element.sessionId,
            requestId: context.element.requestId,
            result: context.element.result,
            action,
        });
    }
}
function getActiveNotebookEditor(editorService) {
    const activeEditorPane = editorService.activeEditorPane;
    if (activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
        const notebookEditor = activeEditorPane.getControl();
        if (notebookEditor.hasModel()) {
            return notebookEditor;
        }
    }
    return undefined;
}
function getEditableActiveCodeEditor(editorService) {
    const activeCodeEditorInNotebook = getActiveNotebookEditor(editorService)?.activeCodeEditor;
    if (activeCodeEditorInNotebook &&
        activeCodeEditorInNotebook.hasTextFocus() &&
        activeCodeEditorInNotebook.hasModel()) {
        return activeCodeEditorInNotebook;
    }
    let codeEditor = getCodeEditor(editorService.activeTextEditorControl);
    if (!codeEditor) {
        for (const editor of editorService.visibleTextEditorControls) {
            codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                break;
            }
        }
    }
    if (!codeEditor || !codeEditor.hasModel()) {
        return undefined;
    }
    return codeEditor;
}
function isReadOnly(model, textFileService) {
    // Check if model is editable, currently only support untitled and text file
    const activeTextModel = textFileService.files.get(model.uri) ?? textFileService.untitled.get(model.uri);
    return !!activeTextModel?.isReadonly();
}
function reindent(codeBlockContent, model, seletionStartLine) {
    const newContent = strings.splitLines(codeBlockContent);
    if (newContent.length === 0) {
        return codeBlockContent;
    }
    const formattingOptions = model.getFormattingOptions();
    const codeIndentLevel = computeIndentation(model.getLineContent(seletionStartLine), formattingOptions.tabSize).level;
    const indents = newContent.map((line) => computeIndentation(line, formattingOptions.tabSize));
    // find the smallest indent level in the code block
    const newContentIndentLevel = indents.reduce((min, indent, index) => {
        if (indent.length !== newContent[index].length) {
            // ignore empty lines
            return Math.min(indent.level, min);
        }
        return min;
    }, Number.MAX_VALUE);
    if (newContentIndentLevel === Number.MAX_VALUE || newContentIndentLevel === codeIndentLevel) {
        // all lines are empty or the indent is already correct
        return codeBlockContent;
    }
    const newLines = [];
    for (let i = 0; i < newContent.length; i++) {
        const { level, length } = indents[i];
        const newLevel = Math.max(0, codeIndentLevel + level - newContentIndentLevel);
        const newIndentation = formattingOptions.insertSpaces
            ? ' '.repeat(formattingOptions.tabSize * newLevel)
            : '\t'.repeat(newLevel);
        newLines.push(newIndentation + newContent[i].substring(length));
    }
    return newLines.join('\n');
}
/**
 * Returns:
 *  - level: the line's the ident level in tabs
 *  - length: the number of characters of the leading whitespace
 */
export function computeIndentation(line, tabSize) {
    let nSpaces = 0;
    let level = 0;
    let i = 0;
    let length = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            nSpaces++;
            if (nSpaces === tabSize) {
                level++;
                nSpaces = 0;
                length = i + 1;
            }
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            level++;
            nSpaces = 0;
            length = i + 1;
        }
        else {
            break;
        }
        i++;
    }
    return { level, length };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY29kZUJsb2NrT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxD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