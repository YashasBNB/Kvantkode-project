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
var MainThreadFileSystem_1;
import { Emitter, Event } from '../../../base/common/event.js';
import { toDisposable, DisposableStore, DisposableMap, } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService, FileType, FileOperationError, FileSystemProviderErrorCode, FilePermission, toFileSystemProviderErrorCode, } from '../../../platform/files/common/files.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { VSBuffer } from '../../../base/common/buffer.js';
let MainThreadFileSystem = MainThreadFileSystem_1 = class MainThreadFileSystem {
    constructor(extHostContext, _fileService) {
        this._fileService = _fileService;
        this._fileProvider = new DisposableMap();
        this._disposables = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystem);
        const infoProxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemInfo);
        for (const entry of _fileService.listCapabilities()) {
            infoProxy.$acceptProviderInfos(URI.from({ scheme: entry.scheme, path: '/dummy' }), entry.capabilities);
        }
        this._disposables.add(_fileService.onDidChangeFileSystemProviderRegistrations((e) => infoProxy.$acceptProviderInfos(URI.from({ scheme: e.scheme, path: '/dummy' }), e.provider?.capabilities ?? null)));
        this._disposables.add(_fileService.onDidChangeFileSystemProviderCapabilities((e) => infoProxy.$acceptProviderInfos(URI.from({ scheme: e.scheme, path: '/dummy' }), e.provider.capabilities)));
    }
    dispose() {
        this._disposables.dispose();
        this._fileProvider.dispose();
    }
    async $registerFileSystemProvider(handle, scheme, capabilities, readonlyMessage) {
        this._fileProvider.set(handle, new RemoteFileSystemProvider(this._fileService, scheme, capabilities, readonlyMessage, handle, this._proxy));
    }
    $unregisterProvider(handle) {
        this._fileProvider.deleteAndDispose(handle);
    }
    $onFileSystemChange(handle, changes) {
        const fileProvider = this._fileProvider.get(handle);
        if (!fileProvider) {
            throw new Error('Unknown file provider');
        }
        fileProvider.$onFileSystemChange(changes);
    }
    // --- consumer fs, vscode.workspace.fs
    async $stat(uri) {
        try {
            const stat = await this._fileService.stat(URI.revive(uri));
            return {
                ctime: stat.ctime,
                mtime: stat.mtime,
                size: stat.size,
                permissions: stat.readonly ? FilePermission.Readonly : undefined,
                type: MainThreadFileSystem_1._asFileType(stat),
            };
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $readdir(uri) {
        try {
            const stat = await this._fileService.resolve(URI.revive(uri), { resolveMetadata: false });
            if (!stat.isDirectory) {
                const err = new Error(stat.name);
                err.name = FileSystemProviderErrorCode.FileNotADirectory;
                throw err;
            }
            return !stat.children
                ? []
                : stat.children.map((child) => [child.name, MainThreadFileSystem_1._asFileType(child)]);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    static _asFileType(stat) {
        let res = 0;
        if (stat.isFile) {
            res += FileType.File;
        }
        else if (stat.isDirectory) {
            res += FileType.Directory;
        }
        if (stat.isSymbolicLink) {
            res += FileType.SymbolicLink;
        }
        return res;
    }
    async $readFile(uri) {
        try {
            const file = await this._fileService.readFile(URI.revive(uri));
            return file.value;
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $writeFile(uri, content) {
        try {
            await this._fileService.writeFile(URI.revive(uri), content);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $rename(source, target, opts) {
        try {
            await this._fileService.move(URI.revive(source), URI.revive(target), opts.overwrite);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $copy(source, target, opts) {
        try {
            await this._fileService.copy(URI.revive(source), URI.revive(target), opts.overwrite);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $mkdir(uri) {
        try {
            await this._fileService.createFolder(URI.revive(uri));
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $delete(uri, opts) {
        try {
            return await this._fileService.del(URI.revive(uri), opts);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    static _handleError(err) {
        if (err instanceof FileOperationError) {
            switch (err.fileOperationResult) {
                case 1 /* FileOperationResult.FILE_NOT_FOUND */:
                    err.name = FileSystemProviderErrorCode.FileNotFound;
                    break;
                case 0 /* FileOperationResult.FILE_IS_DIRECTORY */:
                    err.name = FileSystemProviderErrorCode.FileIsADirectory;
                    break;
                case 6 /* FileOperationResult.FILE_PERMISSION_DENIED */:
                    err.name = FileSystemProviderErrorCode.NoPermissions;
                    break;
                case 4 /* FileOperationResult.FILE_MOVE_CONFLICT */:
                    err.name = FileSystemProviderErrorCode.FileExists;
                    break;
            }
        }
        else if (err instanceof Error) {
            const code = toFileSystemProviderErrorCode(err);
            if (code !== FileSystemProviderErrorCode.Unknown) {
                err.name = code;
            }
        }
        throw err;
    }
    $ensureActivation(scheme) {
        return this._fileService.activateProvider(scheme);
    }
};
MainThreadFileSystem = MainThreadFileSystem_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadFileSystem),
    __param(1, IFileService)
], MainThreadFileSystem);
export { MainThreadFileSystem };
class RemoteFileSystemProvider {
    constructor(fileService, scheme, capabilities, readOnlyMessage, _handle, _proxy) {
        this.readOnlyMessage = readOnlyMessage;
        this._handle = _handle;
        this._proxy = _proxy;
        this._onDidChange = new Emitter();
        this.onDidChangeFile = this._onDidChange.event;
        this.onDidChangeCapabilities = Event.None;
        this.capabilities = capabilities;
        this._registration = fileService.registerProvider(scheme, this);
    }
    dispose() {
        this._registration.dispose();
        this._onDidChange.dispose();
    }
    watch(resource, opts) {
        const session = Math.random();
        this._proxy.$watch(this._handle, session, resource, opts);
        return toDisposable(() => {
            this._proxy.$unwatch(this._handle, session);
        });
    }
    $onFileSystemChange(changes) {
        this._onDidChange.fire(changes.map(RemoteFileSystemProvider._createFileChange));
    }
    static _createFileChange(dto) {
        return { resource: URI.revive(dto.resource), type: dto.type };
    }
    // --- forwarding calls
    async stat(resource) {
        try {
            return await this._proxy.$stat(this._handle, resource);
        }
        catch (err) {
            throw err;
        }
    }
    async readFile(resource) {
        const buffer = await this._proxy.$readFile(this._handle, resource);
        return buffer.buffer;
    }
    writeFile(resource, content, opts) {
        return this._proxy.$writeFile(this._handle, resource, VSBuffer.wrap(content), opts);
    }
    delete(resource, opts) {
        return this._proxy.$delete(this._handle, resource, opts);
    }
    mkdir(resource) {
        return this._proxy.$mkdir(this._handle, resource);
    }
    readdir(resource) {
        return this._proxy.$readdir(this._handle, resource);
    }
    rename(resource, target, opts) {
        return this._proxy.$rename(this._handle, resource, target, opts);
    }
    copy(resource, target, opts) {
        return this._proxy.$copy(this._handle, resource, target, opts);
    }
    open(resource, opts) {
        return this._proxy.$open(this._handle, resource, opts);
    }
    close(fd) {
        return this._proxy.$close(this._handle, fd);
    }
    async read(fd, pos, data, offset, length) {
        const readData = await this._proxy.$read(this._handle, fd, pos, length);
        data.set(readData.buffer, offset);
        return readData.byteLength;
    }
    write(fd, pos, data, offset, length) {
        return this._proxy.$write(this._handle, fd, pos, VSBuffer.wrap(data).slice(offset, offset + length));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEZpbGVTeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUVOLFlBQVksRUFDWixlQUFlLEVBQ2YsYUFBYSxHQUNiLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBSU4sWUFBWSxFQUdaLFFBQVEsRUFJUixrQkFBa0IsRUFFbEIsMkJBQTJCLEVBSTNCLGNBQWMsRUFDZCw2QkFBNkIsR0FHN0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGNBQWMsRUFHZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFJbEQsSUFBTSxvQkFBb0IsNEJBQTFCLE1BQU0sb0JBQW9CO0lBS2hDLFlBQ0MsY0FBK0IsRUFDakIsWUFBMkM7UUFBMUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFMekMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsRUFBb0MsQ0FBQTtRQUNyRSxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFNcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRXZFLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENB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