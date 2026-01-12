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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFNN0UsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTNFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFFakUsTUFBTSxDQUFOLElBQWtCLHdCQXlCakI7QUF6QkQsV0FBa0Isd0JBQXdCO0lBQ3pDLGlEQUFxQixDQUFBO0lBQ3JCLDBEQUE4QixDQUFBO0lBQzlCLDBEQUE4QixDQUFBO0lBQzlCLHFEQUF5QixDQUFBO0lBQ3pCLHVEQUEyQixDQUFBO0lBQzNCLG1EQUF1QixDQUFBO0lBQ3ZCLHFEQUF5QixDQUFBO0lBQ3pCLG1EQUF1QixDQUFBO0lBQ3ZCLG1EQUF1QixDQUFBO0lBQ3ZCLG1FQUF1QyxDQUFBO0lBQ3ZDLG1FQUF1QyxDQUFBO0lBQ3ZDLGlEQUFxQixDQUFBO0lBQ3JCLHFEQUF5QixDQUFBO0lBQ3pCLDZDQUFpQixDQUFBO0lBQ2pCLDJDQUFlLENBQUE7SUFDZix5REFBNkIsQ0FBQTtJQUM3QiwrREFBbUMsQ0FBQTtJQUNuQyxpREFBcUIsQ0FBQTtJQUNyQiwyREFBK0IsQ0FBQTtJQUMvQix5Q0FBYSxDQUFBO0lBQ2IsaURBQXFCLENBQUE7SUFDckIsdURBQTJCLENBQUE7SUFDM0IsdURBQTJCLENBQUE7SUFDM0IsaURBQXFCLENBQUE7QUFDdEIsQ0FBQyxFQXpCaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQXlCekM7QUFFRCxNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBRUQsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQix1Q0FBcUIsQ0FBQTtJQUNyQiwrQkFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixjQUFjLEtBQWQsY0FBYyxRQUcvQjtBQW1HRCxNQUFNLE9BQU8seUJBQ1osU0FBUSxVQUFVO0lBR2xCLFlBQ1EsRUFBNEIsRUFDNUIsT0FBK0IsRUFDL0IsY0FBNEIsRUFDNUIsT0FBbUIsRUFDbkIsbUJBQTJCLEVBQzNCLE1BQW1CLEVBQ25CLE9BQW1CLEVBQ25CLGtCQUE2QyxFQUM3QyxzQkFBaUQsRUFDakQsa0JBQWdDLEVBQ2hDLFNBQXVDLEVBQ3ZDLFVBQTBDLEVBQzFDLDZCQUErRDtRQUV0RSxLQUFLLEVBQUUsQ0FBQTtRQWRBLE9BQUUsR0FBRixFQUFFLENBQTBCO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLG1CQUFjLEdBQWQsY0FBYyxDQUFjO1FBQzVCLFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO1FBQzNCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBWTtRQUNuQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBQzdDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBMkI7UUFDakQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFjO1FBQ2hDLGNBQVMsR0FBVCxTQUFTLENBQThCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWdDO1FBQzFDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBa0M7SUFHdkUsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUFDLEdBQVE7SUFDeEQsT0FBTyxDQUNOLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLGNBQWMsSUFBSSxHQUFHLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxtQkFBbUIsQ0FDNUYsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQUN2RCxZQUNpQixFQUFVLEVBQ25CLE9BQStCLEVBQy9CLGNBQTRCLEVBQzVCLE9BQW1CLEVBQ25CLE1BQW1CLEVBQ25CLGtCQUE2QyxFQUM3QyxzQkFBaUQsRUFDakQsT0FBbUIsRUFDbkIsa0JBQWdDO1FBRXZDLEtBQUssRUFBRSxDQUFBO1FBVlMsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNuQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixtQkFBYyxHQUFkLGNBQWMsQ0FBYztRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBQ25CLFdBQU0sR0FBTixNQUFNLENBQWE7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJCO1FBQ2pELFlBQU8sR0FBUCxPQUFPLENBQVk7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFjO0lBR3hDLENBQUM7Q0FDRCJ9