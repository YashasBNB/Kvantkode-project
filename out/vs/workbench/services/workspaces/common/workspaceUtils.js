/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
export function isChatTransferredWorkspace(workspace, storageService) {
    const workspaceUri = workspace.folders[0]?.uri;
    if (!workspaceUri) {
        return false;
    }
    const chatWorkspaceTransfer = storageService.getObject('chat.workspaceTransfer', 0 /* StorageScope.PROFILE */, []);
    const toWorkspace = chatWorkspaceTransfer.map((item) => {
        return { toWorkspace: URI.from(item.toWorkspace) };
    });
    return toWorkspace.some((item) => item.toWorkspace.toString() === workspaceUri.toString());
}
export async function areWorkspaceFoldersEmpty(workspace, fileService) {
    for (const folder of workspace.folders) {
        const folderStat = await fileService.resolve(folder.uri);
        if (folderStat.children && folderStat.children.length > 0) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2NvbW1vbi93b3Jrc3BhY2VVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFLcEQsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxTQUFxQixFQUNyQixjQUErQjtJQUUvQixNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQTtJQUM5QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDbkIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUNyRCx3QkFBd0IsZ0NBRXhCLEVBQUUsQ0FDRixDQUFBO0lBQ0QsTUFBTSxXQUFXLEdBQTJCLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO1FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtBQUMzRixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSx3QkFBd0IsQ0FDN0MsU0FBcUIsRUFDckIsV0FBeUI7SUFFekIsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4RCxJQUFJLFVBQVUsQ0FBQyxRQUFRLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDM0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9