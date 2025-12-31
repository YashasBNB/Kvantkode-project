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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nRWRpdG9yT3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsYUFBYSxFQUNiLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUNOLE9BQU8sRUFDUCxPQUFPLEVBQ1AsV0FBVyxFQUVYLG1CQUFtQixFQUNuQix5QkFBeUIsRUFDekIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFFTixvQkFBb0IsR0FFcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sbUJBQW1CLEdBSW5CLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUU1RixPQUFPLEVBQ04scUNBQXFDLEVBQ3JDLE1BQU0sRUFDTixLQUFLLEdBQ0wsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUs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