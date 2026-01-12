/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DecreaseHoverVerbosityLevel, GoToBottomHoverAction, GoToTopHoverAction, HideContentHoverAction, IncreaseHoverVerbosityLevel, PageDownHoverAction, PageUpHoverAction, ScrollDownHoverAction, ScrollLeftHoverAction, ScrollRightHoverAction, ScrollUpHoverAction, ShowDefinitionPreviewHoverAction, ShowOrFocusHoverAction, } from './hoverActions.js';
import { registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { editorHoverBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { HoverParticipantRegistry } from './hoverTypes.js';
import { MarkdownHoverParticipant } from './markdownHoverParticipant.js';
import { MarkerHoverParticipant } from './markerHoverParticipant.js';
import { ContentHoverController } from './contentHoverController.js';
import { GlyphHoverController } from './glyphHoverController.js';
import './hover.css';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ExtHoverAccessibleView, HoverAccessibilityHelp, HoverAccessibleView, } from './hoverAccessibleViews.js';
registerEditorContribution(ContentHoverController.ID, ContentHoverController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorContribution(GlyphHoverController.ID, GlyphHoverController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(ShowOrFocusHoverAction);
registerEditorAction(ShowDefinitionPreviewHoverAction);
registerEditorAction(HideContentHoverAction);
registerEditorAction(ScrollUpHoverAction);
registerEditorAction(ScrollDownHoverAction);
registerEditorAction(ScrollLeftHoverAction);
registerEditorAction(ScrollRightHoverAction);
registerEditorAction(PageUpHoverAction);
registerEditorAction(PageDownHoverAction);
registerEditorAction(GoToTopHoverAction);
registerEditorAction(GoToBottomHoverAction);
registerEditorAction(IncreaseHoverVerbosityLevel);
registerEditorAction(DecreaseHoverVerbosityLevel);
HoverParticipantRegistry.register(MarkdownHoverParticipant);
HoverParticipantRegistry.register(MarkerHoverParticipant);
// theming
registerThemingParticipant((theme, collector) => {
    const hoverBorder = theme.getColor(editorHoverBorder);
    if (hoverBorder) {
        collector.addRule(`.monaco-editor .monaco-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
        collector.addRule(`.monaco-editor .monaco-hover hr { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
        collector.addRule(`.monaco-editor .monaco-hover hr { border-bottom: 0px solid ${hoverBorder.transparent(0.5)}; }`);
    }
});
AccessibleViewRegistry.register(new HoverAccessibleView());
AccessibleViewRegistry.register(new HoverAccessibilityHelp());
AccessibleViewRegistry.register(new ExtHoverAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvaG92ZXJDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0QiwyQkFBMkIsRUFDM0IsbUJBQW1CLEVBQ25CLGlCQUFpQixFQUNqQixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0QixtQkFBbUIsRUFDbkIsZ0NBQWdDLEVBQ2hDLHNCQUFzQixHQUN0QixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDN0csT0FBTyxFQUNOLHNCQUFzQixFQUN0QixzQkFBc0IsRUFDdEIsbUJBQW1CLEdBQ25CLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsMEJBQTBCLENBQ3pCLHNCQUFzQixDQUFDLEVBQUUsRUFDekIsc0JBQXNCLGlFQUV0QixDQUFBO0FBQ0QsMEJBQTBCLENBQ3pCLG9CQUFvQixDQUFDLEVBQUUsRUFDdkIsb0JBQW9CLGlFQUVwQixDQUFBO0FBQ0Qsb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUM1QyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0FBQ3RELG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFDNUMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUN6QyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQzNDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQUE7QUFDM0Msb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUM1QyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3ZDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDekMsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtBQUN4QyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQzNDLG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLENBQUE7QUFDakQsb0JBQW9CLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtBQUNqRCx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtBQUMzRCx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtBQUV6RCxVQUFVO0FBQ1YsMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDL0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3JELElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsU0FBUyxDQUFDLE9BQU8sQ0FDaEIsaUdBQWlHLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FDbEksQ0FBQTtRQUNELFNBQVMsQ0FBQyxPQUFPLENBQ2hCLDJEQUEyRCxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQzVGLENBQUE7UUFDRCxTQUFTLENBQUMsT0FBTyxDQUNoQiw4REFBOEQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUMvRixDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0Ysc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFBO0FBQzFELHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQTtBQUM3RCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUEifQ==