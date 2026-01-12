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
var ChatEditingTextModelContentProvider_1;
import { URI } from '../../../../../base/common/uri.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { chatEditingSnapshotScheme } from '../../common/chatEditingService.js';
import { ChatEditingSession } from './chatEditingSession.js';
let ChatEditingTextModelContentProvider = class ChatEditingTextModelContentProvider {
    static { ChatEditingTextModelContentProvider_1 = this; }
    static { this.scheme = 'chat-editing-text-model'; }
    static getFileURI(chatSessionId, documentId, path) {
        return URI.from({
            scheme: ChatEditingTextModelContentProvider_1.scheme,
            path,
            query: JSON.stringify({
                kind: 'doc',
                documentId,
                chatSessionId,
            }),
        });
    }
    constructor(_chatEditingService, _modelService) {
        this._chatEditingService = _chatEditingService;
        this._modelService = _modelService;
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const data = JSON.parse(resource.query);
        const session = this._chatEditingService.getEditingSession(data.chatSessionId);
        const entry = session?.entries.get().find((candidate) => candidate.entryId === data.documentId);
        if (!entry) {
            return null;
        }
        return this._modelService.getModel(entry.originalURI);
    }
};
ChatEditingTextModelContentProvider = ChatEditingTextModelContentProvider_1 = __decorate([
    __param(1, IModelService)
], ChatEditingTextModelContentProvider);
export { ChatEditingTextModelContentProvider };
let ChatEditingSnapshotTextModelContentProvider = class ChatEditingSnapshotTextModelContentProvider {
    static getSnapshotFileURI(chatSessionId, requestId, undoStop, path) {
        return URI.from({
            scheme: chatEditingSnapshotScheme,
            path,
            query: JSON.stringify({
                sessionId: chatSessionId,
                requestId: requestId ?? '',
                undoStop: undoStop ?? '',
            }),
        });
    }
    constructor(_chatEditingService, _modelService) {
        this._chatEditingService = _chatEditingService;
        this._modelService = _modelService;
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const data = JSON.parse(resource.query);
        const session = this._chatEditingService.getEditingSession(data.sessionId);
        if (!(session instanceof ChatEditingSession) || !data.requestId) {
            return null;
        }
        return session.getSnapshotModel(data.requestId, data.undoStop || undefined, resource);
    }
};
ChatEditingSnapshotTextModelContentProvider = __decorate([
    __param(1, IModelService)
], ChatEditingSnapshotTextModelContentProvider);
export { ChatEditingSnapshotTextModelContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUZXh0TW9kZWxDb250ZW50UHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdUZXh0TW9kZWxDb250ZW50UHJvdmlkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFBRSx5QkFBeUIsRUFBdUIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQVFyRCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFtQzs7YUFDeEIsV0FBTSxHQUFHLHlCQUF5QixBQUE1QixDQUE0QjtJQUVsRCxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQXFCLEVBQUUsVUFBa0IsRUFBRSxJQUFZO1FBQy9FLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztZQUNmLE1BQU0sRUFBRSxxQ0FBbUMsQ0FBQyxNQUFNO1lBQ2xELElBQUk7WUFDSixLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDckIsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsVUFBVTtnQkFDVixhQUFhO2FBQ2tDLENBQUM7U0FDakQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFlBQ2tCLG1CQUF3QyxFQUN6QixhQUE0QjtRQUQzQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3pCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO0lBQzFELENBQUM7SUFFSixLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtR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