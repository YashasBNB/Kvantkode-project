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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UmVsYXRlZEZpbGVzQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdElucHV0UmVsYXRlZEZpbGVzQ29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsbUJBQW1CLEVBQXVCLE1BQU0sb0NBQW9DLENBQUE7QUFDN0YsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXJELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUMzQyxPQUFFLEdBQUcsNkJBQTZCLEFBQWhDLENBQWdDO0lBS2xELFlBQ3NCLGtCQUF3RCxFQUN6RCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFIK0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN4QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBTDFELGtD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