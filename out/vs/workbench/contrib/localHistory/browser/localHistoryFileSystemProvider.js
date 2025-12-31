/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { FileType, hasReadWriteCapability, } from '../../../../platform/files/common/files.js';
import { isEqual } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
/**
 * A wrapper around a standard file system provider
 * that is entirely readonly.
 */
export class LocalHistoryFileSystemProvider {
    static { this.SCHEMA = 'vscode-local-history'; }
    static toLocalHistoryFileSystem(resource) {
        const serializedLocalHistoryResource = {
            location: resource.location.toString(true),
            associatedResource: resource.associatedResource.toString(true),
        };
        // Try to preserve the associated resource as much as possible
        // and only keep the `query` part dynamic. This enables other
        // components (e.g. other timeline providers) to continue
        // providing timeline entries even when our resource is active.
        return resource.associatedResource.with({
            scheme: LocalHistoryFileSystemProvider.SCHEMA,
            query: JSON.stringify(serializedLocalHistoryResource),
        });
    }
    static fromLocalHistoryFileSystem(resource) {
        const serializedLocalHistoryResource = JSON.parse(resource.query);
        return {
            location: URI.parse(serializedLocalHistoryResource.location),
            associatedResource: URI.parse(serializedLocalHistoryResource.associatedResource),
        };
    }
    static { this.EMPTY_RESOURCE = URI.from({
        scheme: LocalHistoryFileSystemProvider.SCHEMA,
        path: '/empty',
    }); }
    static { this.EMPTY = {
        location: LocalHistoryFileSystemProvider.EMPTY_RESOURCE,
        associatedResource: LocalHistoryFileSystemProvider.EMPTY_RESOURCE,
    }; }
    get capabilities() {
        return 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 2048 /* FileSystemProviderCapabilities.Readonly */;
    }
    constructor(fileService) {
        this.fileService = fileService;
        this.mapSchemeToProvider = new Map();
        //#endregion
        //#region Unsupported File Operations
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    async withProvider(resource) {
        const scheme = resource.scheme;
        let providerPromise = this.mapSchemeToProvider.get(scheme);
        if (!providerPromise) {
            // Resolve early when provider already exists
            const provider = this.fileService.getProvider(scheme);
            if (provider) {
                providerPromise = Promise.resolve(provider);
            }
            // Otherwise wait for registration
            else {
                providerPromise = new Promise((resolve) => {
                    const disposable = this.fileService.onDidChangeFileSystemProviderRegistrations((e) => {
                        if (e.added && e.provider && e.scheme === scheme) {
                            disposable.dispose();
                            resolve(e.provider);
                        }
                    });
                });
            }
            this.mapSchemeToProvider.set(scheme, providerPromise);
        }
        return providerPromise;
    }
    //#region Supported File Operations
    async stat(resource) {
        const location = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(resource).location;
        // Special case: empty resource
        if (isEqual(LocalHistoryFileSystemProvider.EMPTY_RESOURCE, location)) {
            return { type: FileType.File, ctime: 0, mtime: 0, size: 0 };
        }
        // Otherwise delegate to provider
        return (await this.withProvider(location)).stat(location);
    }
    async readFile(resource) {
        const location = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(resource).location;
        // Special case: empty resource
        if (isEqual(LocalHistoryFileSystemProvider.EMPTY_RESOURCE, location)) {
            return VSBuffer.fromString('').buffer;
        }
        // Otherwise delegate to provider
        const provider = await this.withProvider(location);
        if (hasReadWriteCapability(provider)) {
            return provider.readFile(location);
        }
        throw new Error('Unsupported');
    }
    async writeFile(resource, content, opts) { }
    async mkdir(resource) { }
    async readdir(resource) {
        return [];
    }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    watch(resource, opts) {
        return Disposable.None;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5RmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxIaXN0b3J5L2Jyb3dzZXIvbG9jYWxIaXN0b3J5RmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFJTixRQUFRLEVBRVIsc0JBQXNCLEdBTXRCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQW1CNUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjthQUcxQixXQUFNLEdBQUcsc0JBQXNCLEFBQXpCLENBQXlCO0lBRS9DLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxRQUErQjtRQUM5RCxNQUFNLDhCQUE4QixHQUFvQztZQUN2RSxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQzFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQzlELENBQUE7UUFFRCw4REFBOEQ7UUFDOUQsNkRBQTZEO1FBQzdELHlEQUF5RDtRQUN6RCwrREFBK0Q7UUFDL0QsT0FBTyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxNQUFNO1lB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