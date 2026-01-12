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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9iYWNrdXAvbm9kZS9iYWNrdXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBT2pELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFZO0lBQ25ELE1BQU0sU0FBUyxHQUFHLEdBQXlDLENBQUE7SUFFM0QsT0FBTyxPQUFPLFNBQVMsRUFBRSxZQUFZLEtBQUssUUFBUSxDQUFBO0FBQ25ELENBQUM7QUFRRCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLDBCQUF1RDtJQUV2RCxJQUFJLG9CQUFvQixHQUEyQixFQUFFLENBQUE7SUFDckQsSUFBSSxDQUFDO1FBQ0osSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDMUQsb0JBQW9CLEdBQUcsMEJBQTBCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDaEYsU0FBUyxFQUFFO29CQUNWLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRTtvQkFDaEIsVUFBVSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztpQkFDOUM7Z0JBQ0QsZUFBZSxFQUFFLFNBQVMsQ0FBQyxlQUFlO2FBQzFDLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osZ0NBQWdDO0lBQ2pDLENBQUM7SUFFRCxPQUFPLG9CQUFvQixDQUFBO0FBQzVCLENBQUM7QUFPRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLDBCQUF1RDtJQUV2RCxJQUFJLGlCQUFpQixHQUF3QixFQUFFLENBQUE7SUFDL0MsSUFBSSxDQUFDO1FBQ0osSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdkQsaUJBQWlCLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztnQkFDdEMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO2FBQ3ZDLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osZ0NBQWdDO0lBQ2pDLENBQUM7SUFFRCxPQUFPLGlCQUFpQixDQUFBO0FBQ3pCLENBQUMifQ==