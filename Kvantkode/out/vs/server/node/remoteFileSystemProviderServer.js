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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVGaWxlU3lzdGVtUHJvdmlkZXJTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUk3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRTVELE9BQU8sRUFDTixxQ0FBcUMsRUFDckMsMEJBQTBCLEdBRTFCLE1BQU0sMkRBQTJELENBQUE7QUFJbEUsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLHFDQUFtRTtJQUc1SCxZQUNDLFVBQXVCLEVBQ04sa0JBQTZDLEVBQzdDLG9CQUEyQztRQUU1RCxLQUFLLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUh4Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBQzdDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFMNUMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7UUFTeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVrQixpQkFBaUIsQ0FBQyxHQUFpQztRQUNyRSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNuRSxJ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