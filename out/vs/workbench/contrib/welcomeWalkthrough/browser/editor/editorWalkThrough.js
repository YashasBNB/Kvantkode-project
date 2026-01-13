/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import content from './vs_code_editor_walkthrough.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { WalkThroughInput } from '../walkThroughInput.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { walkThroughContentRegistry } from '../../common/walkThroughContentProvider.js';
walkThroughContentRegistry.registerProvider('vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough', content);
const typeId = 'workbench.editors.walkThroughInput';
const inputOptions = {
    typeId,
    name: localize('editorWalkThrough.title', 'Editor Playground'),
    resource: FileAccess.asBrowserUri('vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough.md').with({
        scheme: Schemas.walkThrough,
        query: JSON.stringify({
            moduleId: 'vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough',
        }),
    }),
    telemetryFrom: 'walkThrough',
};
export class EditorWalkThroughAction extends Action2 {
    static { this.ID = 'workbench.action.showInteractivePlayground'; }
    static { this.LABEL = localize2('editorWalkThrough', 'Interactive Editor Playground'); }
    constructor() {
        super({
            id: EditorWalkThroughAction.ID,
            title: EditorWalkThroughAction.LABEL,
            category: Categories.Help,
            f1: true,
            metadata: {
                description: localize2('editorWalkThroughMetadata', 'Opens an interactive playground for learning about the editor.'),
            },
        });
    }
    run(serviceAccessor) {
        const editorService = serviceAccessor.get(IEditorService);
        const instantiationService = serviceAccessor.get(IInstantiationService);
        const input = instantiationService.createInstance(WalkThroughInput, inputOptions);
        // TODO @lramos15 adopt the resolver here
        return editorService.openEditor(input, { pinned: true }).then(() => void 0);
    }
}
export class EditorWalkThroughInputSerializer {
    static { this.ID = typeId; }
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(WalkThroughInput, inputOptions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2Fsa1Rocm91Z2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVXYWxrdGhyb3VnaC9icm93c2VyL2VkaXRvci9lZGl0b3JXYWxrVGhyb3VnaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUEyQixNQUFNLHdCQUF3QixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUV2RiwwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FDMUMsbUZBQW1GLEVBQ25GLE9BQU8sQ0FDUCxDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcsb0NBQW9DLENBQUE7QUFDbkQsTUFBTSxZQUFZLEdBQTRCO0lBQzdDLE1BQU07SUFDTixJQUFJLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLG1CQUFtQixDQUFDO0lBQzlELFFBQVEsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUNoQyxzRkFBc0YsQ0FDdEYsQ0FBQyxJQUFJLENBQUM7UUFDTixNQUFNLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckIsUUFBUSxFQUFFLG1GQUFtRjtTQUM3RixDQUFDO0tBQ0YsQ0FBQztJQUNGLGFBQWEsRUFBRSxhQUFhO0NBQzVCLENBQUE7QUFFRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsT0FBTzthQUM1QixPQUFFLEdBQUcsNENBQTRDLENBQUE7YUFDakQsVUFBSyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSwrQkFBK0IsQ0FBQyxDQUFBO0lBRTlGO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QixDQUFDLEVBQUU7WUFDOUIsS0FBSyxFQUFFLHVCQUF1QixDQUFDLEtBQUs7WUFDcEMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQ3JCLDJCQUEyQixFQUMzQixnRUFBZ0UsQ0FDaEU7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFZSxHQUFHLENBQUMsZUFBaUM7UUFDcEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN6RCxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN2RSxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDakYseUNBQXlDO1FBQ3pDLE9BQU8sYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM1RSxDQUFDOztBQUdGLE1BQU0sT0FBTyxnQ0FBZ0M7YUFDNUIsT0FBRSxHQUFHLE1BQU0sQ0FBQTtJQUVwQixZQUFZLENBQUMsV0FBd0I7UUFDM0MsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sU0FBUyxDQUFDLFdBQXdCO1FBQ3hDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVNLFdBQVcsQ0FBQyxvQkFBMkM7UUFDN0QsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDM0UsQ0FBQyJ9