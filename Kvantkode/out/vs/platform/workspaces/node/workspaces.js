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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy9ub2RlL3dvcmtzcGFjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUVuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUWxFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUE7QUFFcEQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFFekQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFVBQWU7SUFDckQsU0FBUyxjQUFjO1FBQ3RCLElBQUksYUFBYSxHQUNoQixVQUFVLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLGFBQWEsR0FBRyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQyxvQ0FBb0M7UUFDakYsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxzRUFBc0U7SUFDcEksQ0FBQztJQUVELE9BQU87UUFDTixFQUFFLEVBQUUsY0FBYyxFQUFFO1FBQ3BCLFVBQVU7S0FDVixDQUFBO0FBQ0YsQ0FBQztBQWFELE1BQU0sVUFBVSxrQ0FBa0MsQ0FDakQsU0FBYyxFQUNkLFVBQWtCO0lBRWxCLFNBQVMsV0FBVztRQUNuQiw2Q0FBNkM7UUFDN0MsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN2QyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsc0VBQXNFO1FBQzNJLENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsK0NBQStDO1FBQy9DLGdEQUFnRDtRQUNoRCxpREFBaUQ7UUFDakQsaURBQWlEO1FBQ2pELE9BQU87UUFFUCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksS0FBeUIsQ0FBQTtRQUM3QixJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUEsQ0FBQywwRUFBMEU7UUFDbEcsQ0FBQzthQUFNLElBQUksV0FBVyxFQUFFLENBQUM7WUFDeEIsS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyx3Q0FBd0M7UUFDaEYsQ0FBQzthQUFNLElBQUksU0FBUyxFQUFFLENBQUM7WUFDdEIsSUFBSSxPQUFPLFVBQVUsQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2hELEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQSxDQUFDLG1IQUFtSDtZQUMvSixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUM7YUFDdEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7YUFDeEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDbEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsc0VBQXNFO0lBQ3ZGLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQTtJQUM5QixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2xDLE9BQU87WUFDTixFQUFFLEVBQUUsUUFBUTtZQUNaLEdBQUcsRUFBRSxTQUFTO1NBQ2QsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQSxDQUFDLGlCQUFpQjtBQUNuQyxDQUFDO0FBRUQseURBQXlEO0FBQ3pELHlEQUF5RDtBQUN6RCx5REFBeUQ7QUFFekQsTUFBTSxVQUFVLDhCQUE4QjtJQUM3QyxPQUFPO1FBQ04sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO0tBQzlELENBQUE7QUFDRixDQUFDIn0=