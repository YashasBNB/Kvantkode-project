/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../base/common/uri.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { posix, delimiter } from '../../base/common/path.js';
import { AbstractDiskFileSystemProviderChannel, AbstractSessionFileWatcher, } from '../../platform/files/node/diskFileSystemProviderServer.js';
export class RemoteAgentFileSystemProviderChannel extends AbstractDiskFileSystemProviderChannel {
    constructor(logService, environmentService, configurationService) {
        super(new DiskFileSystemProvider(logService), logService);
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.uriTransformerCache = new Map();
        this._register(this.provider);
    }
    getUriTransformer(ctx) {
        let transformer = this.uriTransformerCache.get(ctx.remoteAuthority);
        if (!transformer) {
            transformer = createURITransformer(ctx.remoteAuthority);
            this.uriTransformerCache.set(ctx.remoteAuthority, transformer);
        }
        return transformer;
    }
    transformIncoming(uriTransformer, _resource, supportVSCodeResource = false) {
        if (supportVSCodeResource && _resource.path === '/vscode-resource' && _resource.query) {
            const requestResourcePath = JSON.parse(_resource.query).requestResourcePath;
            return URI.from({ scheme: 'file', path: requestResourcePath });
        }
        return URI.revive(uriTransformer.transformIncoming(_resource));
    }
    //#region File Watching
    createSessionFileWatcher(uriTransformer, emitter) {
        return new SessionFileWatcher(uriTransformer, emitter, this.logService, this.environmentService, this.configurationService);
    }
}
class SessionFileWatcher extends AbstractSessionFileWatcher {
    constructor(uriTransformer, sessionEmitter, logService, environmentService, configurationService) {
        super(uriTransformer, sessionEmitter, logService, environmentService);
    }
    getRecursiveWatcherOptions(environmentService) {
        const fileWatcherPolling = environmentService.args['file-watcher-polling'];
        if (fileWatcherPolling) {
            const segments = fileWatcherPolling.split(delimiter);
            const pollingInterval = Number(segments[0]);
            if (pollingInterval > 0) {
                const usePolling = segments.length > 1 ? segments.slice(1) : true;
                return { usePolling, pollingInterval };
            }
        }
        return undefined;
    }
    getExtraExcludes(environmentService) {
        if (environmentService.extensionsPath) {
            // when opening the $HOME folder, we end up watching the extension folder
            // so simply exclude watching the extensions folder
            return [posix.join(environmentService.extensionsPath, '**')];
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sMEJBQTBCLENBQUE7QUFJN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFakYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUU1RCxPQUFPLEVBQ04scUNBQXFDLEVBQ3JDLDBCQUEwQixHQUUxQixNQUFNLDJEQUEyRCxDQUFBO0FBSWxFLE1BQU0sT0FBTyxvQ0FBcUMsU0FBUSxxQ0FBbUU7SUFHNUgsWUFDQyxVQUF1QixFQUNOLGtCQUE2QyxFQUM3QyxvQkFBMkM7UUFFNUQsS0FBSyxDQUFDLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFIeEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBTDVDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUEyQixDQUFBO1FBU3hFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFa0IsaUJBQWlCLENBQUMsR0FBaUM7UUFDckUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFD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