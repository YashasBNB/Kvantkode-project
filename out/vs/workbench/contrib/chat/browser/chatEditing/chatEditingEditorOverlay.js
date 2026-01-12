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
import '../media/chatEditingEditorOverlay.css';
import { combinedDisposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedOpts, observableFromEvent, observableSignalFromEvent, observableValue, transaction, } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatEditingService, } from '../../common/chatEditingService.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { addDisposableGenericMouseMoveListener, append, reset, } from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { AcceptAction, navigationBearingFakeActionId, RejectAction, } from './chatEditingEditorActions.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { Event } from '../../../../../base/common/event.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ObservableEditorSession } from './chatEditingEditorContextKeys.js';
import { rcut } from '../../../../../base/common/strings.js';
let ChatEditorOverlayWidget = class ChatEditorOverlayWidget {
    constructor(_editor, _chatService, instaService) {
        this._editor = _editor;
        this._chatService = _chatService;
        this._showStore = new DisposableStore();
        this._session = observableValue(this, undefined);
        this._entry = observableValue(this, undefined);
        this._navigationBearings = observableValue(this, { changeCount: -1, activeIdx: -1, entriesCount: -1 });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editor-overlay-widget');
        const progressNode = document.createElement('div');
        progressNode.classList.add('chat-editor-overlay-progress');
        append(progressNode, renderIcon(ThemeIcon.modify(Codicon.loading, 'spin')));
        this._domNode.appendChild(progressNode);
        const toolbarNode = document.createElement('div');
        toolbarNode.classList.add('chat-editor-overlay-toolbar');
        this._domNode.appendChild(toolbarNode);
        this._toolbar = instaService.createInstance(MenuWorkbenchToolBar, toolbarNode, MenuId.ChatEditingEditorContent, {
            telemetrySource: 'chatEditor.overlayToolbar',
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: () => true,
                useSeparatorsInPrimaryActions: true,
            },
            menuOptions: { renderShortTitle: true },
            actionViewItemProvider: (action, options) => {
                const that = this;
                if (action.id === navigationBearingFakeActionId) {
                    return new (class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, {
                                ...options,
                                icon: false,
                                label: true,
                                keybindingNotRenderedWithLabel: true,
                            });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun((r) => {
                                assertType(this.label);
                                const { changeCount, activeIdx } = that._navigationBearings.read(r);
                                if (changeCount > 0) {
                                    const n = activeIdx === -1 ? '1' : `${activeIdx + 1}`;
                                    this.label.innerText = localize('nOfM', '{0} of {1}', n, changeCount);
                                }
                                else {
                                    this.label.innerText = localize('0Of0', '0 of 0');
                                }
                                this.updateTooltip();
                            }));
                        }
                        getTooltip() {
                            const { changeCount, entriesCount } = that._navigationBearings.get();
                            if (changeCount === -1 || entriesCount === -1) {
                                return undefined;
                            }
                            else if (changeCount === 1 && entriesCount === 1) {
                                return localize('tooltip_11', '1 change in 1 file');
                            }
                            else if (changeCount === 1) {
                                return localize('tooltip_1n', '1 change in {0} files', entriesCount);
                            }
                            else if (entriesCount === 1) {
                                return localize('tooltip_n1', '{0} changes in 1 file', changeCount);
                            }
                            else {
                                return localize('tooltip_nm', '{0} changes in {1} files', changeCount, entriesCount);
                            }
                        }
                    })();
                }
                if (action.id === AcceptAction.ID || action.id === RejectAction.ID) {
                    return new (class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, {
                                ...options,
                                icon: false,
                                label: true,
                                keybindingNotRenderedWithLabel: true,
                            });
                            this._reveal = this._store.add(new MutableDisposable());
                        }
                        render(container) {
                            super.render(container);
                            if (action.id === AcceptAction.ID) {
                                const listener = this._store.add(new MutableDisposable());
                                this._store.add(autorun((r) => {
                                    assertType(this.label);
                                    assertType(this.element);
                                    const ctrl = that._entry.read(r)?.autoAcceptController.read(r);
                                    if (ctrl) {
                                        const r = -100 * (ctrl.remaining / ctrl.total);
                                        this.element.style.setProperty('--vscode-action-item-auto-timeout', `${r}%`);
                                        this.element.classList.toggle('auto', true);
                                        listener.value = addDisposableGenericMouseMoveListener(this.element, () => ctrl.cancel());
                                    }
                                    else {
                                        this.element.classList.toggle('auto', false);
                                        listener.clear();
                                    }
                                }));
                            }
                        }
                        set actionRunner(actionRunner) {
                            super.actionRunner = actionRunner;
                            this._reveal.value = actionRunner.onWillRun((_e) => {
                                that._editor.focus();
                            });
                        }
                        get actionRunner() {
                            return super.actionRunner;
                        }
                    })();
                }
                if (action.id === 'inlineChat2.reveal' ||
                    action.id === 'workbench.action.chat.openEditSession') {
                    return new (class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, options);
                            this._requestMessage = derived((r) => {
                                const session = that._session.read(r);
                                const chatModel = that._chatService.getSession(session?.chatSessionId ?? '');
                                if (!session || !chatModel) {
                                    return undefined;
                                }
                                const response = that._entry.read(r)?.isCurrentlyBeingModifiedBy.read(r);
                                if (response) {
                                    if (response?.isPaused.read(r)) {
                                        return { message: localize('paused', 'Edits Paused'), paused: true };
                                    }
                                    const entry = that._entry.read(r);
                                    if (entry) {
                                        const progress = entry?.rewriteRatio.read(r);
                                        const message = progress === 0
                                            ? localize('generating', 'Generating edits')
                                            : localize('applyingPercentage', '{0}% Applying edits', Math.round(progress * 100));
                                        return { message };
                                    }
                                }
                                if (session.isGlobalEditingSession) {
                                    return undefined;
                                }
                                const request = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)).read(r);
                                if (!request || request.response?.isComplete) {
                                    return undefined;
                                }
                                return { message: request.message.text };
                            });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun((r) => {
                                assertType(this.label);
                                const value = this._requestMessage.read(r);
                                if (!value) {
                                    // normal rendering
                                    this.options.icon = true;
                                    this.options.label = false;
                                    reset(this.label);
                                    this.updateClass();
                                    this.updateLabel();
                                    this.updateTooltip();
                                }
                                else {
                                    this.options.icon = false;
                                    this.options.label = true;
                                    this.updateClass();
                                    this.updateTooltip();
                                    const message = rcut(value.message, 47);
                                    reset(this.label, message);
                                }
                                const busy = Boolean(value && !value.paused);
                                that._domNode.classList.toggle('busy', busy);
                                this.label.classList.toggle('busy', busy);
                            }));
                        }
                        getTooltip() {
                            return this._requestMessage.get()?.message || super.getTooltip();
                        }
                    })();
                }
                return undefined;
            },
        });
    }
    dispose() {
        this.hide();
        this._showStore.dispose();
        this._toolbar.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    show(session, entry, indicies) {
        this._showStore.clear();
        transaction((tx) => {
            this._session.set(session, tx);
            this._entry.set(entry, tx);
        });
        this._showStore.add(autorun((r) => {
            const entryIndex = indicies.entryIndex.read(r);
            const changeIndex = indicies.changeIndex.read(r);
            const entries = session.entries.read(r);
            let activeIdx = entryIndex !== undefined && changeIndex !== undefined ? changeIndex : -1;
            let totalChangesCount = 0;
            for (let i = 0; i < entries.length; i++) {
                const changesCount = entries[i].changesCount.read(r);
                totalChangesCount += changesCount;
                if (entryIndex !== undefined && i < entryIndex) {
                    activeIdx += changesCount;
                }
            }
            this._navigationBearings.set({ changeCount: totalChangesCount, activeIdx, entriesCount: entries.length }, undefined);
        }));
    }
    hide() {
        transaction((tx) => {
            this._session.set(undefined, tx);
            this._entry.set(undefined, tx);
            this._navigationBearings.set({ changeCount: -1, activeIdx: -1, entriesCount: -1 }, tx);
        });
        this._showStore.clear();
    }
};
ChatEditorOverlayWidget = __decorate([
    __param(1, IChatService),
    __param(2, IInstantiationService)
], ChatEditorOverlayWidget);
let ChatEditingOverlayController = class ChatEditingOverlayController {
    constructor(container, group, instaService, chatService, chatEditingService, inlineChatService) {
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editing-editor-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = `24px`;
        this._domNode.style.right = `24px`;
        this._domNode.style.zIndex = `100`;
        const widget = instaService.createInstance(ChatEditorOverlayWidget, group);
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        this._store.add(widget);
        const show = () => {
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                widget.hide();
                this._domNode.remove();
            }
        };
        const activeEditorSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange));
        const activeUriObs = derivedOpts({ equalsFn: isEqual }, (r) => {
            activeEditorSignal.read(r); // signal
            const editor = group.activeEditorPane;
            const uri = EditorResourceAccessor.getOriginalUri(editor?.input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            return uri;
        });
        const sessionAndEntry = derived((r) => {
            activeEditorSignal.read(r); // signal to ensure activeEditor and activeEditorPane don't go out of sync
            const uri = activeUriObs.read(r);
            if (!uri) {
                return undefined;
            }
            return new ObservableEditorSession(uri, chatEditingService, inlineChatService).value.read(r);
        });
        const isInProgress = derived((r) => {
            const session = sessionAndEntry.read(r)?.session;
            if (!session) {
                return false;
            }
            const chatModel = chatService.getSession(session.chatSessionId);
            const lastResponse = observableFromEvent(this, chatModel.onDidChange, () => chatModel.getRequests().at(-1)?.response);
            const response = lastResponse.read(r);
            if (!response) {
                return false;
            }
            return observableFromEvent(this, response.onDidChange, () => !response.isComplete).read(r);
        });
        this._store.add(autorun((r) => {
            const data = sessionAndEntry.read(r);
            if (!data) {
                hide();
                return;
            }
            const { session, entry } = data;
            if (entry?.state.read(r) === 0 /* WorkingSetEntryState.Modified */ || // any entry changing
                (!session.isGlobalEditingSession && isInProgress.read(r)) // inline chat request
            ) {
                // any session with changes
                const editorPane = group.activeEditorPane;
                assertType(editorPane);
                const changeIndex = derived((r) => entry ? entry.getEditorIntegration(editorPane).currentIndex.read(r) : 0);
                const entryIndex = derived((r) => (entry ? session.entries.read(r).indexOf(entry) : 0));
                widget.show(session, entry, { entryIndex, changeIndex });
                show();
            }
            else {
                // nothing
                hide();
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingOverlayController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IInlineChatSessionService)
], ChatEditingOverlayController);
let ChatEditingEditorOverlay = class ChatEditingEditorOverlay {
    static { this.ID = 'chat.edits.editorOverlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = new DisposableMap();
        this._store.add(autorun((r) => {
            const toDelete = new Set(overlayWidgets.keys());
            const groups = editorGroups.read(r);
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    // TODO@jrieken better with https://github.com/microsoft/vscode/tree/ben/layout-group-container
                    continue;
                }
                toDelete.delete(group); // we keep the widget for this group!
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const container = group.element;
                    const ctrl = scopedInstaService.createInstance(ChatEditingOverlayController, container, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], ChatEditingEditorOverlay);
export { ChatEditingEditorOverlay };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixhQUFhLEVBQ2IsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sT0FBTyxFQUNQLE9BQU8sRUFDUCxXQUFXLEVBRVgsbUJBQW1CLEVBQ25CLHlCQUF5QixFQUN6QixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUVOLG9CQUFvQixHQUVwQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixtQkFBbUIsR0FJbkIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRTVGLE9BQU8sRUFDTixxQ0FBcUMsRUFDckMsTUFBTSxFQUNOLEtBQUssR0FDTCxNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8s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