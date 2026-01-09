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
var ChatInputPart_1;
import * as dom from '../../../../base/browser/dom.js';
import { addDisposableListener } from '../../../../base/browser/dom.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate, } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Separator, toAction, } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { HistoryNavigator2 } from '../../../../base/common/history.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar } from '../../../../platform/actions/browser/buttonbar.js';
import { DropdownMenuActionViewItemWithKeybinding } from '../../../../platform/actions/browser/dropdownActionViewItemWithKeybinding.js';
import { DropdownWithPrimaryActionViewItem, } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar, } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerAndCreateHistoryNavigationContext } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { getSimpleCodeEditorWidgetOptions, getSimpleEditorOptions, setupSimpleEditorSelectionStyling, } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { isImageVariableEntry, isPasteVariableEntry, } from '../common/chatModel.js';
import { IChatService } from '../common/chatService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { IContextGatheringService } from '../../void/browser/contextGatheringService.js';
import { ChatInputHistoryMaxEntries, IChatWidgetHistoryService, } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode, validateChatMode, } from '../common/constants.js';
import { ILanguageModelsService, } from '../common/languageModels.js';
import { CancelAction, ChatEditingSessionSubmitAction, ChatSubmitAction, ChatSwitchToNextModelActionId, ToggleAgentModeActionId, } from './actions/chatExecuteActions.js';
import { AttachToolsAction } from './actions/chatToolActions.js';
import { ImplicitContextAttachmentWidget } from './attachments/implicitContextAttachment.js';
import { PromptAttachmentsCollectionWidget } from './attachments/promptAttachments/promptAttachmentsCollectionWidget.js';
import { ChatAttachmentModel } from './chatAttachmentModel.js';
import { toChatVariable } from './chatAttachmentModel/chatPromptAttachmentsCollection.js';
import { DefaultChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, PasteAttachmentWidget, } from './chatAttachmentWidgets.js';
import { CollapsibleListPool, } from './chatContentParts/chatReferencesContentPart.js';
import { ChatDragAndDrop } from './chatDragAndDrop.js';
import { ChatEditingRemoveAllFilesAction, ChatEditingShowChangesAction, } from './chatEditing/chatEditingActions.js';
import { ChatFollowups } from './chatFollowups.js';
import { ChatSelectedTools } from './chatSelectedTools.js';
import { ChatFileReference } from './contrib/chatDynamicVariables/chatFileReference.js';
import { ChatImplicitContext } from './contrib/chatImplicitContext.js';
import { ChatRelatedFiles } from './contrib/chatInputRelatedFilesContrib.js';
import { resizeImage } from './imageUtils.js';
const $ = dom.$;
const INPUT_EDITOR_MAX_HEIGHT = 250;
let ChatInputPart = class ChatInputPart extends Disposable {
    static { ChatInputPart_1 = this; }
    static { this.INPUT_SCHEME = 'chatSessionInput'; }
    static { this._counter = 0; }
    get attachmentModel() {
        return this._attachmentModel;
    }
    getAttachedAndImplicitContext(sessionId) {
        const contextArr = [...this.attachmentModel.attachments];
        if (this.implicitContext?.enabled && this.implicitContext.value) {
            contextArr.push(this.implicitContext.toBaseEntry());
        }
        // factor in nested file links of a prompt into the implicit context
        const variables = this.variableService.getDynamicVariables(sessionId);
        for (const variable of variables) {
            if (!(variable instanceof ChatFileReference)) {
                continue;
            }
            // the usual URIs list of prompt instructions is `bottom-up`, therefore
            // we do the same here - first add all child references to the list
            contextArr.push(...variable.allValidReferences.map((link) => {
                return toChatVariable(link, false);
            }));
        }
        try {
            const snippets = this.contextGatheringService.getCachedSnippets();
            const list = Array.isArray(snippets) ? snippets : [];
            for (let i = 0; i < list.length; i++) {
                const snippet = list[i];
                if (typeof snippet === 'string' && snippet.trim()) {
                    contextArr.push({
                        id: `gather:${this.location}:${i}`,
                        name: 'gather',
                        value: snippet,
                        isOmitted: true,
                    });
                }
            }
        }
        catch {
            // ignore
        }
        contextArr.push(...this.instructionAttachmentsPart.chatAttachments);
        return contextArr;
    }
    /**
     * Check if the chat input part has any prompt instruction attachments.
     */
    get hasInstructionAttachments() {
        return !this.instructionAttachmentsPart.empty;
    }
    get implicitContext() {
        return this._implicitContext;
    }
    get relatedFiles() {
        return this._relatedFiles;
    }
    get inputPartHeight() {
        return this._inputPartHeight;
    }
    get followupsHeight() {
        return this._followupsHeight;
    }
    get editSessionWidgetHeight() {
        return this._editSessionWidgetHeight;
    }
    get inputEditor() {
        return this._inputEditor;
    }
    get currentLanguageModel() {
        return this._currentLanguageModel?.identifier;
    }
    get currentMode() {
        if (this.location === ChatAgentLocation.Panel && !this.chatService.unifiedViewEnabled) {
            return ChatMode.Ask;
        }
        return this._currentMode === ChatMode.Agent && !this.agentService.hasToolsAgent
            ? ChatMode.Edit
            : this._currentMode;
    }
    get selectedElements() {
        const edits = [];
        const editsList = this._chatEditList?.object;
        const selectedElements = editsList?.getSelectedElements() ?? [];
        for (const element of selectedElements) {
            if (element.kind === 'reference' && URI.isUri(element.reference)) {
                edits.push(element.reference);
            }
        }
        return edits;
    }
    /**
     * The number of working set entries that the user actually wanted to attach.
     * This is less than or equal to {@link ChatInputPart.chatEditWorkingSetFiles}.
     */
    get attemptedWorkingSetEntriesCount() {
        return this._attemptedWorkingSetEntriesCount;
    }
    constructor(
    // private readonly editorOptions: ChatEditorOptions, // TODO this should be used
    location, options, styles, getContribsInputState, historyService, modelService, instantiationService, contextKeyService, configurationService, keybindingService, accessibilityService, languageModelsService, logService, fileService, editorService, themeService, textModelResolverService, storageService, labelService, variableService, agentService, chatService, sharedWebExtracterService, experimentService, contextGatheringService) {
        super();
        this.location = location;
        this.options = options;
        this.historyService = historyService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.languageModelsService = languageModelsService;
        this.logService = logService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.textModelResolverService = textModelResolverService;
        this.storageService = storageService;
        this.labelService = labelService;
        this.variableService = variableService;
        this.agentService = agentService;
        this.chatService = chatService;
        this.sharedWebExtracterService = sharedWebExtracterService;
        this.experimentService = experimentService;
        this.contextGatheringService = contextGatheringService;
        this._onDidLoadInputState = this._register(new Emitter());
        this.onDidLoadInputState = this._onDidLoadInputState.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeContext = this._register(new Emitter());
        this.onDidChangeContext = this._onDidChangeContext.event;
        this._onDidAcceptFollowup = this._register(new Emitter());
        this.onDidAcceptFollowup = this._onDidAcceptFollowup.event;
        this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        this._onDidChangeVisibility = this._register(new Emitter());
        this._contextResourceLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event });
        this.inputEditorHeight = 0;
        this.followupsDisposables = this._register(new DisposableStore());
        this.attachedContextDisposables = this._register(new MutableDisposable());
        this._inputPartHeight = 0;
        this._followupsHeight = 0;
        this._editSessionWidgetHeight = 0;
        this._waitForPersistedLanguageModel = this._register(new MutableDisposable());
        this._onDidChangeCurrentLanguageModel = this._register(new Emitter());
        this._onDidChangeCurrentChatMode = this._register(new Emitter());
        this.onDidChangeCurrentChatMode = this._onDidChangeCurrentChatMode.event;
        this._currentMode = ChatMode.Ask;
        this.inputUri = URI.parse(`${ChatInputPart_1.INPUT_SCHEME}:input-${ChatInputPart_1._counter++}`);
        this._chatEditsActionsDisposables = this._register(new DisposableStore());
        this._chatEditsDisposables = this._register(new DisposableStore());
        this._attemptedWorkingSetEntriesCount = 0;
        this._attachmentModel = this._register(this.instantiationService.createInstance(ChatAttachmentModel));
        this.selectedToolsModel = this._register(this.instantiationService.createInstance(ChatSelectedTools));
        this.dnd = this._register(this.instantiationService.createInstance(ChatDragAndDrop, this._attachmentModel, styles));
        this.getInputState = () => {
            return {
                ...getContribsInputState(),
                chatContextAttachments: this._attachmentModel.attachments,
                chatMode: this._currentMode,
            };
        };
        this.inputEditorMaxHeight =
            this.options.renderStyle === 'compact' ? INPUT_EDITOR_MAX_HEIGHT / 3 : INPUT_EDITOR_MAX_HEIGHT;
        this.inputEditorHasText = ChatContextKeys.inputHasText.bindTo(contextKeyService);
        this.chatCursorAtTop = ChatContextKeys.inputCursorAtTop.bindTo(contextKeyService);
        this.inputEditorHasFocus = ChatContextKeys.inputHasFocus.bindTo(contextKeyService);
        this.promptInstructionsAttached = ChatContextKeys.instructionsAttached.bindTo(contextKeyService);
        this.chatMode = ChatContextKeys.chatMode.bindTo(contextKeyService);
        this.history = this.loadHistory();
        this._register(this.historyService.onDidClearHistory(() => (this.history = new HistoryNavigator2([{ text: '' }], ChatInputHistoryMaxEntries, historyKeyFn))));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */)) {
                this.inputEditor.updateOptions({ ariaLabel: this._getAriaLabel() });
            }
        }));
        this._chatEditsListPool = this._register(this.instantiationService.createInstance(CollapsibleListPool, this._onDidChangeVisibility.event, MenuId.ChatEditingWidgetModifiedFilesToolbar));
        this._hasFileAttachmentContextKey = ChatContextKeys.hasFileAttachments.bindTo(contextKeyService);
        this.instructionAttachmentsPart = this._register(instantiationService.createInstance(PromptAttachmentsCollectionWidget, this.attachmentModel.promptInstructions, this._contextResourceLabels));
        // trigger re-layout of chat input when number of instruction attachment changes
        this.instructionAttachmentsPart.onAttachmentsCountChange(() => {
            this._onDidChangeHeight.fire();
        });
        this.initSelectedModel();
    }
    getSelectedModelStorageKey() {
        return `chat.currentLanguageModel.${this.location}`;
    }
    initSelectedModel() {
        const persistedSelection = this.storageService.get(this.getSelectedModelStorageKey(), -1 /* StorageScope.APPLICATION */);
        if (persistedSelection) {
            const model = this.languageModelsService.lookupLanguageModel(persistedSelection);
            if (model) {
                this.setCurrentLanguageModel({ metadata: model, identifier: persistedSelection });
                this.checkModelSupported();
            }
            else {
                this._waitForPersistedLanguageModel.value =
                    this.languageModelsService.onDidChangeLanguageModels((e) => {
                        const persistedModel = e.added?.find((m) => m.identifier === persistedSelection);
                        if (persistedModel) {
                            this._waitForPersistedLanguageModel.clear();
                            if (persistedModel.metadata.isUserSelectable) {
                                this.setCurrentLanguageModel({
                                    metadata: persistedModel.metadata,
                                    identifier: persistedSelection,
                                });
                                this.checkModelSupported();
                            }
                        }
                    });
            }
        }
        this._register(this._onDidChangeCurrentChatMode.event(() => {
            this.checkModelSupported();
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ChatConfiguration.Edits2Enabled)) {
                this.checkModelSupported();
            }
        }));
    }
    switchToNextModel() {
        const models = this.getModels();
        if (models.length > 0) {
            const currentIndex = models.findIndex((model) => model.identifier === this._currentLanguageModel?.identifier);
            const nextIndex = (currentIndex + 1) % models.length;
            this.setCurrentLanguageModel(models[nextIndex]);
        }
    }
    checkModelSupported() {
        if (this._currentLanguageModel &&
            !this.modelSupportedForDefaultAgent(this._currentLanguageModel)) {
            this.setCurrentLanguageModelToDefault();
        }
    }
    setChatMode(mode) {
        if (!this.options.supportsChangingModes) {
            return;
        }
        mode =
            validateChatMode(mode) ??
                (this.location === ChatAgentLocation.Panel ? ChatMode.Ask : ChatMode.Edit);
        this._currentMode = mode;
        this.chatMode.set(mode);
        this._onDidChangeCurrentChatMode.fire();
    }
    modelSupportedForDefaultAgent(model) {
        // Probably this logic could live in configuration on the agent, or somewhere else, if it gets more complex
        if (this.currentMode === ChatMode.Agent ||
            (this.currentMode === ChatMode.Edit &&
                this.configurationService.getValue(ChatConfiguration.Edits2Enabled))) {
            if (this.configurationService.getValue('chat.agent.allModels')) {
                return true;
            }
            const supportsToolsAgent = typeof model.metadata.capabilities?.agentMode === 'undefined' ||
                model.metadata.capabilities.agentMode;
            // Filter out models that don't support tool calling, and models that don't support enough context to have a good experience with the tools agent
            return supportsToolsAgent && !!model.metadata.capabilities?.toolCalling;
        }
        return true;
    }
    getModels() {
        const models = this.languageModelsService
            .getLanguageModelIds()
            .map((modelId) => ({
            identifier: modelId,
            metadata: this.languageModelsService.lookupLanguageModel(modelId),
        }))
            .filter((entry) => entry.metadata?.isUserSelectable && this.modelSupportedForDefaultAgent(entry));
        models.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
        return models;
    }
    setCurrentLanguageModelToDefault() {
        const defaultLanguageModelId = this.languageModelsService
            .getLanguageModelIds()
            .find((id) => this.languageModelsService.lookupLanguageModel(id)?.isDefault);
        const hasUserSelectableLanguageModels = this.languageModelsService
            .getLanguageModelIds()
            .find((id) => {
            const model = this.languageModelsService.lookupLanguageModel(id);
            return model?.isUserSelectable && !model.isDefault;
        });
        const defaultModel = hasUserSelectableLanguageModels && defaultLanguageModelId
            ? {
                metadata: this.languageModelsService.lookupLanguageModel(defaultLanguageModelId),
                identifier: defaultLanguageModelId,
            }
            : undefined;
        if (defaultModel) {
            this.setCurrentLanguageModel(defaultModel);
        }
    }
    setCurrentLanguageModel(model) {
        this._currentLanguageModel = model;
        if (this.cachedDimensions) {
            // For quick chat and editor chat, relayout because the input may need to shrink to accomodate the model name
            this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
        }
        this.storageService.store(this.getSelectedModelStorageKey(), model.identifier, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeCurrentLanguageModel.fire(model);
    }
    loadHistory() {
        const history = this.historyService.getHistory(this.location);
        if (history.length === 0) {
            history.push({ text: '' });
        }
        return new HistoryNavigator2(history, 50, historyKeyFn);
    }
    _getAriaLabel() {
        const verbose = this.configurationService.getValue("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        if (verbose) {
            const kbLabel = this.keybindingService
                .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                ?.getLabel();
            return kbLabel
                ? localize('actions.chat.accessibiltyHelp', 'Chat Input,  Type to ask questions or type / for topics, press enter to send out the request. Use {0} for Chat Accessibility Help.', kbLabel)
                : localize('chatInput.accessibilityHelpNoKb', 'Chat Input,  Type code here and press Enter to run. Use the Chat Accessibility Help command for more information.');
        }
        return localize('chatInput', 'Chat Input');
    }
    initForNewChatModel(state, modelIsEmpty) {
        this.history = this.loadHistory();
        this.history.add({
            text: state.inputValue ?? this.history.current().text,
            state: state.inputState ?? this.getInputState(),
        });
        const attachments = state.inputState?.chatContextAttachments ?? [];
        this._attachmentModel.clearAndSetContext(...attachments);
        if (state.inputValue) {
            this.setValue(state.inputValue, false);
        }
        if (state.inputState?.chatMode) {
            this.setChatMode(state.inputState.chatMode);
        }
        else if (this.location === ChatAgentLocation.EditingSession) {
            this.setChatMode(ChatMode.Edit);
        }
        if (modelIsEmpty) {
            const storageKey = this.getDefaultModeExperimentStorageKey();
            const hasSetDefaultMode = this.storageService.getBoolean(storageKey, 1 /* StorageScope.WORKSPACE */, false);
            if (!hasSetDefaultMode) {
                Promise.all([
                    this.experimentService.getTreatment('chat.defaultMode'),
                    this.experimentService.getTreatment('chat.defaultLanguageModel'),
                ]).then(([defaultModeTreatment, defaultLanguageModelTreatment]) => {
                    if (typeof defaultModeTreatment === 'string') {
                        this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                        const defaultMode = validateChatMode(defaultModeTreatment);
                        if (defaultMode) {
                            this.logService.trace(`Applying default mode from experiment: ${defaultMode}`);
                            this.setChatMode(defaultMode);
                            this.checkModelSupported();
                        }
                    }
                    if (typeof defaultLanguageModelTreatment === 'string' &&
                        this._currentMode === ChatMode.Agent) {
                        this.storageService.store(storageKey, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                        this.logService.trace(`Applying default language model from experiment: ${defaultLanguageModelTreatment}`);
                        this.setExpModelOrWait(defaultLanguageModelTreatment);
                    }
                });
            }
        }
    }
    setExpModelOrWait(modelId) {
        const model = this.languageModelsService.lookupLanguageModel(modelId);
        if (model) {
            this.setCurrentLanguageModel({ metadata: model, identifier: modelId });
            this.checkModelSupported();
            this._waitForPersistedLanguageModel.clear();
        }
        else {
            this._waitForPersistedLanguageModel.value =
                this.languageModelsService.onDidChangeLanguageModels((e) => {
                    const model = e.added?.find((m) => m.identifier === modelId);
                    if (model) {
                        this._waitForPersistedLanguageModel.clear();
                        if (model.metadata.isUserSelectable) {
                            this.setCurrentLanguageModel({ metadata: model.metadata, identifier: modelId });
                            this.checkModelSupported();
                        }
                    }
                });
        }
    }
    getDefaultModeExperimentStorageKey() {
        const tag = this.options.widgetViewKindTag;
        return `chat.${tag}.hasSetDefaultModeByExperiment`;
    }
    logInputHistory() {
        const historyStr = [...this.history].map((entry) => JSON.stringify(entry)).join('\n');
        this.logService.info(`[${this.location}] Chat input history:`, historyStr);
    }
    setVisible(visible) {
        this._onDidChangeVisibility.fire(visible);
    }
    get element() {
        return this.container;
    }
    async showPreviousValue() {
        const inputState = this.getInputState();
        if (this.history.isAtEnd()) {
            this.saveCurrentValue(inputState);
        }
        else {
            const currentEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
            if (!this.history.has(currentEntry)) {
                this.saveCurrentValue(inputState);
                this.history.resetCursor();
            }
        }
        this.navigateHistory(true);
    }
    async showNextValue() {
        const inputState = this.getInputState();
        if (this.history.isAtEnd()) {
            return;
        }
        else {
            const currentEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
            if (!this.history.has(currentEntry)) {
                this.saveCurrentValue(inputState);
                this.history.resetCursor();
            }
        }
        this.navigateHistory(false);
    }
    async navigateHistory(previous) {
        const historyEntry = previous ? this.history.previous() : this.history.next();
        let historyAttachments = historyEntry.state?.chatContextAttachments ?? [];
        // Check for images in history to restore the value.
        if (historyAttachments.length > 0) {
            historyAttachments = (await Promise.all(historyAttachments.map(async (attachment) => {
                if (attachment.isImage &&
                    attachment.references?.length &&
                    URI.isUri(attachment.references[0].reference)) {
                    const currReference = attachment.references[0].reference;
                    try {
                        const imageBinary = currReference.toString(true).startsWith('http')
                            ? await this.sharedWebExtracterService.readImage(currReference, CancellationToken.None)
                            : (await this.fileService.readFile(currReference)).value;
                        if (!imageBinary) {
                            return undefined;
                        }
                        const newAttachment = { ...attachment };
                        newAttachment.value =
                            isImageVariableEntry(attachment) && attachment.isPasted
                                ? imageBinary.buffer
                                : await resizeImage(imageBinary.buffer); // if pasted image, we do not need to resize.
                        return newAttachment;
                    }
                    catch (err) {
                        this.logService.error('Failed to fetch and reference.', err);
                        return undefined;
                    }
                }
                return attachment;
            }))).filter((attachment) => attachment !== undefined);
        }
        this._attachmentModel.clearAndSetContext(...historyAttachments);
        aria.status(historyEntry.text);
        this.setValue(historyEntry.text, true);
        this._onDidLoadInputState.fire(historyEntry.state);
        const model = this._inputEditor.getModel();
        if (!model) {
            return;
        }
        if (previous) {
            const endOfFirstViewLine = this._inputEditor._getViewModel()?.getLineLength(1) ?? 1;
            const endOfFirstModelLine = model.getLineLength(1);
            if (endOfFirstViewLine === endOfFirstModelLine) {
                // Not wrapped - set cursor to the end of the first line
                this._inputEditor.setPosition({ lineNumber: 1, column: endOfFirstViewLine + 1 });
            }
            else {
                // Wrapped - set cursor one char short of the end of the first view line.
                // If it's after the next character, the cursor shows on the second line.
                this._inputEditor.setPosition({ lineNumber: 1, column: endOfFirstViewLine });
            }
        }
        else {
            this._inputEditor.setPosition(getLastPosition(model));
        }
    }
    setValue(value, transient) {
        this.inputEditor.setValue(value);
        // always leave cursor at the end
        this.inputEditor.setPosition({ lineNumber: 1, column: value.length + 1 });
        if (!transient) {
            this.saveCurrentValue(this.getInputState());
        }
    }
    saveCurrentValue(inputState) {
        const newEntry = this.getFilteredEntry(this._inputEditor.getValue(), inputState);
        this.history.replaceLast(newEntry);
    }
    focus() {
        this._inputEditor.focus();
    }
    hasFocus() {
        return this._inputEditor.hasWidgetFocus();
    }
    /**
     * Reset the input and update history.
     * @param userQuery If provided, this will be added to the history. Followups and programmatic queries should not be passed.
     */
    async acceptInput(isUserQuery) {
        if (isUserQuery) {
            const userQuery = this._inputEditor.getValue();
            const inputState = this.getInputState();
            const entry = this.getFilteredEntry(userQuery, inputState);
            this.history.replaceLast(entry);
            this.history.add({ text: '' });
        }
        // Clear attached context, fire event to clear input state, and clear the input editor
        this.attachmentModel.clear();
        this._onDidLoadInputState.fire({});
        if (this.accessibilityService.isScreenReaderOptimized() && isMacintosh) {
            this._acceptInputForVoiceover();
        }
        else {
            this._inputEditor.focus();
            this._inputEditor.setValue('');
        }
    }
    validateCurrentMode() {
        if (!this.agentService.hasToolsAgent && this._currentMode === ChatMode.Agent) {
            this.setChatMode(ChatMode.Edit);
        }
    }
    // A funtion that filters out specifically the `value` property of the attachment.
    getFilteredEntry(query, inputState) {
        const attachmentsWithoutImageValues = inputState.chatContextAttachments?.map((attachment) => {
            if (attachment.isImage && attachment.references?.length && attachment.value) {
                const newAttachment = { ...attachment };
                newAttachment.value = undefined;
                return newAttachment;
            }
            return attachment;
        });
        inputState.chatContextAttachments = attachmentsWithoutImageValues;
        const newEntry = {
            text: query,
            state: inputState,
        };
        return newEntry;
    }
    _acceptInputForVoiceover() {
        const domNode = this._inputEditor.getDomNode();
        if (!domNode) {
            return;
        }
        // Remove the input editor from the DOM temporarily to prevent VoiceOver
        // from reading the cleared text (the request) to the user.
        domNode.remove();
        this._inputEditor.setValue('');
        this._inputEditorElement.appendChild(domNode);
        this._inputEditor.focus();
    }
    _handleAttachedContextChange() {
        this._hasFileAttachmentContextKey.set(Boolean(this._attachmentModel.attachments.find((a) => a.isFile)));
        this.renderAttachedContext();
    }
    render(container, initialValue, widget) {
        let elements;
        if (this.options.renderStyle === 'compact') {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-and-edit-session', [
                    dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                    dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                        dom.h('.chat-input-container@inputContainer', [
                            dom.h('.chat-editor-container@editorContainer'),
                            dom.h('.chat-input-toolbars@inputToolbars'),
                        ]),
                    ]),
                    dom.h('.chat-attachments-container@attachmentsContainer', [
                        dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                        dom.h('.chat-attached-context@attachedContextContainer'),
                        dom.h('.chat-related-files@relatedFilesContainer'),
                    ]),
                    dom.h('.interactive-input-followups@followupsContainer'),
                ]),
            ]);
        }
        else {
            elements = dom.h('.interactive-input-part', [
                dom.h('.interactive-input-followups@followupsContainer'),
                dom.h('.chat-editing-session@chatEditingSessionWidgetContainer'),
                dom.h('.interactive-input-and-side-toolbar@inputAndSideToolbar', [
                    dom.h('.chat-input-container@inputContainer', [
                        dom.h('.chat-attachments-container@attachmentsContainer', [
                            dom.h('.chat-attachment-toolbar@attachmentToolbar'),
                            dom.h('.chat-related-files@relatedFilesContainer'),
                            dom.h('.chat-attached-context@attachedContextContainer'),
                        ]),
                        dom.h('.chat-editor-container@editorContainer'),
                        dom.h('.chat-input-toolbars@inputToolbars'),
                    ]),
                ]),
            ]);
        }
        this.container = elements.root;
        container.append(this.container);
        this.container.classList.toggle('compact', this.options.renderStyle === 'compact');
        this.followupsContainer = elements.followupsContainer;
        const inputAndSideToolbar = elements.inputAndSideToolbar; // The chat input and toolbar to the right
        const inputContainer = elements.inputContainer; // The chat editor, attachments, and toolbars
        const editorContainer = elements.editorContainer;
        this.attachmentsContainer = elements.attachmentsContainer;
        this.attachedContextContainer = elements.attachedContextContainer;
        this.relatedFilesContainer = elements.relatedFilesContainer;
        const toolbarsContainer = elements.inputToolbars;
        const attachmentToolbarContainer = elements.attachmentToolbar;
        this.chatEditingSessionWidgetContainer = elements.chatEditingSessionWidgetContainer;
        if (this.options.enableImplicitContext) {
            this._implicitContext = this._register(new ChatImplicitContext());
            this._register(this._implicitContext.onDidChangeValue(() => this._handleAttachedContextChange()));
        }
        this.renderAttachedContext();
        this._register(this._attachmentModel.onDidChangeContext(() => this._handleAttachedContextChange()));
        this.renderChatEditingSessionState(null);
        if (this.options.renderWorkingSet) {
            this._relatedFiles = this._register(new ChatRelatedFiles());
            this._register(this._relatedFiles.onDidChange(() => this.renderChatRelatedFiles()));
        }
        this.renderChatRelatedFiles();
        this.dnd.addOverlay(container, container);
        const inputScopedContextKeyService = this._register(this.contextKeyService.createScoped(inputContainer));
        ChatContextKeys.inChatInput.bindTo(inputScopedContextKeyService).set(true);
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, inputScopedContextKeyService])));
        const { historyNavigationBackwardsEnablement, historyNavigationForwardsEnablement } = this._register(registerAndCreateHistoryNavigationContext(inputScopedContextKeyService, this));
        this.historyNavigationBackwardsEnablement = historyNavigationBackwardsEnablement;
        this.historyNavigationForewardsEnablement = historyNavigationForwardsEnablement;
        const options = getSimpleEditorOptions(this.configurationService);
        options.overflowWidgetsDomNode = this.options.editorOverflowWidgetsDomNode;
        options.pasteAs = EditorOptions.pasteAs.defaultValue;
        options.readOnly = false;
        options.ariaLabel = this._getAriaLabel();
        options.fontFamily = DEFAULT_FONT_FAMILY;
        options.fontSize = 13;
        options.lineHeight = 20;
        options.padding =
            this.options.renderStyle === 'compact' ? { top: 2, bottom: 2 } : { top: 8, bottom: 8 };
        options.cursorWidth = 1;
        options.wrappingStrategy = 'advanced';
        options.bracketPairColorization = { enabled: false };
        options.suggest = {
            showIcons: true,
            showSnippets: false,
            showWords: true,
            showStatusBar: false,
            insertMode: 'replace',
        };
        options.scrollbar = { ...(options.scrollbar ?? {}), vertical: 'hidden' };
        options.stickyScroll = { enabled: false };
        this._inputEditorElement = dom.append(editorContainer, $(chatInputEditorContainerSelector));
        const editorOptions = getSimpleCodeEditorWidgetOptions();
        editorOptions.contributions?.push(...EditorExtensionsRegistry.getSomeEditorContributions([
            ContentHoverController.ID,
            GlyphHoverController.ID,
            CopyPasteController.ID,
            LinkDetector.ID,
        ]));
        this._inputEditor = this._register(scopedInstantiationService.createInstance(CodeEditorWidget, this._inputEditorElement, options, editorOptions));
        SuggestController.get(this._inputEditor)?.forceRenderingAbove();
        options.overflowWidgetsDomNode?.classList.add('hideSuggestTextIcons');
        this._inputEditorElement.classList.add('hideSuggestTextIcons');
        this._register(this._inputEditor.onDidChangeModelContent(() => {
            const currentHeight = Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight);
            if (currentHeight !== this.inputEditorHeight) {
                this.inputEditorHeight = currentHeight;
                this._onDidChangeHeight.fire();
            }
            const model = this._inputEditor.getModel();
            const inputHasText = !!model && model.getValue().trim().length > 0;
            this.inputEditorHasText.set(inputHasText);
        }));
        this._register(this._inputEditor.onDidContentSizeChange((e) => {
            if (e.contentHeightChanged) {
                this.inputEditorHeight = e.contentHeight;
                this._onDidChangeHeight.fire();
            }
        }));
        this._register(this._inputEditor.onDidFocusEditorText(() => {
            this.inputEditorHasFocus.set(true);
            this._onDidFocus.fire();
            inputContainer.classList.toggle('focused', true);
        }));
        this._register(this._inputEditor.onDidBlurEditorText(() => {
            this.inputEditorHasFocus.set(false);
            inputContainer.classList.toggle('focused', false);
            this._onDidBlur.fire();
        }));
        this._register(this._inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this._inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this._inputEditor)?.clearWidgets();
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        this._register(dom.addStandardDisposableListener(toolbarsContainer, dom.EventType.CLICK, (e) => this.inputEditor.focus()));
        this._register(dom.addStandardDisposableListener(this.attachmentsContainer, dom.EventType.CLICK, (e) => this.inputEditor.focus()));
        this.inputActionsToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, MenuId.ChatInput, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: { shouldForwardArgs: true },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            hoverDelegate,
        }));
        this.inputActionsToolbar.context = { widget };
        this._register(this.inputActionsToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions &&
                typeof this.cachedInputToolbarWidth === 'number' &&
                this.cachedInputToolbarWidth !== this.inputActionsToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        this.executeToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, toolbarsContainer, this.options.menus.executeToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                shouldForwardArgs: true,
            },
            hoverDelegate,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */, // keep it lean when hiding items and avoid a "..." overflow menu
            actionViewItemProvider: (action, options) => {
                if (this.location === ChatAgentLocation.Panel ||
                    this.location === ChatAgentLocation.Editor) {
                    if ((action.id === ChatSubmitAction.ID ||
                        action.id === CancelAction.ID ||
                        action.id === ChatEditingSessionSubmitAction.ID) &&
                        action instanceof MenuItemAction) {
                        const dropdownAction = this.instantiationService.createInstance(MenuItemAction, {
                            id: 'chat.moreExecuteActions',
                            title: localize('notebook.moreExecuteActionsLabel', 'More...'),
                            icon: Codicon.chevronDown,
                        }, undefined, undefined, undefined, undefined);
                        return this.instantiationService.createInstance(ChatSubmitDropdownActionItem, action, dropdownAction, { ...options, menuAsChild: false });
                    }
                }
                if (action.id === ChatSwitchToNextModelActionId && action instanceof MenuItemAction) {
                    if (!this._currentLanguageModel) {
                        this.setCurrentLanguageModelToDefault();
                    }
                    if (this._currentLanguageModel) {
                        const itemDelegate = {
                            onDidChangeModel: this._onDidChangeCurrentLanguageModel.event,
                            setModel: (model) => {
                                // The user changed the language model, so we don't wait for the persisted option to be registered
                                this._waitForPersistedLanguageModel.clear();
                                this.setCurrentLanguageModel(model);
                                this.renderAttachedContext();
                            },
                            getModels: () => this.getModels(),
                        };
                        return this.instantiationService.createInstance(ModelPickerActionViewItem, action, this._currentLanguageModel, itemDelegate);
                    }
                }
                else if (action.id === ToggleAgentModeActionId && action instanceof MenuItemAction) {
                    const delegate = {
                        getMode: () => this.currentMode,
                        onDidChangeMode: this._onDidChangeCurrentChatMode.event,
                    };
                    return this.instantiationService.createInstance(ToggleChatModeActionViewItem, action, delegate);
                }
                return undefined;
            },
        }));
        this.executeToolbar.getElement().classList.add('chat-execute-toolbar');
        this.executeToolbar.context = { widget };
        this._register(this.executeToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions &&
                typeof this.cachedExecuteToolbarWidth === 'number' &&
                this.cachedExecuteToolbarWidth !== this.executeToolbar.getItemsWidth()) {
                this.layout(this.cachedDimensions.height, this.cachedDimensions.width);
            }
        }));
        if (this.options.menus.inputSideToolbar) {
            const toolbarSide = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, inputAndSideToolbar, this.options.menus.inputSideToolbar, {
                telemetrySource: this.options.menus.telemetrySource,
                menuOptions: {
                    shouldForwardArgs: true,
                },
                hoverDelegate,
            }));
            this.inputSideToolbarContainer = toolbarSide.getElement();
            toolbarSide.getElement().classList.add('chat-side-toolbar');
            toolbarSide.context = { widget };
        }
        let inputModel = this.modelService.getModel(this.inputUri);
        if (!inputModel) {
            inputModel = this.modelService.createModel('', null, this.inputUri, true);
        }
        this.textModelResolverService.createModelReference(this.inputUri).then((ref) => {
            // make sure to hold a reference so that the model doesn't get disposed by the text model service
            if (this._store.isDisposed) {
                ref.dispose();
                return;
            }
            this._register(ref);
        });
        this.inputModel = inputModel;
        this.inputModel.updateOptions({
            bracketColorizationOptions: { enabled: false, independentColorPoolPerBracketType: false },
        });
        this._inputEditor.setModel(this.inputModel);
        if (initialValue) {
            this.inputModel.setValue(initialValue);
            const lineNumber = this.inputModel.getLineCount();
            this._inputEditor.setPosition({
                lineNumber,
                column: this.inputModel.getLineMaxColumn(lineNumber),
            });
        }
        const onDidChangeCursorPosition = () => {
            const model = this._inputEditor.getModel();
            if (!model) {
                return;
            }
            const position = this._inputEditor.getPosition();
            if (!position) {
                return;
            }
            const atTop = position.lineNumber === 1 &&
                position.column - 1 <= (this._inputEditor._getViewModel()?.getLineLength(1) ?? 0);
            this.chatCursorAtTop.set(atTop);
            this.historyNavigationBackwardsEnablement.set(atTop);
            this.historyNavigationForewardsEnablement.set(position.equals(getLastPosition(model)));
        };
        this._register(this._inputEditor.onDidChangeCursorPosition((e) => onDidChangeCursorPosition()));
        onDidChangeCursorPosition();
        this._register(this.themeService.onDidFileIconThemeChange(() => {
            this.renderAttachedContext();
        }));
        this.addFilesToolbar = this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, attachmentToolbarContainer, MenuId.ChatInputAttachmentToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            label: true,
            menuOptions: { shouldForwardArgs: true, renderShortTitle: true },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            hoverDelegate,
            actionViewItemProvider: (action, options) => {
                if (action.id === 'workbench.action.chat.editing.attachContext' ||
                    action.id === 'workbench.action.chat.attachContext') {
                    const viewItem = this.instantiationService.createInstance(AddFilesButton, undefined, action, options);
                    return viewItem;
                }
                if (action.id === AttachToolsAction.id) {
                    return this.selectedToolsModel.toolsActionItemViewItemProvider(action, options);
                }
                return undefined;
            },
        }));
        this.addFilesToolbar.context = {
            widget,
            placeholder: localize('chatAttachFiles', 'Search for files and context to add to your request'),
        };
        this._register(this.addFilesToolbar.onDidChangeMenuItems(() => {
            if (this.cachedDimensions) {
                this._onDidChangeHeight.fire();
            }
        }));
        this._register(this.selectedToolsModel.toolsActionItemViewItemProvider.onDidRender(() => this._onDidChangeHeight.fire()));
    }
    renderAttachedContext() {
        const container = this.attachedContextContainer;
        // Note- can't measure attachedContextContainer, because it has `display: contents`, so measure the parent to check for height changes
        const oldHeight = this.attachmentsContainer.offsetHeight;
        const store = new DisposableStore();
        this.attachedContextDisposables.value = store;
        dom.clearNode(container);
        const hoverDelegate = store.add(createInstantHoverDelegate());
        const attachments = [...this.attachmentModel.attachments.entries()];
        const hasAttachments = Boolean(attachments.length) ||
            Boolean(this.implicitContext?.value) ||
            !this.instructionAttachmentsPart.empty;
        dom.setVisibility(Boolean(hasAttachments || (this.addFilesToolbar && !this.addFilesToolbar.isEmpty())), this.attachmentsContainer);
        dom.setVisibility(hasAttachments, this.attachedContextContainer);
        if (!attachments.length) {
            this._indexOfLastAttachedContextDeletedWithKeyboard = -1;
        }
        if (this.implicitContext?.value) {
            const implicitPart = store.add(this.instantiationService.createInstance(ImplicitContextAttachmentWidget, this.implicitContext, this._contextResourceLabels));
            container.appendChild(implicitPart.domNode);
        }
        this.promptInstructionsAttached.set(!this.instructionAttachmentsPart.empty);
        this.instructionAttachmentsPart.render(container);
        for (const [index, attachment] of attachments) {
            const resource = URI.isUri(attachment.value)
                ? attachment.value
                : attachment.value &&
                    typeof attachment.value === 'object' &&
                    'uri' in attachment.value &&
                    URI.isUri(attachment.value.uri)
                    ? attachment.value.uri
                    : undefined;
            const range = attachment.value &&
                typeof attachment.value === 'object' &&
                'range' in attachment.value &&
                Range.isIRange(attachment.value.range)
                ? attachment.value.range
                : undefined;
            const shouldFocusClearButton = index ===
                Math.min(this._indexOfLastAttachedContextDeletedWithKeyboard, this.attachmentModel.size - 1);
            let attachmentWidget;
            if (resource && (attachment.isFile || attachment.isDirectory)) {
                attachmentWidget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (attachment.isImage) {
                attachmentWidget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isPasteVariableEntry(attachment)) {
                attachmentWidget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            else {
                attachmentWidget = this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, this._currentLanguageModel, shouldFocusClearButton, container, this._contextResourceLabels, hoverDelegate);
            }
            store.add(attachmentWidget);
            store.add(attachmentWidget.onDidDelete((e) => {
                this.handleAttachmentDeletion(e, index, attachment);
            }));
        }
        if (oldHeight !== this.attachmentsContainer.offsetHeight) {
            this._onDidChangeHeight.fire();
        }
    }
    handleAttachmentDeletion(e, index, attachment) {
        this._attachmentModel.delete(attachment.id);
        // Set focus to the next attached context item if deletion was triggered by a keystroke (vs a mouse click)
        if (dom.isKeyboardEvent(e)) {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                this._indexOfLastAttachedContextDeletedWithKeyboard = index;
            }
        }
        if (this._attachmentModel.size === 0) {
            this.focus();
        }
        this._onDidChangeContext.fire({ removed: [attachment] });
    }
    async renderChatEditingSessionState(chatEditingSession) {
        dom.setVisibility(Boolean(chatEditingSession), this.chatEditingSessionWidgetContainer);
        const seenEntries = new ResourceSet();
        const entries = chatEditingSession?.entries.get().map((entry) => {
            seenEntries.add(entry.modifiedURI);
            return {
                reference: entry.modifiedURI,
                state: entry.state.get(),
                kind: 'reference',
            };
        }) ?? [];
        if (!chatEditingSession || !this.options.renderWorkingSet || !entries.length) {
            dom.clearNode(this.chatEditingSessionWidgetContainer);
            this._chatEditsDisposables.clear();
            this._chatEditList = undefined;
            return;
        }
        // Summary of number of files changed
        const innerContainer = this.chatEditingSessionWidgetContainer.querySelector('.chat-editing-session-container.show-file-icons') ??
            dom.append(this.chatEditingSessionWidgetContainer, $('.chat-editing-session-container.show-file-icons'));
        for (const entry of chatEditingSession.entries.get()) {
            if (!seenEntries.has(entry.modifiedURI)) {
                entries.unshift({
                    reference: entry.modifiedURI,
                    state: entry.state.get(),
                    kind: 'reference',
                });
                seenEntries.add(entry.modifiedURI);
            }
        }
        entries.sort((a, b) => {
            if (a.kind === 'reference' && b.kind === 'reference') {
                if (a.state === b.state || a.state === undefined || b.state === undefined) {
                    return a.reference.toString().localeCompare(b.reference.toString());
                }
                return a.state - b.state;
            }
            return 0;
        });
        const overviewRegion = innerContainer.querySelector('.chat-editing-session-overview') ??
            dom.append(innerContainer, $('.chat-editing-session-overview'));
        const overviewTitle = overviewRegion.querySelector('.working-set-title') ??
            dom.append(overviewRegion, $('.working-set-title'));
        const overviewFileCount = overviewTitle.querySelector('span.working-set-count') ??
            dom.append(overviewTitle, $('span.working-set-count'));
        overviewFileCount.textContent =
            entries.length === 1
                ? localize('chatEditingSession.oneFile.1', '1 file changed')
                : localize('chatEditingSession.manyFiles.1', '{0} files changed', entries.length);
        overviewTitle.ariaLabel = overviewFileCount.textContent;
        overviewTitle.tabIndex = 0;
        // Clear out the previous actions (if any)
        this._chatEditsActionsDisposables.clear();
        // Chat editing session actions
        const actionsContainer = overviewRegion.querySelector('.chat-editing-session-actions') ??
            dom.append(overviewRegion, $('.chat-editing-session-actions'));
        this._chatEditsActionsDisposables.add(this.instantiationService.createInstance(MenuWorkbenchButtonBar, actionsContainer, MenuId.ChatEditingWidgetToolbar, {
            telemetrySource: this.options.menus.telemetrySource,
            menuOptions: {
                arg: { sessionId: chatEditingSession.chatSessionId },
            },
            buttonConfigProvider: (action) => {
                if (action.id === ChatEditingShowChangesAction.ID ||
                    action.id === ChatEditingRemoveAllFilesAction.ID) {
                    return { showIcon: true, showLabel: false, isSecondary: true };
                }
                return undefined;
            },
        }));
        if (!chatEditingSession) {
            return;
        }
        // Working set
        const workingSetContainer = innerContainer.querySelector('.chat-editing-session-list') ??
            dom.append(innerContainer, $('.chat-editing-session-list'));
        if (!this._chatEditList) {
            this._chatEditList = this._chatEditsListPool.get();
            const list = this._chatEditList.object;
            this._chatEditsDisposables.add(this._chatEditList);
            this._chatEditsDisposables.add(list.onDidFocus(() => {
                this._onDidFocus.fire();
            }));
            this._chatEditsDisposables.add(list.onDidOpen(async (e) => {
                if (e.element?.kind === 'reference' && URI.isUri(e.element.reference)) {
                    const modifiedFileUri = e.element.reference;
                    const entry = chatEditingSession.getEntry(modifiedFileUri);
                    const pane = await this.editorService.openEditor({
                        resource: modifiedFileUri,
                        options: e.editorOptions,
                    }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                    if (pane) {
                        entry?.getEditorIntegration(pane).reveal(true);
                    }
                }
            }));
            this._chatEditsDisposables.add(addDisposableListener(list.getHTMLElement(), 'click', (e) => {
                if (!this.hasFocus()) {
                    this._onDidFocus.fire();
                }
            }, true));
            dom.append(workingSetContainer, list.getHTMLElement());
            dom.append(innerContainer, workingSetContainer);
        }
        const maxItemsShown = 6;
        const itemsShown = Math.min(entries.length, maxItemsShown);
        const height = itemsShown * 22;
        const list = this._chatEditList.object;
        list.layout(height);
        list.getHTMLElement().style.height = `${height}px`;
        list.splice(0, list.length, entries);
        this._onDidChangeHeight.fire();
    }
    async renderChatRelatedFiles() {
        const anchor = this.relatedFilesContainer;
        dom.clearNode(anchor);
        const shouldRender = this.configurationService.getValue('chat.renderRelatedFiles');
        dom.setVisibility(Boolean(this.relatedFiles?.value.length && shouldRender), anchor);
        if (!shouldRender || !this.relatedFiles?.value.length) {
            return;
        }
        const hoverDelegate = getDefaultHoverDelegate('element');
        for (const { uri, description } of this.relatedFiles.value) {
            const uriLabel = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: true,
                secondary: true,
                hoverDelegate,
            }));
            uriLabel.label = this.labelService.getUriBasenameLabel(uri);
            uriLabel.element.classList.add('monaco-icon-label');
            uriLabel.element.title = localize('suggeste.title', '{0} - {1}', this.labelService.getUriLabel(uri, { relative: true }), description ?? '');
            this._chatEditsActionsDisposables.add(uriLabel.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const addButton = this._chatEditsActionsDisposables.add(new Button(anchor, {
                supportIcons: false,
                secondary: true,
                hoverDelegate,
                ariaLabel: localize('chatEditingSession.addSuggestion', 'Add suggestion {0}', this.labelService.getUriLabel(uri, { relative: true })),
            }));
            addButton.icon = Codicon.add;
            addButton.setTitle(localize('chatEditingSession.addSuggested', 'Add suggestion'));
            this._chatEditsActionsDisposables.add(addButton.onDidClick(async () => {
                group.remove(); // REMOVE asap
                await this._attachmentModel.addFile(uri);
                this.relatedFiles?.remove(uri);
            }));
            const sep = document.createElement('div');
            sep.classList.add('separator');
            const group = document.createElement('span');
            group.classList.add('monaco-button-dropdown', 'sidebyside-button');
            group.appendChild(addButton.element);
            group.appendChild(sep);
            group.appendChild(uriLabel.element);
            dom.append(anchor, group);
            this._chatEditsActionsDisposables.add(toDisposable(() => {
                group.remove();
            }));
        }
        this._onDidChangeHeight.fire();
    }
    async renderFollowups(items, response) {
        if (!this.options.renderFollowups) {
            return;
        }
        this.followupsDisposables.clear();
        dom.clearNode(this.followupsContainer);
        if (items && items.length > 0) {
            this.followupsDisposables.add(this.instantiationService.createInstance(ChatFollowups, this.followupsContainer, items, this.location, undefined, (followup) => this._onDidAcceptFollowup.fire({ followup, response })));
        }
        this._onDidChangeHeight.fire();
    }
    get contentHeight() {
        const data = this.getLayoutData();
        return (data.followupsHeight +
            data.inputPartEditorHeight +
            data.inputPartVerticalPadding +
            data.inputEditorBorder +
            data.attachmentsHeight +
            data.toolbarsHeight +
            data.chatEditingStateHeight);
    }
    layout(height, width) {
        this.cachedDimensions = new dom.Dimension(width, height);
        return this._layout(height, width);
    }
    _layout(height, width, allowRecurse = true) {
        const data = this.getLayoutData();
        const inputEditorHeight = Math.min(data.inputPartEditorHeight, height -
            data.followupsHeight -
            data.attachmentsHeight -
            data.inputPartVerticalPadding -
            data.toolbarsHeight);
        const followupsWidth = width - data.inputPartHorizontalPadding;
        this.followupsContainer.style.width = `${followupsWidth}px`;
        this._inputPartHeight =
            data.inputPartVerticalPadding +
                data.followupsHeight +
                inputEditorHeight +
                data.inputEditorBorder +
                data.attachmentsHeight +
                data.toolbarsHeight +
                data.chatEditingStateHeight;
        this._followupsHeight = data.followupsHeight;
        this._editSessionWidgetHeight = data.chatEditingStateHeight;
        const initialEditorScrollWidth = this._inputEditor.getScrollWidth();
        const newEditorWidth = width -
            data.inputPartHorizontalPadding -
            data.editorBorder -
            data.inputPartHorizontalPaddingInside -
            data.toolbarsWidth -
            data.sideToolbarWidth;
        const newDimension = { width: newEditorWidth, height: inputEditorHeight };
        if (!this.previousInputEditorDimension ||
            this.previousInputEditorDimension.width !== newDimension.width ||
            this.previousInputEditorDimension.height !== newDimension.height) {
            // This layout call has side-effects that are hard to understand. eg if we are calling this inside a onDidChangeContent handler, this can trigger the next onDidChangeContent handler
            // to be invoked, and we have a lot of these on this editor. Only doing a layout this when the editor size has actually changed makes it much easier to follow.
            this._inputEditor.layout(newDimension);
            this.previousInputEditorDimension = newDimension;
        }
        if (allowRecurse && initialEditorScrollWidth < 10) {
            // This is probably the initial layout. Now that the editor is layed out with its correct width, it should report the correct contentHeight
            return this._layout(height, width, false);
        }
    }
    getLayoutData() {
        const executeToolbarWidth = (this.cachedExecuteToolbarWidth =
            this.executeToolbar.getItemsWidth());
        const inputToolbarWidth = (this.cachedInputToolbarWidth =
            this.inputActionsToolbar.getItemsWidth());
        const executeToolbarPadding = (this.executeToolbar.getItemsLength() - 1) * 4;
        const inputToolbarPadding = this.inputActionsToolbar.getItemsLength()
            ? (this.inputActionsToolbar.getItemsLength() - 1) * 4
            : 0;
        return {
            inputEditorBorder: 2,
            followupsHeight: this.followupsContainer.offsetHeight,
            inputPartEditorHeight: Math.min(this._inputEditor.getContentHeight(), this.inputEditorMaxHeight),
            inputPartHorizontalPadding: this.options.renderStyle === 'compact' ? 16 : 32,
            inputPartVerticalPadding: this.options.renderStyle === 'compact' ? 12 : 28,
            attachmentsHeight: this.attachmentsContainer.offsetHeight +
                (this.attachmentsContainer.checkVisibility() ? 6 : 0),
            editorBorder: 2,
            inputPartHorizontalPaddingInside: 12,
            toolbarsWidth: this.options.renderStyle === 'compact'
                ? executeToolbarWidth + executeToolbarPadding + inputToolbarWidth + inputToolbarPadding
                : 0,
            toolbarsHeight: this.options.renderStyle === 'compact' ? 0 : 22,
            chatEditingStateHeight: this.chatEditingSessionWidgetContainer.offsetHeight,
            sideToolbarWidth: this.inputSideToolbarContainer
                ? dom.getTotalWidth(this.inputSideToolbarContainer) + 4 /*gap*/
                : 0,
        };
    }
    getViewState() {
        return this.getInputState();
    }
    saveState() {
        if (this.history.isAtEnd()) {
            this.saveCurrentValue(this.getInputState());
        }
        const inputHistory = [...this.history];
        this.historyService.saveHistory(this.location, inputHistory);
    }
};
ChatInputPart = ChatInputPart_1 = __decorate([
    __param(4, IChatWidgetHistoryService),
    __param(5, IModelService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IConfigurationService),
    __param(9, IKeybindingService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageModelsService),
    __param(12, ILogService),
    __param(13, IFileService),
    __param(14, IEditorService),
    __param(15, IThemeService),
    __param(16, ITextModelService),
    __param(17, IStorageService),
    __param(18, ILabelService),
    __param(19, IChatVariablesService),
    __param(20, IChatAgentService),
    __param(21, IChatService),
    __param(22, ISharedWebContentExtractorService),
    __param(23, IWorkbenchAssignmentService),
    __param(24, IContextGatheringService)
], ChatInputPart);
export { ChatInputPart };
const historyKeyFn = (entry) => JSON.stringify({ ...entry, state: { ...entry.state, chatMode: undefined } });
function getLastPosition(model) {
    return { lineNumber: model.getLineCount(), column: model.getLineLength(model.getLineCount()) + 1 };
}
// This does seems like a lot just to customize an item with dropdown. This whole class exists just because we need an
// onDidChange listener on the submenu, which is apparently not needed in other cases.
let ChatSubmitDropdownActionItem = class ChatSubmitDropdownActionItem extends DropdownWithPrimaryActionViewItem {
    constructor(action, dropdownAction, options, menuService, contextMenuService, contextKeyService, keybindingService, notificationService, themeService, accessibilityService) {
        super(action, dropdownAction, [], '', {
            ...options,
            getKeyBinding: (action) => keybindingService.lookupKeybinding(action.id, contextKeyService),
        }, contextMenuService, keybindingService, notificationService, contextKeyService, themeService, accessibilityService);
        const menu = menuService.createMenu(MenuId.ChatExecuteSecondary, contextKeyService);
        const setActions = () => {
            const secondary = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            this.update(dropdownAction, secondary);
        };
        setActions();
        this._register(menu.onDidChange(() => setActions()));
    }
};
ChatSubmitDropdownActionItem = __decorate([
    __param(3, IMenuService),
    __param(4, IContextMenuService),
    __param(5, IContextKeyService),
    __param(6, IKeybindingService),
    __param(7, INotificationService),
    __param(8, IThemeService),
    __param(9, IAccessibilityService)
], ChatSubmitDropdownActionItem);
let ModelPickerActionViewItem = class ModelPickerActionViewItem extends DropdownMenuActionViewItemWithKeybinding {
    constructor(action, currentLanguageModel, delegate, contextMenuService, keybindingService, contextKeyService, chatEntitlementService, commandService, menuService, telemetryService) {
        const modelActionsProvider = {
            getActions: () => {
                const setLanguageModelAction = (entry) => {
                    return {
                        id: entry.identifier,
                        label: entry.metadata.name,
                        tooltip: '',
                        class: undefined,
                        enabled: true,
                        checked: entry.identifier === this.currentLanguageModel.identifier,
                        run: () => {
                            this.currentLanguageModel = entry;
                            this.renderLabel(this.element);
                            this.delegate.setModel(entry);
                        },
                    };
                };
                const models = this.delegate.getModels();
                const actions = models.map((entry) => setLanguageModelAction(entry));
                // Add menu contributions from extensions
                const menuActions = menuService.getMenuActions(MenuId.ChatModelPicker, contextKeyService);
                const menuContributions = getFlatActionBarActions(menuActions);
                if (menuContributions.length > 0 ||
                    chatEntitlementService.entitlement === ChatEntitlement.Limited) {
                    actions.push(new Separator());
                }
                actions.push(...menuContributions);
                if (chatEntitlementService.entitlement === ChatEntitlement.Limited) {
                    actions.push(toAction({
                        id: 'moreModels',
                        label: localize('chat.moreModels', 'Add more Models'),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-models' });
                            commandService.executeCommand(commandId);
                        },
                    }));
                }
                return actions;
            },
        };
        const actionWithLabel = {
            ...action,
            tooltip: localize('chat.modelPicker.label', 'Pick Model'),
            run: () => { },
        };
        super(actionWithLabel, modelActionsProvider, contextMenuService, undefined, keybindingService, contextKeyService);
        this.currentLanguageModel = currentLanguageModel;
        this.delegate = delegate;
        this._register(delegate.onDidChangeModel((modelId) => {
            this.currentLanguageModel = modelId;
            this.renderLabel(this.element);
        }));
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        dom.reset(element, dom.$('span.chat-model-label', undefined, this.currentLanguageModel.metadata.name), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionViewItem = __decorate([
    __param(3, IContextMenuService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, IChatEntitlementService),
    __param(7, ICommandService),
    __param(8, IMenuService),
    __param(9, ITelemetryService)
], ModelPickerActionViewItem);
const chatInputEditorContainerSelector = '.interactive-input-editor';
setupSimpleEditorSelectionStyling(chatInputEditorContainerSelector);
let ToggleChatModeActionViewItem = class ToggleChatModeActionViewItem extends DropdownMenuActionViewItemWithKeybinding {
    constructor(action, delegate, contextMenuService, keybindingService, contextKeyService, chatService, chatAgentService) {
        const makeAction = (mode) => ({
            ...action,
            id: mode,
            label: this.modeToString(mode),
            class: undefined,
            enabled: true,
            checked: delegate.getMode() === mode,
            run: async () => {
                const result = await action.run({ mode });
                this.renderLabel(this.element);
                return result;
            },
        });
        const actionProvider = {
            getActions: () => {
                const agentStateActions = [makeAction(ChatMode.Edit)];
                if (chatAgentService.hasToolsAgent) {
                    agentStateActions.push(makeAction(ChatMode.Agent));
                }
                if (chatService.unifiedViewEnabled) {
                    agentStateActions.unshift(makeAction(ChatMode.Ask));
                }
                return agentStateActions;
            },
        };
        super(action, actionProvider, contextMenuService, undefined, keybindingService, contextKeyService);
        this.delegate = delegate;
        this._register(delegate.onDidChangeMode(() => this.renderLabel(this.element)));
    }
    modeToString(mode) {
        switch (mode) {
            case ChatMode.Agent:
                return localize('chat.agentMode', 'Agent');
            case ChatMode.Edit:
                return localize('chat.normalMode', 'Edit');
            case ChatMode.Ask:
            default:
                return localize('chat.askMode', 'Ask');
        }
    }
    renderLabel(element) {
        // Can't call super.renderLabel because it has a hack of forcing the 'codicon' class
        this.setAriaLabelAttributes(element);
        const state = this.modeToString(this.delegate.getMode());
        dom.reset(element, dom.$('span.chat-model-label', undefined, state), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ToggleChatModeActionViewItem = __decorate([
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, IChatService),
    __param(6, IChatAgentService)
], ToggleChatModeActionViewItem);
class AddFilesButton extends ActionViewItem {
    constructor(context, action, options) {
        super(context, action, options);
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-attached-context-attachment', 'chat-add-files');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRJbnB1dFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXJFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsdUJBQXVCLEdBQ3ZCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDMUYsT0FBTyxFQUVOLFNBQVMsRUFDVCxRQUFRLEdBR1IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXRFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQ3ZJLE9BQU8sRUFDTixpQ0FBaUMsR0FFakMsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN6RyxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDOUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQzFILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN0RyxPQUFPLEVBQ04sWUFBWSxFQUNaLGNBQWMsRUFDZCxVQUFVLEdBQ1YsTUFBTSxrREFBa0QsQ0FBQTtBQUd6RCxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLHNCQUFzQixFQUN0QixpQ0FBaUMsR0FDakMsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlGLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV4RixPQUFPLEVBQ04sMEJBQTBCLEVBRzFCLHlCQUF5QixHQUN6QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixnQkFBZ0IsR0FDaEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUNOLFlBQVksRUFDWiw4QkFBOEIsRUFDOUIsZ0JBQWdCLEVBQ2hCLDZCQUE2QixFQUc3Qix1QkFBdUIsR0FDdkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUV4SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLHFCQUFxQixHQUNyQixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUNOLCtCQUErQixFQUMvQiw0QkFBNEIsR0FDNUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTdDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZixNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQTtBQTJCNUIsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7O2FBQzVCLGlCQUFZLEdBQUcsa0JBQWtCLEFBQXJCLENBQXFCO2FBQ2xDLGFBQVEsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQXlCM0IsSUFBVyxlQUFlO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFJTSw2QkFBNkIsQ0FBQyxTQUFpQjtRQUNyRCxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN4RCxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUVELG9FQUFvRTtRQUNwRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLENBQUMsUUFBUSxZQUFZLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDOUMsU0FBUTtZQUNULENBQUM7WUFFRCx1RUFBdUU7WUFDdkUsbUVBQW1FO1lBQ25FLFVBQVUsQ0FBQyxJQUFJLENBQ2QsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzNDLE9BQU8sY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1lBQ2pFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBQ3BELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdkIsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7b0JBQ25ELFVBQVUsQ0FBQyxJQUFJLENBQUM7d0JBQ2YsRUFBRSxFQUFFLFVBQVUsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLEVBQUU7d0JBQ2xDLElBQUksRUFBRSxRQUFRO3dCQUNkLEtBQUssRUFBRSxPQUFPO3dCQUNkLFNBQVMsRUFBRSxJQUFJO3FCQUNjLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsU0FBUztRQUNWLENBQUM7UUFFRCxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRW5FLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcseUJBQXlCO1FBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO0lBQzlDLENBQUM7SUFLRCxJQUFXLGVBQWU7UUFDekIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQStCRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBR0QsSUFBSSx1QkFBdUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUE7SUFDckMsQ0FBQztJQVVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBd0JELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixFQUFFLFVBQVUsQ0FBQTtJQUM5QyxDQUFDO0lBTUQsSUFBVyxXQUFXO1FBQ3JCLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDdkYsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFBO1FBQ3BCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYTtZQUM5RSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDZixDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUNyQixDQUFDO0lBWUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ2hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFBO1FBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxDQUFBO1FBQy9ELEtBQUssTUFBTSxPQUFPLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xFLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBR0Q7OztPQUdHO0lBQ0gsSUFBVywrQkFBK0I7UUFDekMsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUE7SUFDN0MsQ0FBQztJQVVEO0lBQ0MsaUZBQWlGO0lBQ2hFLFFBQTJCLEVBQzNCLE9BQThCLEVBQy9DLE1BQXdCLEVBQ3hCLHFCQUFnQyxFQUNMLGNBQTBELEVBQ3RFLFlBQTRDLEVBQ3BDLG9CQUE0RCxFQUMvRCxpQkFBc0QsRUFDbkQsb0JBQTRELEVBQy9ELGlCQUFzRCxFQUNuRCxvQkFBNEQsRUFDM0QscUJBQThELEVBQ3pFLFVBQXdDLEVBQ3ZDLFdBQTBDLEVBQ3hDLGFBQThDLEVBQy9DLFlBQTRDLEVBQ3hDLHdCQUE0RCxFQUM5RCxjQUFnRCxFQUNsRCxZQUE0QyxFQUNwQyxlQUF1RCxFQUMzRCxZQUFnRCxFQUNyRCxXQUEwQyxFQUV4RCx5QkFBNkUsRUFDaEQsaUJBQStELEVBQ2xFLHVCQUFrRTtRQUU1RixLQUFLLEVBQUUsQ0FBQTtRQTNCVSxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUMzQixZQUFPLEdBQVAsT0FBTyxDQUF1QjtRQUdILG1CQUFjLEdBQWQsY0FBYyxDQUEyQjtRQUNyRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDMUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN4RCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3RCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN2Qiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQW1CO1FBQzdDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNqQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNuQixvQkFBZSxHQUFmLGVBQWUsQ0FBdUI7UUFDMUMsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBRXZDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBbUM7UUFDL0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE2QjtRQUNqRCw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBOVByRix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFPLENBQUMsQ0FBQTtRQUN4RCx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRXRELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3ZELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFFbEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNoRCxlQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUE7UUFFcEMsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9DLGNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUVsQyx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzQyxJQUFJLE9BQU8sRUFBa0YsQ0FDN0YsQ0FBQTtRQUNRLHVCQUFrQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFFcEQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUMsSUFBSSxPQUFPLEVBQTZFLENBQ3hGLENBQUE7UUFDUSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBNkR0RCxtREFBOEMsR0FBVyxDQUFDLENBQUMsQ0FBQTtRQWNsRCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUMvRCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUNqRixjQUFjLEVBQ2QsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQzVELENBQUE7UUFHTyxzQkFBaUIsR0FBRyxDQUFDLENBQUE7UUFNWix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUs1RCwrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzRCxJQUFJLGlCQUFpQixFQUFtQixDQUN4QyxDQUFBO1FBTU8scUJBQWdCLEdBQVcsQ0FBQyxDQUFBO1FBSzVCLHFCQUFnQixHQUFXLENBQUMsQ0FBQTtRQUs1Qiw2QkFBd0IsR0FBVyxDQUFDLENBQUE7UUFnQzNCLG1DQUE4QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQy9ELElBQUksaUJBQWlCLEVBQWUsQ0FDcEMsQ0FBQTtRQUNPLHFDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3hELElBQUksT0FBTyxFQUEyQyxDQUN0RCxDQUFBO1FBTU8sZ0NBQTJCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDaEUsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQTtRQUVwRSxpQkFBWSxHQUFhLFFBQVEsQ0FBQyxHQUFHLENBQUE7UUFlcEMsYUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxlQUFhLENBQUMsWUFBWSxVQUFVLGVBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFL0UsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDcEUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFldEUscUNBQWdDLEdBQVcsQ0FBQyxDQUFBO1FBZ0RuRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUM3RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3ZDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FDM0QsQ0FBQTtRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDeEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUN4RixDQUFBO1FBRUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFvQixFQUFFO1lBQzFDLE9BQU87Z0JBQ04sR0FBRyxxQkFBcUIsRUFBRTtnQkFDMUIsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVc7Z0JBQ3pELFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTthQUMzQixDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQjtZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUE7UUFFL0YsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDaEYsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLDBCQUEwQixHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNoRyxJQUFJLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFbEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUNwQyxHQUFHLEVBQUUsQ0FDSixDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FDcEMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUNkLDBCQUEwQixFQUMxQixZQUFZLENBQ1osQ0FBQyxDQUNILENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLGdGQUFzQyxFQUFFLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDcEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsbUJBQW1CLEVBQ25CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQ2pDLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FDNUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLDRCQUE0QixHQUFHLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUVoRyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0Msb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxpQ0FBaUMsRUFDakMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFDdkMsSUFBSSxDQUFDLHNCQUFzQixDQUMzQixDQUNELENBQUE7UUFFRCxnRkFBZ0Y7UUFDaEYsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUM3RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLE9BQU8sNkJBQTZCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ2pELElBQUksQ0FBQywwQkFBMEIsRUFBRSxvQ0FFakMsQ0FBQTtRQUNELElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUNoRixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtnQkFDakYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFDM0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLO29CQUN4QyxJQUFJLENBQUMscUJBQXFCLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDMUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssa0JBQWtCLENBQUMsQ0FBQTt3QkFDaEYsSUFBSSxjQUFjLEVBQUUsQ0FBQzs0QkFDcEIsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssRUFBRSxDQUFBOzRCQUUzQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQ0FDOUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDO29DQUM1QixRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVE7b0NBQ2pDLFVBQVUsRUFBRSxrQkFBa0I7aUNBQzlCLENBQUMsQ0FBQTtnQ0FDRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTs0QkFDM0IsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQzNDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQzNCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQzdELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDL0IsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQ3BDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxVQUFVLENBQ3RFLENBQUE7WUFDRCxNQUFNLFNBQVMsR0FBRyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1lBQ3BELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUNDLElBQUksQ0FBQyxxQkFBcUI7WUFDMUIsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQzlELENBQUM7WUFDRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFjO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDekMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJO1lBQ0gsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO2dCQUN0QixDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0UsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3hDLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxLQUE4QztRQUNuRiwyR0FBMkc7UUFDM0csSUFDQyxJQUFJLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQyxLQUFLO1lBQ25DLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLENBQUMsSUFBSTtnQkFDbEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUNwRSxDQUFDO1lBQ0YsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztnQkFDaEUsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsTUFBTSxrQkFBa0IsR0FDdkIsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxTQUFTLEtBQUssV0FBVztnQkFDN0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFBO1lBRXRDLGlKQUFpSjtZQUNqSixPQUFPLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUE7UUFDeEUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLFNBQVM7UUFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQjthQUN2QyxtQkFBbUIsRUFBRTthQUNyQixHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbEIsVUFBVSxFQUFFLE9BQU87WUFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUU7U0FDbEUsQ0FBQyxDQUFDO2FBQ0YsTUFBTSxDQUNOLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLGdCQUFnQixJQUFJLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsQ0FDeEYsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGdDQUFnQztRQUN2QyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxxQkFBcUI7YUFDdkQsbUJBQW1CLEVBQUU7YUFDckIsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDN0UsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMscUJBQXFCO2FBQ2hFLG1CQUFtQixFQUFFO2FBQ3JCLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ1osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2hFLE9BQU8sS0FBSyxFQUFFLGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUNILE1BQU0sWUFBWSxHQUNqQiwrQkFBK0IsSUFBSSxzQkFBc0I7WUFDeEQsQ0FBQyxDQUFDO2dCQUNBLFFBQVEsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUU7Z0JBQ2pGLFVBQVUsRUFBRSxzQkFBc0I7YUFDbEM7WUFDRixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ2IsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxLQUE4QztRQUM3RSxJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFBO1FBRWxDLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDM0IsNkdBQTZHO1lBQzdHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsRUFDakMsS0FBSyxDQUFDLFVBQVUsZ0VBR2hCLENBQUE7UUFFRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTyxXQUFXO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxPQUFPLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRU8sYUFBYTtRQUNwQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxnRkFFakQsQ0FBQTtRQUNELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCO2lCQUNwQyxnQkFBZ0Isc0ZBQThDO2dCQUMvRCxFQUFFLFFBQVEsRUFBRSxDQUFBO1lBQ2IsT0FBTyxPQUFPO2dCQUNiLENBQUMsQ0FBQyxRQUFRLENBQ1IsK0JBQStCLEVBQy9CLG9JQUFvSSxFQUNwSSxPQUFPLENBQ1A7Z0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUixpQ0FBaUMsRUFDakMsbUhBQW1ILENBQ25ILENBQUE7UUFDSixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxLQUFxQixFQUFFLFlBQXFCO1FBQy9ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hCLElBQUksRUFBRSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSTtZQUNyRCxLQUFLLEVBQUUsS0FBSyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1NBQy9DLENBQUMsQ0FBQTtRQUNGLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsc0JBQXNCLElBQUksRUFBRSxDQUFBO1FBQ2xFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBRXhELElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM1QyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQy9ELElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxDQUFBO1lBQzVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ3ZELFVBQVUsa0NBRVYsS0FBSyxDQUNMLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQztvQkFDWCxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDO29CQUN2RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLDJCQUEyQixDQUFDO2lCQUNoRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSw2QkFBNkIsQ0FBQyxFQUFFLEVBQUU7b0JBQ2pFLElBQUksT0FBTyxvQkFBb0IsS0FBSyxRQUFRLEVBQUUsQ0FBQzt3QkFDOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLFVBQVUsRUFDVixJQUFJLGdFQUdKLENBQUE7d0JBQ0QsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTt3QkFDMUQsSUFBSSxXQUFXLEVBQUUsQ0FBQzs0QkFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsMENBQTBDLFdBQVcsRUFBRSxDQUFDLENBQUE7NEJBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7NEJBQzdCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO3dCQUMzQixDQUFDO29CQUNGLENBQUM7b0JBRUQsSUFDQyxPQUFPLDZCQUE2QixLQUFLLFFBQVE7d0JBQ2pELElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxDQUFDLEtBQUssRUFDbkMsQ0FBQzt3QkFDRixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsVUFBVSxFQUNWLElBQUksZ0VBR0osQ0FBQTt3QkFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsb0RBQW9ELDZCQUE2QixFQUFFLENBQ25GLENBQUE7d0JBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLENBQUE7b0JBQ3RELENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxPQUFlO1FBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNyRSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUN0RSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtZQUMxQixJQUFJLENBQUMsOEJBQThCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDNUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsOEJBQThCLENBQUMsS0FBSztnQkFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzFELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxLQUFLLE9BQU8sQ0FBQyxDQUFBO29CQUM1RCxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTt3QkFFM0MsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUM7NEJBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBOzRCQUMvRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTt3QkFDM0IsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFTyxrQ0FBa0M7UUFDekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQTtRQUMxQyxPQUFPLFFBQVEsR0FBRyxnQ0FBZ0MsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsZUFBZTtRQUNkLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFnQjtRQUMxQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUI7UUFDdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3BGLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYTtRQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdkMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDNUIsT0FBTTtRQUNQLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDcEYsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBaUI7UUFDOUMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRTdFLElBQUksa0JBQWtCLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxzQkFBc0IsSUFBSSxFQUFFLENBQUE7UUFFekUsb0RBQW9EO1FBQ3BELElBQUksa0JBQWtCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25DLGtCQUFrQixHQUFHLENBQ3BCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRTtnQkFDM0MsSUFDQyxVQUFVLENBQUMsT0FBTztvQkFDbEIsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNO29CQUM3QixHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQzVDLENBQUM7b0JBQ0YsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7b0JBQ3hELElBQUksQ0FBQzt3QkFDSixNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQ2xFLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQzlDLGFBQWEsRUFDYixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCOzRCQUNGLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7d0JBQ3pELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQzs0QkFDbEIsT0FBTyxTQUFTLENBQUE7d0JBQ2pCLENBQUM7d0JBQ0QsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxDQUFBO3dCQUN2QyxhQUFhLENBQUMsS0FBSzs0QkFDbEIsb0JBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVE7Z0NBQ3RELENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTTtnQ0FDcEIsQ0FBQyxDQUFDLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLDZDQUE2Qzt3QkFDdkYsT0FBTyxhQUFhLENBQUE7b0JBQ3JCLENBQUM7b0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUMsQ0FBQTt3QkFDNUQsT0FBTyxTQUFTLENBQUE7b0JBQ2pCLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLFVBQVUsQ0FBQTtZQUNsQixDQUFDLENBQUMsQ0FDRixDQUNELENBQUMsTUFBTSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLENBQUE7UUFFL0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXRDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWxELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkYsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xELElBQUksa0JBQWtCLEtBQUssbUJBQW1CLEVBQUUsQ0FBQztnQkFDaEQsd0RBQXdEO2dCQUN4RCxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHlFQUF5RTtnQkFDekUseUVBQXlFO2dCQUN6RSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhLEVBQUUsU0FBa0I7UUFDekMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEMsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXpFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxVQUEyQjtRQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDMUMsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBcUI7UUFDdEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUVELHNGQUFzRjtRQUN0RixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbEMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN4RSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRUQsa0ZBQWtGO0lBQzFFLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxVQUEyQjtRQUNsRSxNQUFNLDZCQUE2QixHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUMzRixJQUFJLFVBQVUsQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM3RSxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLENBQUE7Z0JBQ3ZDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFBO2dCQUMvQixPQUFPLGFBQWEsQ0FBQTtZQUNyQixDQUFDO1lBQ0QsT0FBTyxVQUFVLENBQUE7UUFDbEIsQ0FBQyxDQUFDLENBQUE7UUFFRixVQUFVLENBQUMsc0JBQXNCLEdBQUcsNkJBQTZCLENBQUE7UUFDakUsTUFBTSxRQUFRLEdBQUc7WUFDaEIsSUFBSSxFQUFFLEtBQUs7WUFDWCxLQUFLLEVBQUUsVUFBVTtTQUNqQixDQUFBO1FBRUQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVPLHdCQUF3QjtRQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU07UUFDUCxDQUFDO1FBQ0Qsd0VBQXdFO1FBQ3hFLDJEQUEyRDtRQUMzRCxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTyw0QkFBNEI7UUFDbkMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDaEUsQ0FBQTtRQUNELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBc0IsRUFBRSxZQUFvQixFQUFFLE1BQW1CO1FBQ3ZFLElBQUksUUFBUSxDQUFBO1FBQ1osSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsRUFBRTtnQkFDM0MsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsRUFBRTtvQkFDNUMsR0FBRyxDQUFDLENBQUMsQ0FBQyx5REFBeUQsQ0FBQztvQkFDaEUsR0FBRyxDQUFDLENBQUMsQ0FBQyx5REFBeUQsRUFBRTt3QkFDaEUsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0MsRUFBRTs0QkFDN0MsR0FBRyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQzs0QkFDL0MsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQzt5QkFDM0MsQ0FBQztxQkFDRixDQUFDO29CQUNGLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0RBQWtELEVBQUU7d0JBQ3pELEdBQUcsQ0FBQyxDQUFDLENBQUMsNENBQTRDLENBQUM7d0JBQ25ELEdBQUcsQ0FBQyxDQUFDLENBQUMsaURBQWlELENBQUM7d0JBQ3hELEdBQUcsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLENBQUM7cUJBQ2xELENBQUM7b0JBQ0YsR0FBRyxDQUFDLENBQUMsQ0FBQyxpREFBaUQsQ0FBQztpQkFDeEQsQ0FBQzthQUNGLENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMseUJBQXlCLEVBQUU7Z0JBQzNDLEdBQUcsQ0FBQyxDQUFDLENBQUMsaURBQWlELENBQUM7Z0JBQ3hELEdBQUcsQ0FBQyxDQUFDLENBQUMseURBQXlELENBQUM7Z0JBQ2hFLEdBQUcsQ0FBQyxDQUFDLENBQUMseURBQXlELEVBQUU7b0JBQ2hFLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0NBQXNDLEVBQUU7d0JBQzdDLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0RBQWtELEVBQUU7NEJBQ3pELEdBQUcsQ0FBQyxDQUFDLENBQUMsNENBQTRDLENBQUM7NEJBQ25ELEdBQUcsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLENBQUM7NEJBQ2xELEdBQUcsQ0FBQyxDQUFDLENBQUMsaURBQWlELENBQUM7eUJBQ3hELENBQUM7d0JBQ0YsR0FBRyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0MsQ0FBQzt3QkFDL0MsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQztxQkFDM0MsQ0FBQztpQkFDRixDQUFDO2FBQ0YsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtRQUM5QixTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFBO1FBQ2xGLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUE7UUFDckQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsbUJBQW1CLENBQUEsQ0FBQywwQ0FBMEM7UUFDbkcsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQSxDQUFDLDZDQUE2QztRQUM1RixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFBO1FBQ2hELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxRQUFRLENBQUMsb0JBQW9CLENBQUE7UUFDekQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQTtRQUNqRSxJQUFJLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFBO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQTtRQUNoRCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQTtRQUM3RCxJQUFJLENBQUMsaUNBQWlDLEdBQUcsUUFBUSxDQUFDLGlDQUFpQyxDQUFBO1FBQ25GLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLENBQ2pGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUMsQ0FDbkYsQ0FBQTtRQUNELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV4QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7WUFDM0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEYsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBRTdCLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV6QyxNQUFNLDRCQUE0QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2xELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQ25ELENBQUE7UUFDRCxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxRSxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3BDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDLENBQ3pFLENBQ0QsQ0FBQTtRQUVELE1BQU0sRUFBRSxvQ0FBb0MsRUFBRSxtQ0FBbUMsRUFBRSxHQUNsRixJQUFJLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDOUYsSUFBSSxDQUFDLG9DQUFvQyxHQUFHLG9DQUFvQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxtQ0FBbUMsQ0FBQTtRQUUvRSxNQUFNLE9BQU8sR0FBK0Isc0JBQXNCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDN0YsT0FBTyxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUE7UUFDMUUsT0FBTyxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUNwRCxPQUFPLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUN4QixPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUN4QyxPQUFPLENBQUMsVUFBVSxHQUFHLG1CQUFtQixDQUFBO1FBQ3hDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxPQUFPO1lBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3ZGLE9BQU8sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUE7UUFDckMsT0FBTyxDQUFDLHVCQUF1QixHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFBO1FBQ3BELE9BQU8sQ0FBQyxPQUFPLEdBQUc7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixZQUFZLEVBQUUsS0FBSztZQUNuQixTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxLQUFLO1lBQ3BCLFVBQVUsRUFBRSxTQUFTO1NBQ3JCLENBQUE7UUFDRCxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQ3hFLE9BQU8sQ0FBQyxZQUFZLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFFekMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZ0IsRUFBRSxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sYUFBYSxHQUFHLGdDQUFnQyxFQUFFLENBQUE7UUFDeEQsYUFBYSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQ2hDLEdBQUcsd0JBQXdCLENBQUMsMEJBQTBCLENBQUM7WUFDdEQsc0JBQXNCLENBQUMsRUFBRTtZQUN6QixvQkFBb0IsQ0FBQyxFQUFFO1lBQ3ZCLG1CQUFtQixDQUFDLEVBQUU7WUFDdEIsWUFBWSxDQUFDLEVBQUU7U0FDZixDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsMEJBQTBCLENBQUMsY0FBYyxDQUN4QyxnQkFBZ0IsRUFDaEIsSUFBSSxDQUFDLG1CQUFtQixFQUN4QixPQUFPLEVBQ1AsYUFBYSxDQUNiLENBQ0QsQ0FBQTtRQUVELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQTtRQUMvRCxPQUFPLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFFOUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUM5QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUM3QixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLEVBQ3BDLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQTtZQUNELElBQUksYUFBYSxLQUFLLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsYUFBYSxDQUFBO2dCQUN0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDL0IsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDMUMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNsRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRTtZQUMzQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDdkIsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO1lBQzFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWpELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdkIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDNUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQTtZQUMxRCx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ2hFLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUVsRSxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQy9FLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQ3hCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3ZGLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQ3hCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN4QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLE1BQU0sQ0FBQyxTQUFTLEVBQ2hCO1lBQ0MsZUFBZSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWU7WUFDbkQsV0FBVyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFO1lBQ3hDLGtCQUFrQixtQ0FBMkI7WUFDN0MsYUFBYTtTQUNiLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sR0FBRyxFQUFFLE1BQU0sRUFBc0MsQ0FBQTtRQUNqRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDbEQsSUFDQyxJQUFJLENBQUMsZ0JBQWdCO2dCQUNyQixPQUFPLElBQUksQ0FBQyx1QkFBdUIsS0FBSyxRQUFRO2dCQUNoRCxJQUFJLENBQUMsdUJBQXVCLEtBQUssSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxFQUN4RSxDQUFDO2dCQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUNqQztZQUNDLGVBQWUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlO1lBQ25ELFdBQVcsRUFBRTtnQkFDWixpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1lBQ0QsYUFBYTtZQUNiLGtCQUFrQixtQ0FBMkIsRUFBRSxpRUFBaUU7WUFDaEgsc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQzNDLElBQ0MsSUFBSSxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLO29CQUN6QyxJQUFJLENBQUMsUUFBUSxLQUFLLGlCQUFpQixDQUFDLE1BQU0sRUFDekMsQ0FBQztvQkFDRixJQUNDLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQyxFQUFFO3dCQUNqQyxNQUFNLENBQUMsRUFBRSxLQUFLLFlBQVksQ0FBQyxFQUFFO3dCQUM3QixNQUFNLENBQUMsRUFBRSxLQUFLLDhCQUE4QixDQUFDLEVBQUUsQ0FBQzt3QkFDakQsTUFBTSxZQUFZLGNBQWMsRUFDL0IsQ0FBQzt3QkFDRixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5RCxjQUFjLEVBQ2Q7NEJBQ0MsRUFBRSxFQUFFLHlCQUF5Qjs0QkFDN0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxTQUFTLENBQUM7NEJBQzlELElBQUksRUFBRSxPQUFPLENBQUMsV0FBVzt5QkFDekIsRUFDRCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLENBQ1QsQ0FBQTt3QkFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlDLDRCQUE0QixFQUM1QixNQUFNLEVBQ04sY0FBYyxFQUNkLEVBQUUsR0FBRyxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUNsQyxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssNkJBQTZCLElBQUksTUFBTSxZQUFZLGNBQWMsRUFBRSxDQUFDO29CQUNyRixJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFBO29CQUN4QyxDQUFDO29CQUVELElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7d0JBQ2hDLE1BQU0sWUFBWSxHQUF3Qjs0QkFDekMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUs7NEJBQzdELFFBQVEsRUFBRSxDQUFDLEtBQThDLEVBQUUsRUFBRTtnQ0FDNUQsa0dBQWtHO2dDQUNsRyxJQUFJLENBQUMsOEJBQThCLENBQUMsS0FBSyxFQUFFLENBQUE7Z0NBQzNDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQ0FDbkMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7NEJBQzdCLENBQUM7NEJBQ0QsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7eUJBQ2pDLENBQUE7d0JBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5Qyx5QkFBeUIsRUFDekIsTUFBTSxFQUNOLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsWUFBWSxDQUNaLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO3FCQUFNLElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyx1QkFBdUIsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7b0JBQ3RGLE1BQU0sUUFBUSxHQUF3Qjt3QkFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXO3dCQUMvQixlQUFlLEVBQUUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUs7cUJBQ3ZELENBQUE7b0JBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5Qyw0QkFBNEIsRUFDNUIsTUFBTSxFQUNOLFFBQVEsQ0FDUixDQUFBO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztTQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxNQUFNLEVBQXNDLENBQUE7UUFDNUUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRTtZQUM3QyxJQUNDLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixLQUFLLFFBQVE7Z0JBQ2xELElBQUksQ0FBQyx5QkFBeUIsS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxFQUNyRSxDQUFDO2dCQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFDbkM7Z0JBQ0MsZUFBZSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWU7Z0JBQ25ELFdBQVcsRUFBRTtvQkFDWixpQkFBaUIsRUFBRSxJQUFJO2lCQUN2QjtnQkFDRCxhQUFhO2FBQ2IsQ0FDRCxDQUNELENBQUE7WUFDRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3pELFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFDM0QsV0FBVyxDQUFDLE9BQU8sR0FBRyxFQUFFLE1BQU0sRUFBc0MsQ0FBQTtRQUNyRSxDQUFDO1FBRUQsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFFLENBQUM7UUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzlFLGlHQUFpRztZQUNqRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzVCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDYixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztZQUM3QiwwQkFBMEIsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsa0NBQWtDLEVBQUUsS0FBSyxFQUFFO1NBQ3pGLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMzQyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUM7Z0JBQzdCLFVBQVU7Z0JBQ1YsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO2FBQ3BELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLHlCQUF5QixHQUFHLEdBQUcsRUFBRTtZQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDaEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQ1YsUUFBUSxDQUFDLFVBQVUsS0FBSyxDQUFDO2dCQUN6QixRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2xGLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRS9CLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEQsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkYsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRix5QkFBeUIsRUFBRSxDQUFBO1FBRTNCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7WUFDL0MsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixNQUFNLENBQUMsMEJBQTBCLEVBQ2pDO1lBQ0MsZUFBZSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWU7WUFDbkQsS0FBSyxFQUFFLElBQUk7WUFDWCxXQUFXLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO1lBQ2hFLGtCQUFrQixtQ0FBMkI7WUFDN0MsYUFBYTtZQUNiLHNCQUFzQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUMzQyxJQUNDLE1BQU0sQ0FBQyxFQUFFLEtBQUssNkNBQTZDO29CQUMzRCxNQUFNLENBQUMsRUFBRSxLQUFLLHFDQUFxQyxFQUNsRCxDQUFDO29CQUNGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3hELGNBQWMsRUFDZCxTQUFTLEVBQ1QsTUFBTSxFQUNOLE9BQU8sQ0FDUCxDQUFBO29CQUNELE9BQU8sUUFBUSxDQUFBO2dCQUNoQixDQUFDO2dCQUNELElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDeEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsK0JBQStCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUNoRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7U0FDRCxDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxHQUFHO1lBQzlCLE1BQU07WUFDTixXQUFXLEVBQUUsUUFBUSxDQUNwQixpQkFBaUIsRUFDakIscURBQXFELENBQ3JEO1NBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsa0JBQWtCLENBQUMsK0JBQStCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUN4RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQzlCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFBO1FBQy9DLHNJQUFzSTtRQUN0SSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFBO1FBQ3hELE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFFN0MsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4QixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUU3RCxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNuRSxNQUFNLGNBQWMsR0FDbkIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7WUFDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDO1lBQ3BDLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQUN2QyxHQUFHLENBQUMsYUFBYSxDQUNoQixPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUNwRixJQUFJLENBQUMsb0JBQW9CLENBQ3pCLENBQUE7UUFDRCxHQUFHLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNoRSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyw4Q0FBOEMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2pDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLCtCQUErQixFQUMvQixJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsc0JBQXNCLENBQzNCLENBQ0QsQ0FBQTtZQUNELFNBQVMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFFRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFakQsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQy9DLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztnQkFDM0MsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO2dCQUNsQixDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUs7b0JBQ2YsT0FBTyxVQUFVLENBQUMsS0FBSyxLQUFLLFFBQVE7b0JBQ3BDLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSztvQkFDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztvQkFDakMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRztvQkFDdEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUNiLE1BQU0sS0FBSyxHQUNWLFVBQVUsQ0FBQyxLQUFLO2dCQUNoQixPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssUUFBUTtnQkFDcEMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLO2dCQUMzQixLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2dCQUNyQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLO2dCQUN4QixDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ2IsTUFBTSxzQkFBc0IsR0FDM0IsS0FBSztnQkFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUU3RixJQUFJLGdCQUFnQixDQUFBO1lBQ3BCLElBQUksUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDMUQsb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixLQUFLLEVBQ0wsVUFBVSxFQUNWLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsc0JBQXNCLEVBQ3RCLFNBQVMsRUFDVCxJQUFJLENBQUMsc0JBQXNCLEVBQzNCLGFBQWEsQ0FDYixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDL0IsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDMUQscUJBQXFCLEVBQ3JCLFFBQVEsRUFDUixVQUFVLEVBQ1YsSUFBSSxDQUFDLHFCQUFxQixFQUMxQixzQkFBc0IsRUFDdEIsU0FBUyxFQUNULElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsYUFBYSxDQUNiLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDMUQscUJBQXFCLEVBQ3JCLFVBQVUsRUFDVixJQUFJLENBQUMscUJBQXFCLEVBQzFCLHNCQUFzQixFQUN0QixTQUFTLEVBQ1QsSUFBSSxDQUFDLHNCQUFzQixFQUMzQixhQUFhLENBQ2IsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMxRCwyQkFBMkIsRUFDM0IsUUFBUSxFQUNSLEtBQUssRUFDTCxVQUFVLEVBQ1YsSUFBSSxDQUFDLHFCQUFxQixFQUMxQixzQkFBc0IsRUFDdEIsU0FBUyxFQUNULElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsYUFBYSxDQUNiLENBQUE7WUFDRixDQUFDO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzNCLEtBQUssQ0FBQyxHQUFHLENBQ1IsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3BELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QixDQUMvQixDQUFtQixFQUNuQixLQUFhLEVBQ2IsVUFBcUM7UUFFckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFM0MsMEdBQTBHO1FBQzFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxLQUFLLENBQUMsTUFBTSx1QkFBZSxJQUFJLEtBQUssQ0FBQyxNQUFNLHdCQUFlLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLDhDQUE4QyxHQUFHLEtBQUssQ0FBQTtZQUM1RCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsS0FBSyxDQUFDLDZCQUE2QixDQUFDLGtCQUE4QztRQUNqRixHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1FBRXRGLE1BQU0sV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUE7UUFDckMsTUFBTSxPQUFPLEdBQ1osa0JBQWtCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQy9DLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ2xDLE9BQU87Z0JBQ04sU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM1QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7Z0JBQ3hCLElBQUksRUFBRSxXQUFXO2FBQ2pCLENBQUE7UUFDRixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFVCxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlFLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLE1BQU0sY0FBYyxHQUNsQixJQUFJLENBQUMsaUNBQWlDLENBQUMsYUFBYSxDQUNwRCxpREFBaUQsQ0FDakM7WUFDakIsR0FBRyxDQUFDLE1BQU0sQ0FDVCxJQUFJLENBQUMsaUNBQWlDLEVBQ3RDLENBQUMsQ0FBQyxpREFBaUQsQ0FBQyxDQUNwRCxDQUFBO1FBQ0YsS0FBSyxNQUFNLEtBQUssSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsT0FBTyxDQUFDLE9BQU8sQ0FBQztvQkFDZixTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVc7b0JBQzVCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtvQkFDeEIsSUFBSSxFQUFFLFdBQVc7aUJBQ2pCLENBQUMsQ0FBQTtnQkFDRixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUN0RCxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUMzRSxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDcEUsQ0FBQztnQkFDRCxPQUFPLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUN6QixDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sY0FBYyxHQUNsQixjQUFjLENBQUMsYUFBYSxDQUFDLGdDQUFnQyxDQUFpQjtZQUMvRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sYUFBYSxHQUNqQixjQUFjLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFpQjtZQUNuRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0saUJBQWlCLEdBQ3RCLGFBQWEsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUM7WUFDckQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUV2RCxpQkFBaUIsQ0FBQyxXQUFXO1lBQzVCLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQkFBZ0IsQ0FBQztnQkFDNUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbkYsYUFBYSxDQUFDLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQUE7UUFDdkQsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFFMUIsMENBQTBDO1FBQzFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUV6QywrQkFBK0I7UUFDL0IsTUFBTSxnQkFBZ0IsR0FDcEIsY0FBYyxDQUFDLGFBQWEsQ0FBQywrQkFBK0IsQ0FBaUI7WUFDOUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQTtRQUUvRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxzQkFBc0IsRUFDdEIsZ0JBQWdCLEVBQ2hCLE1BQU0sQ0FBQyx3QkFBd0IsRUFDL0I7WUFDQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZTtZQUNuRCxXQUFXLEVBQUU7Z0JBQ1osR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixDQUFDLGFBQWEsRUFBRTthQUNwRDtZQUNELG9CQUFvQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hDLElBQ0MsTUFBTSxDQUFDLEVBQUUsS0FBSyw0QkFBNEIsQ0FBQyxFQUFFO29CQUM3QyxNQUFNLENBQUMsRUFBRSxLQUFLLCtCQUErQixDQUFDLEVBQUUsRUFDL0MsQ0FBQztvQkFDRixPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQTtnQkFDL0QsQ0FBQztnQkFDRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsQ0FDRCxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLG1CQUFtQixHQUN2QixjQUFjLENBQUMsYUFBYSxDQUFDLDRCQUE0QixDQUFpQjtZQUMzRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDbEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUE7WUFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDbEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMxQixJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxLQUFLLFdBQVcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDdkUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUE7b0JBRTNDLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtvQkFFMUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FDL0M7d0JBQ0MsUUFBUSxFQUFFLGVBQWU7d0JBQ3pCLE9BQU8sRUFBRSxDQUFDLENBQUMsYUFBYTtxQkFDeEIsRUFDRCxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FDeEMsQ0FBQTtvQkFFRCxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQy9DLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUM3QixxQkFBcUIsQ0FDcEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUNyQixPQUFPLEVBQ1AsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3hCLENBQUM7WUFDRixDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQ0QsQ0FBQTtZQUNELEdBQUcsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7WUFDdEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUNoRCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUMxRCxNQUFNLE1BQU0sR0FBRyxVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQzlCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQjtRQUMzQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUE7UUFDekMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDbEYsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsTUFBTSxJQUFJLFlBQVksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2RCxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hELEtBQUssTUFBTSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQ3JELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDbEIsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWE7YUFDYixDQUFDLENBQ0YsQ0FBQTtZQUNELFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzRCxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUNuRCxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQ2hDLGdCQUFnQixFQUNoQixXQUFXLEVBQ1gsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQ3RELFdBQVcsSUFBSSxFQUFFLENBQ2pCLENBQUE7WUFFRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUNwQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUM5QixLQUFLLENBQUMsTUFBTSxFQUFFLENBQUEsQ0FBQyxjQUFjO2dCQUM3QixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3hDLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUN0RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLFlBQVksRUFBRSxLQUFLO2dCQUNuQixTQUFTLEVBQUUsSUFBSTtnQkFDZixhQUFhO2dCQUNiLFNBQVMsRUFBRSxRQUFRLENBQ2xCLGtDQUFrQyxFQUNsQyxvQkFBb0IsRUFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQ3REO2FBQ0QsQ0FBQyxDQUNGLENBQUE7WUFDRCxTQUFTLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUE7WUFDNUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1lBQ2pGLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQ3BDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQy9CLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQSxDQUFDLGNBQWM7Z0JBQzdCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7WUFFOUIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM1QyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQ2xFLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbkMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFekIsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FDcEMsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDakIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQ3BCLEtBQWtDLEVBQ2xDLFFBQTRDO1FBRTVDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ25DLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2pDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFdEMsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUM1QixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUd0QyxhQUFhLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3ZGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FDdEQsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNqQyxPQUFPLENBQ04sSUFBSSxDQUFDLGVBQWU7WUFDcEIsSUFBSSxDQUFDLHFCQUFxQjtZQUMxQixJQUFJLENBQUMsd0JBQXdCO1lBQzdCLElBQUksQ0FBQyxpQkFBaUI7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQjtZQUN0QixJQUFJLENBQUMsY0FBYztZQUNuQixJQUFJLENBQUMsc0JBQXNCLENBQzNCLENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXhELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUdPLE9BQU8sQ0FBQyxNQUFjLEVBQUUsS0FBYSxFQUFFLFlBQVksR0FBRyxJQUFJO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQ2pDLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsTUFBTTtZQUNMLElBQUksQ0FBQyxlQUFlO1lBQ3BCLElBQUksQ0FBQyxpQkFBaUI7WUFDdEIsSUFBSSxDQUFDLHdCQUF3QjtZQUM3QixJQUFJLENBQUMsY0FBYyxDQUNwQixDQUFBO1FBRUQsTUFBTSxjQUFjLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQTtRQUM5RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLGNBQWMsSUFBSSxDQUFBO1FBRTNELElBQUksQ0FBQyxnQkFBZ0I7WUFDcEIsSUFBSSxDQUFDLHdCQUF3QjtnQkFDN0IsSUFBSSxDQUFDLGVBQWU7Z0JBQ3BCLGlCQUFpQjtnQkFDakIsSUFBSSxDQUFDLGlCQUFpQjtnQkFDdEIsSUFBSSxDQUFDLGlCQUFpQjtnQkFDdEIsSUFBSSxDQUFDLGNBQWM7Z0JBQ25CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtRQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUM1QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFBO1FBRTNELE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUNuRSxNQUFNLGNBQWMsR0FDbkIsS0FBSztZQUNMLElBQUksQ0FBQywwQkFBMEI7WUFDL0IsSUFBSSxDQUFDLFlBQVk7WUFDakIsSUFBSSxDQUFDLGdDQUFnQztZQUNyQyxJQUFJLENBQUMsYUFBYTtZQUNsQixJQUFJLENBQUMsZ0JBQWdCLENBQUE7UUFDdEIsTUFBTSxZQUFZLEdBQUcsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pFLElBQ0MsQ0FBQyxJQUFJLENBQUMsNEJBQTRCO1lBQ2xDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLEtBQUs7WUFDOUQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUMsTUFBTSxFQUMvRCxDQUFDO1lBQ0YscUxBQXFMO1lBQ3JMLCtKQUErSjtZQUMvSixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN0QyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsWUFBWSxDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLFlBQVksSUFBSSx3QkFBd0IsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNuRCwySUFBMkk7WUFDM0ksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCO1lBQzFELElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QjtZQUN0RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDNUUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFO1lBQ3BFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDSixPQUFPO1lBQ04saUJBQWlCLEVBQUUsQ0FBQztZQUNwQixlQUFlLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVk7WUFDckQscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxFQUNwQyxJQUFJLENBQUMsb0JBQW9CLENBQ3pCO1lBQ0QsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUUsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUUsaUJBQWlCLEVBQ2hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZO2dCQUN0QyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEQsWUFBWSxFQUFFLENBQUM7WUFDZixnQ0FBZ0MsRUFBRSxFQUFFO1lBQ3BDLGFBQWEsRUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTO2dCQUNyQyxDQUFDLENBQUMsbUJBQW1CLEdBQUcscUJBQXFCLEdBQUcsaUJBQWlCLEdBQUcsbUJBQW1CO2dCQUN2RixDQUFDLENBQUMsQ0FBQztZQUNMLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvRCxzQkFBc0IsRUFBRSxJQUFJLENBQUMsaUNBQWlDLENBQUMsWUFBWTtZQUMzRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMseUJBQXlCO2dCQUMvQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTztnQkFDL0QsQ0FBQyxDQUFDLENBQUM7U0FDSixDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRUQsU0FBUztRQUNSLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzdELENBQUM7O0FBeHZEVyxhQUFhO0lBNk92QixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxXQUFXLENBQUE7SUFDWCxZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFlBQUEsMkJBQTJCLENBQUE7SUFDM0IsWUFBQSx3QkFBd0IsQ0FBQTtHQWxRZCxhQUFhLENBeXZEekI7O0FBRUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUF3QixFQUFFLEVBQUUsQ0FDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0FBRTdFLFNBQVMsZUFBZSxDQUFDLEtBQWlCO0lBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO0FBQ25HLENBQUM7QUFFRCxzSEFBc0g7QUFDdEgsc0ZBQXNGO0FBQ3RGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsaUNBQWlDO0lBQzNFLFlBQ0MsTUFBc0IsRUFDdEIsY0FBdUIsRUFDdkIsT0FBa0QsRUFDcEMsV0FBeUIsRUFDbEIsa0JBQXVDLEVBQ3hDLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDbkMsbUJBQXlDLEVBQ2hELFlBQTJCLEVBQ25CLG9CQUEyQztRQUVsRSxLQUFLLENBQ0osTUFBTSxFQUNOLGNBQWMsRUFDZCxFQUFFLEVBQ0YsRUFBRSxFQUNGO1lBQ0MsR0FBRyxPQUFPO1lBQ1YsYUFBYSxFQUFFLENBQUMsTUFBZSxFQUFFLEVBQUUsQ0FDbEMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQztTQUNqRSxFQUNELGtCQUFrQixFQUNsQixpQkFBaUIsRUFDakIsbUJBQW1CLEVBQ25CLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osb0JBQW9CLENBQ3BCLENBQUE7UUFDRCxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtZQUN2QixNQUFNLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZGLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZDLENBQUMsQ0FBQTtRQUNELFVBQVUsRUFBRSxDQUFBO1FBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0NBQ0QsQ0FBQTtBQXRDSyw0QkFBNEI7SUFLL0IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtHQVhsQiw0QkFBNEIsQ0FzQ2pDO0FBUUQsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSx3Q0FBd0M7SUFDL0UsWUFDQyxNQUFzQixFQUNkLG9CQUE2RCxFQUNwRCxRQUE2QixFQUN6QixrQkFBdUMsRUFDeEMsaUJBQXFDLEVBQ3JDLGlCQUFxQyxFQUNoQyxzQkFBK0MsRUFDdkQsY0FBK0IsRUFDbEMsV0FBeUIsRUFDcEIsZ0JBQW1DO1FBRXRELE1BQU0sb0JBQW9CLEdBQW9CO1lBQzdDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0sc0JBQXNCLEdBQUcsQ0FDOUIsS0FBOEMsRUFDcEMsRUFBRTtvQkFDWixPQUFPO3dCQUNOLEVBQUUsRUFBRSxLQUFLLENBQUMsVUFBVTt3QkFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSTt3QkFDMUIsT0FBTyxFQUFFLEVBQUU7d0JBQ1gsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLE9BQU8sRUFBRSxJQUFJO3dCQUNiLE9BQU8sRUFBRSxLQUFLLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVO3dCQUNsRSxHQUFHLEVBQUUsR0FBRyxFQUFFOzRCQUNULElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUE7NEJBQ2pDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQVEsQ0FBQyxDQUFBOzRCQUMvQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDOUIsQ0FBQztxQkFDRCxDQUFBO2dCQUNGLENBQUMsQ0FBQTtnQkFFRCxNQUFNLE1BQU0sR0FBOEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDbkYsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtnQkFFcEUseUNBQXlDO2dCQUN6QyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtnQkFDekYsTUFBTSxpQkFBaUIsR0FBRyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDOUQsSUFDQyxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQztvQkFDNUIsc0JBQXNCLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLEVBQzdELENBQUM7b0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUE7Z0JBQzlCLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLGlCQUFpQixDQUFDLENBQUE7Z0JBQ2xDLElBQUksc0JBQXNCLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDcEUsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQUM7d0JBQ1IsRUFBRSxFQUFFLFlBQVk7d0JBQ2hCLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7d0JBQ3JELEdBQUcsRUFBRSxHQUFHLEVBQUU7NEJBQ1QsTUFBTSxTQUFTLEdBQUcsbUNBQW1DLENBQUE7NEJBQ3JELGdCQUFnQixDQUFDLFVBQVUsQ0FHekIseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBOzRCQUNwRSxjQUFjLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO3dCQUN6QyxDQUFDO3FCQUNELENBQUMsQ0FDRixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxPQUFPLENBQUE7WUFDZixDQUFDO1NBQ0QsQ0FBQTtRQUVELE1BQU0sZUFBZSxHQUFZO1lBQ2hDLEdBQUcsTUFBTTtZQUNULE9BQU8sRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxDQUFDO1lBQ3pELEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ2IsQ0FBQTtRQUNELEtBQUssQ0FDSixlQUFlLEVBQ2Ysb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLGlCQUFpQixDQUNqQixDQUFBO1FBM0VPLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBeUM7UUFDcEQsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUEyRTlDLElBQUksQ0FBQyxTQUFTLENBQ2IsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE9BQU8sQ0FBQTtZQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFRLENBQUMsQ0FBQTtRQUNoQyxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVrQixXQUFXLENBQUMsT0FBb0I7UUFDbEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLEdBQUcsQ0FBQyxLQUFLLENBQ1IsT0FBTyxFQUNQLEdBQUcsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQ2xGLEdBQUcsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsQ0FDMUMsQ0FBQTtRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVRLE1BQU0sQ0FBQyxTQUFzQjtRQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7SUFDakQsQ0FBQztDQUNELENBQUE7QUFyR0sseUJBQXlCO0lBSzVCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsaUJBQWlCLENBQUE7R0FYZCx5QkFBeUIsQ0FxRzlCO0FBRUQsTUFBTSxnQ0FBZ0MsR0FBRywyQkFBMkIsQ0FBQTtBQUNwRSxpQ0FBaUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0FBT25FLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsd0NBQXdDO0lBQ2xGLFlBQ0MsTUFBc0IsRUFDTCxRQUE2QixFQUN6QixrQkFBdUMsRUFDeEMsaUJBQXFDLEVBQ3JDLGlCQUFxQyxFQUMzQyxXQUF5QixFQUNwQixnQkFBbUM7UUFFdEQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFjLEVBQVcsRUFBRSxDQUFDLENBQUM7WUFDaEQsR0FBRyxNQUFNO1lBQ1QsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDOUIsS0FBSyxFQUFFLFNBQVM7WUFDaEIsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUk7WUFDcEMsR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNmLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBZ0MsQ0FBQyxDQUFBO2dCQUN2RSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFRLENBQUMsQ0FBQTtnQkFDL0IsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxjQUFjLEdBQW9CO1lBQ3ZDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQ3JELElBQUksZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ25ELENBQUM7Z0JBRUQsSUFBSSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDcEMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDcEQsQ0FBQztnQkFFRCxPQUFPLGlCQUFpQixDQUFBO1lBQ3pCLENBQUM7U0FDRCxDQUFBO1FBRUQsS0FBSyxDQUNKLE1BQU0sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsaUJBQWlCLENBQ2pCLENBQUE7UUEzQ2dCLGFBQVEsR0FBUixRQUFRLENBQXFCO1FBNEM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFFTyxZQUFZLENBQUMsSUFBYztRQUNsQyxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxRQUFRLENBQUMsS0FBSztnQkFDbEIsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDM0MsS0FBSyxRQUFRLENBQUMsSUFBSTtnQkFDakIsT0FBTyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDM0MsS0FBSyxRQUFRLENBQUMsR0FBRyxDQUFDO1lBQ2xCO2dCQUNDLE9BQU8sUUFBUSxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVrQixXQUFXLENBQUMsT0FBb0I7UUFDbEQsb0ZBQW9GO1FBQ3BGLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVwQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN4RCxHQUFHLENBQUMsS0FBSyxDQUNSLE9BQU8sRUFDUCxHQUFHLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFDaEQsR0FBRyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUMxQyxDQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRVEsTUFBTSxDQUFDLFNBQXNCO1FBQ3JDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0NBQ0QsQ0FBQTtBQS9FSyw0QkFBNEI7SUFJL0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGlCQUFpQixDQUFBO0dBUmQsNEJBQTRCLENBK0VqQztBQUVELE1BQU0sY0FBZSxTQUFRLGNBQWM7SUFDMUMsWUFBWSxPQUFnQixFQUFFLE1BQWUsRUFBRSxPQUErQjtRQUM3RSxLQUFLLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRVEsTUFBTSxDQUFDLFNBQXNCO1FBQ3JDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0NBQ0QifQ==