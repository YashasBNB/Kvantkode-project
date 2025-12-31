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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWJzdHJhY3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL2Rpc2NvdmVyeS9uYXRpdmVNY3BEaXNjb3ZlcnlBYnN0cmFjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV0RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUNOLGdCQUFnQixFQUloQixlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFHNUcsT0FBTyxFQUFtQixvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQU9yRCxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLGdDQUFnQyxF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