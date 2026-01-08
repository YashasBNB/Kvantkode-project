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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2xFLE9BQU8sRUFFTixRQUFRLEVBTVIsWUFBWSxHQUtaLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxtQkFBbUIsR0FDbkIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV0RCxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUNaLFNBQVEsVUFBVTthQUdYLE9BQUUsR0FBRyxtREFBbUQsQUFBdEQsQ0FBc0Q7SUFDL0QsWUFDZ0MsV0FBeUIsRUFDakMsb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBSHdCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBSXhELE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMs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