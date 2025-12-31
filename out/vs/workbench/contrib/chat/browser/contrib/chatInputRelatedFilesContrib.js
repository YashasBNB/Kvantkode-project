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
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { autorun } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatWidgetService } from '../chat.js';
let ChatRelatedFilesContribution = class ChatRelatedFilesContribution extends Disposable {
    static { this.ID = 'chat.relatedFilesWorkingSet'; }
    constructor(chatEditingService, chatWidgetService) {
        super();
        this.chatEditingService = chatEditingService;
        this.chatWidgetService = chatWidgetService;
        this.chatEditingSessionDisposables = new Map();
        this._register(autorun((reader) => {
            const sessions = this.chatEditingService.editingSessionsObs.read(reader);
            sessions.forEach((session) => {
                const widget = this.chatWidgetService.getWidgetBySessionId(session.chatSessionId);
                if (widget && !this.chatEditingSessionDisposables.has(session.chatSessionId)) {
                    this._handleNewEditingSession(session, widget);
                }
            });
        }));
    }
    _updateRelatedFileSuggestions(currentEditingSession, widget) {
        if (this._currentRelatedFilesRetrievalOperation) {
            return;
        }
        const workingSetEntries = currentEditingSession.entries.get();
        if (workingSetEntries.length > 0 || widget.attachmentModel.fileAttachments.length === 0) {
            // Do this only for the initial working set state
            return;
        }
        this._currentRelatedFilesRetrievalOperation = this.chatEditingService
            .getRelatedFiles(currentEditingSession.chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
            .then((files) => {
            if (!files?.length || !widget.viewModel?.sessionId || !widget.input.relatedFiles) {
                return;
            }
            const currentEditingSession = this.chatEditingService.getEditingSession(widget.viewModel.sessionId);
            if (!currentEditingSession || currentEditingSession.entries.get().length) {
                return; // Might have disposed while we were calculating
            }
            const existingFiles = new ResourceSet([
                ...widget.attachmentModel.fileAttachments,
                ...widget.input.relatedFiles.removedFiles,
            ]);
            if (!existingFiles.size) {
                return;
            }
            // Pick up to 2 related files
            const newSuggestions = new ResourceMap();
            for (const group of files) {
                for (const file of group.files) {
                    if (newSuggestions.size >= 2) {
                        break;
                    }
                    if (existingFiles.has(file.uri)) {
                        continue;
                    }
                    newSuggestions.set(file.uri, localize('relatedFile', '{0} (Suggested)', file.description));
                    existingFiles.add(file.uri);
                }
            }
            widget.input.relatedFiles.value = [...newSuggestions.entries()].map(([uri, description]) => ({ uri, description }));
        })
            .finally(() => {
            this._currentRelatedFilesRetrievalOperation = undefined;
        });
    }
    _handleNewEditingSession(currentEditingSession, widget) {
        const disposableStore = new DisposableStore();
        disposableStore.add(currentEditingSession.onDidDispose(() => {
            disposableStore.clear();
        }));
        this._updateRelatedFileSuggestions(currentEditingSession, widget);
        const onDebouncedType = Event.debounce(widget.inputEditor.onDidChangeModelContent, () => null, 3000);
        disposableStore.add(onDebouncedType(() => {
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        disposableStore.add(widget.attachmentModel.onDidChangeContext(() => {
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        disposableStore.add(currentEditingSession.onDidDispose(() => {
            disposableStore.dispose();
        }));
        disposableStore.add(widget.onDidAcceptInput(() => {
            widget.input.relatedFiles?.clear();
            this._updateRelatedFileSuggestions(currentEditingSession, widget);
        }));
        this.chatEditingSessionDisposables.set(currentEditingSession.chatSessionId, disposableStore);
    }
    dispose() {
        for (const store of this.chatEditingSessionDisposables.values()) {
            store.dispose();
        }
        super.dispose();
    }
};
ChatRelatedFilesContribution = __decorate([
    __param(0, IChatEditingService),
    __param(1, IChatWidgetService)
], ChatRelatedFilesContribution);
export { ChatRelatedFilesContribution };
export class ChatRelatedFiles extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._removedFiles = new ResourceSet();
        this._value = [];
    }
    get removedFiles() {
        return this._removedFiles;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value;
        this._onDidChange.fire();
    }
    remove(uri) {
        this._value = this._value.filter((file) => !isEqual(file.uri, uri));
        this._removedFiles.add(uri);
        this._onDidChange.fire();
    }
    clearRemovedFiles() {
        this._removedFiles.clear();
    }
    clear() {
        this._value = [];
        this._removedFiles.clear();
        this._onDidChange.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UmVsYXRlZEZpbGVzQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbnB1dFJlbGF0ZWRGaWxlc0NvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFaEQsT0FBTyxFQUFFLG1CQUFtQixFQUF1QixNQUFNLG9DQUFvQyxDQUFBO0FBQzdGLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVyRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDM0MsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQztJQUtsRCxZQUNzQixrQkFBd0QsRUFDekQsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBSCtCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDeEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUwxRCxrQ0FBNkIsR0FBRyxJQUFJLEdBQUcsRUFB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