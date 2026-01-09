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
