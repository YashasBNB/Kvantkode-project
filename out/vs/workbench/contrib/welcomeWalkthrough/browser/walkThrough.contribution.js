/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { WalkThroughInput } from './walkThroughInput.js';
import { WalkThroughPart } from './walkThroughPart.js';
import { WalkThroughArrowUp, WalkThroughArrowDown, WalkThroughPageUp, WalkThroughPageDown, } from './walkThroughActions.js';
import { WalkThroughSnippetContentProvider } from '../common/walkThroughContentProvider.js';
import { EditorWalkThroughAction, EditorWalkThroughInputSerializer, } from './editor/editorWalkThrough.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions } from '../../../common/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { MenuRegistry, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(WalkThroughPart, WalkThroughPart.ID, localize('walkThrough.editor.label', 'Playground')), [new SyncDescriptor(WalkThroughInput)]);
registerAction2(EditorWalkThroughAction);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(EditorWalkThroughInputSerializer.ID, EditorWalkThroughInputSerializer);
registerWorkbenchContribution2(WalkThroughSnippetContentProvider.ID, WalkThroughSnippetContentProvider, { editorTypeId: WalkThroughPart.ID });
KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughArrowUp);
KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughArrowDown);
KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughPageUp);
KeybindingsRegistry.registerCommandAndKeybindingRule(WalkThroughPageDown);
MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
    group: '1_welcome',
    command: {
        id: 'workbench.action.showInteractivePlayground',
        title: localize({ key: 'miPlayground', comment: ['&& denotes a mnemonic'] }, 'Editor Playgrou&&nd'),
    },
    order: 3,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2guY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVdhbGt0aHJvdWdoL2Jyb3dzZXIvd2Fsa1Rocm91Z2guY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLG1CQUFtQixHQUNuQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNGLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsZ0NBQWdDLEdBQ2hDLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUF1QixvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRW5HLFFBQVEsQ0FBQyxFQUFFLENBQXNCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLGtCQUFrQixDQUMvRSxvQkFBb0IsQ0FBQyxNQUFNLENBQzFCLGVBQWUsRUFDZixlQUFlLENBQUMsRUFBRSxFQUNsQixRQUFRLENBQUMsMEJBQTBCLEVBQUUsWUFBWSxDQUFDLENBQ2xELEVBQ0QsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQ3RDLENBQUE7QUFFRCxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtBQUV4QyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyx3QkFBd0IsQ0FDM0YsZ0NBQWdDLENBQUMsRUFBRSxFQUNuQyxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQUVELDhCQUE4QixDQUM3QixpQ0FBaUMsQ0FBQyxFQUFFLEVBQ3BDLGlDQUFpQyxFQUNqQyxFQUFFLFlBQVksRUFBRSxlQUFlLENBQUMsRUFBRSxFQUFFLENBQ3BDLENBQUE7QUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0FBRXhFLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDLG9CQUFvQixDQUFDLENBQUE7QUFFMUUsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUV2RSxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBRXpFLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxLQUFLLEVBQUUsV0FBVztJQUNsQixPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsNENBQTRDO1FBQ2hELEtBQUssRUFBRSxRQUFRLENBQ2QsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDM0QscUJBQXFCLENBQ3JCO0tBQ0Q7SUFDRCxLQUFLLEVBQUUsQ0FBQztDQUNSLENBQUMsQ0FBQSJ9