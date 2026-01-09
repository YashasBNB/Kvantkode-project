/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["UnifiedChatView"] = "chat.unifiedChatView";
    ChatConfiguration["UseFileStorage"] = "chat.useFileStorage";
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
})(ChatConfiguration || (ChatConfiguration = {}));
export var ChatMode;
(function (ChatMode) {
    ChatMode["Ask"] = "ask";
    ChatMode["Edit"] = "edit";
    ChatMode["Agent"] = "agent";
})(ChatMode || (ChatMode = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatMode.Ask:
        case ChatMode.Edit:
        case ChatMode.Agent:
            return mode;
        default:
            return undefined;
    }
}
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    ChatAgentLocation["Panel"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    ChatAgentLocation["Editor"] = "editor";
    ChatAgentLocation["EditingSession"] = "editing-session";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel':
                return ChatAgentLocation.Panel;
            case 'terminal':
                return ChatAgentLocation.Terminal;
            case 'notebook':
                return ChatAgentLocation.Notebook;
            case 'editor':
                return ChatAgentLocation.Editor;
            case 'editing-session':
                return ChatAgentLocation.EditingSession;
        }
        return ChatAgentLocation.Panel;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
