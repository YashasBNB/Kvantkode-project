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
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { annotateVulnerabilitiesInText } from './annotations.js';
import { getFullyQualifiedId, IChatAgentNameService, } from './chatAgents.js';
import { ChatModelInitState, } from './chatModel.js';
import { countWords } from './chatWordCounter.js';
export function isRequestVM(item) {
    return !!item && typeof item === 'object' && 'message' in item;
}
export function isResponseVM(item) {
    return !!item && typeof item.setVote !== 'undefined';
}
let ChatViewModel = class ChatViewModel extends Disposable {
    get inputPlaceholder() {
        return this._inputPlaceholder;
    }
    get model() {
        return this._model;
    }
    setInputPlaceholder(text) {
        this._inputPlaceholder = text;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    resetInputPlaceholder() {
        this._inputPlaceholder = undefined;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    get sessionId() {
        return this._model.sessionId;
    }
    get requestInProgress() {
        return this._model.requestInProgress;
    }
    get requestPausibility() {
        return this._model.requestPausibility;
    }
    get initState() {
        return this._model.initState;
    }
    constructor(_model, codeBlockModelCollection, instantiationService) {
        super();
        this._model = _model;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this._onDidDisposeModel = this._register(new Emitter());
        this.onDidDisposeModel = this._onDidDisposeModel.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._items = [];
        this._inputPlaceholder = undefined;
        _model.getRequests().forEach((request, i) => {
            const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, request);
            this._items.push(requestModel);
            this.updateCodeBlockTextModels(requestModel);
            if (request.response) {
                this.onAddResponse(request.response);
            }
        });
        this._register(_model.onDidDispose(() => this._onDidDisposeModel.fire()));
        this._register(_model.onDidChange((e) => {
            if (e.kind === 'addRequest') {
                const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, e.request);
                this._items.push(requestModel);
                this.updateCodeBlockTextModels(requestModel);
                if (e.request.response) {
                    this.onAddResponse(e.request.response);
                }
            }
            else if (e.kind === 'addResponse') {
                this.onAddResponse(e.response);
            }
            else if (e.kind === 'removeRequest') {
                const requestIdx = this._items.findIndex((item) => isRequestVM(item) && item.id === e.requestId);
                if (requestIdx >= 0) {
                    this._items.splice(requestIdx, 1);
                }
                const responseIdx = e.responseId &&
                    this._items.findIndex((item) => isResponseVM(item) && item.id === e.responseId);
                if (typeof responseIdx === 'number' && responseIdx >= 0) {
                    const items = this._items.splice(responseIdx, 1);
                    const item = items[0];
                    if (item instanceof ChatResponseViewModel) {
                        item.dispose();
                    }
                }
            }
            const modelEventToVmEvent = e.kind === 'addRequest'
                ? { kind: 'addRequest' }
                : e.kind === 'initialize'
                    ? { kind: 'initialize' }
                    : e.kind === 'setHidden'
                        ? { kind: 'setHidden' }
                        : null;
            this._onDidChange.fire(modelEventToVmEvent);
        }));
    }
    onAddResponse(responseModel) {
        const response = this.instantiationService.createInstance(ChatResponseViewModel, responseModel, this);
        this._register(response.onDidChange(() => {
            if (response.isComplete) {
                this.updateCodeBlockTextModels(response);
            }
            return this._onDidChange.fire(null);
        }));
        this._items.push(response);
        this.updateCodeBlockTextModels(response);
    }
    getItems() {
        return this._items.filter((item) => !item.shouldBeRemovedOnSend || item.shouldBeRemovedOnSend.afterUndoStop);
    }
    dispose() {
        super.dispose();
        dispose(this._items.filter((item) => item instanceof ChatResponseViewModel));
    }
    updateCodeBlockTextModels(model) {
        let content;
        if (isRequestVM(model)) {
            content = model.messageText;
        }
        else {
            content = annotateVulnerabilitiesInText(model.response.value)
                .map((x) => x.content.value)
                .join('');
        }
        let codeBlockIndex = 0;
        marked.walkTokens(marked.lexer(content), (token) => {
            if (token.type === 'code') {
                const lang = token.lang || '';
                const text = token.text;
                this.codeBlockModelCollection.update(this._model.sessionId, model, codeBlockIndex++, {
                    text,
                    languageId: lang,
                    isComplete: true,
                });
            }
        });
    }
};
ChatViewModel = __decorate([
    __param(2, IInstantiationService)
], ChatViewModel);
export { ChatViewModel };
export class ChatRequestViewModel {
    get id() {
        return this._model.id;
    }
    get dataId() {
        return (this.id +
            `_${ChatModelInitState[this._model.session.initState]}_${hash(this.variables)}_${hash(this.isComplete)}`);
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIconUri;
    }
    get message() {
        return this._model.message;
    }
    get messageText() {
        return this.message.text;
    }
    get attempt() {
        return this._model.attempt;
    }
    get variables() {
        return this._model.variableData.variables;
    }
    get contentReferences() {
        return this._model.response?.contentReferences;
    }
    get confirmation() {
        return this._model.confirmation;
    }
    get isComplete() {
        return this._model.response?.isComplete ?? false;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get slashCommand() {
        return this._model.response?.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.response?.agentOrSlashCommandDetected ?? false;
    }
    constructor(_model) {
        this._model = _model;
    }
}
let ChatResponseViewModel = class ChatResponseViewModel extends Disposable {
    get model() {
        return this._model;
    }
    get id() {
        return this._model.id;
    }
    get dataId() {
        return (this._model.id +
            `_${this._modelChangeCount}` +
            `_${ChatModelInitState[this._model.session.initState]}` +
            (this.isLast ? '_last' : ''));
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        if (this.agent) {
            const isAllowed = this.chatAgentNameService.getAgentNameRestriction(this.agent);
            if (isAllowed) {
                return this.agent.fullName || this.agent.name;
            }
            else {
                return getFullyQualifiedId(this.agent);
            }
        }
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIcon;
    }
    get agent() {
        return this._model.agent;
    }
    get slashCommand() {
        return this._model.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.agentOrSlashCommandDetected;
    }
    get response() {
        return this._model.response;
    }
    get usedContext() {
        return this._model.usedContext;
    }
    get contentReferences() {
        return this._model.contentReferences;
    }
    get codeCitations() {
        return this._model.codeCitations;
    }
    get progressMessages() {
        return this._model.progressMessages;
    }
    get isComplete() {
        return this._model.isComplete;
    }
    get isCanceled() {
        return this._model.isCanceled;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get replyFollowups() {
        return this._model.followups?.filter((f) => f.kind === 'reply');
    }
    get result() {
        return this._model.result;
    }
    get errorDetails() {
        return this.result?.errorDetails;
    }
    get vote() {
        return this._model.vote;
    }
    get voteDownReason() {
        return this._model.voteDownReason;
    }
    get requestId() {
        return this._model.requestId;
    }
    get isStale() {
        return this._model.isStale;
    }
    get isLast() {
        return this._chatViewModel.getItems().at(-1) === this;
    }
    get usedReferencesExpanded() {
        if (typeof this._usedReferencesExpanded === 'boolean') {
            return this._usedReferencesExpanded;
        }
        return undefined;
    }
    set usedReferencesExpanded(v) {
        this._usedReferencesExpanded = v;
    }
    get vulnerabilitiesListExpanded() {
        return this._vulnerabilitiesListExpanded;
    }
    set vulnerabilitiesListExpanded(v) {
        this._vulnerabilitiesListExpanded = v;
    }
    get contentUpdateTimings() {
        return this._contentUpdateTimings;
    }
    get isPaused() {
        return this._model.isPaused;
    }
    constructor(_model, _chatViewModel, logService, chatAgentNameService) {
        super();
        this._model = _model;
        this._chatViewModel = _chatViewModel;
        this.logService = logService;
        this.chatAgentNameService = chatAgentNameService;
        this._modelChangeCount = 0;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.renderData = undefined;
        this._vulnerabilitiesListExpanded = false;
        this._contentUpdateTimings = undefined;
        if (!_model.isComplete) {
            this._contentUpdateTimings = {
                totalTime: 0,
                lastUpdateTime: Date.now(),
                impliedWordLoadRate: 0,
                lastWordCount: 0,
            };
        }
        this._register(_model.onDidChange(() => {
            // This is set when the response is loading, but the model can change later for other reasons
            if (this._contentUpdateTimings) {
                const now = Date.now();
                const wordCount = countWords(_model.entireResponse.getMarkdown());
                if (wordCount === this._contentUpdateTimings.lastWordCount) {
                    this.trace('onDidChange', `Update- no new words`);
                }
                else {
                    if (this._contentUpdateTimings.lastWordCount === 0) {
                        this._contentUpdateTimings.lastUpdateTime = now;
                    }
                    const timeDiff = Math.min(now - this._contentUpdateTimings.lastUpdateTime, 1000);
                    const newTotalTime = Math.max(this._contentUpdateTimings.totalTime + timeDiff, 250);
                    const impliedWordLoadRate = wordCount / (newTotalTime / 1000);
                    this.trace('onDidChange', `Update- got ${wordCount} words over last ${newTotalTime}ms = ${impliedWordLoadRate} words/s`);
                    this._contentUpdateTimings = {
                        totalTime: this._contentUpdateTimings.totalTime !== 0 ||
                            this.response.value.some((v) => v.kind === 'markdownContent')
                            ? newTotalTime
                            : this._contentUpdateTimings.totalTime,
                        lastUpdateTime: now,
                        impliedWordLoadRate,
                        lastWordCount: wordCount,
                    };
                }
            }
            // new data -> new id, new content to render
            this._modelChangeCount++;
            this._onDidChange.fire();
        }));
    }
    trace(tag, message) {
        this.logService.trace(`ChatResponseViewModel#${tag}: ${message}`);
    }
    setVote(vote) {
        this._modelChangeCount++;
        this._model.setVote(vote);
    }
    setVoteDownReason(reason) {
        this._modelChangeCount++;
        this._model.setVoteDownReason(reason);
    }
    setEditApplied(edit, editCount) {
        this._modelChangeCount++;
        this._model.setEditApplied(edit, editCount);
    }
};
ChatResponseViewModel = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentNameService)
], ChatResponseViewModel);
export { ChatResponseViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUUsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUlsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEUsT0FBTyxFQUNOLG1CQUFtQixFQUduQixxQkFBcUIsR0FFckIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQ04sa0JBQWtCLEdBVWxCLE1BQU0sZ0JBQWdCLENBQUE7QUFhdkIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBR2pELE1BQU0sVUFBVSxXQUFXLENBQUMsSUFBYTtJQUN4QyxPQUFPLENBQUMsQ0FBQyxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUE7QUFDL0QsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsSUFBYTtJQUN6QyxPQUFPLENBQUMsQ0FBQyxJQUFJLElBQUksT0FBUSxJQUErQixDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUE7QUFDakYsQ0FBQztB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