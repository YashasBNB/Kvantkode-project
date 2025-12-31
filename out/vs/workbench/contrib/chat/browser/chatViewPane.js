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
import { $, getWindow } from '../../../../base/browser/dom.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatModelInitState } from '../common/chatModel.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../common/constants.js';
import { ChatWidget } from './chatWidget.js';
import { ChatViewWelcomeController, } from './viewsWelcome/chatViewWelcomeController.js';
export const CHAT_SIDEBAR_OLD_VIEW_PANEL_ID = 'workbench.panel.chatSidebar';
export const CHAT_SIDEBAR_PANEL_ID = 'workbench.panel.chat';
export const CHAT_EDITING_SIDEBAR_PANEL_ID = 'workbench.panel.chatEditing';
let ChatViewPane = class ChatViewPane extends ViewPane {
    get widget() {
        return this._widget;
    }
    constructor(chatOptions, options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, storageService, chatService, chatAgentService, logService, layoutService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.chatOptions = chatOptions;
        this.storageService = storageService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.modelDisposables = this._register(new DisposableStore());
        this.defaultParticipantRegistrationFailed = false;
        this.didUnregisterProvider = false;
        // View state for the ViewPane is currently global per-provider basically, but some other strictly per-model state will require a separate memento.
        this.memento = new Memento('interactive-session-view-' +
            CHAT_PROVIDER_ID +
            (this.chatOptions.location === ChatAgentLocation.EditingSession ? `-edits` : ''), this.storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (this.chatService.unifiedViewEnabled &&
            this.chatOptions.location === ChatAgentLocation.Panel &&
            !this.viewState.hasMigratedCurrentSession) {
            const editsMemento = new Memento('interactive-session-view-' + CHAT_PROVIDER_ID + `-edits`, this.storageService);
            const lastEditsState = editsMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            if (lastEditsState.sessionId) {
                this.logService.trace(`ChatViewPane: last edits session was ${lastEditsState.sessionId}`);
                if (!this.chatService.isPersistedSessionEmpty(lastEditsState.sessionId)) {
                    this.logService.info(`ChatViewPane: migrating ${lastEditsState.sessionId} to unified view`);
                    this.viewState.sessionId = lastEditsState.sessionId;
                    this.viewState.inputValue = lastEditsState.inputValue;
                    this.viewState.inputState = {
                        ...lastEditsState.inputState,
                        chatMode: lastEditsState.inputState?.chatMode ?? ChatMode.Edit,
                    };
                    this.viewState.hasMigratedCurrentSession = true;
                }
            }
        }
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(this.chatOptions?.location)) {
                if (!this._widget?.viewModel && !this._restoringSession) {
                    const info = this.getTransferredOrPersistedSessionInfo();
                    this._restoringSession = (info.sessionId
                        ? this.chatService.getOrRestoreSession(info.sessionId)
                        : Promise.resolve(undefined)).then(async (model) => {
                        // The widget may be hidden at this point, because welcome views were allowed. Use setVisible to
                        // avoid doing a render while the widget is hidden. This is changing the condition in `shouldShowWelcome`
                        // so it should fire onDidChangeViewWelcomeState.
                        const wasVisible = this._widget.visible;
                        try {
                            this._widget.setVisible(false);
                            await this.updateModel(model, info.inputValue || info.mode
                                ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue }
                                : undefined);
                            this.defaultParticipantRegistrationFailed = false;
                            this.didUnregisterProvider = false;
                            this._onDidChangeViewWelcomeState.fire();
                        }
                        finally {
                            this.widget.setVisible(wasVisible);
                        }
                    });
                    this._restoringSession.finally(() => (this._restoringSession = undefined));
                }
            }
            else if (this._widget?.viewModel?.initState === ChatModelInitState.Initialized) {
                // Model is initialized, and the default agent disappeared, so show welcome view
                this.didUnregisterProvider = true;
            }
            this._onDidChangeViewWelcomeState.fire();
        }));
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(ChatContextKeys.SetupViewKeys)) {
                this._onDidChangeViewWelcomeState.fire();
            }
        }));
    }
    getActionsContext() {
        return this.widget?.viewModel
            ? {
                sessionId: this.widget.viewModel.sessionId,
                $mid: 19 /* MarshalledId.ChatViewContext */,
            }
            : undefined;
    }
    async updateModel(model, viewState) {
        this.modelDisposables.clear();
        model =
            model ??
                (this.chatService.transferredSessionData?.sessionId &&
                    this.chatService.transferredSessionData?.location === this.chatOptions.location
                    ? await this.chatService.getOrRestoreSession(this.chatService.transferredSessionData.sessionId)
                    : this.chatService.startSession(this.chatOptions.location, CancellationToken.None));
        if (!model) {
            throw new Error('Could not start chat session');
        }
        if (viewState) {
            this.updateViewState(viewState);
        }
        this.viewState.sessionId = model.sessionId;
        this._widget.setModel(model, { ...this.viewState });
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    shouldShowWelcome() {
        const showSetup = this.contextKeyService.contextMatchesRules(ChatContextKeys.SetupViewCondition);
        const noPersistedSessions = !this.chatService.hasSessions();
        const hasCoreAgent = this.chatAgentService
            .getAgents()
            .some((agent) => agent.isCore && agent.locations.includes(this.chatOptions.location));
        const shouldShow = !hasCoreAgent &&
            (this.didUnregisterProvider ||
                (!this._widget?.viewModel && noPersistedSessions) ||
                this.defaultParticipantRegistrationFailed ||
                showSetup);
        this.logService.trace(`ChatViewPane#shouldShowWelcome(${this.chatOptions.location}) = ${shouldShow}: hasCoreAgent=${hasCoreAgent} didUnregister=${this.didUnregisterProvider} || noViewModel=${!this._widget?.viewModel} && noPersistedSessions=${noPersistedSessions} || defaultParticipantRegistrationFailed=${this.defaultParticipantRegistrationFailed} || showSetup=${showSetup}`);
        return !!shouldShow;
    }
    getTransferredOrPersistedSessionInfo() {
        if (this.chatService.transferredSessionData?.location === this.chatOptions.location) {
            const sessionId = this.chatService.transferredSessionData.sessionId;
            return {
                sessionId,
                inputValue: this.chatService.transferredSessionData.inputValue,
                mode: this.chatService.transferredSessionData.mode,
            };
        }
        else {
            return { sessionId: this.viewState.sessionId };
        }
    }
    async renderBody(parent) {
        try {
            super.renderBody(parent);
            this._register(this.instantiationService.createInstance(ChatViewWelcomeController, parent, this, this.chatOptions.location));
            const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            const locationBasedColors = this.getLocationBasedColors();
            const editorOverflowNode = this.layoutService
                .getContainer(getWindow(parent))
                .appendChild($('.chat-editor-overflow.monaco-editor'));
            this._register({ dispose: () => editorOverflowNode.remove() });
            this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, this.chatOptions.location, { viewId: this.id }, {
                autoScroll: (mode) => mode !== ChatMode.Ask,
                renderFollowups: this.chatOptions.location === ChatAgentLocation.Panel,
                supportsFileReferences: true,
                supportsAdditionalParticipants: this.chatOptions.location === ChatAgentLocation.Panel,
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        return this.chatService.isEditingLocation(this.chatOptions.location);
                    },
                    referencesExpandedWhenEmptyResponse: !this.chatService.isEditingLocation(this.chatOptions.location),
                    progressMessageAtBottomOfResponse: (mode) => mode !== ChatMode.Ask,
                },
                editorOverflowWidgetsDomNode: editorOverflowNode,
                enableImplicitContext: this.chatOptions.location === ChatAgentLocation.Panel ||
                    this.chatService.isEditingLocation(this.chatOptions.location),
                enableWorkingSet: this.chatService.isEditingLocation(this.chatOptions.location)
                    ? 'explicit'
                    : undefined,
                supportsChangingModes: this.chatService.isEditingLocation(this.chatOptions.location),
            }, {
                listForeground: SIDE_BAR_FOREGROUND,
                listBackground: locationBasedColors.background,
                overlayBackground: locationBasedColors.overlayBackground,
                inputEditorBackground: locationBasedColors.background,
                resultEditorBackground: editorBackground,
            }));
            this._register(this.onDidChangeBodyVisibility((visible) => {
                this._widget.setVisible(visible);
            }));
            this._register(this._widget.onDidClear(() => this.clear()));
            this._widget.render(parent);
            const info = this.getTransferredOrPersistedSessionInfo();
            const disposeListener = this._register(this.chatService.onDidDisposeSession((e) => {
                // Render the welcome view if provider registration fails, eg when signed out. This activates for any session, but the problem is the same regardless
                if (e.reason === 'initializationFailed') {
                    this.defaultParticipantRegistrationFailed = true;
                    disposeListener?.dispose();
                    this._onDidChangeViewWelcomeState.fire();
                }
            }));
            const model = info.sessionId
                ? await this.chatService.getOrRestoreSession(info.sessionId)
                : undefined;
            await this.updateModel(model, info.inputValue || info.mode
                ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue }
                : undefined);
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    acceptInput(query) {
        this._widget.acceptInput(query);
    }
    async clear() {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        // Grab the widget's latest view state because it will be loaded back into the widget
        this.updateViewState();
        await this.updateModel(undefined);
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    async loadSession(sessionId, viewState) {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        const newModel = await this.chatService.getOrRestoreSession(sessionId);
        await this.updateModel(newModel, viewState);
    }
    focusInput() {
        this._widget.focusInput();
    }
    focus() {
        super.focus();
        this._widget.focusInput();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._widget.layout(height, width);
    }
    saveState() {
        if (this._widget) {
            // Since input history is per-provider, this is handled by a separate service and not the memento here.
            // TODO multiple chat views will overwrite each other
            this._widget.saveState();
            this.updateViewState();
            this.memento.saveMemento();
        }
        super.saveState();
    }
    updateViewState(viewState) {
        const newViewState = viewState ?? this._widget.getViewState();
        for (const [key, value] of Object.entries(newViewState)) {
            // Assign all props to the memento so they get saved
            ;
            this.viewState[key] = value;
        }
    }
};
ChatViewPane = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IStorageService),
    __param(12, IChatService),
    __param(13, IChatAgentService),
    __param(14, ILogService),
    __param(15, ILayoutService)
], ChatViewPane);
export { ChatViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRWaWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFh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