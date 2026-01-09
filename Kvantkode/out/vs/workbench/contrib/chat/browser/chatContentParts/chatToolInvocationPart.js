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
