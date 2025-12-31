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
var ExtensionMcpDiscovery_1;
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { mcpActivationEvent, mcpContributionPoint } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { extensionPrefixedIdentifier, McpServerDefinition } from '../mcpTypes.js';
const cacheKey = 'mcp.extCachedServers';
const _mcpExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint(mcpContributionPoint);
let ExtensionMcpDiscovery = ExtensionMcpDiscovery_1 = class ExtensionMcpDiscovery extends Disposable {
    constructor(_mcpRegistry, storageService, _extensionService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._extensionCollectionIdsToPersist = new Set();
        this.cachedServers = storageService.getObject(cacheKey, 1 /* StorageScope.WORKSPACE */, {});
        this._register(storageService.onWillSaveState(() => {
            let updated = false;
            for (const collectionId of this._extensionCollectionIdsToPersist) {
                const collection = this._mcpRegistry.collections.get().find((c) => c.id === collectionId);
                if (!collection || collection.lazy) {
                    continue;
                }
                const defs = collection.serverDefinitions.get();
                if (defs) {
                    updated = true;
                    this.cachedServers[collectionId] = {
                        servers: defs.map(McpServerDefinition.toSerialized),
                    };
                }
            }
            if (updated) {
                storageService.store(cacheKey, this.cachedServers, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    start() {
        const extensionCollections = this._register(new DisposableMap());
        this._register(_mcpExtensionPoint.setHandler((_extensions, delta) => {
            const { added, removed } = delta;
            for (const collections of removed) {
                for (const coll of collections.value) {
                    extensionCollections.deleteAndDispose(extensionPrefixedIdentifier(collections.description.identifier, coll.id));
                }
            }
            for (const collections of added) {
                if (!ExtensionMcpDiscovery_1._validate(collections)) {
                    continue;
                }
                for (const coll of collections.value) {
                    const id = extensionPrefixedIdentifier(collections.description.identifier, coll.id);
                    this._extensionCollectionIdsToPersist.add(id);
                    const serverDefs = this.cachedServers.hasOwnProperty(id)
                        ? this.cachedServers[id].servers
                        : undefined;
                    const dispo = this._mcpRegistry.registerCollection({
                        id,
                        label: coll.label,
                        remoteAuthority: null,
                        isTrustedByDefault: true,
                        scope: 1 /* StorageScope.WORKSPACE */,
                        serverDefinitions: observableValue(this, serverDefs?.map(McpServerDefinition.fromSerialized) || []),
                        lazy: {
                            isCached: !!serverDefs,
                            load: () => this._activateExtensionServers(coll.id),
                            removed: () => extensionCollections.deleteAndDispose(id),
                        },
                    });
                    extensionCollections.set(id, dispo);
                }
            }
        }));
    }
    async _activateExtensionServers(collectionId) {
        await this._extensionService.activateByEvent(mcpActivationEvent(collectionId));
        await Promise.all(this._mcpRegistry.delegates.map((r) => r.waitForInitialProviderPromises()));
    }
    static _validate(user) {
        if (!Array.isArray(user.value)) {
            user.collector.error(localize('invalidData', 'Expected an array of MCP collections'));
            return false;
        }
        for (const contribution of user.value) {
            if (typeof contribution.id !== 'string' || isFalsyOrWhitespace(contribution.id)) {
                user.collector.error(localize('invalidId', "Expected 'id' to be a non-empty string."));
                return false;
            }
            if (typeof contribution.label !== 'string' || isFalsyOrWhitespace(contribution.label)) {
                user.collector.error(localize('invalidLabel', "Expected 'label' to be a non-empty string."));
                return false;
            }
        }
        return true;
    }
};
ExtensionMcpDiscovery = ExtensionMcpDiscovery_1 = __decorate([
    __param(0, IMcpRegistry),
    __param(1, IStorageService),
    __param(2, IExtensionService)
], ExtensionMcpDiscovery);
export { ExtensionMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvZXh0ZW5zaW9uTWNwRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFaEQsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3hGLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSw4REFBOEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDckQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHakYsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUE7QUFNdkMsTUFBTSxrQkFBa0IsR0FDdkIsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtBQUU1RSxJQUFNLHFCQUFxQiw2QkFBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBSXBELFlBQ2UsWUFBMkMsRUFDeEMsY0FBK0IsRUFDN0IsaUJB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