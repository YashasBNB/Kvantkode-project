/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileType, FileSystemProviderErrorCode, createFileSystemProviderError, } from '../../../../platform/files/common/files.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NotSupportedError } from '../../../../base/common/errors.js';
export class FetchFileSystemProvider {
    constructor() {
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ +
            2 /* FileSystemProviderCapabilities.FileReadWrite */ +
            1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    // working implementations
    async readFile(resource) {
        try {
            const res = await fetch(resource.toString(true));
            if (res.status === 200) {
                return new Uint8Array(await res.arrayBuffer());
            }
            throw createFileSystemProviderError(res.statusText, FileSystemProviderErrorCode.Unknown);
        }
        catch (err) {
            throw createFileSystemProviderError(err, FileSystemProviderErrorCode.Unknown);
        }
    }
    // fake implementations
    async stat(_resource) {
        return {
            type: FileType.File,
            size: 0,
            mtime: 0,
            ctime: 0,
        };
    }
    watch() {
        return Disposable.None;
    }
    // error implementations
    writeFile(_resource, _content, _opts) {
        throw new NotSupportedError();
    }
    readdir(_resource) {
        throw new NotSupportedError();
    }
    mkdir(_resource) {
        throw new NotSupportedError();
    }
    delete(_resource, _opts) {
        throw new NotSupportedError();
    }
    rename(_from, _to, _opts) {
        throw new NotSupportedError();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvYnJvd3Nlci93ZWJXb3JrZXJGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLFFBQVEsRUFJUiwyQkFBMkIsRUFFM0IsNkJBQTZCLEdBQzdCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBQ1UsaUJBQVksR0FDcEI7Z0VBQzRDO3VFQUNJLENBQUE7UUFDeEMsNEJBQXVCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNwQyxvQkFBZSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUE2Q3RDLENBQUM7SUEzQ0EsMEJBQTBCO0lBQzFCLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBYTtRQUMzQixJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDaEQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUN4QixPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDL0MsQ0FBQztZQUNELE1BQU0sNkJBQTZCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6RixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE1BQU0sNkJBQTZCLENBQUMsR0FBRyxFQUFFLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzlFLENBQUM7SUFDRixDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBYztRQUN4QixPQUFPO1lBQ04sSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ25CLElBQUksRUFBRSxDQUFDO1lBQ1AsS0FBSyxFQUFFLENBQUM7WUFDUixLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQsd0JBQXdCO0lBQ3hCLFNBQVMsQ0FBQyxTQUFjLEVBQUUsUUFBb0IsRUFBRSxLQUF3QjtRQUN2RSxNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsT0FBTyxDQUFDLFNBQWM7UUFDckIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUNELEtBQUssQ0FBQyxTQUFjO1FBQ25CLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFDRCxNQUFNLENBQUMsU0FBYyxFQUFFLEtBQXlCO1FBQy9DLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFDRCxNQUFNLENBQUMsS0FBVSxFQUFFLEdBQVEsRUFBRSxLQUE0QjtRQUN4RCxNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0NBQ0QifQ==