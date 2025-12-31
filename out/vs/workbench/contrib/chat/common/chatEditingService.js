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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUs1RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUFvRTdGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGtDQUFrQyxDQUFBO0FBeUUzRSxNQUFNLENBQU4sSUFBa0IsNEJBR2pCO0FBSEQsV0FBa0IsNEJBQTRCO0lBQzdDLCtFQUFJLENBQUE7SUFDSiwrRkFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUhpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRzdDO0FBRUQsTUFBTSxDQUFOLElBQWtCLG9CQU9qQjtBQVBELFdBQWtCLG9CQUFvQjtJQUNyQyx1RUFBUSxDQUFBO0lBQ1IsdUVBQVEsQ0FBQTtJQUNSLHVFQUFRLENBQUE7SUFDUix5RUFBUyxDQUFBO0lBQ1QsdUVBQVEsQ0FBQTtJQUNSLCtEQUFJLENBQUE7QUFDTCxDQUFDLEVBUGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFPckM7QUFFRCxNQUFNLENBQU4sSUFBa0IsNEJBR2pCO0FBSEQsV0FBa0IsNEJBQTRCO0lBQzdDLDJGQUFVLENBQUE7SUFDVixpRkFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRzdDO0FBa0dELE1BQU0sQ0FBTixJQUFrQix1QkFLakI7QUFMRCxXQUFrQix1QkFBdUI7SUFDeEMsMkVBQVcsQ0FBQTtJQUNYLHlGQUFrQixDQUFBO0lBQ2xCLHFFQUFRLENBQUE7SUFDUiw2RUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUxpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBS3hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sOENBQThDLEdBQUcsZ0NBQWdDLENBQUE7QUFFOUYsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQ3BFLDRCQUE0QixFQUM1QixTQUFTLEVBQ1QsUUFBUSxDQUNQLDRCQUE0QixFQUM1QiwwREFBMEQsQ0FDMUQsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0RBQW9ELEdBQUcsSUFBSSxhQUFhLENBQ3BGLDRDQUE0QyxFQUM1QyxTQUFTLEVBQ1QsUUFBUSxDQUNQLDRDQUE0QyxFQUM1Qyx5RUFBeUUsQ0FDekUsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQ3BFLDRCQUE0QixFQUM1QixFQUFFLENBQ0YsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUM3RCxxQkFBcUIsRUFDckIsU0FBUyxDQUNULENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FDOUQsc0JBQXNCLEVBQ3RCLFNBQVMsQ0FDVCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUcsSUFBSSxhQUFhLENBQ3pFLGlDQUFpQyxFQUNqQyxLQUFLLENBQ0wsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUM3RCxxQkFBcUIsRUFDckIsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLGFBQWEsQ0FDakUseUJBQXlCLEVBQ3pCLEtBQUssQ0FDTCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsNkJBQTZCLENBQUE7QUFDN0UsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsRUFBRSxDQUFBO0FBRWhELE1BQU0sQ0FBTixJQUFrQixZQUdqQjtBQUhELFdBQWtCLFlBQVk7SUFDN0IscURBQU8sQ0FBQTtJQUNQLHVEQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLFlBQVksS0FBWixZQUFZLFFBRzdCO0FBT0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEtBQWM7SUFDeEQsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxXQUFXLElBQUksS0FBSyxDQUFBO0FBQ3BFLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsT0FBNEI7SUFDakUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLDhDQUE4QztRQUN0RCxTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWE7S0FDaEMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9