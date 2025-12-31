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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUVOLGNBQWMsRUFDZCxnQkFBZ0IsR0FDaEIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUdOLGlCQUFpQixFQUNqQixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxHQUFHLEVBQXlCLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQWdCLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXpGLE9BQU8sRUFBd0IsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFD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