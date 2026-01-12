/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { shell } from 'electron';
import { localize } from '../../../nls.js';
import { isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, } from '../common/files.js';
import { basename, normalize } from '../../../base/common/path.js';
import { AbstractDiskFileSystemProviderChannel, AbstractSessionFileWatcher, } from '../node/diskFileSystemProviderServer.js';
import { DefaultURITransformer } from '../../../base/common/uriIpc.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
export class DiskFileSystemProviderChannel extends AbstractDiskFileSystemProviderChannel {
    constructor(provider, logService, environmentService) {
        super(provider, logService);
        this.environmentService = environmentService;
    }
    getUriTransformer(ctx) {
        return DefaultURITransformer;
    }
    transformIncoming(uriTransformer, _resource) {
        return URI.revive(_resource);
    }
    //#region Delete: override to support Electron's trash support
    async delete(uriTransformer, _resource, opts) {
        if (!opts.useTrash) {
            return super.delete(uriTransformer, _resource, opts);
        }
        const resource = this.transformIncoming(uriTransformer, _resource);
        const filePath = normalize(resource.fsPath);
        try {
            await shell.trashItem(filePath);
        }
        catch (error) {
            throw createFileSystemProviderError(isWindows
                ? localize('binFailed', "Failed to move '{0}' to the recycle bin ({1})", basename(filePath), toErrorMessage(error))
                : localize('trashFailed', "Failed to move '{0}' to the trash ({1})", basename(filePath), toErrorMessage(error)), FileSystemProviderErrorCode.Unknown);
        }
    }
    //#endregion
    //#region File Watching
    createSessionFileWatcher(uriTransformer, emitter) {
        return new SessionFileWatcher(uriTransformer, emitter, this.logService, this.environmentService);
    }
}
class SessionFileWatcher extends AbstractSessionFileWatcher {
    watch(req, resource, opts) {
        if (opts.recursive) {
            throw createFileSystemProviderError('Recursive file watching is not supported from main process for performance reasons.', FileSystemProviderErrorCode.Unavailable);
        }
        return super.watch(req, resource, opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvZWxlY3Ryb24tbWFpbi9kaXNrRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDaEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFJTiw2QkFBNkIsRUFDN0IsMkJBQTJCLEdBQzNCLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUdsRSxPQUFPLEVBQ04scUNBQXFDLEVBQ3JDLDBCQUEwQixHQUUxQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBbUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFckUsTUFBTSxPQUFPLDZCQUE4QixTQUFRLHFDQUE4QztJQUNoRyxZQUNDLFFBQWdDLEVBQ2hDLFVBQXVCLEVBQ04sa0JBQXVDO1FBRXhELEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFGVix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO0lBR3pELENBQUM7SUFFa0IsaUJBQWlCLENBQUMsR0FBWTtRQUNoRCxPQUFPLHFCQUFxQixDQUFBO0lBQzdCLENBQUM7SUFFa0IsaUJBQWlCLENBQ25DLGNBQStCLEVBQy9CLFNBQXdCO1FBRXhCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQsOERBQThEO0lBRTNDLEtBQUssQ0FBQyxNQUFNLENBQzlCLGNBQStCLEVBQy9CLFNBQXdCLEVBQ3hCLElBQXdCO1FBRXhCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEUsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxJQUFJLENBQUM7WUFDSixNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSw2QkFBNkIsQ0FDbEMsU0FBUztnQkFDUixDQUFDLENBQUMsUUFBUSxDQUNSLFdBQVcsRUFDWCwrQ0FBK0MsRUFDL0MsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUNsQixjQUFjLENBQUMsS0FBSyxDQUFDLENBQ3JCO2dCQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1IsYUFBYSxFQUNiLHlDQUF5QyxFQUN6QyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQ2xCLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FDckIsRUFDSCwyQkFBMkIsQ0FBQyxPQUFPLENBQ25DLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFlBQVk7SUFFWix1QkFBdUI7SUFFYix3QkFBd0IsQ0FDakMsY0FBK0IsRUFDL0IsT0FBd0M7UUFFeEMsT0FBTyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0NBR0Q7QUFFRCxNQUFNLGtCQUFtQixTQUFRLDBCQUEwQjtJQUNqRCxLQUFLLENBQUMsR0FBVyxFQUFFLFFBQWEsRUFBRSxJQUFtQjtRQUM3RCxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixNQUFNLDZCQUE2QixDQUNsQyxxRkFBcUYsRUFDckYsMkJBQTJCLENBQUMsV0FBVyxDQUN2QyxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3hDLENBQUM7Q0FDRCJ9