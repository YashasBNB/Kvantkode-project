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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ncy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2VsZWN0cm9uLXNhbmRib3gvbG9ncy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7WUFDM0IsS0FBSyxFQUFFLG9CQUFvQixDQUFDLEtBQUs7WUFDakMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEdBQUcsQ0FBQyxnQkFBa0M7UUFDckMsT0FBTyxnQkFBZ0I7YUFDckIsR0FBRyxDQUFDLHFCQUFxQixDQUFDO2FBQzFCLGNBQWMsQ0FDZCxvQkFBb0IsRUFDcEIsb0JBQW9CLENBQUMsRUFBRSxFQUN2QixvQkFBb0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUNoQzthQUNBLEdBQUcsRUFBRSxDQUFBO0lBQ1IsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkIsQ0FBQyxFQUFFO1lBQ3BDLEtBQUssRUFBRSw2QkFBNkIsQ0FBQyxLQUFLO1lBQzFDLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxHQUFHLENBQUMsZ0JBQWtDO1FBQ3JDLE9BQU8sZ0JBQWdCO2FBQ3JCLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQzthQUMxQixjQUFjLENBQ2QsNkJBQTZCLEVBQzdCLDZCQUE2QixDQUFDLEVBQUUsRUFDaEMsNkJBQTZCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FDekM7YUFDQSxHQUFHLEVBQUUsQ0FBQTtJQUNSLENBQUM7Q0FDRCxDQUNELENBQUEifQ==