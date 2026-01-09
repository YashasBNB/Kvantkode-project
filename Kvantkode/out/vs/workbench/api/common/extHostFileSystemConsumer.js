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
var ExtHostConsumerFileSystem_1;
import { MainContext } from './extHost.protocol.js';
import * as files from '../../../platform/files/common/files.js';
import { FileSystemError } from './extHostTypes.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceQueue } from '../../../base/common/async.js';
import { extUri, extUriIgnorePathCase } from '../../../base/common/resources.js';
import { Schemas } from '../../../base/common/network.js';
let ExtHostConsumerFileSystem = ExtHostConsumerFileSystem_1 = class ExtHostConsumerFileSystem {
    constructor(extHostRpc, fileSystemInfo) {
        this._fileSystemProvider = new Map();
        this._writeQueue = new ResourceQueue();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadFileSystem);
        const that = this;
        this.value = Object.freeze({
            async stat(uri) {
                try {
                    let stat;
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        stat = await provider.impl.stat(uri);
                    }
                    else {
                        stat = await that._proxy.$stat(uri);
                    }
                    return {
                        type: stat.type,
                        ctime: stat.ctime,
                        mtime: stat.mtime,
                        size: stat.size,
                        permissions: stat.permissions === files.FilePermission.Readonly ? 1 : undefined,
                    };
                }
                catch (err) {
                    ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async readDirectory(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return (await provider.impl.readDirectory(uri)).slice(); // safe-copy
                    }
                    else {
                        return await that._proxy.$readdir(uri);
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async createDirectory(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return await that.mkdirp(provider.impl, provider.extUri, uri);
                    }
                    else {
                        return await that._proxy.$mkdir(uri);
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async readFile(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return (await provider.impl.readFile(uri)).slice(); // safe-copy
                    }
                    else {
                        const buff = await that._proxy.$readFile(uri);
                        return buff.buffer;
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async writeFile(uri, content) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        await that.mkdirp(provider.impl, provider.extUri, provider.extUri.dirname(uri));
                        return await that._writeQueue.queueFor(uri, () => Promise.resolve(provider.impl.writeFile(uri, content, { create: true, overwrite: true })));
                    }
                    else {
                        return await that._proxy.$writeFile(uri, VSBuffer.wrap(content));
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async delete(uri, options) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly && !options?.useTrash /* no shortcut: use trash */) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return await provider.impl.delete(uri, { recursive: false, ...options });
                    }
                    else {
                        return await that._proxy.$delete(uri, {
                            recursive: false,
                            useTrash: false,
                            atomic: false,
                            ...options,
                        });
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async rename(oldUri, newUri, options) {
                try {
                    // no shortcut: potentially involves different schemes, does mkdirp
                    return await that._proxy.$rename(oldUri, newUri, { ...{ overwrite: false }, ...options });
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async copy(source, destination, options) {
                try {
                    // no shortcut: potentially involves different schemes, does mkdirp
                    return await that._proxy.$copy(source, destination, {
                        ...{ overwrite: false },
                        ...options,
                    });
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            isWritableFileSystem(scheme) {
                const capabilities = fileSystemInfo.getCapabilities(scheme);
                if (typeof capabilities === 'number') {
                    return !(capabilities & 2048 /* files.FileSystemProviderCapabilities.Readonly */);
                }
                return undefined;
            },
        });
    }
    async mkdirp(provider, providerExtUri, directory) {
        const directoriesToCreate = [];
        while (!providerExtUri.isEqual(directory, providerExtUri.dirname(directory))) {
            try {
                const stat = await provider.stat(directory);
                if ((stat.type & files.FileType.Directory) === 0) {
                    throw FileSystemError.FileExists(`Unable to create folder '${directory.scheme === Schemas.file ? directory.fsPath : directory.toString(true)}' that already exists but is not a directory`);
                }
                break; // we have hit a directory that exists -> good
            }
            catch (error) {
                if (files.toFileSystemProviderErrorCode(error) !==
                    files.FileSystemProviderErrorCode.FileNotFound) {
                    throw error;
                }
                // further go up and remember to create this directory
                directoriesToCreate.push(providerExtUri.basename(directory));
                directory = providerExtUri.dirname(directory);
            }
        }
        for (let i = directoriesToCreate.length - 1; i >= 0; i--) {
            directory = providerExtUri.joinPath(directory, directoriesToCreate[i]);
            try {
                await provider.createDirectory(directory);
            }
            catch (error) {
                if (files.toFileSystemProviderErrorCode(error) !==
                    files.FileSystemProviderErrorCode.FileExists) {
                    // For mkdirp() we tolerate that the mkdir() call fails
                    // in case the folder already exists. This follows node.js
                    // own implementation of fs.mkdir({ recursive: true }) and
                    // reduces the chances of race conditions leading to errors
                    // if multiple calls try to create the same folders
                    // As such, we only throw an error here if it is other than
                    // the fact that the file already exists.
                    // (see also https://github.com/microsoft/vscode/issues/89834)
                    throw error;
                }
            }
        }
    }
    static _handleError(err) {
        // desired error type
        if (err instanceof FileSystemError) {
            throw err;
        }
        // file system provider error
        if (err instanceof files.FileSystemProviderError) {
            switch (err.code) {
                case files.FileSystemProviderErrorCode.FileExists:
                    throw FileSystemError.FileExists(err.message);
                case files.FileSystemProviderErrorCode.FileNotFound:
                    throw FileSystemError.FileNotFound(err.message);
                case files.FileSystemProviderErrorCode.FileNotADirectory:
                    throw FileSystemError.FileNotADirectory(err.message);
                case files.FileSystemProviderErrorCode.FileIsADirectory:
                    throw FileSystemError.FileIsADirectory(err.message);
                case files.FileSystemProviderErrorCode.NoPermissions:
                    throw FileSystemError.NoPermissions(err.message);
                case files.FileSystemProviderErrorCode.Unavailable:
                    throw FileSystemError.Unavailable(err.message);
                default:
                    throw new FileSystemError(err.message, err.name);
            }
        }
        // generic error
        if (!(err instanceof Error)) {
            throw new FileSystemError(String(err));
        }
        // no provider (unknown scheme) error
        if (err.name === 'ENOPRO' || err.message.includes('ENOPRO')) {
            throw FileSystemError.Unavailable(err.message);
        }
        // file system error
        switch (err.name) {
            case files.FileSystemProviderErrorCode.FileExists:
                throw FileSystemError.FileExists(err.message);
            case files.FileSystemProviderErrorCode.FileNotFound:
                throw FileSystemError.FileNotFound(err.message);
            case files.FileSystemProviderErrorCode.FileNotADirectory:
                throw FileSystemError.FileNotADirectory(err.message);
            case files.FileSystemProviderErrorCode.FileIsADirectory:
                throw FileSystemError.FileIsADirectory(err.message);
            case files.FileSystemProviderErrorCode.NoPermissions:
                throw FileSystemError.NoPermissions(err.message);
            case files.FileSystemProviderErrorCode.Unavailable:
                throw FileSystemError.Unavailable(err.message);
            default:
                throw new FileSystemError(err.message, err.name);
        }
    }
    // ---
    addFileSystemProvider(scheme, provider, options) {
        this._fileSystemProvider.set(scheme, {
            impl: provider,
            extUri: options?.isCaseSensitive ? extUri : extUriIgnorePathCase,
            isReadonly: !!options?.isReadonly,
        });
        return toDisposable(() => this._fileSystemProvider.delete(scheme));
    }
    getFileSystemProviderExtUri(scheme) {
        return this._fileSystemProvider.get(scheme)?.extUri ?? extUri;
    }
};
ExtHostConsumerFileSystem = ExtHostConsumerFileSystem_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostFileSystemInfo)
], ExtHostConsumerFileSystem);
export { ExtHostConsumerFileSystem };
export const IExtHostConsumerFileSystem = createDecorator('IExtHostConsumerFileSystem');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1Db25zdW1lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEZpbGVTeXN0ZW1Db25zdW1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBNkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5RSxPQUFPLEtBQUssS0FBSyxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ25FLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDN0QsT0FBTyxFQUFXLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUdsRCxJQUFNLHlCQUF5QixpQ0FBL0IsTUFBTSx5QkFBeUI7SUFhckMsWUFDcUIsVUFBOEIsRUFDMUIsY0FBc0M7UUFUOUMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBRzNDLENBQUE7UUFFYyxnQkFBVyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUE7UUFNakQsSUFBSSxDQUFDLE1BQU0sR0FB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