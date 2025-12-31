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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2Fsa1Rocm91Z2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lV2Fsa3Rocm91Z2gvYnJvd3Nlci9lZGl0b3IvZWRpdG9yV2Fsa1Rocm91Z2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMkIsTUFBTSx3QkFBd0IsQ0FBQTtBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdkYsMEJBQTBCLENBQUMsZ0JBQWdCLENBQzFDLG1GQUFtRixFQUNuRixPQUFPLENBQ1AsQ0FBQTtBQUVELE1BQU0sTUFBTSxHQUFHLG9DQUFvQyxDQUFBO0FBQ25ELE1BQU0sWUFBWSxHQUE0QjtJQUM3QyxNQUFNO0lBQ04sSUFBSSxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtQkFBbUIsQ0FBQztJQUM5RCxRQUFRLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FDaEMsc0ZBQXNGLENBQ3RGLENBQUMsSUFBSSxDQUFDO1FBQ04sTUFBTSxFQUFFLE9BQU8sQ0FBQyxXQUFXO1FBQzNCLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3JCLFFBQVEsRUFBRSxtRkFBbUY7U0FDN0YsQ0FBQztLQUNGLENBQUM7SUFDRixhQUFhLEVBQUUsYUFBYTtDQUM1QixDQUFBO0FBRUQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLE9BQU87YUFDNUIsT0FBRSxHQUFHLDRDQUE0QyxDQUFBO2FBQ2pELFVBQUssR0FBRyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsK0JBQStCLENBQUMsQ0FBQTtJQUU5RjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFO1lBQzlCLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxLQUFLO1lBQ3BDLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUNyQiwyQkFBMkIsRUFDM0IsZ0VBQWdFLENBQ2hFO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRWUsR0FBRyxDQUFDLGVBQWlDO1FBQ3BELE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDekQsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDdkUsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2pGLHlDQUF5QztRQUN6QyxPQUFPLGFBQWEsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQzs7QUFHRixNQUFNLE9BQU8sZ0NBQWdDO2FBQzVCLE9BQUUsR0FBRyxNQUFNLENBQUE7SUFFcEIsWUFBWSxDQUFDLFdBQXdCO1FBQzNDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVNLFNBQVMsQ0FBQyxXQUF3QjtRQUN4QyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTSxXQUFXLENBQUMsb0JBQTJDO1FBQzdELE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzNFLENBQUMifQ==