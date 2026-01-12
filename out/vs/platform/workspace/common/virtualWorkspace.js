/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
export function isVirtualResource(resource) {
    return resource.scheme !== Schemas.file && resource.scheme !== Schemas.vscodeRemote;
}
export function getVirtualWorkspaceLocation(workspace) {
    if (workspace.folders.length) {
        return workspace.folders.every((f) => isVirtualResource(f.uri))
            ? workspace.folders[0].uri
            : undefined;
    }
    else if (workspace.configuration && isVirtualResource(workspace.configuration)) {
        return workspace.configuration;
    }
    return undefined;
}
export function getVirtualWorkspaceScheme(workspace) {
    return getVirtualWorkspaceLocation(workspace)?.scheme;
}
export function getVirtualWorkspaceAuthority(workspace) {
    return getVirtualWorkspaceLocation(workspace)?.authority;
}
export function isVirtualWorkspace(workspace) {
    return getVirtualWorkspaceLocation(workspace) !== undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlydHVhbFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlL2NvbW1vbi92aXJ0dWFsV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUl6RCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsUUFBYTtJQUM5QyxPQUFPLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUE7QUFDcEYsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsU0FBcUI7SUFFckIsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzlCLE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RCxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1lBQzFCLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO1NBQU0sSUFBSSxTQUFTLENBQUMsYUFBYSxJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1FBQ2xGLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQTtJQUMvQixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxTQUFxQjtJQUM5RCxPQUFPLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQTtBQUN0RCxDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLFNBQXFCO0lBQ2pFLE9BQU8sMkJBQTJCLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxDQUFBO0FBQ3pELENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsU0FBcUI7SUFDdkQsT0FBTywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsS0FBSyxTQUFTLENBQUE7QUFDNUQsQ0FBQyJ9