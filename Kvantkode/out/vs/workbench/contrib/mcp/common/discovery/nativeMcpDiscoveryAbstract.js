/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorunWithStore, observableValue, } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { discoverySourceLabel, mcpDiscoverySection } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { ClaudeDesktopMpcDiscoveryAdapter, CursorDesktopMpcDiscoveryAdapter, WindsurfDesktopMpcDiscoveryAdapter, } from './nativeMcpDiscoveryAdapters.js';
let FilesystemMcpDiscovery = class FilesystemMcpDiscovery extends Disposable {
    constructor(configurationService, _fileService, _mcpRegistry) {
        super();
        this._fileService = _fileService;
        this._mcpRegistry = _mcpRegistry;
        this._fsDiscoveryEnabled = observableConfigValue(mcpDiscoverySection, true, configurationService);
    }
    _isDiscoveryEnabled(reader, discoverySource) {
        const fsDiscovery = this._fsDiscoveryEnabled.read(reader);
        if (typeof fsDiscovery === 'boolean') {
            return fsDiscovery;
        }
        if (discoverySource && fsDiscovery[discoverySource] === false) {
            return false;
        }
        return true;
    }
    watchFile(file, collection, discoverySource, adaptFile) {
        const store = new DisposableStore();
        const collectionRegistration = store.add(new MutableDisposable());
        const updateFile = async () => {
            let definitions = [];
            try {
                const contents = await this._fileService.readFile(file);
                definitions = adaptFile(contents.value) || [];
            }
            catch {
                // ignored
            }
            if (!definitions.length) {
                collectionRegistration.clear();
            }
            else {
                collection.serverDefinitions.set(definitions, undefined);
                if (!collectionRegistration.value) {
                    collectionRegistration.value = this._mcpRegistry.registerCollection(collection);
                }
            }
        };
        store.add(autorunWithStore((reader, store) => {
            if (!this._isDiscoveryEnabled(reader, discoverySource)) {
                collectionRegistration.clear();
                return;
            }
            const throttler = store.add(new RunOnceScheduler(updateFile, 500));
            const watcher = store.add(this._fileService.createWatcher(file, { recursive: false, excludes: [] }));
            store.add(watcher.onDidChange(() => throttler.schedule()));
            updateFile();
        }));
        return store;
    }
};
FilesystemMcpDiscovery = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, IMcpRegistry)
], FilesystemMcpDiscovery);
export { FilesystemMcpDiscovery };
/**
 * Base class that discovers MCP servers on a filesystem, outside of the ones
 * defined in VS Code settings.
 */
let NativeFilesystemMcpDiscovery = class NativeFilesystemMcpDiscovery extends FilesystemMcpDiscovery {
    constructor(remoteAuthority, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(configurationService, fileService, mcpRegistry);
        this.suffix = '';
        if (remoteAuthority) {
            this.suffix =
                ' ' +
                    localize('onRemoteLabel', ' on {0}', labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority));
        }
        this.adapters = [
            instantiationService.createInstance(ClaudeDesktopMpcDiscoveryAdapter, remoteAuthority),
            instantiationService.createInstance(CursorDesktopMpcDiscoveryAdapter, remoteAuthority),
            instantiationService.createInstance(WindsurfDesktopMpcDiscoveryAdapter, remoteAuthority),
        ];
    }
    setDetails(detailsDto) {
        if (!detailsDto) {
            return;
        }
        const details = {
            ...detailsDto,
            homedir: URI.revive(detailsDto.homedir),
            xdgHome: detailsDto.xdgHome ? URI.revive(detailsDto.xdgHome) : undefined,
            winAppData: detailsDto.winAppData ? URI.revive(detailsDto.winAppData) : undefined,
        };
        for (const adapter of this.adapters) {
            const file = adapter.getFilePath(details);
            if (!file) {
                continue;
            }
            const collection = {
                id: adapter.id,
                label: discoverySourceLabel[adapter.discoverySource] + this.suffix,
                remoteAuthority: adapter.remoteAuthority,
                scope: 0 /* StorageScope.PROFILE */,
                isTrustedByDefault: false,
                serverDefinitions: observableValue(this, []),
                presentation: {
                    origin: file,
                    order: adapter.order + (adapter.remoteAuthority ? -50 /* McpCollectionSortOrder.RemoteBoost */ : 0),
                },
            };
            this._register(this.watchFile(file, collection, adapter.discoverySource, (contents) => adapter.adaptFile(contents, details)));
        }
    }
};
NativeFilesystemMcpDiscovery = __decorate([
    __param(1, ILabelService),
    __param(2, IFileService),
    __param(3, IInstantiationService),
    __param(4, IMcpRegistry),
    __param(5, IConfigurationService)
], NativeFilesystemMcpDiscovery);
export { NativeFilesystemMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWJzdHJhY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L25hdGl2ZU1jcERpc2NvdmVyeUFic3RyYWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXRFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sZ0JBQWdCLEVBSWhCLGVBQWUsR0FDZixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUc1RyxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBT3JELE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsZ0NB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