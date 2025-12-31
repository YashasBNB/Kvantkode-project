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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUZXh0TW9kZWxDb250ZW50UHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nVGV4dE1vZGVsQ29udGVudFByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxPQUFPLEVBQUUseUJBQXlCLEVBQXVCLE1BQU0sb0NBQW9DLENBQUE7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFRckQsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBbUM7O2FBQ3hCLFdBQU0sR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7SUFFbEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxhQUFxQixFQUFFLFVBQWtCLEVBQUUsSUFBWTtRQUMvRSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZixNQUFNLEVBQUUscUNBQW1DLENBQUMsTUFBTTtZQUNsRCxJQUFJO1lBQ0osS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2dCQUNYLFVBQVU7Z0JBQ1YsYUFBYTthQUNrQyxDQUFDO1NBQ2pELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxZQUNrQixtQkFBd0MsRUFDekIsYUFBNEI7UUFEM0Msd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN6QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtJQUMxRCxDQUFDO0lBRUosS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWE7UUFDckMs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