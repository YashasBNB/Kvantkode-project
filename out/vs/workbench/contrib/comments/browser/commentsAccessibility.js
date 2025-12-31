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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0FjY2Vzc2liaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBUXRILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxNQUFNLEtBQVcsMkJBQTJCLENBdUQzQztBQXZERCxXQUFpQiwyQkFBMkI7SUFDOUIsaUNBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNoQyxPQUFPLEVBQ1AseUVBQXlFLENBQ3pFLENBQUE7SUFDWSxvQ0FBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ25DLGFBQWEsRUFDYixrTUFBa00sRUFDbE0sZUFBZSx3QkFBd0IsQ0FBQyxFQUFFLEdBQUcsQ0FDN0MsQ0FBQTtJQUNZLDJDQUFlLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDMUMsaUJBQWlCLEVBQ2pCLHVDQUF1QyxDQUN2QyxDQUFBO0lBQ1ksa0NBQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0lBQzdELHFDQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDcEMsTUFBTSxFQUNOLG1DQUFtQyxFQUNuQyxlQUFlLG9FQUEwQixHQUFHLENBQzVDLENBQUE7SUFDWSx5Q0FBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3hDLFVBQVUsRUFDVix1Q0FBdUMsRUFDdkMsZUFBZSw0RUFBOEIsR0FBRyxDQUNoRCxDQUFBO0lBQ1ksNkNBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDNUMscUJBQXFCLEVBQ3JCLGlDQUFpQyxFQUNqQyxlQUFlLHlFQUEyQixHQUFHLENBQzdDLENBQUE7SUFDWSxpREFBcUIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNoRCx5QkFBeUIsRUFDekIscUNBQXFDLEVBQ3JDLGVBQWUsaUZBQStCLEdBQUcsQ0FDakQsQ0FBQTtJQUNZLDhDQUFrQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQzdDLHNCQUFzQixFQUN0QixrQ0FBa0MsRUFDbEMsZUFBZSxrRkFBbUMsR0FBRyxDQUNyRCxDQUFBO0lBQ1ksa0RBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDakQsMEJBQTBCLEVBQzFCLHNDQUFzQyxFQUN0QyxlQUFlLDBGQUF1QyxHQUFHLENBQ3pELENBQUE7SUFDWSxzQ0FBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQ3JDLGdCQUFnQixFQUNoQix3Q0FBd0MsRUFDeEMsZUFBZSx3REFBb0IsR0FBRyxDQUN0QyxDQUFBO0lBQ1kseUNBQWEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUN4QyxlQUFlLEVBQ2Ysc0JBQXNCLEVBQ3RCLGVBQWUsMkRBQXVCLEdBQUcsQ0FDekMsQ0FBQTtBQUNGLENBQUMsRUF2RGdCLDJCQUEyQixLQUEzQiwyQkFBMkIsUUF1RDNDO0FBRUQsTUFBTSxPQUFPLGlDQUNaLFNBQVEsVUFBVTtJQURuQjs7UUFJQyxPQUFFLHNEQUFvQztRQUN0Qyx3QkFBbUIscUZBQTRFO1FBQy9GLFlBQU8sR0FBMkIsRUFBRSxJQUFJLHNDQUF5QixFQUFFLENBQUE7SUFnQnBFLENBQUM7SUFkQSxjQUFjO1FBQ2IsT0FBTztZQUNOLDJCQUEyQixDQUFDLFFBQVE7WUFDcEMsMkJBQTJCLENBQUMsZUFBZTtZQUMzQywyQkFBMkIsQ0FBQyxNQUFNO1lBQ2xDLDJCQUEyQixDQUFDLFVBQVU7WUFDdEMsMkJBQTJCLENBQUMsYUFBYTtZQUN6QywyQkFBMkIsQ0FBQyxTQUFTO1lBQ3JDLDJCQUEyQixDQUFDLGFBQWE7U0FDekMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTztRQUNOLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsVUFBVSxDQUFBO1FBQ2pCLFNBQUksd0NBQTBCO1FBQzlCLFNBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxDQUFDLHVCQUF1QixFQUFFLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBSTlGLENBQUM7SUFIQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsY0FBYyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7SUFDN0YsQ0FBQztDQUNEIn0=