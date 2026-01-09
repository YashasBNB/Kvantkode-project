/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export const chatEditingSnapshotScheme = 'chat-editing-snapshot-text-model';
export var WorkingSetEntryRemovalReason;
(function (WorkingSetEntryRemovalReason) {
    WorkingSetEntryRemovalReason[WorkingSetEntryRemovalReason["User"] = 0] = "User";
    WorkingSetEntryRemovalReason[WorkingSetEntryRemovalReason["Programmatic"] = 1] = "Programmatic";
})(WorkingSetEntryRemovalReason || (WorkingSetEntryRemovalReason = {}));
export var WorkingSetEntryState;
(function (WorkingSetEntryState) {
    WorkingSetEntryState[WorkingSetEntryState["Modified"] = 0] = "Modified";
    WorkingSetEntryState[WorkingSetEntryState["Accepted"] = 1] = "Accepted";
    WorkingSetEntryState[WorkingSetEntryState["Rejected"] = 2] = "Rejected";
    WorkingSetEntryState[WorkingSetEntryState["Transient"] = 3] = "Transient";
    WorkingSetEntryState[WorkingSetEntryState["Attached"] = 4] = "Attached";
    WorkingSetEntryState[WorkingSetEntryState["Sent"] = 5] = "Sent";
})(WorkingSetEntryState || (WorkingSetEntryState = {}));
export var ChatEditingSessionChangeType;
(function (ChatEditingSessionChangeType) {
    ChatEditingSessionChangeType[ChatEditingSessionChangeType["WorkingSet"] = 0] = "WorkingSet";
    ChatEditingSessionChangeType[ChatEditingSessionChangeType["Other"] = 1] = "Other";
})(ChatEditingSessionChangeType || (ChatEditingSessionChangeType = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize('chatEditingWidgetFileState', 'The current state of the file in the chat editing widget'));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize('chatEditingAgentSupportsReadonlyReferences', 'Whether the chat editing agent supports readonly references (temporary)'));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && 'sessionId' in thing;
}
export function getMultiDiffSourceUri(session) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: session.chatSessionId,
    });
}
