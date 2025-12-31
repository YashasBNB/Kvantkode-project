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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0SW5wdXRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVyRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHVCQUF1QixHQUN2QixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzFGLE9BQU8sRUFFTixTQUFTLEVBQ1QsUUFBUSxHQUdSLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV0RSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNa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