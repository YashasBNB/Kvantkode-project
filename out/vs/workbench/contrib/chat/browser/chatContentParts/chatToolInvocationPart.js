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
var ChatToolInvocationSubPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { createToolInputUri, ILanguageModelToolsService, isToolResultInputOutputDetails, } from '../../common/languageModelToolsService.js';
import { CancelChatActionId } from '../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../actions/chatToolActions.js';
import { ChatCollapsibleEditorContentPart } from './chatCollapsibleContentPart.js';
import { ChatConfirmationWidget, ChatCustomConfirmationWidget, } from './chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from './chatMarkdownContentPart.js';
import { ChatCustomProgressPart, ChatProgressContentPart } from './chatProgressContentPart.js';
import { ChatCollapsibleListContentPart, } from './chatReferencesContentPart.js';
let ChatToolInvocationPart = class ChatToolInvocationPart extends Disposable {
    get codeblocks() {
        return this.subPart?.codeblocks ?? [];
    }
    get codeblocksPartId() {
        return this.subPart?.codeblocksPartId;
    }
    constructor(toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService) {
        super();
        this.toolInvocation = toolInvocation;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.domNode = dom.$('.chat-tool-invocation-part');
        if (toolInvocation.presentation === 'hidden') {
            return;
        }
        // This part is a bit different, since IChatToolInvocation is not an immutable model object. So this part is able to rerender itself.
        // If this turns out to be a typical pattern, we could come up with a more reusable pattern, like telling the list to rerender an element
        // when the model changes, or trying to make the model immutable and swap out one content part for a new one based on user actions in the view.
        const partStore = this._register(new DisposableStore());
        const render = () => {
            dom.clearNode(this.domNode);
            partStore.clear();
            this.subPart = partStore.add(instantiationService.createInstance(ChatToolInvocationSubPart, toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex));
            this.domNode.appendChild(this.subPart.domNode);
            partStore.add(this.subPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            partStore.add(this.subPart.onNeedsRerender(() => {
                render();
                this._onDidChangeHeight.fire();
            }));
        };
        render();
    }
    hasSameContent(other, followingContent, element) {
        return ((other.kind === 'toolInvocation' || other.kind === 'toolInvocationSerialized') &&
            this.toolInvocation.toolCallId === other.toolCallId);
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatToolInvocationPart = __decorate([
    __param(8, IInstantiationService)
], ChatToolInvocationPart);
export { ChatToolInvocationPart };
let ChatToolInvocationSubPart = class ChatToolInvocationSubPart extends Disposable {
    static { ChatToolInvocationSubPart_1 = this; }
    static { this.idPool = 0; }
    get codeblocks() {
        // TODO this is weird, the separate cases should maybe be their own "subparts"
        return this.markdownPart?.codeblocks ?? this._codeblocks;
    }
    get codeblocksPartId() {
        return this.markdownPart?.codeblocksPartId ?? this._codeblocksPartId;
    }
    constructor(toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, keybindingService, modelService, languageService, contextKeyService, languageModelToolsService) {
        super();
        this.toolInvocation = toolInvocation;
        this.context = context;
        this.renderer = renderer;
        this.listPool = listPool;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextKeyService = contextKeyService;
        this.languageModelToolsService = languageModelToolsService;
        this._codeblocksPartId = 'tool-' + ChatToolInvocationSubPart_1.idPool++;
        this._onNeedsRerender = this._register(new Emitter());
        this.onNeedsRerender = this._onNeedsRerender.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._codeblocks = [];
        if (toolInvocation.kind === 'toolInvocation' && toolInvocation.confirmationMessages) {
            if (toolInvocation.toolSpecificData?.kind === 'terminal') {
                this.domNode = this.createTerminalConfirmationWidget(toolInvocation, toolInvocation.toolSpecificData);
            }
            else {
                this.domNode = this.createConfirmationWidget(toolInvocation);
            }
        }
        else if (toolInvocation.toolSpecificData?.kind === 'terminal') {
            this.domNode = this.createTerminalMarkdownProgressPart(toolInvocation, toolInvocation.toolSpecificData);
        }
        else if (Array.isArray(toolInvocation.resultDetails) &&
            toolInvocation.resultDetails?.length) {
            this.domNode = this.createResultList(toolInvocation.pastTenseMessage ?? toolInvocation.invocationMessage, toolInvocation.resultDetails);
        }
        else if (isToolResultInputOutputDetails(toolInvocation.resultDetails)) {
            this.domNode = this.createInputOutputMarkdownProgressPart(toolInvocation.pastTenseMessage ?? toolInvocation.invocationMessage, toolInvocation.resultDetails);
        }
        else {
            this.domNode = this.createProgressPart();
        }
        if (toolInvocation.kind === 'toolInvocation' && !toolInvocation.isComplete) {
            toolInvocation.isCompletePromise.then(() => this._onNeedsRerender.fire());
        }
    }
    createConfirmationWidget(toolInvocation) {
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const title = toolInvocation.confirmationMessages.title;
        const message = toolInvocation.confirmationMessages.message;
        const allowAutoConfirm = toolInvocation.confirmationMessages.allowAutoConfirm;
        const continueLabel = localize('continue', 'Continue');
        const continueKeybinding = this.keybindingService
            .lookupKeybinding(AcceptToolConfirmationActionId)
            ?.getLabel();
        const continueTooltip = continueKeybinding
            ? `${continueLabel} (${continueKeybinding})`
            : continueLabel;
        const cancelLabel = localize('cancel', 'Cancel');
        const cancelKeybinding = this.keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        let ConfirmationOutcome;
        (function (ConfirmationOutcome) {
            ConfirmationOutcome[ConfirmationOutcome["Allow"] = 0] = "Allow";
            ConfirmationOutcome[ConfirmationOutcome["Disallow"] = 1] = "Disallow";
            ConfirmationOutcome[ConfirmationOutcome["AllowWorkspace"] = 2] = "AllowWorkspace";
            ConfirmationOutcome[ConfirmationOutcome["AllowGlobally"] = 3] = "AllowGlobally";
            ConfirmationOutcome[ConfirmationOutcome["AllowSession"] = 4] = "AllowSession";
        })(ConfirmationOutcome || (ConfirmationOutcome = {}));
        const buttons = [
            {
                label: continueLabel,
                data: 0 /* ConfirmationOutcome.Allow */,
                tooltip: continueTooltip,
                moreActions: !allowAutoConfirm
                    ? undefined
                    : [
                        {
                            label: localize('allowSession', 'Allow in this Session'),
                            data: 4 /* ConfirmationOutcome.AllowSession */,
                            tooltip: localize('allowSesssionTooltip', 'Allow this tool to run in this session without confirmation.'),
                        },
                        {
                            label: localize('allowWorkspace', 'Allow in this Workspace'),
                            data: 2 /* ConfirmationOutcome.AllowWorkspace */,
                            tooltip: localize('allowWorkspaceTooltip', 'Allow this tool to run in this workspace without confirmation.'),
                        },
                        {
                            label: localize('allowGlobally', 'Always Allow'),
                            data: 3 /* ConfirmationOutcome.AllowGlobally */,
                            tooltip: localize('allowGloballTooltip', 'Always allow this tool to run without confirmation.'),
                        },
                    ],
            },
            {
                label: localize('cancel', 'Cancel'),
                data: 1 /* ConfirmationOutcome.Disallow */,
                isSecondary: true,
                tooltip: cancelTooltip,
            },
        ];
        let confirmWidget;
        if (typeof message === 'string') {
            confirmWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, title, message, buttons));
        }
        else {
            const chatMarkdownContent = {
                kind: 'markdownContent',
                content: message,
            };
            const codeBlockRenderOptions = {
                hideToolbar: true,
                reserveWidth: 19,
                verticalPadding: 5,
                editorOptions: {
                    wordWrap: 'on',
                },
            };
            const elements = dom.h('div', [dom.h('.message@message'), dom.h('.editor@editor')]);
            if (toolInvocation.toolSpecificData?.kind === 'input') {
                const inputData = toolInvocation.toolSpecificData;
                const codeBlockRenderOptions = {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'on',
                        readOnly: false,
                    },
                };
                const langId = this.languageService.getLanguageIdByLanguageName('json');
                const model = this._register(this.modelService.createModel(JSON.stringify(inputData.rawInput, undefined, 2), this.languageService.createById(langId), createToolInputUri(toolInvocation.toolId)));
                const editor = this._register(this.editorPool.get());
                editor.object.render({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codeBlockPartIndex: 0,
                    element: this.context.element,
                    languageId: langId ?? 'json',
                    renderOptions: codeBlockRenderOptions,
                    textModel: Promise.resolve(model),
                }, this.currentWidthDelegate());
                this._codeblocks.push({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codemapperUri: undefined,
                    elementId: this.context.element.id,
                    focus: () => editor.object.focus(),
                    isStreaming: false,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    uriPromise: Promise.resolve(model.uri),
                });
                this._register(editor.object.onDidChangeContentHeight(() => {
                    editor.object.layout(this.currentWidthDelegate());
                    this._onDidChangeHeight.fire();
                }));
                this._register(model.onDidChangeContent((e) => {
                    try {
                        inputData.rawInput = JSON.parse(model.getValue());
                    }
                    catch {
                        // ignore
                    }
                }));
                elements.editor.append(editor.object.element);
            }
            this.markdownPart = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
            elements.message.append(this.markdownPart.domNode);
            this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, elements.root, toolInvocation.toolSpecificData?.kind === 'input', buttons));
        }
        const hasToolConfirmation = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmation.set(true);
        this._register(confirmWidget.onDidClick((button) => {
            switch (button.data) {
                case 3 /* ConfirmationOutcome.AllowGlobally */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'profile', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 2 /* ConfirmationOutcome.AllowWorkspace */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'workspace', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 4 /* ConfirmationOutcome.AllowSession */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'memory', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 0 /* ConfirmationOutcome.Allow */:
                    toolInvocation.confirmed.complete(true);
                    break;
                case 1 /* ConfirmationOutcome.Disallow */:
                    toolInvocation.confirmed.complete(false);
                    break;
            }
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => hasToolConfirmation.reset()));
        toolInvocation.confirmed.p.then(() => {
            hasToolConfirmation.reset();
            this._onNeedsRerender.fire();
        });
        return confirmWidget.domNode;
    }
    createTerminalConfirmationWidget(toolInvocation, terminalData) {
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const title = toolInvocation.confirmationMessages.title;
        const message = toolInvocation.confirmationMessages.message;
        const continueLabel = localize('continue', 'Continue');
        const continueKeybinding = this.keybindingService
            .lookupKeybinding(AcceptToolConfirmationActionId)
            ?.getLabel();
        const continueTooltip = continueKeybinding
            ? `${continueLabel} (${continueKeybinding})`
            : continueLabel;
        const cancelLabel = localize('cancel', 'Cancel');
        const cancelKeybinding = this.keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        const buttons = [
            {
                label: continueLabel,
                data: true,
                tooltip: continueTooltip,
            },
            {
                label: cancelLabel,
                data: false,
                isSecondary: true,
                tooltip: cancelTooltip,
            },
        ];
        const renderedMessage = this._register(this.renderer.render(typeof message === 'string' ? new MarkdownString(message) : message, {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        }));
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
                readOnly: false,
            },
        };
        const langId = this.languageService.getLanguageIdByLanguageName(terminalData.language ?? 'sh') ??
            'shellscript';
        const model = this.modelService.createModel(terminalData.command, this.languageService.createById(langId));
        const editor = this._register(this.editorPool.get());
        editor.object.render({
            codeBlockIndex: this.codeBlockStartIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            languageId: langId,
            renderOptions: codeBlockRenderOptions,
            textModel: Promise.resolve(model),
        }, this.currentWidthDelegate());
        this._codeblocks.push({
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => editor.object.focus(),
            isStreaming: false,
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri),
        });
        this._register(editor.object.onDidChangeContentHeight(() => {
            editor.object.layout(this.currentWidthDelegate());
            this._onDidChangeHeight.fire();
        }));
        this._register(model.onDidChangeContent((e) => {
            terminalData.command = model.getValue();
        }));
        const element = dom.$('');
        dom.append(element, editor.object.element);
        dom.append(element, renderedMessage.element);
        const confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, element, false, buttons));
        ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(true);
        this._register(confirmWidget.onDidClick((button) => {
            toolInvocation.confirmed.complete(button.data);
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        toolInvocation.confirmed.p.then(() => {
            ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(false);
            this._onNeedsRerender.fire();
        });
        return confirmWidget.domNode;
    }
    createProgressPart() {
        let content;
        if (this.toolInvocation.isComplete &&
            this.toolInvocation.isConfirmed !== false &&
            this.toolInvocation.pastTenseMessage) {
            content =
                typeof this.toolInvocation.pastTenseMessage === 'string'
                    ? new MarkdownString().appendText(this.toolInvocation.pastTenseMessage)
                    : this.toolInvocation.pastTenseMessage;
        }
        else {
            content =
                typeof this.toolInvocation.invocationMessage === 'string'
                    ? new MarkdownString().appendText(this.toolInvocation.invocationMessage + '…')
                    : MarkdownString.lift(this.toolInvocation.invocationMessage).appendText('…');
        }
        const progressMessage = {
            kind: 'progressMessage',
            content,
        };
        const iconOverride = !this.toolInvocation.isConfirmed
            ? Codicon.error
            : this.toolInvocation.isComplete
                ? Codicon.check
                : undefined;
        const progressPart = this._register(this.instantiationService.createInstance(ChatProgressContentPart, progressMessage, this.renderer, this.context, undefined, true, iconOverride));
        return progressPart.domNode;
    }
    createTerminalMarkdownProgressPart(toolInvocation, terminalData) {
        const content = new MarkdownString(`\`\`\`${terminalData.language}\n${terminalData.command}\n\`\`\``);
        const chatMarkdownContent = {
            kind: 'markdownContent',
            content: content,
        };
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
            },
        };
        this.markdownPart = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        const icon = !this.toolInvocation.isConfirmed
            ? Codicon.error
            : this.toolInvocation.isComplete
                ? Codicon.check
                : ThemeIcon.modify(Codicon.loading, 'spin');
        const progressPart = this.instantiationService.createInstance(ChatCustomProgressPart, this.markdownPart.domNode, icon);
        return progressPart.domNode;
    }
    createInputOutputMarkdownProgressPart(message, inputOutputData) {
        const model = this._register(this.modelService.createModel(`${inputOutputData.input}\n\n${inputOutputData.output}`, this.languageService.createById('json')));
        const collapsibleListPart = this._register(this.instantiationService.createInstance(ChatCollapsibleEditorContentPart, message, this.context, this.editorPool, Promise.resolve(model), model.getLanguageId(), {
            hideToolbar: true,
            reserveWidth: 19,
            maxHeightInLines: 13,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
            },
        }, {
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => { },
            isStreaming: false,
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri),
        }));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        return collapsibleListPart.domNode;
    }
    createResultList(message, toolDetails) {
        const collapsibleListPart = this._register(this.instantiationService.createInstance(ChatCollapsibleListContentPart, toolDetails.map((detail) => ({
            kind: 'reference',
            reference: detail,
        })), message, this.context, this.listPool));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        return collapsibleListPart.domNode;
    }
};
ChatToolInvocationSubPart = ChatToolInvocationSubPart_1 = __decorate([
    __param(8, IInstantiationService),
    __param(9, IKeybindingService),
    __param(10, IModelService),
    __param(11, ILanguageService),
    __param(12, IContextKeyService),
    __param(13, ILanguageModelToolsService)
], ChatToolInvocationSubPart);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUb29sSW52b2NhdGlvblBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNGLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUluRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQVVqRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDBCQUEwQixFQUMxQiw4QkFBOEIsR0FFOUIsTUFBTSwyQ0FBMkMsQ0FB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