/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from './constants.js';
export var ChatContextKeys;
(function (ChatContextKeys) {
    ChatContextKeys.responseVote = new RawContextKey('chatSessionResponseVote', '', {
        type: 'string',
        description: localize('interactiveSessionResponseVote', "When the response has been voted up, is set to 'up'. When voted down, is set to 'down'. Otherwise an empty string."),
    });
    ChatContextKeys.responseDetectedAgentCommand = new RawContextKey('chatSessionResponseDetectedAgentOrCommand', false, {
        type: 'boolean',
        description: localize('chatSessionResponseDetectedAgentOrCommand', 'When the agent or command was automatically detected'),
    });
    ChatContextKeys.responseSupportsIssueReporting = new RawContextKey('chatResponseSupportsIssueReporting', false, {
        type: 'boolean',
        description: localize('chatResponseSupportsIssueReporting', 'True when the current chat response supports issue reporting.'),
    });
    ChatContextKeys.responseIsFiltered = new RawContextKey('chatSessionResponseFiltered', false, {
        type: 'boolean',
        description: localize('chatResponseFiltered', 'True when the chat response was filtered out by the server.'),
    });
    ChatContextKeys.responseHasError = new RawContextKey('chatSessionResponseError', false, {
        type: 'boolean',
        description: localize('chatResponseErrored', 'True when the chat response resulted in an error.'),
    });
    ChatContextKeys.requestInProgress = new RawContextKey('chatSessionRequestInProgress', false, {
        type: 'boolean',
        description: localize('interactiveSessionRequestInProgress', 'True when the current request is still in progress.'),
    });
    ChatContextKeys.isRequestPaused = new RawContextKey('chatRequestIsPaused', false, {
        type: 'boolean',
        description: localize('chatRequestIsPaused', 'True when the current request is paused.'),
    });
    ChatContextKeys.canRequestBePaused = new RawContextKey('chatCanRequestBePaused', false, {
        type: 'boolean',
        description: localize('chatCanRequestBePaused', 'True when the current request can be paused.'),
    });
    ChatContextKeys.isResponse = new RawContextKey('chatResponse', false, {
        type: 'boolean',
        description: localize('chatResponse', 'The chat item is a response.'),
    });
    ChatContextKeys.isRequest = new RawContextKey('chatRequest', false, {
        type: 'boolean',
        description: localize('chatRequest', 'The chat item is a request'),
    });
    ChatContextKeys.itemId = new RawContextKey('chatItemId', '', {
        type: 'string',
        description: localize('chatItemId', 'The id of the chat item.'),
    });
    ChatContextKeys.lastItemId = new RawContextKey('chatLastItemId', [], {
        type: 'string',
        description: localize('chatLastItemId', 'The id of the last chat item.'),
    });
    ChatContextKeys.editApplied = new RawContextKey('chatEditApplied', false, {
        type: 'boolean',
        description: localize('chatEditApplied', 'True when the chat text edits have been applied.'),
    });
    ChatContextKeys.inputHasText = new RawContextKey('chatInputHasText', false, {
        type: 'boolean',
        description: localize('interactiveInputHasText', 'True when the chat input has text.'),
    });
    ChatContextKeys.inputHasFocus = new RawContextKey('chatInputHasFocus', false, {
        type: 'boolean',
        description: localize('interactiveInputHasFocus', 'True when the chat input has focus.'),
    });
    ChatContextKeys.inChatInput = new RawContextKey('inChatInput', false, {
        type: 'boolean',
        description: localize('inInteractiveInput', 'True when focus is in the chat input, false otherwise.'),
    });
    ChatContextKeys.inChatSession = new RawContextKey('inChat', false, {
        type: 'boolean',
        description: localize('inChat', 'True when focus is in the chat widget, false otherwise.'),
    });
    ChatContextKeys.inUnifiedChat = new RawContextKey('inUnifiedChat', false, {
        type: 'boolean',
        description: localize('inUnifiedChat', 'True when focus is in the unified chat widget, false otherwise.'),
    });
    ChatContextKeys.instructionsAttached = new RawContextKey('chatInstructionsAttached', false, {
        type: 'boolean',
        description: localize('chatInstructionsAttachedContextDescription', 'True when the chat has a prompt instructions attached.'),
    });
    ChatContextKeys.chatMode = new RawContextKey('chatMode', ChatMode.Ask, {
        type: 'string',
        description: localize('chatMode', 'The current chat mode.'),
    });
    ChatContextKeys.supported = ContextKeyExpr.or(IsWebContext.toNegated(), RemoteNameContext.notEqualsTo('')); // supported on desktop and in web only with a remote connection
    ChatContextKeys.enabled = new RawContextKey('chatIsEnabled', false, {
        type: 'boolean',
        description: localize('chatIsEnabled', 'True when chat is enabled because a default chat participant is activated with an implementation.'),
    });
    ChatContextKeys.panelParticipantRegistered = new RawContextKey('chatPanelParticipantRegistered', false, {
        type: 'boolean',
        description: localize('chatParticipantRegistered', 'True when a default chat participant is registered for the panel.'),
    });
    ChatContextKeys.editingParticipantRegistered = new RawContextKey('chatEditingParticipantRegistered', false, {
        type: 'boolean',
        description: localize('chatEditingParticipantRegistered', 'True when a default chat participant is registered for editing.'),
    });
    ChatContextKeys.chatEditingCanUndo = new RawContextKey('chatEditingCanUndo', false, {
        type: 'boolean',
        description: localize('chatEditingCanUndo', 'True when it is possible to undo an interaction in the editing panel.'),
    });
    ChatContextKeys.chatEditingCanRedo = new RawContextKey('chatEditingCanRedo', false, {
        type: 'boolean',
        description: localize('chatEditingCanRedo', 'True when it is possible to redo an interaction in the editing panel.'),
    });
    ChatContextKeys.extensionInvalid = new RawContextKey('chatExtensionInvalid', false, {
        type: 'boolean',
        description: localize('chatExtensionInvalid', 'True when the installed chat extension is invalid and needs to be updated.'),
    });
    ChatContextKeys.inputCursorAtTop = new RawContextKey('chatCursorAtTop', false);
    ChatContextKeys.inputHasAgent = new RawContextKey('chatInputHasAgent', false);
    ChatContextKeys.location = new RawContextKey('chatLocation', undefined);
    ChatContextKeys.inQuickChat = new RawContextKey('quickChatHasFocus', false, {
        type: 'boolean',
        description: localize('inQuickChat', 'True when the quick chat UI has focus, false otherwise.'),
    });
    ChatContextKeys.hasFileAttachments = new RawContextKey('chatHasFileAttachments', false, {
        type: 'boolean',
        description: localize('chatHasFileAttachments', 'True when the chat has file attachments.'),
    });
    ChatContextKeys.languageModelsAreUserSelectable = new RawContextKey('chatModelsAreUserSelectable', false, {
        type: 'boolean',
        description: localize('chatModelsAreUserSelectable', 'True when the chat model can be selected manually by the user.'),
    });
    ChatContextKeys.Setup = {
        hidden: new RawContextKey('chatSetupHidden', false, true), // True when chat setup is explicitly hidden.
        installed: new RawContextKey('chatSetupInstalled', false, true), // True when the chat extension is installed.
        fromDialog: ContextKeyExpr.has('config.chat.setupFromDialog'),
    };
    ChatContextKeys.Entitlement = {
        signedOut: new RawContextKey('chatSetupSignedOut', false, true), // True when user is signed out.
        canSignUp: new RawContextKey('chatPlanCanSignUp', false, true), // True when user can sign up to be a chat limited user.
        limited: new RawContextKey('chatPlanLimited', false, true), // True when user is a chat limited user.
        pro: new RawContextKey('chatPlanPro', false, true), // True when user is a chat pro user.
    };
    ChatContextKeys.SetupViewKeys = new Set([
        ChatContextKeys.Setup.hidden.key,
        ChatContextKeys.Setup.installed.key,
        ChatContextKeys.Entitlement.signedOut.key,
        ChatContextKeys.Entitlement.canSignUp.key,
        ...ChatContextKeys.Setup.fromDialog.keys(),
    ]);
    ChatContextKeys.SetupViewCondition = ContextKeyExpr.and(ChatContextKeys.Setup.fromDialog.negate(), ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.installed.negate()), ContextKeyExpr.and(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Setup.installed), ContextKeyExpr.and(ChatContextKeys.Entitlement.signedOut, ChatContextKeys.Setup.installed)));
    ChatContextKeys.chatQuotaExceeded = new RawContextKey('chatQuotaExceeded', false, true);
    ChatContextKeys.completionsQuotaExceeded = new RawContextKey('completionsQuotaExceeded', false, true);
    ChatContextKeys.Editing = {
        hasToolsAgent: new RawContextKey('chatHasToolsAgent', false, {
            type: 'boolean',
            description: localize('chatEditingHasToolsAgent', 'True when a tools agent is registered.'),
        }),
        agentModeDisallowed: new RawContextKey('chatAgentModeDisallowed', undefined, {
            type: 'boolean',
            description: localize('chatAgentModeDisallowed', 'True when agent mode is not allowed.'),
        }), // experiment-driven disablement
        hasToolConfirmation: new RawContextKey('chatHasToolConfirmation', false, {
            type: 'boolean',
            description: localize('chatEditingHasToolConfirmation', 'True when a tool confirmation is present.'),
        }),
    };
    ChatContextKeys.Tools = {
        toolsCount: new RawContextKey('toolsCount', 0, {
            type: 'number',
            description: localize('toolsCount', 'The count of tools available in the chat.'),
        }),
    };
})(ChatContextKeys || (ChatContextKeys = {}));
export var ChatContextKeyExprs;
(function (ChatContextKeyExprs) {
    ChatContextKeyExprs.unifiedChatEnabled = ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedChatView}`);
    ChatContextKeyExprs.inEditsOrUnified = ContextKeyExpr.or(ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession), ChatContextKeys.inUnifiedChat);
    ChatContextKeyExprs.inNonUnifiedPanel = ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inUnifiedChat.negate());
    ChatContextKeyExprs.inEditingMode = ContextKeyExpr.or(ChatContextKeys.chatMode.isEqualTo(ChatMode.Edit), ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent));
})(ChatContextKeyExprs || (ChatContextKeyExprs = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0Q29udGV4dEtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUUvRSxNQUFNLEtBQVcsZUFBZSxDQWtSL0I7QUFsUkQsV0FBaUIsZUFBZTtJQUNsQiw0QkFBWSxHQUFHLElBQUksYUFBYSxDQUFTLHlCQUF5QixFQUFFLEVBQUUsRUFBRTtRQUNwRixJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdDQUFnQyxFQUNoQyxvSEFBb0gsQ0FDcEg7S0FDRCxDQUFDLENBQUE7SUFDVyw0Q0FBNEIsR0FBRyxJQUFJLGFBQWEsQ0FDNUQsMkNBQTJDLEVBQzNDLEtBQUssRUFDTDtRQUNDLElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsMkNBQTJDLEVBQzNDLHNEQUFzRCxDQUN0RDtLQUNELENBQ0QsQ0FBQTtJQUNZLDhDQUE4QixHQUFHLElBQUksYUFBYSxDQUM5RCxvQ0FBb0MsRUFDcEMsS0FBSyxFQUNMO1FBQ0MsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQixvQ0FBb0Ms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