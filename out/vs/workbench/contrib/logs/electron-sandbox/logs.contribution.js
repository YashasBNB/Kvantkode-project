/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { OpenLogsFolderAction, OpenExtensionLogsFolderAction } from './logsActions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OpenLogsFolderAction.ID,
            title: OpenLogsFolderAction.TITLE,
            category: Categories.Developer,
            f1: true,
        });
    }
    run(servicesAccessor) {
        return servicesAccessor
            .get(IInstantiationService)
            .createInstance(OpenLogsFolderAction, OpenLogsFolderAction.ID, OpenLogsFolderAction.TITLE.value)
            .run();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OpenExtensionLogsFolderAction.ID,
            title: OpenExtensionLogsFolderAction.TITLE,
            category: Categories.Developer,
            f1: true,
        });
    }
    run(servicesAccessor) {
        return servicesAccessor
            .get(IInstantiationService)
            .createInstance(OpenExtensionLogsFolderAction, OpenExtensionLogsFolderAction.ID, OpenExtensionLogsFolderAction.TITLE.value)
            .run();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvZWxlY3Ryb24tc2FuZGJveC9sb2dzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtZQUMzQixLQUFLLEVBQUUsb0JBQW9CLENBQUMsS0FBSztZQUNqQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsR0FBRyxDQUFDLGdCQUFrQztRQUNyQyxPQUFPLGdCQUFnQjthQUNyQixHQUFHLENBQUMscUJBQXFCLENBQUM7YUFDMUIsY0FBYyxDQUNkLG9CQUFvQixFQUNwQixvQkFBb0IsQ0FBQyxFQUFFLEVBQ3ZCLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQ2hDO2FBQ0EsR0FBRyxFQUFFLENBQUE7SUFDUixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QixDQUFDLEVBQUU7WUFDcEMsS0FBSyxFQUFFLDZCQUE2QixDQUFDLEtBQUs7WUFDMUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEdBQUcsQ0FBQyxnQkFBa0M7UUFDckMsT0FBTyxnQkFBZ0I7YUFDckIsR0FBRyxDQUFDLHFCQUFxQixDQUFDO2FBQzFCLGNBQWMsQ0FDZCw2QkFBNkIsRUFDN0IsNkJBQTZCLENBQUMsRUFBRSxFQUNoQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUN6QzthQUNBLEdBQUcsRUFBRSxDQUFBO0lBQ1IsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9