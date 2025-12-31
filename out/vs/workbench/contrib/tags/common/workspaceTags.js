/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getRemotes } from '../../../../platform/extensionManagement/common/configRemotes.js';
export const IWorkspaceTagsService = createDecorator('workspaceTagsService');
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false, sha1Hex) {
    return Promise.all(getRemotes(text, stripEndingDotGit).map((remote) => sha1Hex(remote)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RhZ3MvY29tbW9uL3dvcmtzcGFjZVRhZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUk3RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFnQm5HLE1BQU0sQ0FBQyxLQUFLLFVBQVUsMEJBQTBCLENBQy9DLElBQVksRUFDWixvQkFBNkIsS0FBSyxFQUNsQyxPQUF5QztJQUV6QyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN6RixDQUFDIn0=