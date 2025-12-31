/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createHash } from 'crypto';
import { Schemas } from '../../../base/common/network.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { originalFSPath } from '../../../base/common/resources.js';
/**
 * Length of workspace identifiers that are not empty. Those are
 * MD5 hashes (128bits / 4 due to hex presentation).
 */
export const NON_EMPTY_WORKSPACE_ID_LENGTH = 128 / 4;
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function getWorkspaceIdentifier(configPath) {
    function getWorkspaceId() {
        let configPathStr = configPath.scheme === Schemas.file ? originalFSPath(configPath) : configPath.toString();
        if (!isLinux) {
            configPathStr = configPathStr.toLowerCase(); // sanitize for platform file system
        }
        return createHash('md5').update(configPathStr).digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
    }
    return {
        id: getWorkspaceId(),
        configPath,
    };
}
export function getSingleFolderWorkspaceIdentifier(folderUri, folderStat) {
    function getFolderId() {
        // Remote: produce a hash from the entire URI
        if (folderUri.scheme !== Schemas.file) {
            return createHash('md5').update(folderUri.toString()).digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
        }
        // Local: we use the ctime as extra salt to the
        // identifier so that folders getting recreated
        // result in a different identifier. However, if
        // the stat is not provided we return `undefined`
        // to ensure identifiers are stable for the given
        // URI.
        if (!folderStat) {
            return undefined;
        }
        let ctime;
        if (isLinux) {
            ctime = folderStat.ino; // Linux: birthtime is ctime, so we cannot use it! We use the ino instead!
        }
        else if (isMacintosh) {
            ctime = folderStat.birthtime.getTime(); // macOS: birthtime is fine to use as is
        }
        else if (isWindows) {
            if (typeof folderStat.birthtimeMs === 'number') {
                ctime = Math.floor(folderStat.birthtimeMs); // Windows: fix precision issue in node.js 8.x to get 7.x results (see https://github.com/nodejs/node/issues/19897)
            }
            else {
                ctime = folderStat.birthtime.getTime();
            }
        }
        return createHash('md5')
            .update(folderUri.fsPath)
            .update(ctime ? String(ctime) : '')
            .digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
    }
    const folderId = getFolderId();
    if (typeof folderId === 'string') {
        return {
            id: folderId,
            uri: folderUri,
        };
    }
    return undefined; // invalid folder
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function createEmptyWorkspaceIdentifier() {
    return {
        id: (Date.now() + Math.round(Math.random() * 1000)).toString(),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvbm9kZS93b3Jrc3BhY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFFbkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVFsRTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO0FBRXBELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQseURBQXlEO0FBRXpELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxVQUFlO0lBQ3JELFNBQVMsY0FBYztRQUN0QixJQUFJLGFBQWEsR0FDaEIsVUFBVSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxhQUFhLEdBQUcsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFBLENBQUMsb0NBQW9DO1FBQ2pGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsc0VBQXNFO0lBQ3BJLENBQUM7SUFFRCxPQUFPO1FBQ04sRUFBRSxFQUFFLGNBQWMsRUFBRTtRQUNwQixVQUFVO0tBQ1YsQ0FBQTtBQUNGLENBQUM7QUFhRCxNQUFNLFVBQVUsa0NBQWtDLENBQ2pELFNBQWMsRUFDZCxVQUFrQjtJQUVsQixTQUFTLFdBQVc7UUFDbkIsNkNBQTZDO1FBQzdDLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkMsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLHNFQUFzRTtRQUMzSSxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLCtDQUErQztRQUMvQyxnREFBZ0Q7UUFDaEQsaURBQWlEO1FBQ2pELGlEQUFpRDtRQUNqRCxPQUFPO1FBRVAsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLEtBQXlCLENBQUE7UUFDN0IsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFBLENBQUMsMEVBQTBFO1FBQ2xHLENBQUM7YUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3hCLEtBQUssR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBLENBQUMsd0NBQXdDO1FBQ2hGLENBQUM7YUFBTSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ3RCLElBQUksT0FBTyxVQUFVLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNoRCxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUEsQ0FBQyxtSEFBbUg7WUFDL0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDO2FBQ3RCLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO2FBQ3hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2FBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLHNFQUFzRTtJQUN2RixDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxFQUFFLENBQUE7SUFDOUIsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPO1lBQ04sRUFBRSxFQUFFLFFBQVE7WUFDWixHQUFHLEVBQUUsU0FBUztTQUNkLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUEsQ0FBQyxpQkFBaUI7QUFDbkMsQ0FBQztBQUVELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQseURBQXlEO0FBRXpELE1BQU0sVUFBVSw4QkFBOEI7SUFDN0MsT0FBTztRQUNOLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtLQUM5RCxDQUFBO0FBQ0YsQ0FBQyJ9