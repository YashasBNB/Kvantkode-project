/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Schemas } from '../../../../base/common/network.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ExtensionsLocalizedLabel, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export class OpenExtensionsFolderAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.openExtensionsFolder',
            title: localize2('openExtensionsFolder', 'Open Extensions Folder'),
            category: ExtensionsLocalizedLabel,
            f1: true,
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const fileService = accessor.get(IFileService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        const extensionsHome = URI.file(environmentService.extensionsPath);
        const file = await fileService.resolve(extensionsHome);
        let itemToShow;
        if (file.children && file.children.length > 0) {
            itemToShow = file.children[0].resource;
        }
        else {
            itemToShow = extensionsHome;
        }
        if (itemToShow.scheme === Schemas.file) {
            return nativeHostService.showItemInFolder(itemToShow.fsPath);
        }
    }
}
export class CleanUpExtensionsFolderAction extends Action2 {
    constructor() {
        super({
            id: '_workbench.extensions.action.cleanUpExtensionsFolder',
            title: localize2('cleanUpExtensionsFolder', 'Cleanup Extensions Folder'),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const extensionManagementService = accessor.get(IExtensionManagementService);
        return extensionManagementService.cleanUp();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV4RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUMzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUV6RixNQUFNLE9BQU8sMEJBQTJCLFNBQVEsT0FBTztJQUN0RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrREFBa0Q7WUFDdEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQztZQUNsRSxRQUFRLEVBQUUsd0JBQXdCO1lBQ2xDLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQTtRQUUzRSxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUV0RCxJQUFJLFVBQWUsQ0FBQTtRQUNuQixJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0MsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ3ZDLENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVSxHQUFHLGNBQWMsQ0FBQTtRQUM1QixDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4QyxPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLE9BQU87SUFDekQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0RBQXNEO1lBQzFELEtBQUssRUFBRSxTQUFTLENBQUMseUJBQXlCLEVBQUUsMkJBQTJCLENBQUM7WUFDeEUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDNUUsT0FBTywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QifQ==