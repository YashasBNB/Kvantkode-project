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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NvZGVCbG9ja09wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBcUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtB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