/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { DefaultDropProvidersFeature } from './defaultProviders.js';
import { DropIntoEditorController, changeDropTypeCommandId, dropWidgetVisibleCtx, } from './dropIntoEditorController.js';
registerEditorContribution(DropIntoEditorController.ID, DropIntoEditorController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorFeature(DefaultDropProvidersFeature);
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: changeDropTypeCommandId,
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            },
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.changeDropType();
    }
})());
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hideDropWidget',
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.clearWidgets();
    }
})());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2Ryb3BJbnRvRWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFDTixhQUFhLEVBR2IscUJBQXFCLEVBQ3JCLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ25FLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLCtCQUErQixDQUFBO0FBRXRDLDBCQUEwQixDQUN6Qix3QkFBd0IsQ0FBQyxFQUFFLEVBQzNCLHdCQUF3QixpRUFFeEIsQ0FBQTtBQUNELHFCQUFxQixDQUFDLDJCQUEyQixDQUFDLENBQUE7QUFFbEQscUJBQXFCLENBQ3BCLElBQUksQ0FBQyxLQUFNLFNBQVEsYUFBYTtJQUMvQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLE9BQU8sRUFBRSxtREFBK0I7YUFDeEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRWUsZ0JBQWdCLENBQy9CLFNBQWtDLEVBQ2xDLE1BQW1CLEVBQ25CLEtBQVU7UUFFVix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQUE7SUFDdkQsQ0FBQztDQUNELENBQUMsRUFBRSxDQUNKLENBQUE7QUFFRCxxQkFBcUIsQ0FDcEIsSUFBSSxDQUFDLEtBQU0sU0FBUSxhQUFhO0lBQy9CO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QjtZQUMzQixZQUFZLEVBQUUsb0JBQW9CO1lBQ2xDLE1BQU0sRUFBRTtnQkFDUCxNQUFNLDBDQUFnQztnQkFDdEMsT0FBTyx3QkFBZ0I7YUFDdkI7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRWUsZ0JBQWdCLENBQy9CLFNBQWtDLEVBQ2xDLE1BQW1CLEVBQ25CLEtBQVU7UUFFVix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUE7SUFDckQsQ0FBQztDQUNELENBQUMsRUFBRSxDQUNKLENBQUEifQ==