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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9icm93c2VyL3dlYldvcmtlckZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBR04sUUFBUSxFQUlSLDJCQUEyQixFQUUzQiw2QkFBNkIsR0FDN0IsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFDVSxpQkFBWSxHQUNwQjtnRUFDNEM7dUVBQ0ksQ0FBQTtRQUN4Qyw0QkFBdUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3BDLG9CQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQTZDdEMsQ0FBQztJQTNDQSwwQkFBMEI7SUFDMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhO1FBQzNCLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxHQUFHLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNoRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3hCLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1lBQ0QsTUFBTSw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUUsQ0FBQztJQUNGLENBQUM7SUFFRCx1QkFBdUI7SUFDdkIsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFjO1FBQ3hCLE9BQU87WUFDTixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsSUFBSSxFQUFFLENBQUM7WUFDUCxLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssRUFBRSxDQUFDO1NBQ1IsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsU0FBUyxDQUFDLFNBQWMsRUFBRSxRQUFvQixFQUFFLEtBQXdCO1FBQ3ZFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFDRCxPQUFPLENBQUMsU0FBYztRQUNyQixNQUFNLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsS0FBSyxDQUFDLFNBQWM7UUFDbkIsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUNELE1BQU0sQ0FBQyxTQUFjLEVBQUUsS0FBeUI7UUFDL0MsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUNELE1BQU0sQ0FBQyxLQUFVLEVBQUUsR0FBUSxFQUFFLEtBQTRCO1FBQ3hELE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQzlCLENBQUM7Q0FDRCJ9