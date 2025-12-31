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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2VsZWN0cm9uLW1haW4vZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBSU4sNkJBQTZCLEVBQzdCLDJCQUEyQixHQUMzQixNQUFNLG9CQUFvQixDQUFBO0FBRTNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFHbEUsT0FBTyxFQUNOLHFDQUFxQyxFQUNyQywwQkFBMEIsR0FFMUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQW1CLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXJFLE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxxQ0FBOEM7SUFDaEcsWUFDQyxRQUFnQyxFQUNoQyxVQUF1QixFQUNOLGtCQUF1QztRQUV4RCxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRlYsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtJQUd6RCxDQUFDO0lBRWtCLGlCQUFpQixDQUFDLEdBQVk7UUFDaEQsT0FBTyxxQkFBcUIsQ0FBQTtJQUM3QixDQUFDO0lBRWtCLGlCQUFpQixDQUNuQyxjQUErQixFQUMvQixTQUF3QjtRQUV4QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELDhEQUE4RDtJQUUzQyxLQUFLLENBQUMsTUFBTSxDQUM5QixjQUErQixFQUMvQixTQUF3QixFQUN4QixJQUF3QjtRQUV4QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sNkJBQTZCLENBQ2xDLFNBQVM7Z0JBQ1IsQ0FBQyxDQUFDLFFBQVEsQ0FDUixXQUFXLEVBQ1gsK0NBQStDLEVBQy9DLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDbEIsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUNyQjtnQkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLGFBQWEsRUFDYix5Q0FBeUMsRUFDekMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUNsQixjQUFjLENBQUMsS0FBSyxDQUFDLENBQ3JCLEVBQ0gsMkJBQTJCLENBQUMsT0FBTyxDQUNuQyxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosdUJBQXVCO0lBRWIsd0JBQXdCLENBQ2pDLGNBQStCLEVBQy9CLE9BQXdDO1FBRXhDLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDakcsQ0FBQztDQUdEO0FBRUQsTUFBTSxrQkFBbUIsU0FBUSwwQkFBMEI7SUFDakQsS0FBSyxDQUFDLEdBQVcsRUFBRSxRQUFhLEVBQUUsSUFBbUI7UUFDN0QsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsTUFBTSw2QkFBNkIsQ0FDbEMscUZBQXFGLEVBQ3JGLDJCQUEyQixDQUFDLFdBQVcsQ0FDdkMsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0QifQ==