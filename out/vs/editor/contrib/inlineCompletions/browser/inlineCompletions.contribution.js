/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { wrapInHotClass1 } from '../../../../platform/observable/common/wrapInHotClass.js';
import { registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { AcceptInlineCompletion, AcceptNextLineOfInlineCompletion, AcceptNextWordOfInlineCompletion, DevExtractReproSample, HideInlineCompletion, JumpToNextInlineEdit, ShowNextInlineSuggestionAction, ShowPreviousInlineSuggestionAction, ToggleAlwaysShowInlineSuggestionToolbar, ExplicitTriggerInlineEditAction, TriggerInlineSuggestionAction, TriggerInlineEditAction, ToggleInlineCompletionShowCollapsed, AcceptNextInlineEditPart, } from './controller/commands.js';
import { InlineCompletionsController } from './controller/inlineCompletionsController.js';
import { InlineCompletionsHoverParticipant } from './hintsWidget/hoverParticipant.js';
import { InlineCompletionsAccessibleView } from './inlineCompletionsAccessibleView.js';
import { InlineEditsAdapterContribution } from './model/inlineEditsAdapter.js';
registerEditorContribution(InlineEditsAdapterContribution.ID, InlineEditsAdapterContribution, 3 /* EditorContributionInstantiation.Eventually */);
registerEditorContribution(InlineCompletionsController.ID, wrapInHotClass1(InlineCompletionsController.hot), 3 /* EditorContributionInstantiation.Eventually */);
registerEditorAction(TriggerInlineSuggestionAction);
registerEditorAction(ExplicitTriggerInlineEditAction);
registerEditorCommand(new TriggerInlineEditAction());
registerEditorAction(ShowNextInlineSuggestionAction);
registerEditorAction(ShowPreviousInlineSuggestionAction);
registerEditorAction(AcceptNextWordOfInlineCompletion);
registerEditorAction(AcceptNextLineOfInlineCompletion);
registerEditorAction(AcceptInlineCompletion);
registerEditorAction(ToggleInlineCompletionShowCollapsed);
registerEditorAction(HideInlineCompletion);
registerEditorAction(AcceptNextInlineEditPart);
registerEditorAction(JumpToNextInlineEdit);
registerAction2(ToggleAlwaysShowInlineSuggestionToolbar);
registerEditorAction(DevExtractReproSample);
HoverParticipantRegistry.register(InlineCompletionsHoverParticipant);
AccessibleViewRegistry.register(new InlineCompletionsAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2lubGluZUNvbXBsZXRpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsZ0NBQWdDLEVBQ2hDLGdDQUFnQyxFQUNoQyxxQkFBcUIsRUFDckIsb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQiw4QkFBOEIsRUFDOUIsa0NBQWtDLEVBQ2xDLHVDQUF1QyxFQUN2QywrQkFBK0IsRUFDL0IsNkJBQTZCLEVBQzdCLHVCQUF1QixFQUN2QixtQ0FBbUMsRUFDbkMsd0JBQXdCLEdBQ3hCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUUsMEJBQTBCLENBQ3pCLDhCQUE4QixDQUFDLEVBQUUsRUFDakMsOEJBQThCLHFEQUU5QixDQUFBO0FBRUQsMEJBQTBCLENBQ3pCLDJCQUEyQixDQUFDLEVBQUUsRUFDOUIsZUFBZSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxxREFFaEQsQ0FBQTtBQUVELG9CQUFvQixDQUFDLDZCQUE2QixDQUFDLENBQUE7QUFDbkQsb0JBQW9CLENBQUMsK0JBQStCLENBQUMsQ0FBQTtBQUNyRCxxQkFBcUIsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtBQUNwRCxvQkFBb0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0FBQ3BELG9CQUFvQixDQUFDLGtDQUFrQyxDQUFDLENBQUE7QUFDeEQsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtBQUN0RCxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0FBQ3RELG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFDNUMsb0JBQW9CLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtBQUN6RCxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0FBQzFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUE7QUFDOUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUMxQyxlQUFlLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtBQUN4RCxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0FBRTNDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO0FBQ3BFLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLCtCQUErQixFQUFFLENBQUMsQ0FBQSJ9