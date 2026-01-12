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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFF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