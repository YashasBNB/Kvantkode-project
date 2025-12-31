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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdDQUFnQyxFQUNoQyxnQ0FBZ0MsRUFDaEMscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsOEJBQThCLEVBQzlCLGtDQUFrQyxFQUNsQyx1Q0FBdUMsRUFDdkMsK0JBQStCLEVBQy9CLDZCQUE2QixFQUM3Qix1QkFBdUIsRUFDdkIsbUNBQW1DLEVBQ25DLHdCQUF3QixHQUN4QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTlFLDBCQUEwQixDQUN6Qiw4QkFBOEIsQ0FBQyxFQUFFLEVBQ2pDLDhCQUE4QixxREFFOUIsQ0FBQTtBQUVELDBCQUEwQixDQUN6QiwyQkFBMkIsQ0FBQyxFQUFFLEVBQzlCLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMscURBRWhELENBQUE7QUFFRCxvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO0FBQ25ELG9CQUFvQixDQUFDLCtCQUErQixDQUFDLENBQUE7QUFDckQscUJBQXFCLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7QUFDcEQsb0JBQW9CLENBQUMsOEJBQThCLENBQUMsQ0FBQTtBQUNwRCxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO0FBQ3hELG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLENBQUE7QUFDdEQsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtBQUN0RCxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0FBQzVDLG9CQUFvQixDQUFDLG1DQUFtQyxDQUFDLENBQUE7QUFDekQsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUMxQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0FBQzlDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUE7QUFDMUMsZUFBZSxDQUFDLHVDQUF1QyxDQUFDLENBQUE7QUFDeEQsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUUzQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtBQUNwRSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSwrQkFBK0IsRUFBRSxDQUFDLENBQUEifQ==