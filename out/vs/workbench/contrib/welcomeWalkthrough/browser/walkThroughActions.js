/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { WalkThroughPart, WALK_THROUGH_FOCUS } from './walkThroughPart.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export const WalkThroughArrowUp = {
    id: 'workbench.action.interactivePlayground.arrowUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 16 /* KeyCode.UpArrow */,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.arrowUp();
        }
    },
};
export const WalkThroughArrowDown = {
    id: 'workbench.action.interactivePlayground.arrowDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 18 /* KeyCode.DownArrow */,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.arrowDown();
        }
    },
};
export const WalkThroughPageUp = {
    id: 'workbench.action.interactivePlayground.pageUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 11 /* KeyCode.PageUp */,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.pageUp();
        }
    },
};
export const WalkThroughPageDown = {
    id: 'workbench.action.interactivePlayground.pageDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WALK_THROUGH_FOCUS, EditorContextKeys.editorTextFocus.toNegated()),
    primary: 12 /* KeyCode.PageDown */,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane instanceof WalkThroughPart) {
            activeEditorPane.pageDown();
        }
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVdhbGt0aHJvdWdoL2Jyb3dzZXIvd2Fsa1Rocm91Z2hBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFLMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3JGLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUE4QjtJQUM1RCxFQUFFLEVBQUUsZ0RBQWdEO0lBQ3BELE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMzRixPQUFPLDBCQUFpQjtJQUN4QixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFBO1FBQ3ZELElBQUksZ0JBQWdCLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDakQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQThCO0lBQzlELEVBQUUsRUFBRSxrREFBa0Q7SUFDdEQsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzNGLE9BQU8sNEJBQW1CO0lBQzFCLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3JCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7UUFDdkQsSUFBSSxnQkFBZ0IsWUFBWSxlQUFlLEVBQUUsQ0FBQztZQUNqRCxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBOEI7SUFDM0QsRUFBRSxFQUFFLCtDQUErQztJQUNuRCxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDM0YsT0FBTyx5QkFBZ0I7SUFDdkIsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDckIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN2RCxJQUFJLGdCQUFnQixZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ2pELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUE4QjtJQUM3RCxFQUFFLEVBQUUsaURBQWlEO0lBQ3JELE1BQU0sNkNBQW1DO0lBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMzRixPQUFPLDJCQUFrQjtJQUN6QixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtRQUNyQixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFBO1FBQ3ZELElBQUksZ0JBQWdCLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDakQsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBIn0=