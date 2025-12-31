/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const IAccessibleViewService = createDecorator('accessibleViewService');
export var AccessibleViewProviderId;
(function (AccessibleViewProviderId) {
    AccessibleViewProviderId["Terminal"] = "terminal";
    AccessibleViewProviderId["TerminalChat"] = "terminal-chat";
    AccessibleViewProviderId["TerminalHelp"] = "terminal-help";
    AccessibleViewProviderId["DiffEditor"] = "diffEditor";
    AccessibleViewProviderId["MergeEditor"] = "mergeEditor";
    AccessibleViewProviderId["PanelChat"] = "panelChat";
    AccessibleViewProviderId["InlineChat"] = "inlineChat";
    AccessibleViewProviderId["AgentChat"] = "agentChat";
    AccessibleViewProviderId["QuickChat"] = "quickChat";
    AccessibleViewProviderId["InlineCompletions"] = "inlineCompletions";
    AccessibleViewProviderId["KeybindingsEditor"] = "keybindingsEditor";
    AccessibleViewProviderId["Notebook"] = "notebook";
    AccessibleViewProviderId["ReplEditor"] = "replEditor";
    AccessibleViewProviderId["Editor"] = "editor";
    AccessibleViewProviderId["Hover"] = "hover";
    AccessibleViewProviderId["Notification"] = "notification";
    AccessibleViewProviderId["EmptyEditorHint"] = "emptyEditorHint";
    AccessibleViewProviderId["Comments"] = "comments";
    AccessibleViewProviderId["CommentThread"] = "commentThread";
    AccessibleViewProviderId["Repl"] = "repl";
    AccessibleViewProviderId["ReplHelp"] = "replHelp";
    AccessibleViewProviderId["RunAndDebug"] = "runAndDebug";
    AccessibleViewProviderId["Walkthrough"] = "walkthrough";
    AccessibleViewProviderId["SourceControl"] = "scm";
})(AccessibleViewProviderId || (AccessibleViewProviderId = {}));
export var AccessibleViewType;
(function (AccessibleViewType) {
    AccessibleViewType["Help"] = "help";
    AccessibleViewType["View"] = "view";
})(AccessibleViewType || (AccessibleViewType = {}));
export var NavigationType;
(function (NavigationType) {
    NavigationType["Previous"] = "previous";
    NavigationType["Next"] = "next";
})(NavigationType || (NavigationType = {}));
export class AccessibleContentProvider extends Disposable {
    constructor(id, options, provideContent, onClose, verbositySettingKey, onOpen, actions, provideNextContent, providePreviousContent, onDidChangeContent, onKeyDown, getSymbols, onDidRequestClearLastProvider) {
        super();
        this.id = id;
        this.options = options;
        this.provideContent = provideContent;
        this.onClose = onClose;
        this.verbositySettingKey = verbositySettingKey;
        this.onOpen = onOpen;
        this.actions = actions;
        this.provideNextContent = provideNextContent;
        this.providePreviousContent = providePreviousContent;
        this.onDidChangeContent = onDidChangeContent;
        this.onKeyDown = onKeyDown;
        this.getSymbols = getSymbols;
        this.onDidRequestClearLastProvider = onDidRequestClearLastProvider;
    }
}
export function isIAccessibleViewContentProvider(obj) {
    return (obj && obj.id && obj.options && obj.provideContent && obj.onClose && obj.verbositySettingKey);
}
export class ExtensionContentProvider extends Disposable {
    constructor(id, options, provideContent, onClose, onOpen, provideNextContent, providePreviousContent, actions, onDidChangeContent) {
        super();
        this.id = id;
        this.options = options;
        this.provideContent = provideContent;
        this.onClose = onClose;
        this.onOpen = onOpen;
        this.provideNextContent = provideNextContent;
        this.providePreviousContent = providePreviousContent;
        this.actions = actions;
        this.onDidChangeContent = onDidChangeContent;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBTTdFLE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBRWpFLE1BQU0sQ0FBTixJQUFrQix3QkF5QmpCO0FBekJELFdBQWtCLHdCQUF3QjtJQUN6QyxpREFBcUIsQ0FBQTtJQUNyQiwwREFBOEIsQ0FBQTtJQUM5QiwwREFBOEIsQ0FBQTtJQUM5QixxREFBeUIsQ0FBQTtJQUN6Qix1REFBMkIsQ0FBQTtJQUMzQixtREFBdUIsQ0FBQTtJQUN2QixxREFBeUIsQ0FBQTtJQUN6QixtREFBdUIsQ0FBQTtJQUN2QixtREFBdUIsQ0FBQTtJQUN2QixtRUFBdUMsQ0FBQTtJQUN2QyxtRUFBdUMsQ0FBQTtJQUN2QyxpREFBcUIsQ0FBQTtJQUNyQixxREFBeUIsQ0FBQTtJQUN6Qiw2Q0FBaUIsQ0FBQTtJQUNqQiwyQ0FBZSxDQUFBO0lBQ2YseURBQTZCLENBQUE7SUFDN0IsK0RBQW1DLENBQUE7SUFDbkMsaURBQXFCLENBQUE7SUFDckIsMkRBQStCLENBQUE7SUFDL0IseUNBQWEsQ0FBQTtJQUNiLGlEQUFxQixDQUFBO0lBQ3JCLHVEQUEyQixDQUFBO0lBQzNCLHVEQUEyQixDQUFBO0lBQzNCLGlEQUFxQixDQUFBO0FBQ3RCLENBQUMsRUF6QmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUF5QnpDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGtCQUdqQjtBQUhELFdBQWtCLGtCQUFrQjtJQUNuQyxtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUduQztBQUVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IsdUNBQXFCLENBQUE7SUFDckIsK0JBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUFtR0QsTUFBTSxPQUFPLHlCQUNaLFNBQVEsVUFBVTtJQUdsQixZQUNRLEVBQTRCLEVBQzVCLE9BQStCLEVBQy9CLGNBQTRCLEVBQzVCLE9BQW1CLEVBQ25CLG1CQUEyQixFQUMzQixNQUFtQixFQUNuQixPQUFtQixFQUNuQixrQkFBNkMsRUFDN0Msc0JBQWlELEVBQ2pELGtCQUFnQyxFQUNoQyxTQUF1QyxFQUN2QyxVQUEwQyxFQUMxQyw2QkFBK0Q7UUFFdEUsS0FBSyxFQUFFLENBQUE7UUFkQSxPQUFFLEdBQUYsRUFBRSxDQUEwQjtRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBYztRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJCO1FBQ2pELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBYztRQUNoQyxjQUFTLEdBQVQsU0FBUyxDQUE4QjtRQUN2QyxlQUFVLEdBQVYsVUFBVSxDQUFnQztRQUMxQyxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWtDO0lBR3ZFLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FBQyxHQUFRO0lBQ3hELE9BQU8sQ0FDTixHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxjQUFjLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsbUJBQW1CLENBQzVGLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQVU7SUFDdkQsWUFDaUIsRUFBVSxFQUNuQixPQUErQixFQUMvQixjQUE0QixFQUM1QixPQUFtQixFQUNuQixNQUFtQixFQUNuQixrQkFBNkMsRUFDN0Msc0JBQWlELEVBQ2pELE9BQW1CLEVBQ25CLGtCQUFnQztRQUV2QyxLQUFLLEVBQUUsQ0FBQTtRQVZTLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFDL0IsbUJBQWMsR0FBZCxjQUFjLENBQWM7UUFDNUIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBMkI7UUFDN0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUEyQjtRQUNqRCxZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBYztJQUd4QyxDQUFDO0NBQ0QifQ==