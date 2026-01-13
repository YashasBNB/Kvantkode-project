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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNDTVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkU0NNU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU12RSxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLDRCQUE0QixHQUM1QixNQUFNLDZCQUE2QixDQUFBO0FBRXBDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQWMvRixNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxlQUFlLENBQzNELGtDQUFrQyxDQUNsQyxDQUFBO0FBRUQsTUFBTSxpQkFBaUIsR0FBRyxxQ0FBcUMsQ0FBQTtBQUUvRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFRcEQsWUFDYyxVQUF3QyxFQUNoQyxrQkFBdUMsRUFDdEMsbUJBQTBELEVBRWhGLDBCQUF3RSxFQUNwRCxpQkFBc0QsRUFDdEQsaUJBQXNELEVBQ3BELG1CQUEwRDtRQUVoRixLQUFLLEVBQUUsQ0FBQTtRQVR1QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRWQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUUvRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ25DLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNuQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBZGhFLFlBQU8sR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzVDLGlCQUFZLEdBQWtCLElBQUksQ0FBQTtRQUNsQyxxQkFBZ0IsR0FBa0IsSUFBSSxDQUFBO1FBZTdDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FDcEMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLENBQ2pELENBQUE7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDL0IsTUFBTSxTQUFTLEdBQUcsWUFBWSxFQUFFLENBQUE7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtZQUVqQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ3pDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7b0JBQzNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztpQkFDekIsQ0FBQyxDQUFBO2dCQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7Z0JBQzlCLENBQUM7Z0JBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUE7Z0JBQzVGLE1BQU0scUJBQXFCLEdBQUcsY0FBYztvQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQzdELGNBQWMsRUFBRSxZQUFZLENBQzVCLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO29CQUM5QixDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNaLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtnQkFFeEUsTUFBTSxZQUFZLEdBQWlCO29CQUNsQyxjQUFjO29CQUNkLHFCQUFxQjtvQkFDckIsZ0JBQWdCO2lCQUNoQixDQUFBO2dCQUVELE1BQU0sTUFBTSxHQUFHLDRCQUE0QixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU1RSxNQUFNLGNBQWMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFXLENBQUMsQ0FBQTtnQkFDbkUsTUFBTSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxHQUN4QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsd0JBQXdCLENBQUM7b0JBQ3hELGNBQWM7b0JBQ2QsYUFBYSxFQUFFLDhCQUE4QjtvQkFDN0MsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO29CQUMzQyxXQUFXLEVBQUUsS0FBSztpQkFDbEIsQ0FBQyxDQUFBO2dCQUVILE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FDOUMsUUFBUSxFQUNSLHFCQUFzQixFQUN0QixZQUFZLENBQ1osQ0FBQTtnQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO2dCQUM5QixDQUFDO2dCQUVELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMxQyxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNwQixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDbEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO0lBQzdCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUMvRCxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUM3QyxDQUFBO1FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsb0JBQW9CO0lBRVosY0FBYyxDQUNyQixRQUEwQixFQUMxQixxQkFBNkIsRUFDN0IsWUFBMEI7UUFFMUIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUM7Z0JBQ3pELFlBQVksRUFBRSxjQUFjO2dCQUM1QixRQUFRO2dCQUNSLHFCQUFxQjtnQkFDckIsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsY0FBYyxFQUFFLFlBQVksQ0FBQyxjQUFjO2dCQUMzQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMscUJBQXFCO2dCQUN6RCxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsZ0JBQWdCO2dCQUMvQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztnQkFDaEIsY0FBYyxFQUFFLENBQUMsTUFBNEIsRUFBRSxFQUFFO29CQUNoRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO29CQUNwRSxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO29CQUNsRCxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDZCxDQUFDO2dCQUNELE9BQU8sRUFBRSxHQUFHLEVBQUU7b0JBQ2IsTUFBTSxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO2dCQUNELE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSwwQkFBMEIsRUFBRTthQUNwRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxzQkFBc0I7SUFFZCxnQkFBZ0IsQ0FBQyxTQUFpQjtRQUN6QyxPQUFPLFNBQVMsS0FBSyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDM0MsQ0FBQztJQUVELG1CQUFtQjtJQUVYLE9BQU8sQ0FBQyxLQUFVO1FBQ3pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FDN0IsU0FBUyxDQUFDLG1DQUFtQyxFQUFFLG9DQUFvQyxDQUFDLENBQUMsS0FBSyxDQUMxRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdktLLDRCQUE0QjtJQVMvQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0dBaEJqQiw0QkFBNEIsQ0F1S2pDO0FBRUQsTUFBTSwyQkFBNEIsU0FBUSxPQUFPO0lBQ2hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLHlCQUF5QixFQUFFLG9DQUFvQyxDQUFDO1lBQ2pGLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNqQyxPQUFPLEVBQUUsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLG9DQUFvQyxDQUFDO1lBQzFGLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUMzQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUMvQztvQkFDRCxLQUFLLEVBQUUsUUFBUTtpQkFDZjthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDaEYsNEJBQTRCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtJQUNyRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLGtDQUFtQyxTQUFRLE9BQU87SUFDdkQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLEtBQUssRUFBRSxTQUFTLENBQ2YsK0JBQStCLEVBQy9CLDZDQUE2QyxDQUM3QztZQUNELElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztZQUNyQyxPQUFPLEVBQUUsU0FBUyxDQUNqQixzQ0FBc0MsRUFDdEMsNkNBQTZDLENBQzdDO1lBQ0QsRUFBRSxFQUFFLEtBQUssRUFBRSwrRUFBK0U7WUFDMUYsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVztvQkFDdEIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUMzQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUM5QztvQkFDRCxLQUFLLEVBQUUsUUFBUTtpQkFDZjthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSw0QkFBNEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDaEYsNEJBQTRCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDckMsQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLDJCQUEyQixDQUFDLENBQUE7QUFDNUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUE7QUFDbkQsaUJBQWlCLENBQ2hCLDZCQUE2QixFQUM3Qiw0QkFBNEIsb0NBRTVCLENBQUEifQ==