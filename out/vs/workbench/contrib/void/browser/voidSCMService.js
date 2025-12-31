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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNDTVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFNDTVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFNdkUsT0FBTyxFQUNOLDhCQUE4QixFQUM5Qiw0QkFBNEIsR0FDNUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUYsT0FBTyxF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