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
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { codiconsLibrary } from '../../../../../../base/common/codiconsLibrary.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService, } from '../../../../../../platform/quickinput/common/quickInput.js';
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IChatWidgetService } from '../../../../chat/browser/chat.js';
import { ChatInputPart } from '../../../../chat/browser/chatInputPart.js';
import { ChatDynamicVariableModel } from '../../../../chat/browser/contrib/chatDynamicVariables.js';
import { computeCompletionRanges } from '../../../../chat/browser/contrib/chatInputCompletions.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
import { ChatContextKeys } from '../../../../chat/common/chatContextKeys.js';
import { chatVariableLeader } from '../../../../chat/common/chatParserTypes.js';
import { NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT, NOTEBOOK_CELL_OUTPUT_MIMETYPE, } from '../../../common/notebookContextKeys.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { getNotebookEditorFromEditorPane, } from '../../notebookBrowser.js';
import * as icons from '../../notebookIcons.js';
import { getOutputViewModelFromId } from '../cellOutputActions.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../coreActions.js';
import { CellUri } from '../../../common/notebookCommon.js';
import './cellChatActions.js';
import { CTX_NOTEBOOK_CHAT_HAS_AGENT } from './notebookChatContext.js';
const NotebookKernelVariableKey = 'kernelVariable';
const NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST = [
    'text/plain',
    'text/html',
    'application/vnd.code.notebook.error',
    'application/vnd.code.notebook.stdout',
    'application/x.notebook.stdout',
    'application/x.notebook.stream',
    'application/vnd.code.notebook.stderr',
    'application/x.notebook.stderr',
    'image/png',
    'image/jpeg',
    'image/svg',
];
let NotebookChatContribution = class NotebookChatContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookChatContribution'; }
    constructor(contextKeyService, chatAgentService, editorService, chatWidgetService, notebookKernelService, languageFeaturesService) {
        super();
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.notebookKernelService = notebookKernelService;
        this.languageFeaturesService = languageFeaturesService;
        this._ctxHasProvider = CTX_NOTEBOOK_CHAT_HAS_AGENT.bindTo(contextKeyService);
        const updateNotebookAgentStatus = () => {
            const hasNotebookAgent = Boolean(chatAgentService.getDefaultAgent(ChatAgentLocation.Notebook));
            this._ctxHasProvider.set(hasNotebookAgent);
        };
        updateNotebookAgentStatus();
        this._register(chatAgentService.onDidChangeAgents(updateNotebookAgentStatus));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatKernelDynamicCompletions',
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.supportsFileReferences) {
                    return null;
                }
                if (widget.location !== ChatAgentLocation.Notebook) {
                    return null;
                }
                const variableNameDef = new RegExp(`${chatVariableLeader}\\w*`, 'g');
                const range = computeCompletionRanges(model, position, variableNameDef, true);
                if (!range) {
                    return null;
                }
                const result = { suggestions: [] };
                const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn +
                    `${chatVariableLeader}${NotebookKernelVariableKey}:`.length);
                result.suggestions.push({
                    label: `${chatVariableLeader}${NotebookKernelVariableKey}`,
                    insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:`,
                    detail: localize('pickKernelVariableLabel', 'Pick a variable from the kernel'),
                    range,
                    kind: 18 /* CompletionItemKind.Text */,
                    command: {
                        id: SelectAndInsertKernelVariableAction.ID,
                        title: SelectAndInsertKernelVariableAction.ID,
                        arguments: [{ widget, range: afterRange }],
                    },
                    sortText: 'z',
                });
                await this.addKernelVariableCompletion(widget, result, range, token);
                return result;
            },
        }));
        // output context
        NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.bindTo(contextKeyService).set(NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST);
    }
    async addKernelVariableCompletion(widget, result, info, token) {
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1);
        }
        const notebook = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        if (!notebook) {
            return;
        }
        const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        for await (const variable of variables) {
            if (pattern && !variable.name.toLowerCase().includes(pattern)) {
                continue;
            }
            result.suggestions.push({
                label: { label: variable.name, description: variable.type },
                insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:${variable.name} `,
                filterText: `${chatVariableLeader}${variable.name}`,
                range: info,
                kind: 4 /* CompletionItemKind.Variable */,
                sortText: 'z',
                command: {
                    id: SelectAndInsertKernelVariableAction.ID,
                    title: SelectAndInsertKernelVariableAction.ID,
                    arguments: [{ widget, range: info.insert, variable: variable.name }],
                },
                detail: variable.type,
                documentation: variable.value,
            });
        }
    }
};
NotebookChatContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, INotebookKernelService),
    __param(5, ILanguageFeaturesService)
], NotebookChatContribution);
export class SelectAndInsertKernelVariableAction extends Action2 {
    constructor() {
        super({
            id: SelectAndInsertKernelVariableAction.ID,
            title: '', // not displayed
        });
    }
    static { this.ID = 'notebook.chat.selectAndInsertKernelVariable'; }
    async run(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const notebookKernelService = accessor.get(INotebookKernelService);
        const quickInputService = accessor.get(IQuickInputService);
        const notebook = getNotebookEditorFromEditorPane(editorService.activeEditorPane)?.getViewModel()
            ?.notebookDocument;
        if (!notebook) {
            return;
        }
        const context = args[0];
        if (!context || !('widget' in context) || !('range' in context)) {
            return;
        }
        const widget = context.widget;
        const range = context.range;
        const variable = context.variable;
        if (variable !== undefined) {
            this.addVariableReference(widget, variable, range, false);
            return;
        }
        const selectedKernel = notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        const quickPickItems = [];
        for await (const variable of variables) {
            quickPickItems.push({
                label: variable.name,
                description: variable.value,
                detail: variable.type,
            });
        }
        const pickedVariable = await quickInputService.pick(quickPickItems, {
            placeHolder: 'Select a kernel variable',
        });
        if (!pickedVariable) {
            return;
        }
        this.addVariableReference(widget, pickedVariable.label, range, true);
    }
    addVariableReference(widget, variableName, range, updateText) {
        if (range) {
            const text = `#kernelVariable:${variableName}`;
            if (updateText) {
                const editor = widget.inputEditor;
                const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
                if (!success) {
                    return;
                }
            }
            widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
                id: 'vscode.notebook.variable',
                range: {
                    startLineNumber: range.startLineNumber,
                    startColumn: range.startColumn,
                    endLineNumber: range.endLineNumber,
                    endColumn: range.startColumn + text.length,
                },
                data: variableName,
                fullName: variableName,
                icon: codiconsLibrary.variable,
            });
        }
        else {
            widget.attachmentModel.addContext({
                id: 'vscode.notebook.variable',
                name: variableName,
                value: variableName,
                icon: codiconsLibrary.variable,
            });
        }
    }
}
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOutput.addToChat',
            title: localize('notebookActions.addOutputToChat', 'Add Cell Output to Chat'),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, ContextKeyExpr.in(NOTEBOOK_CELL_OUTPUT_MIMETYPE.key, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.key)),
                order: 10,
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
            precondition: ChatContextKeys.enabled,
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext &&
            'outputId' in outputContext &&
            typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        if (!outputViewModel) {
            // not able to find the output from the provided context, use the active cell
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (activeCell.focusedOutputId !== undefined) {
                outputViewModel = activeCell.outputsViewModels.find((output) => {
                    return output.model.outputId === activeCell.focusedOutputId;
                });
            }
            else {
                outputViewModel = activeCell.outputsViewModels.find((output) => output.pickedMimeType?.isTrusted);
            }
        }
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        const chatWidgetService = accessor.get(IChatWidgetService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            const widgets = chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel);
            if (widgets.length === 0) {
                return;
            }
            widget = widgets[0];
        }
        if (mimeType && NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST.includes(mimeType)) {
            // get the cell index
            const cellFromViewModelHandle = outputViewModel.cellViewModel.handle;
            const cell = notebookEditor.getCellByHandle(cellFromViewModelHandle);
            if (!cell) {
                return;
            }
            // uri of the cell
            const cellUri = cell.uri;
            // get the output index
            const outputId = outputViewModel?.model.outputId;
            let outputIndex = 0;
            if (outputId !== undefined) {
                // find the output index
                outputIndex = cell.outputsViewModels.findIndex((output) => {
                    return output.model.outputId === outputId;
                });
            }
            // get URI of notebook
            let notebookUri = notebookEditor.textModel?.uri;
            if (!notebookUri) {
                // if the notebook is not found, try to parse the cell uri
                const parsedCellUri = CellUri.parse(cellUri);
                notebookUri = parsedCellUri?.notebook;
                if (!notebookUri) {
                    return;
                }
            }
            // construct the URI using the cell uri and output index
            const outputCellUri = CellUri.generateCellOutputUriWithIndex(notebookUri, cellUri, outputIndex);
            const l = {
                value: outputCellUri,
                id: outputCellUri.toString(),
                name: outputCellUri.toString(),
                isFile: true,
            };
            widget.attachmentModel.addContext(l);
        }
    }
});
registerAction2(SelectAndInsertKernelVariableAction);
registerWorkbenchContribution2(NotebookChatContribution.ID, NotebookChatContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY2hhdC9ub3RlYm9vay5jaGF0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQVFyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUNOLE9BQU8sRUFDUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUVOLDhCQUE4QixHQUU5QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBE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