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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlydHVhbFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZS9jb21tb24vdmlydHVhbFdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFJekQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFFBQWE7SUFDOUMsT0FBTyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFBO0FBQ3BGLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLFNBQXFCO0lBRXJCLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QixPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUQsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztZQUMxQixDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztTQUFNLElBQUksU0FBUyxDQUFDLGFBQWEsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUNsRixPQUFPLFNBQVMsQ0FBQyxhQUFhLENBQUE7SUFDL0IsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsU0FBcUI7SUFDOUQsT0FBTywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUE7QUFDdEQsQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxTQUFxQjtJQUNqRSxPQUFPLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQTtBQUN6RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFNBQXFCO0lBQ3ZELE9BQU8sMkJBQTJCLENBQUMsU0FBUyxDQUFDLEtBQUssU0FBUyxDQUFBO0FBQzVELENBQUMifQ==