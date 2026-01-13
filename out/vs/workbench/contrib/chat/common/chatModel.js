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
var ChatModel_1;
import { asArray } from '../../../../base/common/arrays.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString, } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { equals } from '../../../../base/common/objects.js';
import { ObservablePromise, observableValue, } from '../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import { URI, isUriComponents } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { IChatAgentService, reviveSerializedAgent, } from './chatAgents.js';
import { IChatEditingService } from './chatEditingService.js';
import { ChatRequestTextPart, reviveParsedChatRequest, } from './chatParserTypes.js';
import { isIUsedContext, } from './chatService.js';
import { ChatAgentLocation } from './constants.js';
export var IDiagnosticVariableEntryFilterData;
(function (IDiagnosticVariableEntryFilterData) {
    IDiagnosticVariableEntryFilterData.icon = Codicon.error;
    function fromMarker(marker) {
        return {
            filterUri: marker.resource,
            owner: marker.owner,
            problemMessage: marker.message,
            filterRange: {
                startLineNumber: marker.startLineNumber,
                endLineNumber: marker.endLineNumber,
                startColumn: marker.startColumn,
                endColumn: marker.endColumn,
            },
        };
    }
    IDiagnosticVariableEntryFilterData.fromMarker = fromMarker;
    function toEntry(data) {
        return {
            id: id(data),
            name: label(data),
            icon: IDiagnosticVariableEntryFilterData.icon,
            value: data,
            kind: 'diagnostic',
            range: data.filterRange
                ? new OffsetRange(data.filterRange.startLineNumber, data.filterRange.endLineNumber)
                : undefined,
            ...data,
        };
    }
    IDiagnosticVariableEntryFilterData.toEntry = toEntry;
    function id(data) {
        return [
            data.filterUri,
            data.owner,
            data.filterSeverity,
            data.filterRange?.startLineNumber,
        ].join(':');
    }
    IDiagnosticVariableEntryFilterData.id = id;
    function label(data) {
        let TrimThreshold;
        (function (TrimThreshold) {
            TrimThreshold[TrimThreshold["MaxChars"] = 30] = "MaxChars";
            TrimThreshold[TrimThreshold["MaxSpaceLookback"] = 10] = "MaxSpaceLookback";
        })(TrimThreshold || (TrimThreshold = {}));
        if (data.problemMessage) {
            if (data.problemMessage.length < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage;
            }
            // Trim the message, on a space if it would not lose too much
            // data (MaxSpaceLookback) or just blindly otherwise.
            const lastSpace = data.problemMessage.lastIndexOf(' ', 30 /* TrimThreshold.MaxChars */);
            if (lastSpace === -1 || lastSpace + 10 /* TrimThreshold.MaxSpaceLookback */ < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage.substring(0, 30 /* TrimThreshold.MaxChars */) + '…';
            }
            return data.problemMessage.substring(0, lastSpace) + '…';
        }
        let labelStr = localize('chat.attachment.problems.all', 'All Problems');
        if (data.filterUri) {
            labelStr = localize('chat.attachment.problems.inFile', 'Problems in {0}', basename(data.filterUri));
        }
        return labelStr;
    }
    IDiagnosticVariableEntryFilterData.label = label;
})(IDiagnosticVariableEntryFilterData || (IDiagnosticVariableEntryFilterData = {}));
export function isImplicitVariableEntry(obj) {
    return obj.kind === 'implicit';
}
export function isPasteVariableEntry(obj) {
    return obj.kind === 'paste';
}
export function isImageVariableEntry(obj) {
    return obj.kind === 'image';
}
export function isDiagnosticsVariableEntry(obj) {
    return obj.kind === 'diagnostic';
}
export function isChatRequestVariableEntry(obj) {
    const entry = obj;
    return (typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string');
}
export function isCellTextEditOperation(value) {
    const candidate = value;
    return !!candidate && !!candidate.edit && !!candidate.uri && URI.isUri(candidate.uri);
}
const nonHistoryKinds = new Set(['toolInvocation', 'toolInvocationSerialized']);
function isChatProgressHistoryResponseContent(content) {
    return !nonHistoryKinds.has(content.kind);
}
export function toChatHistoryContent(content) {
    return content.filter(isChatProgressHistoryResponseContent);
}
const defaultChatResponseModelChangeReason = { reason: 'other' };
export class ChatRequestModel {
    get session() {
        return this._session;
    }
    get username() {
        return this.session.requesterUsername;
    }
    get avatarIconUri() {
        return this.session.requesterAvatarIconUri;
    }
    get attempt() {
        return this._attempt;
    }
    get variableData() {
        return this._variableData;
    }
    set variableData(v) {
        this._variableData = v;
    }
    get confirmation() {
        return this._confirmation;
    }
    get locationData() {
        return this._locationData;
    }
    get attachedContext() {
        return this._attachedContext;
    }
    constructor(_session, message, _variableData, timestamp, _attempt = 0, _confirmation, _locationData, _attachedContext, isCompleteAddedRequest = false, modelId, restoredId) {
        this._session = _session;
        this.message = message;
        this._variableData = _variableData;
        this.timestamp = timestamp;
        this._attempt = _attempt;
        this._confirmation = _confirmation;
        this._locationData = _locationData;
        this._attachedContext = _attachedContext;
        this.isCompleteAddedRequest = isCompleteAddedRequest;
        this.modelId = modelId;
        this.id = restoredId ?? 'request_' + generateUuid();
        // this.timestamp = Date.now();
    }
    adoptTo(session) {
        this._session = session;
    }
}
class AbstractResponse {
    get value() {
        return this._responseParts;
    }
    constructor(value) {
        /**
         * A stringified representation of response data which might be presented to a screenreader or used when copying a response.
         */
        this._responseRepr = '';
        /**
         * Just the markdown content of the response, used for determining the rendering rate of markdown
         */
        this._markdownContent = '';
        this._responseParts = value;
        this._updateRepr();
    }
    toString() {
        return this._responseRepr;
    }
    /**
     * _Just_ the content of markdown parts in the response
     */
    getMarkdown() {
        return this._markdownContent;
    }
    _updateRepr() {
        this._responseRepr = this.partsToRepr(this._responseParts);
        this._markdownContent = this._responseParts
            .map((part) => {
            if (part.kind === 'inlineReference') {
                return this.inlineRefToRepr(part);
            }
            else if (part.kind === 'markdownContent' || part.kind === 'markdownVuln') {
                return part.content.value;
            }
            else {
                return '';
            }
        })
            .filter((s) => s.length > 0)
            .join('');
    }
    partsToRepr(parts) {
        const blocks = [];
        let currentBlockSegments = [];
        for (const part of parts) {
            let segment;
            switch (part.kind) {
                case 'treeData':
                case 'progressMessage':
                case 'codeblockUri':
                case 'toolInvocation':
                case 'toolInvocationSerialized':
                case 'undoStop':
                    // Ignore
                    continue;
                case 'inlineReference':
                    segment = { text: this.inlineRefToRepr(part) };
                    break;
                case 'command':
                    segment = { text: part.command.title, isBlock: true };
                    break;
                case 'textEditGroup':
                case 'notebookEditGroup':
                    segment = { text: localize('editsSummary', 'Made changes.'), isBlock: true };
                    break;
                case 'confirmation':
                    segment = { text: `${part.title}\n${part.message}`, isBlock: true };
                    break;
                default:
                    segment = { text: part.content.value };
                    break;
            }
            if (segment.isBlock) {
                if (currentBlockSegments.length) {
                    blocks.push(currentBlockSegments.join(''));
                    currentBlockSegments = [];
                }
                blocks.push(segment.text);
            }
            else {
                currentBlockSegments.push(segment.text);
            }
        }
        if (currentBlockSegments.length) {
            blocks.push(currentBlockSegments.join(''));
        }
        return blocks.join('\n\n');
    }
    inlineRefToRepr(part) {
        if ('uri' in part.inlineReference) {
            return this.uriToRepr(part.inlineReference.uri);
        }
        return 'name' in part.inlineReference
            ? '`' + part.inlineReference.name + '`'
            : this.uriToRepr(part.inlineReference);
    }
    uriToRepr(uri) {
        if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            return uri.toString(false);
        }
        return basename(uri);
    }
}
/** A view of a subset of a response */
class ResponseView extends AbstractResponse {
    constructor(_response, undoStop) {
        const idx = _response.value.findIndex((v) => v.kind === 'undoStop' && v.id === undoStop);
        super(idx === -1 ? _response.value.slice() : _response.value.slice(0, idx));
        this.undoStop = undoStop;
    }
}
export class Response extends AbstractResponse {
    get onDidChangeValue() {
        return this._onDidChangeValue.event;
    }
    constructor(value) {
        super(asArray(value).map((v) => isMarkdownString(v)
            ? { content: v, kind: 'markdownContent' }
            : 'kind' in v
                ? v
                : { kind: 'treeData', treeData: v }));
        this._onDidChangeValue = new Emitter();
        this._citations = [];
    }
    dispose() {
        this._onDidChangeValue.dispose();
    }
    clear() {
        this._responseParts = [];
        this._updateRepr(true);
    }
    updateContent(progress, quiet) {
        if (progress.kind === 'markdownContent') {
            // last response which is NOT a text edit group because we do want to support heterogenous streaming but not have
            // the MD be chopped up by text edit groups (and likely other non-renderable parts)
            const lastResponsePart = this._responseParts.filter((p) => p.kind !== 'textEditGroup').at(-1);
            if (!lastResponsePart ||
                lastResponsePart.kind !== 'markdownContent' ||
                !canMergeMarkdownStrings(lastResponsePart.content, progress.content)) {
                // The last part can't be merged with- not markdown, or markdown with different permissions
                this._responseParts.push(progress);
            }
            else {
                // Don't modify the current object, since it's being diffed by the renderer
                const idx = this._responseParts.indexOf(lastResponsePart);
                this._responseParts[idx] = {
                    ...lastResponsePart,
                    content: appendMarkdownString(lastResponsePart.content, progress.content),
                };
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'textEdit' || progress.kind === 'notebookEdit') {
            // If the progress.uri is a cell Uri, its possible its part of the inline chat.
            // Old approach of notebook inline chat would not start and end with notebook Uri, so we need to check for old approach.
            const useOldApproachForInlineNotebook = progress.uri.scheme === Schemas.vscodeNotebookCell &&
                !this._responseParts.find((part) => part.kind === 'notebookEditGroup');
            // merge edits for the same file no matter when they come in
            const notebookUri = useOldApproachForInlineNotebook
                ? undefined
                : CellUri.parse(progress.uri)?.notebook;
            const uri = notebookUri ?? progress.uri;
            let found = false;
            const groupKind = progress.kind === 'textEdit' && !notebookUri ? 'textEditGroup' : 'notebookEditGroup';
            const edits = groupKind === 'textEditGroup'
                ? progress.edits
                : progress.edits.map((edit) => TextEdit.isTextEdit(edit) ? { uri: progress.uri, edit } : edit);
            for (let i = 0; !found && i < this._responseParts.length; i++) {
                const candidate = this._responseParts[i];
                if (candidate.kind === groupKind && !candidate.done && isEqual(candidate.uri, uri)) {
                    candidate.edits.push(edits);
                    candidate.done = progress.done;
                    found = true;
                }
            }
            if (!found) {
                this._responseParts.push({
                    kind: groupKind,
                    uri,
                    edits: groupKind === 'textEditGroup' ? [edits] : edits,
                    done: progress.done,
                });
            }
            this._updateRepr(quiet);
        }
        else if (progress.kind === 'progressTask') {
            // Add a new resolving part
            const responsePosition = this._responseParts.push(progress) - 1;
            this._updateRepr(quiet);
            const disp = progress.onDidAddProgress(() => {
                this._updateRepr(false);
            });
            progress.task?.().then((content) => {
                // Stop listening for progress updates once the task settles
                disp.dispose();
                // Replace the resolving part's content with the resolved response
                if (typeof content === 'string') {
                    ;
                    this._responseParts[responsePosition].content = new MarkdownString(content);
                }
                this._updateRepr(false);
            });
        }
        else if (progress.kind === 'toolInvocation') {
            if (progress.confirmationMessages) {
                progress.confirmed.p.then(() => {
                    this._updateRepr(false);
                });
            }
            progress.isCompletePromise.then(() => {
                this._updateRepr(false);
            });
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
        else {
            this._responseParts.push(progress);
            this._updateRepr(quiet);
        }
    }
    addCitation(citation) {
        this._citations.push(citation);
        this._updateRepr();
    }
    _updateRepr(quiet) {
        super._updateRepr();
        if (!this._onDidChangeValue) {
            return; // called from parent constructor
        }
        this._responseRepr += this._citations.length
            ? '\n\n' + getCodeCitationsMessage(this._citations)
            : '';
        if (!quiet) {
            this._onDidChangeValue.fire();
        }
    }
}
export class ChatResponseModel extends Disposable {
    get session() {
        return this._session;
    }
    get shouldBeRemovedOnSend() {
        return this._shouldBeRemovedOnSend;
    }
    get isComplete() {
        return this._isComplete;
    }
    set shouldBeRemovedOnSend(disablement) {
        this._shouldBeRemovedOnSend = disablement;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    get isCanceled() {
        return this._isCanceled;
    }
    get vote() {
        return this._vote;
    }
    get voteDownReason() {
        return this._voteDownReason;
    }
    get followups() {
        return this._followups;
    }
    get entireResponse() {
        return this._finalizedResponse || this._response;
    }
    get result() {
        return this._result;
    }
    get username() {
        return this.session.responderUsername;
    }
    get avatarIcon() {
        return this.session.responderAvatarIcon;
    }
    get agent() {
        return this._agent;
    }
    get slashCommand() {
        return this._slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._agentOrSlashCommandDetected ?? false;
    }
    get usedContext() {
        return this._usedContext;
    }
    get contentReferences() {
        return Array.from(this._contentReferences);
    }
    get codeCitations() {
        return this._codeCitations;
    }
    get progressMessages() {
        return this._progressMessages;
    }
    get isStale() {
        return this._isStale;
    }
    get isPaused() {
        return this._isPaused;
    }
    get isPendingConfirmation() {
        return this._response.value.some((part) => (part.kind === 'toolInvocation' && part.isConfirmed === undefined) ||
            (part.kind === 'confirmation' && part.isUsed === false));
    }
    get response() {
        const undoStop = this._shouldBeRemovedOnSend?.afterUndoStop;
        if (!undoStop) {
            return this._finalizedResponse || this._response;
        }
        if (this._responseView?.undoStop !== undoStop) {
            this._responseView = new ResponseView(this._response, undoStop);
        }
        return this._responseView;
    }
    constructor(_response, _session, _agent, _slashCommand, requestId, _isComplete = false, _isCanceled = false, _vote, _voteDownReason, _result, followups, isCompleteAddedRequest = false, _shouldBeRemovedOnSend = undefined, restoredId) {
        super();
        this._session = _session;
        this._agent = _agent;
        this._slashCommand = _slashCommand;
        this.requestId = requestId;
        this._isComplete = _isComplete;
        this._isCanceled = _isCanceled;
        this._vote = _vote;
        this._voteDownReason = _voteDownReason;
        this._result = _result;
        this.isCompleteAddedRequest = isCompleteAddedRequest;
        this._shouldBeRemovedOnSend = _shouldBeRemovedOnSend;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._contentReferences = [];
        this._codeCitations = [];
        this._progressMessages = [];
        this._isStale = false;
        this._isPaused = observableValue('isPaused', false);
        // If we are creating a response with some existing content, consider it stale
        this._isStale =
            Array.isArray(_response) &&
                (_response.length !== 0 || (isMarkdownString(_response) && _response.value.length !== 0));
        this._followups = followups ? [...followups] : undefined;
        this._response = this._register(new Response(_response));
        this._register(this._response.onDidChangeValue(() => this._onDidChange.fire(defaultChatResponseModelChangeReason)));
        this.id = restoredId ?? 'response_' + generateUuid();
    }
    /**
     * Apply a progress update to the actual response content.
     */
    updateContent(responsePart, quiet) {
        this.bufferWhenPaused(() => this._response.updateContent(responsePart, quiet));
    }
    /**
     * Adds an undo stop at the current position in the stream.
     */
    addUndoStop(undoStop) {
        this.bufferWhenPaused(() => {
            this._onDidChange.fire({ reason: 'undoStop', id: undoStop.id });
            this._response.updateContent(undoStop, true);
        });
    }
    /**
     * Apply one of the progress updates that are not part of the actual response content.
     */
    applyReference(progress) {
        if (progress.kind === 'usedContext') {
            this._usedContext = progress;
        }
        else if (progress.kind === 'reference') {
            this._contentReferences.push(progress);
            this._onDidChange.fire(defaultChatResponseModelChangeReason);
        }
    }
    applyCodeCitation(progress) {
        this._codeCitations.push(progress);
        this._response.addCitation(progress);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setAgent(agent, slashCommand) {
        this._agent = agent;
        this._slashCommand = slashCommand;
        this._agentOrSlashCommandDetected = !agent.isDefault || !!slashCommand;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setResult(result) {
        this._result = result;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    complete() {
        if (this._result?.errorDetails?.responseIsRedacted) {
            this._response.clear();
        }
        this._isComplete = true;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    cancel() {
        this._isComplete = true;
        this._isCanceled = true;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setFollowups(followups) {
        this._followups = followups;
        this._onDidChange.fire(defaultChatResponseModelChangeReason); // Fire so that command followups get rendered on the row
    }
    setVote(vote) {
        this._vote = vote;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setVoteDownReason(reason) {
        this._voteDownReason = reason;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setEditApplied(edit, editCount) {
        if (!this.response.value.includes(edit)) {
            return false;
        }
        if (!edit.state) {
            return false;
        }
        edit.state.applied = editCount; // must not be edit.edits.length
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        return true;
    }
    adoptTo(session) {
        this._session = session;
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
    }
    setPaused(isPause, tx) {
        this._isPaused.set(isPause, tx);
        this._onDidChange.fire(defaultChatResponseModelChangeReason);
        this.bufferedPauseContent?.forEach((f) => f());
        this.bufferedPauseContent = undefined;
    }
    finalizeUndoState() {
        this._finalizedResponse = this.response;
        this._responseView = undefined;
        this._shouldBeRemovedOnSend = undefined;
    }
    bufferWhenPaused(apply) {
        if (!this._isPaused.get()) {
            apply();
        }
        else {
            this.bufferedPauseContent ??= [];
            this.bufferedPauseContent.push(apply);
        }
    }
}
export var ChatPauseState;
(function (ChatPauseState) {
    ChatPauseState[ChatPauseState["NotPausable"] = 0] = "NotPausable";
    ChatPauseState[ChatPauseState["Paused"] = 1] = "Paused";
    ChatPauseState[ChatPauseState["Unpaused"] = 2] = "Unpaused";
})(ChatPauseState || (ChatPauseState = {}));
/**
 * Normalize chat data from storage to the current format.
 * TODO- ChatModel#_deserialize and reviveSerializedAgent also still do some normalization and maybe that should be done in here too.
 */
export function normalizeSerializableChatData(raw) {
    normalizeOldFields(raw);
    if (!('version' in raw)) {
        return {
            version: 3,
            ...raw,
            lastMessageDate: raw.creationDate,
            customTitle: undefined,
        };
    }
    if (raw.version === 2) {
        return {
            ...raw,
            version: 3,
            customTitle: raw.computedTitle,
        };
    }
    return raw;
}
function normalizeOldFields(raw) {
    // Fill in fields that very old chat data may be missing
    if (!raw.sessionId) {
        raw.sessionId = generateUuid();
    }
    if (!raw.creationDate) {
        raw.creationDate = getLastYearDate();
    }
    if ('version' in raw && (raw.version === 2 || raw.version === 3)) {
        if (!raw.lastMessageDate) {
            // A bug led to not porting creationDate properly, and that was copied to lastMessageDate, so fix that up if missing.
            raw.lastMessageDate = getLastYearDate();
        }
    }
}
function getLastYearDate() {
    const lastYearDate = new Date();
    lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
    return lastYearDate.getTime();
}
export function isExportableSessionData(obj) {
    const data = obj;
    return typeof data === 'object' && typeof data.requesterUsername === 'string';
}
export function isSerializableSessionData(obj) {
    const data = obj;
    return (isExportableSessionData(obj) &&
        typeof data.creationDate === 'number' &&
        typeof data.sessionId === 'string' &&
        obj.requests.every((request) => !request.usedContext /* for backward compat allow missing usedContext */ ||
            isIUsedContext(request.usedContext)));
}
export var ChatRequestRemovalReason;
(function (ChatRequestRemovalReason) {
    /**
     * "Normal" remove
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Removal"] = 0] = "Removal";
    /**
     * Removed because the request will be resent
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Resend"] = 1] = "Resend";
    /**
     * Remove because the request is moving to another model
     */
    ChatRequestRemovalReason[ChatRequestRemovalReason["Adoption"] = 2] = "Adoption";
})(ChatRequestRemovalReason || (ChatRequestRemovalReason = {}));
export var ChatModelInitState;
(function (ChatModelInitState) {
    ChatModelInitState[ChatModelInitState["Created"] = 0] = "Created";
    ChatModelInitState[ChatModelInitState["Initializing"] = 1] = "Initializing";
    ChatModelInitState[ChatModelInitState["Initialized"] = 2] = "Initialized";
})(ChatModelInitState || (ChatModelInitState = {}));
let ChatModel = ChatModel_1 = class ChatModel extends Disposable {
    static getDefaultTitle(requests) {
        const firstRequestMessage = requests.at(0)?.message ?? '';
        const message = typeof firstRequestMessage === 'string' ? firstRequestMessage : firstRequestMessage.text;
        return message.split('\n')[0].substring(0, 50);
    }
    get sampleQuestions() {
        return this._sampleQuestions;
    }
    get sessionId() {
        return this._sessionId;
    }
    get requestInProgress() {
        const lastRequest = this.lastRequest;
        if (!lastRequest?.response) {
            return false;
        }
        if (lastRequest.response.isPendingConfirmation) {
            return false;
        }
        return !lastRequest.response.isComplete;
    }
    get requestPausibility() {
        const lastRequest = this.lastRequest;
        if (!lastRequest?.response?.agent ||
            lastRequest.response.isComplete ||
            lastRequest.response.isPendingConfirmation) {
            return 0 /* ChatPauseState.NotPausable */;
        }
        return lastRequest.response.isPaused.get() ? 1 /* ChatPauseState.Paused */ : 2 /* ChatPauseState.Unpaused */;
    }
    get hasRequests() {
        return this._requests.length > 0;
    }
    get lastRequest() {
        return this._requests.at(-1);
    }
    get creationDate() {
        return this._creationDate;
    }
    get lastMessageDate() {
        return this._lastMessageDate;
    }
    get _defaultAgent() {
        return this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
    }
    get requesterUsername() {
        return this._defaultAgent?.metadata.requester?.name ?? this.initialData?.requesterUsername ?? '';
    }
    get responderUsername() {
        return this._defaultAgent?.fullName ?? this.initialData?.responderUsername ?? '';
    }
    get requesterAvatarIconUri() {
        return this._defaultAgent?.metadata.requester?.icon ?? this._initialRequesterAvatarIconUri;
    }
    get responderAvatarIcon() {
        return this._defaultAgent?.metadata.themeIcon ?? this._initialResponderAvatarIconUri;
    }
    get initState() {
        return this._initState;
    }
    get isImported() {
        return this._isImported;
    }
    get customTitle() {
        return this._customTitle;
    }
    get title() {
        return this._customTitle || ChatModel_1.getDefaultTitle(this._requests);
    }
    get initialLocation() {
        return this._initialLocation;
    }
    get editingSessionObs() {
        return this._editingSession;
    }
    get editingSession() {
        return this._editingSession?.promiseResult.get()?.data;
    }
    constructor(initialData, _initialLocation, logService, chatAgentService, chatEditingService) {
        super();
        this.initialData = initialData;
        this._initialLocation = _initialLocation;
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.chatEditingService = chatEditingService;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._initState = ChatModelInitState.Created;
        this._isInitializedDeferred = new DeferredPromise();
        this._isImported = false;
        this._checkpoint = undefined;
        const isValid = isSerializableSessionData(initialData);
        if (initialData && !isValid) {
            this.logService.warn(`ChatModel#constructor: Loaded malformed session data: ${JSON.stringify(initialData)}`);
        }
        this._isImported = (!!initialData && !isValid) || (initialData?.isImported ?? false);
        this._sessionId = (isValid && initialData.sessionId) || generateUuid();
        this._requests = initialData ? this._deserialize(initialData) : [];
        this._creationDate = (isValid && initialData.creationDate) || Date.now();
        this._lastMessageDate = (isValid && initialData.lastMessageDate) || this._creationDate;
        this._customTitle = isValid ? initialData.customTitle : undefined;
        this._initialRequesterAvatarIconUri =
            initialData?.requesterAvatarIconUri && URI.revive(initialData.requesterAvatarIconUri);
        this._initialResponderAvatarIconUri = isUriComponents(initialData?.responderAvatarIconUri)
            ? URI.revive(initialData.responderAvatarIconUri)
            : initialData?.responderAvatarIconUri;
    }
    startEditingSession(isGlobalEditingSession) {
        const editingSessionPromise = isGlobalEditingSession
            ? this.chatEditingService.startOrContinueGlobalEditingSession(this)
            : this.chatEditingService.createEditingSession(this);
        this._editingSession = new ObservablePromise(editingSessionPromise);
        this._editingSession.promise.then((editingSession) => this._store.isDisposed ? editingSession.dispose() : this._register(editingSession));
    }
    _deserialize(obj) {
        const requests = obj.requests;
        if (!Array.isArray(requests)) {
            this.logService.error(`Ignoring malformed session data: ${JSON.stringify(obj)}`);
            return [];
        }
        try {
            return requests.map((raw) => {
                const parsedRequest = typeof raw.message === 'string'
                    ? this.getParsedRequestFromString(raw.message)
                    : reviveParsedChatRequest(raw.message);
                // Old messages don't have variableData, or have it in the wrong (non-array) shape
                const variableData = this.reviveVariableData(raw.variableData);
                const request = new ChatRequestModel(this, parsedRequest, variableData, raw.timestamp ?? -1, undefined, undefined, undefined, undefined, undefined, undefined, raw.requestId);
                request.shouldBeRemovedOnSend = raw.isHidden
                    ? { requestId: raw.requestId }
                    : raw.shouldBeRemovedOnSend;
                if (raw.response || raw.result || raw.responseErrorDetails) {
                    const agent = raw.agent && 'metadata' in raw.agent // Check for the new format, ignore entries in the old format
                        ? reviveSerializedAgent(raw.agent)
                        : undefined;
                    // Port entries from old format
                    const result = 'responseErrorDetails' in raw
                        ? // eslint-disable-next-line local/code-no-dangerous-type-assertions
                            { errorDetails: raw.responseErrorDetails }
                        : raw.result;
                    request.response = new ChatResponseModel(raw.response ?? [new MarkdownString(raw.response)], this, agent, raw.slashCommand, request.id, true, raw.isCanceled, raw.vote, raw.voteDownReason, result, raw.followups, undefined, undefined, raw.responseId);
                    request.response.shouldBeRemovedOnSend = raw.isHidden
                        ? { requestId: raw.requestId }
                        : raw.shouldBeRemovedOnSend;
                    if (raw.usedContext) {
                        // @ulugbekna: if this's a new vscode sessions, doc versions are incorrect anyway?
                        request.response.applyReference(revive(raw.usedContext));
                    }
                    raw.contentReferences?.forEach((r) => request.response.applyReference(revive(r)));
                    raw.codeCitations?.forEach((c) => request.response.applyCodeCitation(revive(c)));
                }
                return request;
            });
        }
        catch (error) {
            this.logService.error('Failed to parse chat data', error);
            return [];
        }
    }
    reviveVariableData(raw) {
        const variableData = raw && Array.isArray(raw.variables) ? raw : { variables: [] };
        variableData.variables = variableData.variables.map((v) => {
            // Old variables format
            if (v && 'values' in v && Array.isArray(v.values)) {
                return {
                    id: v.id ?? '',
                    name: v.name,
                    value: v.values[0]?.value,
                    range: v.range,
                    modelDescription: v.modelDescription,
                    references: v.references,
                };
            }
            else {
                return v;
            }
        });
        return variableData;
    }
    getParsedRequestFromString(message) {
        // TODO These offsets won't be used, but chat replies need to go through the parser as well
        const parts = [
            new ChatRequestTextPart(new OffsetRange(0, message.length), { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 }, message),
        ];
        return {
            text: message,
            parts,
        };
    }
    toggleLastRequestPaused(isPaused) {
        if (this.requestPausibility !== 0 /* ChatPauseState.NotPausable */ &&
            this.lastRequest?.response?.agent) {
            const pausedValue = isPaused ?? !this.lastRequest.response.isPaused.get();
            this.lastRequest.response.setPaused(pausedValue);
            this.chatAgentService.setRequestPaused(this.lastRequest.response.agent.id, this.lastRequest.id, pausedValue);
            this._onDidChange.fire({ kind: 'changedRequest', request: this.lastRequest });
        }
    }
    startInitialize() {
        if (this.initState !== ChatModelInitState.Created) {
            throw new Error(`ChatModel is in the wrong state for startInitialize: ${ChatModelInitState[this.initState]}`);
        }
        this._initState = ChatModelInitState.Initializing;
    }
    deinitialize() {
        this._initState = ChatModelInitState.Created;
        this._isInitializedDeferred = new DeferredPromise();
    }
    initialize(sampleQuestions) {
        if (this.initState !== ChatModelInitState.Initializing) {
            // Must call startInitialize before initialize, and only call it once
            throw new Error(`ChatModel is in the wrong state for initialize: ${ChatModelInitState[this.initState]}`);
        }
        this._initState = ChatModelInitState.Initialized;
        this._sampleQuestions = sampleQuestions;
        this._isInitializedDeferred.complete();
        this._onDidChange.fire({ kind: 'initialize' });
    }
    setInitializationError(error) {
        if (this.initState !== ChatModelInitState.Initializing) {
            throw new Error(`ChatModel is in the wrong state for setInitializationError: ${ChatModelInitState[this.initState]}`);
        }
        if (!this._isInitializedDeferred.isSettled) {
            this._isInitializedDeferred.error(error);
        }
    }
    waitForInitialization() {
        return this._isInitializedDeferred.p;
    }
    getRequests() {
        return this._requests;
    }
    get checkpoint() {
        return this._checkpoint;
    }
    setDisabledRequests(requestIds) {
        this._requests.forEach((request) => {
            const shouldBeRemovedOnSend = requestIds.find((r) => r.requestId === request.id);
            request.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            if (request.response) {
                request.response.shouldBeRemovedOnSend = shouldBeRemovedOnSend;
            }
        });
        this._onDidChange.fire({
            kind: 'setHidden',
            hiddenRequestIds: requestIds,
        });
    }
    addRequest(message, variableData, attempt, chatAgent, slashCommand, confirmation, locationData, attachments, isCompleteAddedRequest, modelId) {
        const request = new ChatRequestModel(this, message, variableData, Date.now(), attempt, confirmation, locationData, attachments, isCompleteAddedRequest, modelId);
        request.response = new ChatResponseModel([], this, chatAgent, slashCommand, request.id, undefined, undefined, undefined, undefined, undefined, undefined, isCompleteAddedRequest);
        this._requests.push(request);
        this._lastMessageDate = Date.now();
        this._onDidChange.fire({ kind: 'addRequest', request });
        return request;
    }
    setCustomTitle(title) {
        this._customTitle = title;
    }
    updateRequest(request, variableData) {
        request.variableData = variableData;
        this._onDidChange.fire({ kind: 'changedRequest', request });
    }
    adoptRequest(request) {
        // this doesn't use `removeRequest` because it must not dispose the request object
        const oldOwner = request.session;
        const index = oldOwner._requests.findIndex((candidate) => candidate.id === request.id);
        if (index === -1) {
            return;
        }
        oldOwner._requests.splice(index, 1);
        request.adoptTo(this);
        request.response?.adoptTo(this);
        this._requests.push(request);
        oldOwner._onDidChange.fire({
            kind: 'removeRequest',
            requestId: request.id,
            responseId: request.response?.id,
            reason: 2 /* ChatRequestRemovalReason.Adoption */,
        });
        this._onDidChange.fire({ kind: 'addRequest', request });
    }
    acceptResponseProgress(request, progress, quiet) {
        if (!request.response) {
            request.response = new ChatResponseModel([], this, undefined, undefined, request.id);
        }
        if (request.response.isComplete) {
            throw new Error('acceptResponseProgress: Adding progress to a completed response');
        }
        if (progress.kind === 'markdownContent' ||
            progress.kind === 'treeData' ||
            progress.kind === 'inlineReference' ||
            progress.kind === 'codeblockUri' ||
            progress.kind === 'markdownVuln' ||
            progress.kind === 'progressMessage' ||
            progress.kind === 'command' ||
            progress.kind === 'textEdit' ||
            progress.kind === 'notebookEdit' ||
            progress.kind === 'warning' ||
            progress.kind === 'progressTask' ||
            progress.kind === 'confirmation' ||
            progress.kind === 'toolInvocation') {
            request.response.updateContent(progress, quiet);
        }
        else if (progress.kind === 'usedContext' || progress.kind === 'reference') {
            request.response.applyReference(progress);
        }
        else if (progress.kind === 'codeCitation') {
            request.response.applyCodeCitation(progress);
        }
        else if (progress.kind === 'move') {
            this._onDidChange.fire({ kind: 'move', target: progress.uri, range: progress.range });
        }
        else if (progress.kind === 'undoStop') {
            request.response.addUndoStop(progress);
        }
        else {
            this.logService.error(`Couldn't handle progress: ${JSON.stringify(progress)}`);
        }
    }
    removeRequest(id, reason = 0 /* ChatRequestRemovalReason.Removal */) {
        const index = this._requests.findIndex((request) => request.id === id);
        const request = this._requests[index];
        if (index !== -1) {
            this._onDidChange.fire({
                kind: 'removeRequest',
                requestId: request.id,
                responseId: request.response?.id,
                reason,
            });
            this._requests.splice(index, 1);
            request.response?.dispose();
        }
    }
    cancelRequest(request) {
        if (request.response) {
            request.response.cancel();
        }
    }
    setResponse(request, result) {
        if (!request.response) {
            request.response = new ChatResponseModel([], this, undefined, undefined, request.id);
        }
        request.response.setResult(result);
    }
    completeResponse(request) {
        if (!request.response) {
            throw new Error('Call setResponse before completeResponse');
        }
        request.response.complete();
        this._onDidChange.fire({ kind: 'completedRequest', request });
    }
    setFollowups(request, followups) {
        if (!request.response) {
            // Maybe something went wrong?
            return;
        }
        request.response.setFollowups(followups);
    }
    setResponseModel(request, response) {
        request.response = response;
        this._onDidChange.fire({ kind: 'addResponse', response });
    }
    toExport() {
        return {
            requesterUsername: this.requesterUsername,
            requesterAvatarIconUri: this.requesterAvatarIconUri,
            responderUsername: this.responderUsername,
            responderAvatarIconUri: this.responderAvatarIcon,
            initialLocation: this.initialLocation,
            requests: this._requests.map((r) => {
                const message = {
                    ...r.message,
                    parts: r.message.parts.map((p) => (p && 'toJSON' in p ? p.toJSON() : p)),
                };
                const agent = r.response?.agent;
                const agentJson = agent && 'toJSON' in agent
                    ? agent.toJSON()
                    : agent
                        ? { ...agent }
                        : undefined;
                return {
                    requestId: r.id,
                    message,
                    variableData: r.variableData,
                    response: r.response
                        ? r.response.entireResponse.value.map((item) => {
                            // Keeping the shape of the persisted data the same for back compat
                            if (item.kind === 'treeData') {
                                return item.treeData;
                            }
                            else if (item.kind === 'markdownContent') {
                                return item.content;
                            }
                            else {
                                return item; // TODO
                            }
                        })
                        : undefined,
                    responseId: r.response?.id,
                    shouldBeRemovedOnSend: r.shouldBeRemovedOnSend,
                    result: r.response?.result,
                    followups: r.response?.followups,
                    isCanceled: r.response?.isCanceled,
                    vote: r.response?.vote,
                    voteDownReason: r.response?.voteDownReason,
                    agent: agentJson,
                    slashCommand: r.response?.slashCommand,
                    usedContext: r.response?.usedContext,
                    contentReferences: r.response?.contentReferences,
                    codeCitations: r.response?.codeCitations,
                    timestamp: r.timestamp,
                };
            }),
        };
    }
    toJSON() {
        return {
            version: 3,
            ...this.toExport(),
            sessionId: this.sessionId,
            creationDate: this._creationDate,
            isImported: this._isImported,
            lastMessageDate: this._lastMessageDate,
            customTitle: this._customTitle,
        };
    }
    dispose() {
        this._requests.forEach((r) => r.response?.dispose());
        this._onDidDispose.fire();
        super.dispose();
    }
};
ChatModel = ChatModel_1 = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentService),
    __param(4, IChatEditingService)
], ChatModel);
export { ChatModel };
export function updateRanges(variableData, diff) {
    return {
        variables: variableData.variables.map((v) => ({
            ...v,
            range: v.range && {
                start: v.range.start - diff,
                endExclusive: v.range.endExclusive - diff,
            },
        })),
    };
}
export function canMergeMarkdownStrings(md1, md2) {
    if (md1.baseUri && md2.baseUri) {
        const baseUriEquals = md1.baseUri.scheme === md2.baseUri.scheme &&
            md1.baseUri.authority === md2.baseUri.authority &&
            md1.baseUri.path === md2.baseUri.path &&
            md1.baseUri.query === md2.baseUri.query &&
            md1.baseUri.fragment === md2.baseUri.fragment;
        if (!baseUriEquals) {
            return false;
        }
    }
    else if (md1.baseUri || md2.baseUri) {
        return false;
    }
    return (equals(md1.isTrusted, md2.isTrusted) &&
        md1.supportHtml === md2.supportHtml &&
        md1.supportThemeIcons === md2.supportThemeIcons);
}
export function appendMarkdownString(md1, md2) {
    const appendedValue = typeof md2 === 'string' ? md2 : md2.value;
    return {
        value: md1.value + appendedValue,
        isTrusted: md1.isTrusted,
        supportThemeIcons: md1.supportThemeIcons,
        supportHtml: md1.supportHtml,
        baseUri: md1.baseUri,
    };
}
export function getCodeCitationsMessage(citations) {
    if (citations.length === 0) {
        return '';
    }
    const licenseTypes = citations.reduce((set, c) => set.add(c.license), new Set());
    const label = licenseTypes.size === 1
        ? localize('codeCitation', 'Similar code found with 1 license type', licenseTypes.size)
        : localize('codeCitations', 'Similar code found with {0} license types', licenseTypes.size);
    return label;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sY0FBYyxFQUNkLGdCQUFnQixHQUNoQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBR04saUJBQWlCLEVBQ2pCLGVBQWUsR0FDZixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLEdBQUcsRUFBeUIsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBZ0IsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFekYsT0FBTyxFQUF3QixRQUFRLEVB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