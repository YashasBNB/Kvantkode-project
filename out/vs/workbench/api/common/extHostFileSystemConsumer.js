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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1Db25zdW1lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RGaWxlU3lzdGVtQ29uc3VtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQTZCLE1BQU0sdUJBQXVCLENBQUE7QUFFOUUsT0FBTyxLQUFLLEtBQUssTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdELE9BQU8sRUFBVyxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHbEQsSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJBQXlCO0lBYXJDLFlBQ3FCLFVBQThCLEVBQzFCLGNBQXNDO1FBVDlDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUczQyxDQUFBO1FBRWMsZ0JBQVcsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO1FBTWpELElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxX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