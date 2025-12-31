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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2hvdmVyQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IscUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixzQkFBc0IsRUFDdEIsMkJBQTJCLEVBQzNCLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIscUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixzQkFBc0IsRUFDdEIsbUJBQW1CLEVBQ25CLGdDQUFnQyxFQUNoQyxzQkFBc0IsR0FDdEIsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2hFLE9BQU8sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzdHLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsc0JBQXNCLEVBQ3RCLG1CQUFtQixHQUNuQixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLDBCQUEwQixDQUN6QixzQkFBc0IsQ0FBQyxFQUFFLEVBQ3pCLHNCQUFzQixpRUFFdEIsQ0FBQTtBQUNELDBCQUEwQixDQUN6QixvQkFBb0IsQ0FBQyxFQUFFLEVBQ3ZCLG9CQUFvQixpRUFFcEIsQ0FBQTtBQUNELG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFDNUMsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtBQUN0RCxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0FBQzVDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDekMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0FBQzNDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFDNUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUN2QyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3pDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLENBQUE7QUFDeEMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUMzQyxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0FBQ2pELG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLENBQUE7QUFDakQsd0JBQXdCLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLENBQUE7QUFDM0Qsd0JBQXdCLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFFekQsVUFBVTtBQUNWLDBCQUEwQixDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQy9DLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNyRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLFNBQVMsQ0FBQyxPQUFPLENBQ2hCLGlHQUFpRyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQ2xJLENBQUE7UUFDRCxTQUFTLENBQUMsT0FBTyxDQUNoQiwyREFBMkQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUM1RixDQUFBO1FBQ0QsU0FBUyxDQUFDLE9BQU8sQ0FDaEIsOERBQThELFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FDL0YsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUNGLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUMsQ0FBQTtBQUMxRCxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUE7QUFDN0Qsc0JBQXNCLENBQUMsUUFBUSxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFBIn0=