/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce, isNonEmptyArray } from '../../../base/common/arrays.js';
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { assertType } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { isChatViewTitleActionContext } from '../../contrib/chat/common/chatActions.js';
import { ChatAgentVoteDirection, } from '../../contrib/chat/common/chatService.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { MainContext, } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
class ChatAgentResponseStream {
    constructor(_extension, _request, _proxy, _commandsConverter, _sessionDisposables) {
        this._extension = _extension;
        this._request = _request;
        this._proxy = _proxy;
        this._commandsConverter = _commandsConverter;
        this._sessionDisposables = _sessionDisposables;
        this._stopWatch = StopWatch.create(false);
        this._isClosed = false;
    }
    close() {
        this._isClosed = true;
    }
    get timings() {
        return {
            firstProgress: this._firstProgress,
            totalElapsed: this._stopWatch.elapsed(),
        };
    }
    get apiObject() {
        if (!this._apiObject) {
            const that = this;
            this._stopWatch.reset();
            function throwIfDone(source) {
                if (that._isClosed) {
                    const err = new Error('Response stream has been closed');
                    Error.captureStackTrace(err, source);
                    throw err;
                }
            }
            const _report = (progress, task) => {
                // Measure the time to the first progress update with real markdown content
                if (typeof this._firstProgress === 'undefined' &&
                    (progress.kind === 'markdownContent' || progress.kind === 'markdownVuln')) {
                    this._firstProgress = this._stopWatch.elapsed();
                }
                if (task) {
                    const progressReporterPromise = this._proxy.$handleProgressChunk(this._request.requestId, progress);
                    const progressReporter = {
                        report: (p) => {
                            progressReporterPromise?.then((handle) => {
                                if (handle) {
                                    if (extHostTypes.MarkdownString.isMarkdownString(p.value)) {
                                        this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatResponseWarningPart.from(p), handle);
                                    }
                                    else {
                                        this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatResponseReferencePart.from(p), handle);
                                    }
                                }
                            });
                        },
                    };
                    Promise.all([progressReporterPromise, task?.(progressReporter)]).then(([handle, res]) => {
                        if (handle !== undefined) {
                            this._proxy.$handleProgressChunk(this._request.requestId, typeConvert.ChatTaskResult.from(res), handle);
                        }
                    });
                }
                else {
                    this._proxy.$handleProgressChunk(this._request.requestId, progress);
                }
            };
            this._apiObject = Object.freeze({
                markdown(value) {
                    throwIfDone(this.markdown);
                    const part = new extHostTypes.ChatResponseMarkdownPart(value);
                    const dto = typeConvert.ChatResponseMarkdownPart.from(part);
                    _report(dto);
                    return this;
                },
                markdownWithVulnerabilities(value, vulnerabilities) {
                    throwIfDone(this.markdown);
                    if (vulnerabilities) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    const part = new extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart(value, vulnerabilities);
                    const dto = typeConvert.ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
                    _report(dto);
                    return this;
                },
                codeblockUri(value, isEdit) {
                    throwIfDone(this.codeblockUri);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeblockUriPart(value, isEdit);
                    const dto = typeConvert.ChatResponseCodeblockUriPart.from(part);
                    _report(dto);
                    return this;
                },
                filetree(value, baseUri) {
                    throwIfDone(this.filetree);
                    const part = new extHostTypes.ChatResponseFileTreePart(value, baseUri);
                    const dto = typeConvert.ChatResponseFilesPart.from(part);
                    _report(dto);
                    return this;
                },
                anchor(value, title) {
                    const part = new extHostTypes.ChatResponseAnchorPart(value, title);
                    return this.push(part);
                },
                button(value) {
                    throwIfDone(this.anchor);
                    const part = new extHostTypes.ChatResponseCommandButtonPart(value);
                    const dto = typeConvert.ChatResponseCommandButtonPart.from(part, that._commandsConverter, that._sessionDisposables);
                    _report(dto);
                    return this;
                },
                progress(value, task) {
                    throwIfDone(this.progress);
                    const part = new extHostTypes.ChatResponseProgressPart2(value, task);
                    const dto = task
                        ? typeConvert.ChatTask.from(part)
                        : typeConvert.ChatResponseProgressPart.from(part);
                    _report(dto, task);
                    return this;
                },
                warning(value) {
                    throwIfDone(this.progress);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseWarningPart(value);
                    const dto = typeConvert.ChatResponseWarningPart.from(part);
                    _report(dto);
                    return this;
                },
                reference(value, iconPath) {
                    return this.reference2(value, iconPath);
                },
                reference2(value, iconPath, options) {
                    throwIfDone(this.reference);
                    if (typeof value === 'object' && 'variableName' in value) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (typeof value === 'object' && 'variableName' in value && !value.value) {
                        // The participant used this variable. Does that variable have any references to pull in?
                        const matchingVarData = that._request.variables.variables.find((v) => v.name === value.variableName);
                        if (matchingVarData) {
                            let references;
                            if (matchingVarData.references?.length) {
                                references = matchingVarData.references.map((r) => ({
                                    kind: 'reference',
                                    reference: {
                                        variableName: value.variableName,
                                        value: r.reference,
                                    },
                                }));
                            }
                            else {
                                // Participant sent a variableName reference but the variable produced no references. Show variable reference with no value
                                const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                                const dto = typeConvert.ChatResponseReferencePart.from(part);
                                references = [dto];
                            }
                            references.forEach((r) => _report(r));
                            return this;
                        }
                        else {
                            // Something went wrong- that variable doesn't actually exist
                        }
                    }
                    else {
                        const part = new extHostTypes.ChatResponseReferencePart(value, iconPath, options);
                        const dto = typeConvert.ChatResponseReferencePart.from(part);
                        _report(dto);
                    }
                    return this;
                },
                codeCitation(value, license, snippet) {
                    throwIfDone(this.codeCitation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseCodeCitationPart(value, license, snippet);
                    const dto = typeConvert.ChatResponseCodeCitationPart.from(part);
                    _report(dto);
                },
                textEdit(target, edits) {
                    throwIfDone(this.textEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseTextEditPart(target, edits);
                    part.isDone = edits === true ? true : undefined;
                    const dto = typeConvert.ChatResponseTextEditPart.from(part);
                    _report(dto);
                    return this;
                },
                notebookEdit(target, edits) {
                    throwIfDone(this.notebookEdit);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseNotebookEditPart(target, edits);
                    const dto = typeConvert.ChatResponseNotebookEditPart.from(part);
                    _report(dto);
                    return this;
                },
                confirmation(title, message, data, buttons) {
                    throwIfDone(this.confirmation);
                    checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    const part = new extHostTypes.ChatResponseConfirmationPart(title, message, data, buttons);
                    const dto = typeConvert.ChatResponseConfirmationPart.from(part);
                    _report(dto);
                    return this;
                },
                push(part) {
                    throwIfDone(this.push);
                    if (part instanceof extHostTypes.ChatResponseTextEditPart ||
                        part instanceof extHostTypes.ChatResponseNotebookEditPart ||
                        part instanceof extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart ||
                        part instanceof extHostTypes.ChatResponseWarningPart ||
                        part instanceof extHostTypes.ChatResponseConfirmationPart ||
                        part instanceof extHostTypes.ChatResponseCodeCitationPart ||
                        part instanceof extHostTypes.ChatResponseMovePart ||
                        part instanceof extHostTypes.ChatResponseProgressPart2) {
                        checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                    }
                    if (part instanceof extHostTypes.ChatResponseReferencePart) {
                        // Ensure variable reference values get fixed up
                        this.reference2(part.value, part.iconPath, part.options);
                    }
                    else if (part instanceof extHostTypes.ChatResponseProgressPart2) {
                        const dto = part.task
                            ? typeConvert.ChatTask.from(part)
                            : typeConvert.ChatResponseProgressPart.from(part);
                        _report(dto, part.task);
                    }
                    else if (part instanceof extHostTypes.ChatResponseAnchorPart) {
                        const dto = typeConvert.ChatResponseAnchorPart.from(part);
                        if (part.resolve) {
                            checkProposedApiEnabled(that._extension, 'chatParticipantAdditions');
                            dto.resolveId = generateUuid();
                            const cts = new CancellationTokenSource();
                            part
                                .resolve(cts.token)
                                .then(() => {
                                const resolvedDto = typeConvert.ChatResponseAnchorPart.from(part);
                                that._proxy.$handleAnchorResolve(that._request.requestId, dto.resolveId, resolvedDto);
                            })
                                .then(() => cts.dispose(), () => cts.dispose());
                            that._sessionDisposables.add(toDisposable(() => cts.dispose(true)));
                        }
                        _report(dto);
                    }
                    else {
                        const dto = typeConvert.ChatResponsePart.from(part, that._commandsConverter, that._sessionDisposables);
                        _report(dto);
                    }
                    return this;
                },
            });
        }
        return this._apiObject;
    }
}
export class ExtHostChatAgents2 extends Disposable {
    static { this._idPool = 0; }
    static { this._participantDetectionProviderIdPool = 0; }
    static { this._relatedFilesProviderIdPool = 0; }
    constructor(mainContext, _logService, _commands, _documents, _languageModels, _diagnostics, _tools) {
        super();
        this._logService = _logService;
        this._commands = _commands;
        this._documents = _documents;
        this._languageModels = _languageModels;
        this._diagnostics = _diagnostics;
        this._tools = _tools;
        this._agents = new Map();
        this._participantDetectionProviders = new Map();
        this._relatedFilesProviders = new Map();
        this._sessionDisposables = this._register(new DisposableMap());
        this._completionDisposables = this._register(new DisposableMap());
        this._inFlightRequests = new Set();
        this._onDidDisposeChatSession = this._register(new Emitter());
        this.onDidDisposeChatSession = this._onDidDisposeChatSession.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadChatAgents2);
        _commands.registerArgumentProcessor({
            processArgument: (arg) => {
                // Don't send this argument to extension commands
                if (isChatViewTitleActionContext(arg)) {
                    return null;
                }
                return arg;
            },
        });
    }
    transferActiveChat(newWorkspace) {
        this._proxy.$transferActiveChatSession(newWorkspace);
    }
    createChatAgent(extension, id, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, {}, undefined);
        return agent.apiAgent;
    }
    createDynamicChatAgent(extension, id, dynamicProps, handler) {
        const handle = ExtHostChatAgents2._idPool++;
        const agent = new ExtHostChatAgent(extension, id, this._proxy, handle, handler);
        this._agents.set(handle, agent);
        this._proxy.$registerAgent(handle, extension.identifier, id, { isSticky: true }, dynamicProps);
        return agent.apiAgent;
    }
    registerChatParticipantDetectionProvider(extension, provider) {
        const handle = ExtHostChatAgents2._participantDetectionProviderIdPool++;
        this._participantDetectionProviders.set(handle, new ExtHostParticipantDetector(extension, provider));
        this._proxy.$registerChatParticipantDetectionProvider(handle);
        return toDisposable(() => {
            this._participantDetectionProviders.delete(handle);
            this._proxy.$unregisterChatParticipantDetectionProvider(handle);
        });
    }
    registerRelatedFilesProvider(extension, provider, metadata) {
        const handle = ExtHostChatAgents2._relatedFilesProviderIdPool++;
        this._relatedFilesProviders.set(handle, new ExtHostRelatedFilesProvider(extension, provider));
        this._proxy.$registerRelatedFilesProvider(handle, metadata);
        return toDisposable(() => {
            this._relatedFilesProviders.delete(handle);
            this._proxy.$unregisterRelatedFilesProvider(handle);
        });
    }
    async $provideRelatedFiles(handle, request, token) {
        const provider = this._relatedFilesProviders.get(handle);
        if (!provider) {
            return Promise.resolve([]);
        }
        const extRequestDraft = typeConvert.ChatRequestDraft.to(request);
        return (await provider.provider.provideRelatedFiles(extRequestDraft, token)) ?? undefined;
    }
    async $detectChatParticipant(handle, requestDto, context, options, token) {
        const detector = this._participantDetectionProviders.get(handle);
        if (!detector) {
            return undefined;
        }
        const { request, location, history } = await this._createRequest(requestDto, context, detector.extension);
        const model = await this.getModelForRequest(request, detector.extension);
        const includeInteractionId = isProposedApiEnabled(detector.extension, 'chatParticipantPrivate');
        const extRequest = typeConvert.ChatAgentRequest.to(includeInteractionId ? request : { ...request, requestId: '' }, location, model, this.getDiagnosticsWhenEnabled(detector.extension), this.getToolsForRequest(detector.extension, request));
        return detector.provider.provideParticipantDetection(extRequest, { history }, {
            participants: options.participants,
            location: typeConvert.ChatLocation.to(options.location),
        }, token);
    }
    async _createRequest(requestDto, context, extension) {
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(extension, request.agentId, context);
        // in-place converting for location-data
        let location;
        if (request.locationData?.type === ChatAgentLocation.Editor) {
            // editor data
            const document = this._documents.getDocument(request.locationData.document);
            location = new extHostTypes.ChatRequestEditorData(document, typeConvert.Selection.to(request.locationData.selection), typeConvert.Range.to(request.locationData.wholeRange));
        }
        else if (request.locationData?.type === ChatAgentLocation.Notebook) {
            // notebook data
            const cell = this._documents.getDocument(request.locationData.sessionInputUri);
            location = new extHostTypes.ChatRequestNotebookData(cell);
        }
        else if (request.locationData?.type === ChatAgentLocation.Terminal) {
            // TBD
        }
        return { request, location, history: convertedHistory };
    }
    async getModelForRequest(request, extension) {
        let model;
        if (request.userSelectedModelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, request.userSelectedModelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $setRequestPaused(handle, requestId, isPaused) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const inFlight = Iterable.find(this._inFlightRequests, (r) => r.requestId === requestId);
        if (!inFlight) {
            return;
        }
        agent.setChatRequestPauseState({ request: inFlight.extRequest, isPaused });
    }
    async $invokeAgent(handle, requestDto, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            throw new Error(`[CHAT](${handle}) CANNOT invoke agent because the agent is not registered`);
        }
        let stream;
        let inFlightRequest;
        try {
            const { request, location, history } = await this._createRequest(requestDto, context, agent.extension);
            // Init session disposables
            let sessionDisposables = this._sessionDisposables.get(request.sessionId);
            if (!sessionDisposables) {
                sessionDisposables = new DisposableStore();
                this._sessionDisposables.set(request.sessionId, sessionDisposables);
            }
            stream = new ChatAgentResponseStream(agent.extension, request, this._proxy, this._commands.converter, sessionDisposables);
            const model = await this.getModelForRequest(request, agent.extension);
            const includeInteractionId = isProposedApiEnabled(agent.extension, 'chatParticipantPrivate');
            const extRequest = typeConvert.ChatAgentRequest.to(includeInteractionId ? request : { ...request, requestId: '' }, location, model, this.getDiagnosticsWhenEnabled(agent.extension), this.getToolsForRequest(agent.extension, request));
            inFlightRequest = { requestId: requestDto.requestId, extRequest };
            this._inFlightRequests.add(inFlightRequest);
            const task = agent.invoke(extRequest, { history }, stream.apiObject, token);
            return await raceCancellation(Promise.resolve(task).then((result) => {
                if (result?.metadata) {
                    try {
                        JSON.stringify(result.metadata);
                    }
                    catch (err) {
                        const msg = `result.metadata MUST be JSON.stringify-able. Got error: ${err.message}`;
                        this._logService.error(`[${agent.extension.identifier.value}] [@${agent.id}] ${msg}`, agent.extension);
                        return {
                            errorDetails: { message: msg },
                            timings: stream?.timings,
                            nextQuestion: result.nextQuestion,
                        };
                    }
                }
                let errorDetails;
                if (result?.errorDetails) {
                    errorDetails = {
                        ...result.errorDetails,
                        responseIsIncomplete: true,
                    };
                }
                if (errorDetails?.responseIsRedacted || errorDetails?.isQuotaExceeded) {
                    checkProposedApiEnabled(agent.extension, 'chatParticipantPrivate');
                }
                return {
                    errorDetails,
                    timings: stream?.timings,
                    metadata: result?.metadata,
                    nextQuestion: result?.nextQuestion,
                };
            }), token);
        }
        catch (e) {
            this._logService.error(e, agent.extension);
            if (e instanceof extHostTypes.LanguageModelError && e.cause) {
                e = e.cause;
            }
            const isQuotaExceeded = e instanceof Error && e.name === 'ChatQuotaExceeded';
            return {
                errorDetails: { message: toErrorMessage(e), responseIsIncomplete: true, isQuotaExceeded },
            };
        }
        finally {
            if (inFlightRequest) {
                this._inFlightRequests.delete(inFlightRequest);
            }
            stream?.close();
        }
    }
    getDiagnosticsWhenEnabled(extension) {
        if (!isProposedApiEnabled(extension, 'chatReferenceDiagnostic')) {
            return [];
        }
        return this._diagnostics.getDiagnostics();
    }
    getToolsForRequest(extension, request) {
        if (!isNonEmptyArray(request.userSelectedTools)) {
            return undefined;
        }
        const selector = new Set(request.userSelectedTools);
        return this._tools.getTools(extension).filter((candidate) => selector.has(candidate.name));
    }
    async prepareHistoryTurns(extension, agentId, context) {
        const res = [];
        for (const h of context.history) {
            const ehResult = typeConvert.ChatAgentResult.to(h.result);
            const result = agentId === h.request.agentId ? ehResult : { ...ehResult, metadata: undefined };
            // REQUEST turn
            const varsWithoutTools = h.request.variables.variables
                .filter((v) => !v.isTool)
                .map((v) => typeConvert.ChatPromptReference.to(v, this.getDiagnosticsWhenEnabled(extension)));
            const toolReferences = h.request.variables.variables
                .filter((v) => v.isTool)
                .map(typeConvert.ChatLanguageModelToolReference.to);
            const turn = new extHostTypes.ChatRequestTurn(h.request.message, h.request.command, varsWithoutTools, h.request.agentId, toolReferences);
            res.push(turn);
            // RESPONSE turn
            const parts = coalesce(h.response.map((r) => typeConvert.ChatResponsePart.toContent(r, this._commands.converter)));
            res.push(new extHostTypes.ChatResponseTurn(parts, result, h.request.agentId, h.request.command));
        }
        return res;
    }
    $releaseSession(sessionId) {
        this._sessionDisposables.deleteAndDispose(sessionId);
        this._onDidDisposeChatSession.fire(sessionId);
    }
    async $provideFollowups(requestDto, handle, result, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return Promise.resolve([]);
        }
        const request = revive(requestDto);
        const convertedHistory = await this.prepareHistoryTurns(agent.extension, agent.id, context);
        const ehResult = typeConvert.ChatAgentResult.to(result);
        return (await agent.provideFollowups(ehResult, { history: convertedHistory }, token))
            .filter((f) => {
            // The followup must refer to a participant that exists from the same extension
            const isValid = !f.participant ||
                Iterable.some(this._agents.values(), (a) => a.id === f.participant &&
                    ExtensionIdentifier.equals(a.extension.identifier, agent.extension.identifier));
            if (!isValid) {
                this._logService.warn(`[@${agent.id}] ChatFollowup refers to an unknown participant: ${f.participant}`);
            }
            return isValid;
        })
            .map((f) => typeConvert.ChatFollowup.from(f, request));
    }
    $acceptFeedback(handle, result, voteAction) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const ehResult = typeConvert.ChatAgentResult.to(result);
        let kind;
        switch (voteAction.direction) {
            case ChatAgentVoteDirection.Down:
                kind = extHostTypes.ChatResultFeedbackKind.Unhelpful;
                break;
            case ChatAgentVoteDirection.Up:
                kind = extHostTypes.ChatResultFeedbackKind.Helpful;
                break;
        }
        const feedback = {
            result: ehResult,
            kind,
            unhelpfulReason: isProposedApiEnabled(agent.extension, 'chatParticipantAdditions')
                ? voteAction.reason
                : undefined,
        };
        agent.acceptFeedback(Object.freeze(feedback));
    }
    $acceptAction(handle, result, event) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        if (event.action.kind === 'vote') {
            // handled by $acceptFeedback
            return;
        }
        const ehAction = typeConvert.ChatAgentUserActionEvent.to(result, event, this._commands.converter);
        if (ehAction) {
            agent.acceptAction(Object.freeze(ehAction));
        }
    }
    async $invokeCompletionProvider(handle, query, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return [];
        }
        let disposables = this._completionDisposables.get(handle);
        if (disposables) {
            // Clear any disposables from the last invocation of this completion provider
            disposables.clear();
        }
        else {
            disposables = new DisposableStore();
            this._completionDisposables.set(handle, disposables);
        }
        const items = await agent.invokeCompletionProvider(query, token);
        return items.map((i) => typeConvert.ChatAgentCompletionItem.from(i, this._commands.converter, disposables));
    }
    async $provideChatTitle(handle, context, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        const history = await this.prepareHistoryTurns(agent.extension, agent.id, { history: context });
        return await agent.provideTitle({ history }, token);
    }
    async $provideSampleQuestions(handle, location, token) {
        const agent = this._agents.get(handle);
        if (!agent) {
            return;
        }
        return (await agent.provideSampleQuestions(typeConvert.ChatLocation.to(location), token)).map((f) => typeConvert.ChatFollowup.from(f, undefined));
    }
}
class ExtHostParticipantDetector {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostRelatedFilesProvider {
    constructor(extension, provider) {
        this.extension = extension;
        this.provider = provider;
    }
}
class ExtHostChatAgent {
    constructor(extension, id, _proxy, _handle, _requestHandler) {
        this.extension = extension;
        this.id = id;
        this._proxy = _proxy;
        this._handle = _handle;
        this._requestHandler = _requestHandler;
        this._onDidReceiveFeedback = new Emitter();
        this._onDidPerformAction = new Emitter();
        this._pauseStateEmitter = new Emitter();
    }
    acceptFeedback(feedback) {
        this._onDidReceiveFeedback.fire(feedback);
    }
    acceptAction(event) {
        this._onDidPerformAction.fire(event);
    }
    setChatRequestPauseState(pauseState) {
        this._pauseStateEmitter.fire(pauseState);
    }
    async invokeCompletionProvider(query, token) {
        if (!this._agentVariableProvider) {
            return [];
        }
        return (await this._agentVariableProvider.provider.provideCompletionItems(query, token)) ?? [];
    }
    async provideFollowups(result, context, token) {
        if (!this._followupProvider) {
            return [];
        }
        const followups = await this._followupProvider.provideFollowups(result, context, token);
        if (!followups) {
            return [];
        }
        return (followups
            // Filter out "command followups" from older providers
            .filter((f) => !(f && 'commandId' in f))
            // Filter out followups from older providers before 'message' changed to 'prompt'
            .filter((f) => !(f && 'message' in f)));
    }
    async provideTitle(context, token) {
        if (!this._titleProvider) {
            return;
        }
        return (await this._titleProvider.provideChatTitle(context, token)) ?? undefined;
    }
    async provideSampleQuestions(location, token) {
        if (!this._welcomeMessageProvider || !this._welcomeMessageProvider.provideSampleQuestions) {
            return [];
        }
        const content = await this._welcomeMessageProvider.provideSampleQuestions(location, token);
        if (!content) {
            return [];
        }
        return content;
    }
    get apiAgent() {
        let disposed = false;
        let updateScheduled = false;
        const updateMetadataSoon = () => {
            if (disposed) {
                return;
            }
            if (updateScheduled) {
                return;
            }
            updateScheduled = true;
            queueMicrotask(() => {
                this._proxy.$updateAgent(this._handle, {
                    icon: !this._iconPath
                        ? undefined
                        : this._iconPath instanceof URI
                            ? this._iconPath
                            : 'light' in this._iconPath
                                ? this._iconPath.light
                                : undefined,
                    iconDark: !this._iconPath
                        ? undefined
                        : 'dark' in this._iconPath
                            ? this._iconPath.dark
                            : undefined,
                    themeIcon: this._iconPath instanceof extHostTypes.ThemeIcon ? this._iconPath : undefined,
                    hasFollowups: this._followupProvider !== undefined,
                    helpTextPrefix: !this._helpTextPrefix || typeof this._helpTextPrefix === 'string'
                        ? this._helpTextPrefix
                        : typeConvert.MarkdownString.from(this._helpTextPrefix),
                    helpTextVariablesPrefix: !this._helpTextVariablesPrefix || typeof this._helpTextVariablesPrefix === 'string'
                        ? this._helpTextVariablesPrefix
                        : typeConvert.MarkdownString.from(this._helpTextVariablesPrefix),
                    helpTextPostfix: !this._helpTextPostfix || typeof this._helpTextPostfix === 'string'
                        ? this._helpTextPostfix
                        : typeConvert.MarkdownString.from(this._helpTextPostfix),
                    supportIssueReporting: this._supportIssueReporting,
                    requester: this._requester,
                    welcomeMessageContent: this._welcomeMessageContent && {
                        ...this._welcomeMessageContent,
                        message: typeConvert.MarkdownString.from(this._welcomeMessageContent.message),
                    },
                });
                updateScheduled = false;
            });
        };
        const that = this;
        return {
            get id() {
                return that.id;
            },
            get iconPath() {
                return that._iconPath;
            },
            set iconPath(v) {
                that._iconPath = v;
                updateMetadataSoon();
            },
            get requestHandler() {
                return that._requestHandler;
            },
            set requestHandler(v) {
                assertType(typeof v === 'function', 'Invalid request handler');
                that._requestHandler = v;
            },
            get followupProvider() {
                return that._followupProvider;
            },
            set followupProvider(v) {
                that._followupProvider = v;
                updateMetadataSoon();
            },
            get helpTextPrefix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPrefix;
            },
            set helpTextPrefix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPrefix = v;
                updateMetadataSoon();
            },
            get helpTextVariablesPrefix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextVariablesPrefix;
            },
            set helpTextVariablesPrefix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextVariablesPrefix = v;
                updateMetadataSoon();
            },
            get helpTextPostfix() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._helpTextPostfix;
            },
            set helpTextPostfix(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._helpTextPostfix = v;
                updateMetadataSoon();
            },
            get supportIssueReporting() {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                return that._supportIssueReporting;
            },
            set supportIssueReporting(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantPrivate');
                that._supportIssueReporting = v;
                updateMetadataSoon();
            },
            get onDidReceiveFeedback() {
                return that._onDidReceiveFeedback.event;
            },
            set participantVariableProvider(v) {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                that._agentVariableProvider = v;
                if (v) {
                    if (!v.triggerCharacters.length) {
                        throw new Error('triggerCharacters are required');
                    }
                    that._proxy.$registerAgentCompletionsProvider(that._handle, that.id, v.triggerCharacters);
                }
                else {
                    that._proxy.$unregisterAgentCompletionsProvider(that._handle, that.id);
                }
            },
            get participantVariableProvider() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._agentVariableProvider;
            },
            set welcomeMessageProvider(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._welcomeMessageProvider = v;
                updateMetadataSoon();
            },
            get welcomeMessageProvider() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._welcomeMessageProvider;
            },
            set welcomeMessageContent(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._welcomeMessageContent = v;
                updateMetadataSoon();
            },
            get welcomeMessageContent() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._welcomeMessageContent;
            },
            set titleProvider(v) {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                that._titleProvider = v;
                updateMetadataSoon();
            },
            get titleProvider() {
                checkProposedApiEnabled(that.extension, 'defaultChatParticipant');
                return that._titleProvider;
            },
            get onDidChangePauseState() {
                checkProposedApiEnabled(that.extension, 'chatParticipantAdditions');
                return that._pauseStateEmitter.event;
            },
            onDidPerformAction: !isProposedApiEnabled(this.extension, 'chatParticipantAdditions')
                ? undefined
                : this._onDidPerformAction.event,
            set requester(v) {
                that._requester = v;
                updateMetadataSoon();
            },
            get requester() {
                return that._requester;
            },
            dispose() {
                disposed = true;
                that._followupProvider = undefined;
                that._onDidReceiveFeedback.dispose();
                that._proxy.$unregisterAgent(that._handle);
            },
        };
    }
    invoke(request, context, response, token) {
        return this._requestHandler(request, context, response, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q2hhdEFnZW50czIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUNmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBVXZGLE9BQU8sRUFDTixzQkFBc0IsR0FNdEIsTUFBTSwwQ0FBMEMs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