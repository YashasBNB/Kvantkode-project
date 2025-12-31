/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkspaceTagsService } from '../common/workspaceTags.js';
export class NoOpWorkspaceTagsService {
    getTags() {
        return Promise.resolve({});
    }
    async getTelemetryWorkspaceId(workspace, state) {
        return undefined;
    }
    getHashedRemotesFromUri(workspaceUri, stripEndingDotGit) {
        return Promise.resolve([]);
    }
}
registerSingleton(IWorkspaceTagsService, NoOpWorkspaceTagsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFnc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL2Jyb3dzZXIvd29ya3NwYWNlVGFnc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBUSxNQUFNLDRCQUE0QixDQUFBO0FBRXhFLE1BQU0sT0FBTyx3QkFBd0I7SUFHcEMsT0FBTztRQUNOLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUM1QixTQUFxQixFQUNyQixLQUFxQjtRQUVyQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsdUJBQXVCLENBQUMsWUFBaUIsRUFBRSxpQkFBMkI7UUFDckUsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQSJ9