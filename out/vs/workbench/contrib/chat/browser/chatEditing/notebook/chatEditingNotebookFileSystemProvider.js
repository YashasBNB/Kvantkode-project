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
var ChatEditingNotebookFileSystemProvider_1;
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { FileType, IFileService, } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
import { IChatEditingService } from '../../../common/chatEditingService.js';
import { ChatEditingNotebookSnapshotScheme, deserializeSnapshot, } from './chatEditingModifiedNotebookSnapshot.js';
import { ChatEditingSession } from '../chatEditingSession.js';
let ChatEditingNotebookFileSystemProviderContrib = class ChatEditingNotebookFileSystemProviderContrib extends Disposable {
    static { this.ID = 'chatEditingNotebookFileSystemProviderContribution'; }
    constructor(fileService, instantiationService) {
        super();
        this.fileService = fileService;
        const fileSystemProvider = instantiationService.createInstance(ChatEditingNotebookFileSystemProvider);
        this._register(this.fileService.registerProvider(ChatEditingNotebookSnapshotScheme, fileSystemProvider));
    }
};
ChatEditingNotebookFileSystemProviderContrib = __decorate([
    __param(0, IFileService),
    __param(1, IInstantiationService)
], ChatEditingNotebookFileSystemProviderContrib);
export { ChatEditingNotebookFileSystemProviderContrib };
let ChatEditingNotebookFileSystemProvider = class ChatEditingNotebookFileSystemProvider {
    static { ChatEditingNotebookFileSystemProvider_1 = this; }
    static { this.registeredFiles = new ResourceMap(); }
    static registerFile(resource, buffer) {
        ChatEditingNotebookFileSystemProvider_1.registeredFiles.set(resource, buffer);
        return {
            dispose() {
                if (ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource) === buffer) {
                    ChatEditingNotebookFileSystemProvider_1.registeredFiles.delete(resource);
                }
            },
        };
    }
    constructor(_chatEditingService, notebookService) {
        this._chatEditingService = _chatEditingService;
        this.notebookService = notebookService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ |
            16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
            2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    watch(_resource, _opts) {
        return Disposable.None;
    }
    async stat(_resource) {
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: 0,
        };
    }
    mkdir(_resource) {
        throw new Error('Method not implemented1.');
    }
    readdir(_resource) {
        throw new Error('Method not implemented2.');
    }
    delete(_resource, _opts) {
        throw new Error('Method not implemented3.');
    }
    rename(_from, _to, _opts) {
        throw new Error('Method not implemented4.');
    }
    copy(_from, _to, _opts) {
        throw new Error('Method not implemented5.');
    }
    async readFile(resource) {
        const buffer = ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource);
        if (buffer) {
            return buffer.buffer;
        }
        const queryData = JSON.parse(resource.query);
        if (!queryData.viewType) {
            throw new Error('File not found, viewType not found');
        }
        const session = this._chatEditingService.getEditingSession(queryData.sessionId);
        if (!(session instanceof ChatEditingSession) || !queryData.requestId) {
            throw new Error('File not found, session not found');
        }
        const snapshotEntry = session.getSnapshot(queryData.requestId, queryData.undoStop || undefined, resource);
        if (!snapshotEntry) {
            throw new Error('File not found, snapshot not found');
        }
        const { data } = deserializeSnapshot(snapshotEntry.current);
        const { serializer } = await this.notebookService.withNotebookDataProvider(queryData.viewType);
        return serializer.notebookToData(data).then((s) => s.buffer);
    }
    writeFile(__resource, _content, _opts) {
        throw new Error('Method not implemented7.');
    }
    readFileStream(__resource, _opts, _token) {
        throw new Error('Method not implemented8.');
    }
    open(__resource, _opts) {
        throw new Error('Method not implemented9.');
    }
    close(_fd) {
        throw new Error('Method not implemented10.');
    }
    read(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented11.');
    }
    write(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented12.');
    }
    cloneFile(_from, __to) {
        throw new Error('Method not implemented13.');
    }
};
ChatEditingNotebookFileSystemProvider = ChatEditingNotebookFileSystemProvider_1 = __decorate([
    __param(0, IChatEditingService),
    __param(1, INotebookService)
], ChatEditingNotebookFileSystemProvider);
export { ChatEditingNotebookFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ05vdGVib29rRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdsRSxPQUFPLEVBRU4sUUFBUSxFQU1SLFlBQVksR0FLWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsbUJBQW1CLEdBQ25CLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEQsSUFBTSw0Q0FBNEMsR0FBbEQsTUFBTSw0Q0FDWixTQUFRLFVBQVU7YUFHWCxPQUFFLEdBQUcsbURBQW1ELEFBQXRELENBQXNEO0lBQy9ELFlBQ2dDLFdBQXlCLEVBQ2pDLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUh3QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUl4RCxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLGNBQWMs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