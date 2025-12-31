var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, observableFromEvent, } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { IChatEditingService, } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
export const ctxIsGlobalEditingSession = new RawContextKey('chatEdits.isGlobalEditingSession', undefined, localize('chat.ctxEditSessionIsGlobal', 'The current editor is part of the global edit session'));
export const ctxHasEditorModification = new RawContextKey('chatEdits.hasEditorModifications', undefined, localize('chat.hasEditorModifications', 'The current editor contains chat modifications'));
export const ctxReviewModeEnabled = new RawContextKey('chatEdits.isReviewModeEnabled', true, localize('chat.ctxReviewModeEnabled', 'Review mode for chat changes is enabled'));
export const ctxHasRequestInProgress = new RawContextKey('chatEdits.isRequestInProgress', false, localize('chat.ctxHasRequestInProgress', 'The current editor shows a file from an edit session which is still in progress'));
export const ctxRequestCount = new RawContextKey('chatEdits.requestCount', 0, localize('chatEdits.requestCount', 'The number of turns the editing session in this editor has'));
let ChatEditingEditorContextKeys = class ChatEditingEditorContextKeys {
    static { this.ID = 'chat.edits.editorContextKeys'; }
    constructor(instaService, editorGroupsService) {
        this._store = new DisposableStore();
        const editorGroupCtx = this._store.add(new DisposableMap());
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        this._store.add(autorun((r) => {
            const toDispose = new Set(editorGroupCtx.keys());
            for (const group of editorGroups.read(r)) {
                toDispose.delete(group);
                if (editorGroupCtx.has(group)) {
                    continue;
                }
                editorGroupCtx.set(group, instaService.createInstance(ContextKeyGroup, group));
            }
            for (const item of toDispose) {
                editorGroupCtx.deleteAndDispose(item);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorContextKeys = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorGroupsService)
], ChatEditingEditorContextKeys);
export { ChatEditingEditorContextKeys };
let ContextKeyGroup = class ContextKeyGroup {
    constructor(group, inlineChatSessionService, chatEditingService, chatService) {
        this._store = new DisposableStore();
        this._ctxIsGlobalEditingSession = ctxIsGlobalEditingSession.bindTo(group.scopedContextKeyService);
        this._ctxHasEditorModification = ctxHasEditorModification.bindTo(group.scopedContextKeyService);
        this._ctxHasRequestInProgress = ctxHasRequestInProgress.bindTo(group.scopedContextKeyService);
        this._ctxReviewModeEnabled = ctxReviewModeEnabled.bindTo(group.scopedContextKeyService);
        this._ctxRequestCount = ctxRequestCount.bindTo(group.scopedContextKeyService);
        const editorObs = observableFromEvent(this, group.onDidModelChange, () => group.activeEditor);
        this._store.add(autorun((r) => {
            const editor = editorObs.read(r);
            const uri = EditorResourceAccessor.getOriginalUri(editor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            if (!uri) {
                this._reset();
                return;
            }
            const tuple = new ObservableEditorSession(uri, chatEditingService, inlineChatSessionService).value.read(r);
            if (!tuple) {
                this._reset();
                return;
            }
            const { session, entry, isInlineChat } = tuple;
            const chatModel = chatService.getSession(session.chatSessionId);
            const isRequestInProgress = chatModel
                ? observableFromEvent(this, chatModel.onDidChange, () => chatModel.requestInProgress)
                : constObservable(false);
            this._ctxHasEditorModification.set(isInlineChat || entry?.state.read(r) === 0 /* WorkingSetEntryState.Modified */);
            this._ctxIsGlobalEditingSession.set(session.isGlobalEditingSession);
            this._ctxReviewModeEnabled.set(entry ? entry.reviewMode.read(r) : false);
            this._ctxHasRequestInProgress.set(Boolean(entry?.isCurrentlyBeingModifiedBy.read(r)) || // any entry changing
                (isInlineChat && isRequestInProgress.read(r)));
            // number of requests
            const requestCount = chatModel
                ? observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().length)
                : constObservable(0);
            this._ctxRequestCount.set(requestCount.read(r));
        }));
    }
    _reset() {
        this._ctxIsGlobalEditingSession.reset();
        this._ctxHasEditorModification.reset();
        this._ctxHasRequestInProgress.reset();
        this._ctxReviewModeEnabled.reset();
        this._ctxRequestCount.reset();
    }
    dispose() {
        this._store.dispose();
        this._reset();
    }
};
ContextKeyGroup = __decorate([
    __param(1, IInlineChatSessionService),
    __param(2, IChatEditingService),
    __param(3, IChatService)
], ContextKeyGroup);
let ObservableEditorSession = class ObservableEditorSession {
    constructor(uri, chatEditingService, inlineChatService) {
        const inlineSessionObs = observableFromEvent(this, inlineChatService.onDidChangeSessions, () => inlineChatService.getSession2(uri));
        const sessionObs = chatEditingService.editingSessionsObs.map((value, r) => {
            for (const session of value) {
                const entry = session.readEntry(uri, r);
                if (entry) {
                    return { session, entry, isInlineChat: false };
                }
            }
            return undefined;
        });
        this.value = derived((r) => {
            const inlineSession = inlineSessionObs.read(r);
            if (inlineSession) {
                return {
                    session: inlineSession.editingSession,
                    entry: inlineSession.editingSession.readEntry(uri, r),
                    isInlineChat: true,
                };
            }
            return sessionObs.read(r);
        });
    }
};
ObservableEditorSession = __decorate([
    __param(1, IChatEditingService),
    __param(2, IInlineChatSessionService)
], ObservableEditorSession);
export { ObservableEditorSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JDb250ZXh0S2V5cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ0VkaXRvckNvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hGLE9BQU8sRUFDTixPQUFPLEVBQ1AsZUFBZSxFQUNmLE9BQU8sRUFFUCxtQkFBbUIsR0FDbkIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNuRyxPQUFPLEVBQ04sbUJBQW1CLEdBSW5CLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRTFELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLElBQUksYUFBYSxDQUN6RCxrQ0FBa0MsRUFDbEMsU0FBUyxFQUNULFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx1REFBdUQsQ0FBQyxD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