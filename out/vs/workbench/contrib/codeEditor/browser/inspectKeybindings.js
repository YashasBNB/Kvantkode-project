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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEtleWJpbmRpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2luc3BlY3RLZXliaW5kaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE1BQU0sYUFBYyxTQUFRLE9BQU87SUFDbEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDO1lBQ3pDLEtBQUssRUFBRSxTQUFTLENBQUMsZ0NBQWdDLEVBQUUsc0JBQXNCLENBQUM7WUFDMUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ2xELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFbEQsYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUN4QixRQUFRLEVBQUUsU0FBUztZQUNuQixRQUFRLEVBQUUsaUJBQWlCLENBQUMsY0FBYyxFQUFFO1lBQzVDLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7U0FDekIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBRTlCLE1BQU0saUJBQWtCLFNBQVEsT0FBTztJQUN0QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5Q0FBeUM7WUFDN0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQ0FBb0MsRUFBRSw2QkFBNkIsQ0FBQztZQUNyRixRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFELE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQztZQUM5QixRQUFRLEVBQUUsU0FBUztZQUNuQixRQUFRLEVBQUUsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUU7WUFDaEQsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtTQUN6QixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQSJ9