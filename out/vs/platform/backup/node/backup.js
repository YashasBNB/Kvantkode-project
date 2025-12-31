/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export function isEmptyWindowBackupInfo(obj) {
    const candidate = obj;
    return typeof candidate?.backupFolder === 'string';
}
export function deserializeWorkspaceInfos(serializedBackupWorkspaces) {
    let workspaceBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.workspaces)) {
            workspaceBackupInfos = serializedBackupWorkspaces.workspaces.map((workspace) => ({
                workspace: {
                    id: workspace.id,
                    configPath: URI.parse(workspace.configURIPath),
                },
                remoteAuthority: workspace.remoteAuthority,
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return workspaceBackupInfos;
}
export function deserializeFolderInfos(serializedBackupWorkspaces) {
    let folderBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.folders)) {
            folderBackupInfos = serializedBackupWorkspaces.folders.map((folder) => ({
                folderUri: URI.parse(folder.folderUri),
                remoteAuthority: folder.remoteAuthority,
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return folderBackupInfos;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYmFja3VwL25vZGUvYmFja3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQU9qRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsR0FBWTtJQUNuRCxNQUFNLFNBQVMsR0FBRyxHQUF5QyxDQUFBO0lBRTNELE9BQU8sT0FBTyxTQUFTLEVBQUUsWUFBWSxLQUFLLFFBQVEsQ0FBQTtBQUNuRCxDQUFDO0FBUUQsTUFBTSxVQUFVLHlCQUF5QixDQUN4QywwQkFBdUQ7SUFFdkQsSUFBSSxvQkFBb0IsR0FBMkIsRUFBRSxDQUFBO0lBQ3JELElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzFELG9CQUFvQixHQUFHLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hGLFNBQVMsRUFBRTtvQkFDVixFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUM7aUJBQzlDO2dCQUNELGVBQWUsRUFBRSxTQUFTLENBQUMsZUFBZTthQUMxQyxDQUFDLENBQUMsQ0FBQTtRQUNKLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLGdDQUFnQztJQUNqQyxDQUFDO0lBRUQsT0FBTyxvQkFBb0IsQ0FBQTtBQUM1QixDQUFDO0FBT0QsTUFBTSxVQUFVLHNCQUFzQixDQUNyQywwQkFBdUQ7SUFFdkQsSUFBSSxpQkFBaUIsR0FBd0IsRUFBRSxDQUFBO0lBQy9DLElBQUksQ0FBQztRQUNKLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZELGlCQUFpQixHQUFHLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZFLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ3RDLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTthQUN2QyxDQUFDLENBQUMsQ0FBQTtRQUNKLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLGdDQUFnQztJQUNqQyxDQUFDO0lBRUQsT0FBTyxpQkFBaUIsQ0FBQTtBQUN6QixDQUFDIn0=