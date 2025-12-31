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
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground, editorForeground, inputBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { Memento } from '../../../common/memento.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../common/constants.js';
import { clearChatEditor } from './actions/chatClear.js';
import { ChatEditorInput } from './chatEditorInput.js';
import { ChatWidget } from './chatWidget.js';
let ChatEditor = class ChatEditor extends EditorPane {
    get scopedContextKeyService() {
        return this._scopedContextKeyService;
    }
    constructor(group, telemetryService, themeService, instantiationService, storageService, contextKeyService, chatService) {
        super(ChatEditorInput.EditorID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.chatService = chatService;
    }
    async clear() {
        if (this.input) {
            return this.instantiationService.invokeFunction(clearChatEditor, this.input);
        }
    }
    createEditor(parent) {
        this._scopedContextKeyService = this._register(this.contextKeyService.createScoped(parent));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Panel, undefined, {
            autoScroll: (mode) => mode !== ChatMode.Ask,
            renderFollowups: true,
            supportsFileReferences: true,
            supportsAdditionalParticipants: true,
            rendererOptions: {
                renderTextEditsAsSummary: (uri) => {
                    return this.chatService.isEditingLocation(ChatAgentLocation.Panel);
                },
                referencesExpandedWhenEmptyResponse: !this.chatService.isEditingLocation(ChatAgentLocation.Panel),
                progressMessageAtBottomOfResponse: (mode) => mode !== ChatMode.Ask,
            },
            enableImplicitContext: true,
            enableWorkingSet: this.chatService.isEditingLocation(ChatAgentLocation.Panel)
                ? 'explicit'
                : undefined,
            supportsChangingModes: this.chatService.isEditingLocation(ChatAgentLocation.Panel),
        }, {
            listForeground: editorForeground,
            listBackground: editorBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground,
        }));
        this._register(this.widget.onDidClear(() => this.clear()));
        this.widget.render(parent);
        this.widget.setVisible(true);
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        this.widget?.setVisible(visible);
    }
    focus() {
        super.focus();
        this.widget?.focusInput();
    }
    clearInput() {
        this.saveState();
        super.clearInput();
    }
    async setInput(input, options, context, token) {
        super.setInput(input, options, context, token);
        const editorModel = await input.resolve();
        if (!editorModel) {
            throw new Error(`Failed to get model for chat editor. id: ${input.sessionId}`);
        }
        if (!this.widget) {
            throw new Error('ChatEditor lifecycle issue: no editor widget');
        }
        this.updateModel(editorModel.model, options?.viewState ?? input.options.viewState);
    }
    updateModel(model, viewState) {
        this._memento = new Memento('interactive-session-editor-' + CHAT_PROVIDER_ID, this.storageService);
        this._viewState =
            viewState ??
                this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this.widget.setModel(model, { ...this._viewState });
    }
    saveState() {
        this.widget?.saveState();
        if (this._memento && this._viewState) {
            const widgetViewState = this.widget.getViewState();
            // Need to set props individually on the memento
            this._viewState.inputValue = widgetViewState.inputValue;
            this._viewState.inputState = widgetViewState.inputState;
            this._memento.saveMemento();
        }
    }
    getViewState() {
        return { ...this._viewState };
    }
    layout(dimension, position) {
        if (this.widget) {
            this.widget.layout(dimension.height, dimension.width);
        }
    }
};
ChatEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IContextKeyService),
    __param(6, IChatService)
], ChatEditor);
export { ChatEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsZUFBZSxHQUNmLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDcEQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFB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