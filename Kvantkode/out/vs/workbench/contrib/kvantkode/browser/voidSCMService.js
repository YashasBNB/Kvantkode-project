/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ISCMService } from '../../scm/common/scm.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IConvertToLLMMessageService } from './convertToLLMMessageService.js';
import { ILLMMessageService } from '../common/sendLLMMessageService.js';
import { gitCommitMessage_systemMessage, gitCommitMessage_userMessage, } from '../common/prompt/prompts.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const IGenerateCommitMessageService = createDecorator('voidGenerateCommitMessageService');
const loadingContextKey = 'voidSCMGenerateCommitMessageLoading';
let GenerateCommitMessageService = class GenerateCommitMessageService extends Disposable {
    constructor(scmService, mainProcessService, voidSettingsService, convertToLLMMessageService, llmMessageService, contextKeyService, notificationService) {
        super();
        this.scmService = scmService;
        this.voidSettingsService = voidSettingsService;
        this.convertToLLMMessageService = convertToLLMMessageService;
        this.llmMessageService = llmMessageService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.execute = new ThrottledDelayer(300);
        this.llmRequestId = null;
        this.currentRequestId = null;
        this.loadingContextKey = this.contextKeyService.createKey(loadingContextKey, false);
        this.voidSCM = ProxyChannel.toService(mainProcessService.getChannel('void-channel-scm'));
    }
    dispose() {
        this.execute.dispose();
        super.dispose();
    }
    async generateCommitMessage() {
        this.loadingContextKey.set(true);
        this.execute.trigger(async () => {
            const requestId = generateUuid();
            this.currentRequestId = requestId;
            try {
                const { path, repo } = this.gitRepoInfo();
                const [stat, sampledDiffs, branch, log] = await Promise.all([
                    this.voidSCM.gitStat(path),
                    this.voidSCM.gitSampledDiffs(path),
                    this.voidSCM.gitBranch(path),
                    this.voidSCM.gitLog(path),
                ]);
                if (!this.isCurrentRequest(requestId)) {
                    throw new CancellationError();
                }
                const modelSelection = this.voidSettingsService.state.modelSelectionOfFeature['SCM'] ?? null;
                const modelSelectionOptions = modelSelection
                    ? this.voidSettingsService.state.optionsOfModelSelection['SCM'][modelSelection?.providerName]?.[modelSelection.modelName]
                    : undefined;
                const overridesOfModel = this.voidSettingsService.state.overridesOfModel;
                const modelOptions = {
                    modelSelection,
                    modelSelectionOptions,
                    overridesOfModel,
                };
                const prompt = gitCommitMessage_userMessage(stat, sampledDiffs, branch, log);
                const simpleMessages = [{ role: 'user', content: prompt }];
                const { messages, separateSystemMessage } = this.convertToLLMMessageService.prepareLLMSimpleMessages({
                    simpleMessages,
                    systemMessage: gitCommitMessage_systemMessage,
                    modelSelection: modelOptions.modelSelection,
                    featureName: 'SCM',
                });
                const commitMessage = await this.sendLLMMessage(messages, separateSystemMessage, modelOptions);
                if (!this.isCurrentRequest(requestId)) {
                    throw new CancellationError();
                }
                repo.input.setValue(commitMessage, false);
            }
            catch (error) {
                this.onError(error);
            }
            finally {
                if (this.isCurrentRequest(requestId)) {
                    this.loadingContextKey.set(false);
                }
            }
        });
    }
    abort() {
        if (this.llmRequestId) {
            this.llmMessageService.abort(this.llmRequestId);
        }
        this.execute.cancel();
        this.loadingContextKey.set(false);
        this.currentRequestId = null;
    }
    gitRepoInfo() {
        const repo = Array.from(this.scmService.repositories || []).find((r) => r.provider.contextValue === 'git');
        if (!repo) {
            throw new Error('No git repository found');
        }
        if (!repo.provider.rootUri?.fsPath) {
            throw new Error('No git repository root path found');
        }
        return { path: repo.provider.rootUri.fsPath, repo };
    }
    /** LLM Functions */
    sendLLMMessage(messages, separateSystemMessage, modelOptions) {
        return new Promise((resolve, reject) => {
            this.llmRequestId = this.llmMessageService.sendLLMMessage({
                messagesType: 'chatMessages',
                messages,
                separateSystemMessage,
                chatMode: null,
                modelSelection: modelOptions.modelSelection,
                modelSelectionOptions: modelOptions.modelSelectionOptions,
                overridesOfModel: modelOptions.overridesOfModel,
                onText: () => { },
                onFinalMessage: (params) => {
                    const match = params.fullText.match(/<output>([\s\S]*?)<\/output>/i);
                    const commitMessage = match ? match[1].trim() : '';
                    resolve(commitMessage);
                },
                onError: (error) => {
                    console.error(error);
                    reject(error);
                },
                onAbort: () => {
                    reject(new CancellationError());
                },
                logging: { loggingName: 'VoidSCM - Commit Message' },
            });
        });
    }
    /** Request Helpers */
    isCurrentRequest(requestId) {
        return requestId === this.currentRequestId;
    }
    /** UI Functions */
    onError(error) {
        if (!isCancellationError(error)) {
            console.error(error);
            this.notificationService.error(localize2('voidFailedToGenerateCommitMessage', 'Failed to generate commit message.').value);
        }
    }
};
GenerateCommitMessageService = __decorate([
    __param(0, ISCMService),
    __param(1, IMainProcessService),
    __param(2, IVoidSettingsService),
    __param(3, IConvertToLLMMessageService),
    __param(4, ILLMMessageService),
    __param(5, IContextKeyService),
    __param(6, INotificationService)
], GenerateCommitMessageService);
class GenerateCommitMessageAction extends Action2 {
    constructor() {
        super({
            id: 'void.generateCommitMessageAction',
            title: localize2('voidCommitMessagePrompt', 'KvantKode: Generate Commit Message'),
            icon: ThemeIcon.fromId('sparkle'),
            tooltip: localize2('voidCommitMessagePromptTooltip', 'KvantKode: Generate Commit Message'),
            f1: true,
            menu: [
                {
                    id: MenuId.SCMInputBox,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('scmProvider', 'git'), ContextKeyExpr.equals(loadingContextKey, false)),
                    group: 'inline',
                },
            ],
        });
    }
    async run(accessor) {
        const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
        generateCommitMessageService.generateCommitMessage();
    }
}
class LoadingGenerateCommitMessageAction extends Action2 {
    constructor() {
        super({
            id: 'void.loadingGenerateCommitMessageAction',
            title: localize2('voidCommitMessagePromptCancel', 'KvantKode: Cancel Commit Message Generation'),
            icon: ThemeIcon.fromId('stop-circle'),
            tooltip: localize2('voidCommitMessagePromptCancelTooltip', 'KvantKode: Cancel Commit Message Generation'),
            f1: false, //Having a cancel command in the command palette is more confusing than useful.
            menu: [
                {
                    id: MenuId.SCMInputBox,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('scmProvider', 'git'), ContextKeyExpr.equals(loadingContextKey, true)),
                    group: 'inline',
                },
            ],
        });
    }
    async run(accessor) {
        const generateCommitMessageService = accessor.get(IGenerateCommitMessageService);
        generateCommitMessageService.abort();
    }
}
registerAction2(GenerateCommitMessageAction);
registerAction2(LoadingGenerateCommitMessageAction);
registerSingleton(IGenerateCommitMessageService, GenerateCommitMessageService, 1 /* InstantiationType.Delayed */);
