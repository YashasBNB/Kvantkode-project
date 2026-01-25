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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRmlsZVN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sWUFBWSxFQUNaLGVBQWUsRUFDZixhQUFhLEdBQ2IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFJTixZQUFZLEVBR1osUUFBUSxFQUlSLGtCQUFrQixFQUVsQiwyQkFBMkIsRUFJM0IsY0FBYyxFQUNkLDZCQUE2QixHQUc3QixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sY0FBYyxFQUdkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUlsRCxJQUFNLG9CQUFvQiw0QkFBMUIsTUFBTSxvQkFBb0I7SUFLaEMsWUFDQyxjQUErQixFQUNqQixZQUEyQztRQUExQixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUx6QyxrQkFBYSxHQUFHLElBQUksYUFBYSxFQUFvQyxDQUFBO1FBQ3JFLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU1wRCxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFdkUsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFFB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