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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { FilePermission, FileSystemProviderErrorCode, FileType, } from '../../../../platform/files/common/files.js';
import { ChangeType, decodeEditSessionFileContent, EDIT_SESSIONS_SCHEME, IEditSessionsStorageService, } from '../common/editSessions.js';
import { NotSupportedError } from '../../../../base/common/errors.js';
let EditSessionsFileSystemProvider = class EditSessionsFileSystemProvider {
    static { this.SCHEMA = EDIT_SESSIONS_SCHEME; }
    constructor(editSessionsStorageService) {
        this.editSessionsStorageService = editSessionsStorageService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ + 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        //#region Unsupported file operations
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    async readFile(resource) {
        const match = /(?<ref>[^/]+)\/(?<folderName>[^/]+)\/(?<filePath>.*)/.exec(resource.path.substring(1));
        if (!match?.groups) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        const { ref, folderName, filePath } = match.groups;
        const data = await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        const content = JSON.parse(data.content);
        const change = content.folders
            .find((f) => f.name === folderName)
            ?.workingChanges.find((change) => change.relativeFilePath === filePath);
        if (!change || change.type === ChangeType.Deletion) {
            throw FileSystemProviderErrorCode.FileNotFound;
        }
        return decodeEditSessionFileContent(content.version, change.contents).buffer;
    }
    async stat(resource) {
        const content = await this.readFile(resource);
        const currentTime = Date.now();
        return {
            type: FileType.File,
            permissions: FilePermission.Readonly,
            mtime: currentTime,
            ctime: currentTime,
            size: content.byteLength,
        };
    }
    watch(resource, opts) {
        return Disposable.None;
    }
    async mkdir(resource) { }
    async readdir(resource) {
        return [];
    }
    async rename(from, to, opts) { }
    async delete(resource, opts) { }
    async writeFile() {
        throw new NotSupportedError();
    }
};
EditSessionsFileSystemProvider = __decorate([
    __param(0, IEditSessionsStorageService)
], EditSessionsFileSystemProvider);
export { EditSessionsFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL2Jyb3dzZXIvZWRpdFNlc3Npb25zRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUNOLGNBQWMsRUFFZCwyQkFBMkIsRUFDM0IsUUFBUSxHQU1SLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUNOLFVBQVUsRUFDViw0QkFBNEIsRUFDNUIsb0JBQW9CLEVBRXBCLDJCQUEyQixHQUMzQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO2FBRzFCLFdBQU0sR0FBRyxvQkFBb0IsQUFBdkIsQ0FBdUI7SUFFN0MsWUFDOEIsMEJBQStEO1FBQXZELCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFHcEYsaUJBQVksR0FDcEIseUdBQXNGLENBQUE7UUFvQ3ZGLHFDQUFxQztRQUM1Qiw0QkFBdUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3BDLG9CQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQXpDbEMsQ0FBQztJQUtKLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBYTtRQUMzQixNQUFNLEtBQUssR0FBRyxzREFBc0QsQ0FBQyxJQUFJLENBQ3hFLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxD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