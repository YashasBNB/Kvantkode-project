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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRBZ2VudHMyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENoYXRBZ2VudHMyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFDZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNELE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQVV2RixPQUFPLEVBQ04sc0JBQXNCLEdBTXRCLE1BQU0sMENBQTBDLENBQUE7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