/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ctxCommentEditorFocused } from './simpleCommentEditor.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import * as nls from '../../../../nls.js';
import { ToggleTabFocusModeAction } from '../../../../editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export var CommentAccessibilityHelpNLS;
(function (CommentAccessibilityHelpNLS) {
    CommentAccessibilityHelpNLS.intro = nls.localize('intro', 'The editor contains commentable range(s). Some useful commands include:');
    CommentAccessibilityHelpNLS.tabFocus = nls.localize('introWidget', 'This widget contains a text area, for composition of new comments, and actions, that can be tabbed to once tab moves focus mode has been enabled with the command Toggle Tab Key Moves Focus{0}.', `<keybinding:${ToggleTabFocusModeAction.ID}>`);
    CommentAccessibilityHelpNLS.commentCommands = nls.localize('commentCommands', 'Some useful comment commands include:');
    CommentAccessibilityHelpNLS.escape = nls.localize('escape', '- Dismiss Comment (Escape)');
    CommentAccessibilityHelpNLS.nextRange = nls.localize('next', '- Go to Next Commenting Range{0}.', `<keybinding:${"editor.action.nextCommentingRange" /* CommentCommandId.NextRange */}>`);
    CommentAccessibilityHelpNLS.previousRange = nls.localize('previous', '- Go to Previous Commenting Range{0}.', `<keybinding:${"editor.action.previousCommentingRange" /* CommentCommandId.PreviousRange */}>`);
    CommentAccessibilityHelpNLS.nextCommentThread = nls.localize('nextCommentThreadKb', '- Go to Next Comment Thread{0}.', `<keybinding:${"editor.action.nextCommentThreadAction" /* CommentCommandId.NextThread */}>`);
    CommentAccessibilityHelpNLS.previousCommentThread = nls.localize('previousCommentThreadKb', '- Go to Previous Comment Thread{0}.', `<keybinding:${"editor.action.previousCommentThreadAction" /* CommentCommandId.PreviousThread */}>`);
    CommentAccessibilityHelpNLS.nextCommentedRange = nls.localize('nextCommentedRangeKb', '- Go to Next Commented Range{0}.', `<keybinding:${"editor.action.nextCommentedRangeAction" /* CommentCommandId.NextCommentedRange */}>`);
    CommentAccessibilityHelpNLS.previousCommentedRange = nls.localize('previousCommentedRangeKb', '- Go to Previous Commented Range{0}.', `<keybinding:${"editor.action.previousCommentedRangeAction" /* CommentCommandId.PreviousCommentedRange */}>`);
    CommentAccessibilityHelpNLS.addComment = nls.localize('addCommentNoKb', '- Add Comment on Current Selection{0}.', `<keybinding:${"workbench.action.addComment" /* CommentCommandId.Add */}>`);
    CommentAccessibilityHelpNLS.submitComment = nls.localize('submitComment', '- Submit Comment{0}.', `<keybinding:${"editor.action.submitComment" /* CommentCommandId.Submit */}>`);
})(CommentAccessibilityHelpNLS || (CommentAccessibilityHelpNLS = {}));
export class CommentsAccessibilityHelpProvider extends Disposable {
    constructor() {
        super(...arguments);
        this.id = "comments" /* AccessibleViewProviderId.Comments */;
        this.verbositySettingKey = "accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
    }
    provideContent() {
        return [
            CommentAccessibilityHelpNLS.tabFocus,
            CommentAccessibilityHelpNLS.commentCommands,
            CommentAccessibilityHelpNLS.escape,
            CommentAccessibilityHelpNLS.addComment,
            CommentAccessibilityHelpNLS.submitComment,
            CommentAccessibilityHelpNLS.nextRange,
            CommentAccessibilityHelpNLS.previousRange,
        ].join('\n');
    }
    onClose() {
        this._element?.focus();
    }
}
export class CommentsAccessibilityHelp {
    constructor() {
        this.priority = 110;
        this.name = 'comments';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.or(ctxCommentEditorFocused, CommentContextKeys.commentFocused);
    }
    getProvider(accessor) {
        return accessor.get(IInstantiationService).createInstance(CommentsAccessibilityHelpProvider);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzQWNjZXNzaWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFRdEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE1BQU0sS0FBVywyQkFBMkIsQ0F1RDNDO0FBdkRELFdBQWlCLDJCQUEyQjtJQUM5QixpQ0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLE9BQU8sRUFDUCx5RUFBeUUsQ0FDekUsQ0FBQTtJQUNZLG9DQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDbkMsYUFBYSxFQUNiLGtNQUFrTSxFQUNsTSxlQUFlLHdCQUF3QixDQUFDLEVBQUUsR0FBRyxDQUM3QyxDQUFBO0lBQ1ksMkNBQWUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUMxQyxpQkFBaUIsRUFDakIsdUNBQXVDLENBQ3ZDLENBQUE7SUFDWSxrQ0FBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLDRCQUE0QixDQUFDLENBQUE7SUFDN0QscUNBQVMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNwQyxNQUFNLEVBQ04sbUNBQW1DLEVBQ25DLGVBQWUsb0VBQTBCLEdBQUcsQ0FDNUMsQ0FBQTtJQUNZLHlDQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDeEMsVUFBVSxFQUNWLHVDQUF1QyxFQUN2QyxlQUFlLDRFQUE4QixHQUFHLENBQ2hELENBQUE7SUFDWSw2Q0FBaUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUM1QyxxQkFBcUIsRUFDckIsaUNBQWlDLEVBQ2pDLGVBQWUseUVBQTJCLEdBQUcsQ0FDN0MsQ0FBQTtJQUNZLGlEQUFxQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ2hELHlCQUF5QixFQUN6QixxQ0FBcUMsRUFDckMsZUFBZSxpRkFBK0IsR0FBRyxDQUNqRCxDQUFBO0lBQ1ksOENBQWtCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDN0Msc0JBQXNCLEVBQ3RCLGtDQUFrQyxFQUNsQyxlQUFlLGtGQUFtQyxHQUFHLENBQ3JELENBQUE7SUFDWSxrREFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNqRCwwQkFBMEIsRUFDMUIsc0NBQXNDLEVBQ3RDLGVBQWUsMEZBQXVDLEdBQUcsQ0FDekQsQ0FBQTtJQUNZLHNDQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDckMsZ0JBQWdCLEVBQ2hCLHdDQUF3QyxFQUN4QyxlQUFlLHdEQUFvQixHQUFHLENBQ3RDLENBQUE7SUFDWSx5Q0FBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3hDLGVBQWUsRUFDZixzQkFBc0IsRUFDdEIsZUFBZSwyREFBdUIsR0FBRyxDQUN6QyxDQUFBO0FBQ0YsQ0FBQyxFQXZEZ0IsMkJBQTJCLEtBQTNCLDJCQUEyQixRQXVEM0M7QUFFRCxNQUFNLE9BQU8saUNBQ1osU0FBUSxVQUFVO0lBRG5COztRQUlDLE9BQUUsc0RBQW9DO1FBQ3RDLHdCQUFtQixxRkFBNEU7UUFDL0YsWUFBTyxHQUEyQixFQUFFLElBQUksc0NBQXlCLEVBQUUsQ0FBQTtJQWdCcEUsQ0FBQztJQWRBLGNBQWM7UUFDYixPQUFPO1lBQ04sMkJBQTJCLENBQUMsUUFBUTtZQUNwQywyQkFBMkIsQ0FBQyxlQUFlO1lBQzNDLDJCQUEyQixDQUFDLE1BQU07WUFDbEMsMkJBQTJCLENBQUMsVUFBVTtZQUN0QywyQkFBMkIsQ0FBQyxhQUFhO1lBQ3pDLDJCQUEyQixDQUFDLFNBQVM7WUFDckMsMkJBQTJCLENBQUMsYUFBYTtTQUN6QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNiLENBQUM7SUFDRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxVQUFVLENBQUE7UUFDakIsU0FBSSx3Q0FBMEI7UUFDOUIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUE7SUFJOUYsQ0FBQztJQUhBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0NBQ0QifQ==