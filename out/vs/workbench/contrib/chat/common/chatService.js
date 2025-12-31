/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export function isIDocumentContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'uri' in obj &&
        obj.uri instanceof URI &&
        'version' in obj &&
        typeof obj.version === 'number' &&
        'ranges' in obj &&
        Array.isArray(obj.ranges) &&
        obj.ranges.every(Range.isIRange));
}
export function isIUsedContext(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        'documents' in obj &&
        Array.isArray(obj.documents) &&
        obj.documents.every(isIDocumentContext));
}
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatAgentVoteDirection;
(function (ChatAgentVoteDirection) {
    ChatAgentVoteDirection[ChatAgentVoteDirection["Down"] = 0] = "Down";
    ChatAgentVoteDirection[ChatAgentVoteDirection["Up"] = 1] = "Up";
})(ChatAgentVoteDirection || (ChatAgentVoteDirection = {}));
export var ChatAgentVoteDownReason;
(function (ChatAgentVoteDownReason) {
    ChatAgentVoteDownReason["IncorrectCode"] = "incorrectCode";
    ChatAgentVoteDownReason["DidNotFollowInstructions"] = "didNotFollowInstructions";
    ChatAgentVoteDownReason["IncompleteCode"] = "incompleteCode";
    ChatAgentVoteDownReason["MissingContext"] = "missingContext";
    ChatAgentVoteDownReason["PoorlyWrittenOrFormatted"] = "poorlyWrittenOrFormatted";
    ChatAgentVoteDownReason["RefusedAValidRequest"] = "refusedAValidRequest";
    ChatAgentVoteDownReason["OffensiveOrUnsafe"] = "offensiveOrUnsafe";
    ChatAgentVoteDownReason["Other"] = "other";
    ChatAgentVoteDownReason["WillReportIssue"] = "willReportIssue";
})(ChatAgentVoteDownReason || (ChatAgentVoteDownReason = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    // Keyboard shortcut or context menu
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export const IChatService = createDecorator('IChatService');
export const KEYWORD_ACTIVIATION_SETTING_ID = 'accessibility.voice.keywordActivation';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSXZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQTZCNUYsTUFBTSxDQUFOLElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN6QixtREFBUSxDQUFBO0lBQ1IseURBQVcsQ0FBQTtJQUNYLHFEQUFTLENBQUE7QUFDVixDQUFDLEVBSlcsY0FBYyxLQUFkLGNBQWMsUUFJekI7QUF3QkQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVk7SUFDOUMsT0FBTyxDQUNOLENBQUMsQ0FBQyxHQUFHO1FBQ0wsT0FBTyxHQUFHLEtBQUssUUFBUTtRQUN2QixLQUFLLElBQUksR0FBRztRQUNaLEdBQUcsQ0FBQyxHQUFHLFlBQVksR0FBRztRQUN0QixTQUFTLElBQUksR0FBRztRQUNoQixPQUFPLEdBQUcsQ0FBQyxPQUFPLEtBQUssUUFBUTtRQUMvQixRQUFRLElBQUksR0FBRztRQUNmLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUN6QixHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQ2hDLENBQUE7QUFDRixDQUFDO0FBT0QsTUFBTSxVQUFVLGNBQWMsQ0FBQyxHQUFZO0lBQzFDLE9BQU8sQ0FDTixDQUFDLENBQUMsR0FBRztRQUNMLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsV0FBVyxJQUFJLEdBQUc7UUFDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO1FBQzVCLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQ3ZDLENBQUE7QUFDRixDQUFDO0FBT0QsTUFBTSxDQUFOLElBQVksbUNBSVg7QUFKRCxXQUFZLG1DQUFtQztJQUM5QyxxR0FBWSxDQUFBO0lBQ1osbUdBQVcsQ0FBQTtJQUNYLG1HQUFXLENBQUE7QUFDWixDQUFDLEVBSlcsbUNBQW1DLEtBQW5DLG1DQUFtQyxRQUk5QztBQXNNRCxNQUFNLENBQU4sSUFBWSxzQkFHWDtBQUhELFdBQVksc0JBQXNCO0lBQ2pDLG1FQUFRLENBQUE7SUFDUiwrREFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUhXLHNCQUFzQixLQUF0QixzQkFBc0IsUUFHakM7QUFFRCxNQUFNLENBQU4sSUFBWSx1QkFVWDtBQVZELFdBQVksdUJBQXVCO0lBQ2xDLDBEQUErQixDQUFBO0lBQy9CLGdGQUFxRCxDQUFBO0lBQ3JELDREQUFpQyxDQUFBO0lBQ2pDLDREQUFpQyxDQUFBO0lBQ2pDLGdGQUFxRCxDQUFBO0lBQ3JELHdFQUE2QyxDQUFBO0lBQzdDLGtFQUF1QyxDQUFBO0lBQ3ZDLDBDQUFlLENBQUE7SUFDZiw4REFBbUMsQ0FBQTtBQUNwQyxDQUFDLEVBVlcsdUJBQXVCLEtBQXZCLHVCQUF1QixRQVVsQztBQVFELE1BQU0sQ0FBTixJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdkIsb0NBQW9DO0lBQ3BDLG1EQUFVLENBQUE7SUFDVixxREFBVyxDQUFBO0FBQ1osQ0FBQyxFQUpXLFlBQVksS0FBWixZQUFZLFFBSXZCO0FBZ0xELE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQWUsY0FBYyxDQUFDLENBQUE7QUEwRHpFLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLHVDQUF1QyxDQUFBIn0=