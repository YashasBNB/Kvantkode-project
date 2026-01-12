/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
class InspectKeyMap extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectKeyMappings',
            title: localize2('workbench.action.inspectKeyMap', 'Inspect Key Mappings'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor, editor) {
        const keybindingService = accessor.get(IKeybindingService);
        const editorService = accessor.get(IEditorService);
        editorService.openEditor({
            resource: undefined,
            contents: keybindingService._dumpDebugInfo(),
            options: { pinned: true },
        });
    }
}
registerAction2(InspectKeyMap);
class InspectKeyMapJSON extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.inspectKeyMappingsJSON',
            title: localize2('workbench.action.inspectKeyMapJSON', 'Inspect Key Mappings (JSON)'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const keybindingService = accessor.get(IKeybindingService);
        await editorService.openEditor({
            resource: undefined,
            contents: keybindingService._dumpDebugInfoJSON(),
            options: { pinned: true },
        });
    }
}
registerAction2(InspectKeyMapJSON);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEtleWJpbmRpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvaW5zcGVjdEtleWJpbmRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUc5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFekYsTUFBTSxhQUFjLFNBQVEsT0FBTztJQUNsQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQ0FBcUM7WUFDekMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxzQkFBc0IsQ0FBQztZQUMxRSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQ3hCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUU7WUFDNUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtTQUN6QixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUE7QUFFOUIsTUFBTSxpQkFBa0IsU0FBUSxPQUFPO0lBQ3RDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlDQUF5QztZQUM3QyxLQUFLLEVBQUUsU0FBUyxDQUFDLG9DQUFvQyxFQUFFLDZCQUE2QixDQUFDO1lBQ3JGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQzVDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQzlCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRTtZQUNoRCxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO1NBQ3pCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBIn0=