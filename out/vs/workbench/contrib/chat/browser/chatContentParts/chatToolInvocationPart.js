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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFRvb2xJbnZvY2F0aW9uUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSW5FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBVWpFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsMEJBQTBCLEVBQzFCLDhCQUE4QixHQUU5QixNQUFNLDJDQUEy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