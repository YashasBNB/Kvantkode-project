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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFZLGlCQU1YO0FBTkQsV0FBWSxpQkFBaUI7SUFDNUIsNkRBQXdDLENBQUE7SUFDeEMsMkRBQXNDLENBQUE7SUFDdEMsd0RBQW1DLENBQUE7SUFDbkMsMERBQXFDLENBQUE7SUFDckMsMEVBQXFELENBQUE7QUFDdEQsQ0FBQyxFQU5XLGlCQUFpQixLQUFqQixpQkFBaUIsUUFNNUI7QUFFRCxNQUFNLENBQU4sSUFBWSxRQUlYO0FBSkQsV0FBWSxRQUFRO0lBQ25CLHVCQUFXLENBQUE7SUFDWCx5QkFBYSxDQUFBO0lBQ2IsMkJBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSlcsUUFBUSxLQUFSLFFBQVEsUUFJbkI7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsSUFBYTtJQUM3QyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ2QsS0FBSyxRQUFRLENBQUMsR0FBRyxDQUFDO1FBQ2xCLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQztRQUNuQixLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ2xCLE9BQU8sSUFBZ0IsQ0FBQTtRQUN4QjtZQUNDLE9BQU8sU0FBUyxDQUFBO0lBQ2xCLENBQUM7QUFDRixDQUFDO0FBSUQsTUFBTSxDQUFOLElBQVksaUJBTVg7QUFORCxXQUFZLGlCQUFpQjtJQUM1QixvQ0FBZSxDQUFBO0lBQ2YsMENBQXFCLENBQUE7SUFDckIsMENBQXFCLENBQUE7SUFDckIsc0NBQWlCLENBQUE7SUFDakIsdURBQWtDLENBQUE7QUFDbkMsQ0FBQyxFQU5XLGlCQUFpQixLQUFqQixpQkFBaUIsUUFNNUI7QUFFRCxXQUFpQixpQkFBaUI7SUFDakMsU0FBZ0IsT0FBTyxDQUFDLEtBQTBDO1FBQ2pFLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7WUFDL0IsS0FBSyxVQUFVO2dCQUNkLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFBO1lBQ2xDLEtBQUssVUFBVTtnQkFDZCxPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQTtZQUNsQyxLQUFLLFFBQVE7Z0JBQ1osT0FBTyxpQkFBaUIsQ0FBQyxNQUFNLENBQUE7WUFDaEMsS0FBSyxpQkFBaUI7Z0JBQ3JCLE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFBO1FBQ3pDLENBQUM7UUFDRCxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBZGUseUJBQU8sVUFjdEIsQ0FBQTtBQUNGLENBQUMsRUFoQmdCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFnQmpDIn0=