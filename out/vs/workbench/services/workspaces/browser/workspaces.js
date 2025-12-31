/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hash } from '../../../../base/common/hash.js';
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getWorkspaceIdentifier(workspaceUri) {
    return {
        id: getWorkspaceId(workspaceUri),
        configPath: workspaceUri,
    };
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getSingleFolderWorkspaceIdentifier(folderUri) {
    return {
        id: getWorkspaceId(folderUri),
        uri: folderUri,
    };
}
function getWorkspaceId(uri) {
    return hash(uri.toString()).toString(16);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2Jyb3dzZXIvd29ya3NwYWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdEQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFFekQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFlBQWlCO0lBQ3ZELE9BQU87UUFDTixFQUFFLEVBQUUsY0FBYyxDQUFDLFlBQVksQ0FBQztRQUNoQyxVQUFVLEVBQUUsWUFBWTtLQUN4QixDQUFBO0FBQ0YsQ0FBQztBQUVELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQseURBQXlEO0FBRXpELE1BQU0sVUFBVSxrQ0FBa0MsQ0FDakQsU0FBYztJQUVkLE9BQU87UUFDTixFQUFFLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQztRQUM3QixHQUFHLEVBQUUsU0FBUztLQUNkLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsR0FBUTtJQUMvQixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDekMsQ0FBQyJ9