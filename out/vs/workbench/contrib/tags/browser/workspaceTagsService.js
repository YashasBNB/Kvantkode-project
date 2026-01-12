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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFnc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RhZ3MvYnJvd3Nlci93b3Jrc3BhY2VUYWdzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFRLE1BQU0sNEJBQTRCLENBQUE7QUFFeEUsTUFBTSxPQUFPLHdCQUF3QjtJQUdwQyxPQUFPO1FBQ04sT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQzVCLFNBQXFCLEVBQ3JCLEtBQXFCO1FBRXJCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxZQUFpQixFQUFFLGlCQUEyQjtRQUNyRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLG9DQUE0QixDQUFBIn0=