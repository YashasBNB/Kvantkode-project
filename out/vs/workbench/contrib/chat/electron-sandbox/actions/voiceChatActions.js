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
var VoiceChatSessions_1, ChatSynthesizerSessions_1, KeywordActivationContribution_1, KeywordActivationStatusEntry_1;
import './media/voiceChatActions.css';
import { RunOnceScheduler, disposableTimeout, raceCancellation, } from '../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { isNumber } from '../../../../../base/common/types.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService, } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Extensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { contrastBorder, focusBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading, syncing } from '../../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { registerThemingParticipant } from '../../../../../platform/theme/common/themeService.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ACTIVITY_BAR_BADGE_BACKGROUND } from '../../../../common/theme.js';
import { SpeechTimeoutDefault, accessibilityConfigurationNodeBase, } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { CHAT_CATEGORY } from '../../browser/actions/chatActions.js';
import { IChatWidgetService, IQuickChatService, showChatView, } from '../../browser/chat.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { KEYWORD_ACTIVIATION_SETTING_ID } from '../../common/chatService.js';
import { ChatResponseViewModel, isResponseVM, } from '../../common/chatViewModel.js';
import { IVoiceChatService, VoiceChatInProgress as GlobalVoiceChatInProgress, } from '../../common/voiceChatService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { InlineChatController } from '../../../inlineChat/browser/inlineChatController.js';
import { CTX_INLINE_CHAT_FOCUSED, MENU_INLINE_CHAT_WIDGET_SECONDARY, } from '../../../inlineChat/common/inlineChat.js';
import { NOTEBOOK_EDITOR_FOCUSED } from '../../../notebook/common/notebookContextKeys.js';
import { HasSpeechProvider, ISpeechService, KeywordRecognitionStatus, SpeechToTextInProgress, SpeechToTextStatus, TextToSpeechStatus, TextToSpeechInProgress as GlobalTextToSpeechInProgress, } from '../../../speech/common/speechService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService, } from '../../../../services/layout/browser/layoutService.js';
import { IStatusbarService, } from '../../../../services/statusbar/browser/statusbar.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { renderStringAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { SearchContext } from '../../../search/common/constants.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../base/common/severity.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
const VoiceChatSessionContexts = ['view', 'inline', 'quick', 'editor'];
// Global Context Keys (set on global context key service)
const CanVoiceChat = ContextKeyExpr.and(ChatContextKeys.enabled, HasSpeechProvider);
const FocusInChatInput = ContextKeyExpr.or(CTX_INLINE_CHAT_FOCUSED, ChatContextKeys.inChatInput);
const AnyChatRequestInProgress = ChatContextKeys.requestInProgress;
// Scoped Context Keys (set on per-chat-context scoped context key service)
const ScopedVoiceChatGettingReady = new RawContextKey('scopedVoiceChatGettingReady', false, {
    type: 'boolean',
    description: localize('scopedVoiceChatGettingReady', 'True when getting ready for receiving voice input from the microphone for voice chat. This key is only defined scoped, per chat context.'),
});
const ScopedVoiceChatInProgress = new RawContextKey('scopedVoiceChatInProgress', undefined, {
    type: 'string',
    description: localize('scopedVoiceChatInProgress', 'Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.'),
});
const AnyScopedVoiceChatInProgress = ContextKeyExpr.or(...VoiceChatSessionContexts.map((context) => ScopedVoiceChatInProgress.isEqualTo(context)));
var VoiceChatSessionState;
(function (VoiceChatSessionState) {
    VoiceChatSessionState[VoiceChatSessionState["Stopped"] = 1] = "Stopped";
    VoiceChatSessionState[VoiceChatSessionState["GettingReady"] = 2] = "GettingReady";
    VoiceChatSessionState[VoiceChatSessionState["Started"] = 3] = "Started";
})(VoiceChatSessionState || (VoiceChatSessionState = {}));
class VoiceChatSessionControllerFactory {
    static async create(accessor, context) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const quickChatService = accessor.get(IQuickChatService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorService = accessor.get(IEditorService);
        const viewsService = accessor.get(IViewsService);
        switch (context) {
            case 'focused': {
                const controller = VoiceChatSessionControllerFactory.doCreateForFocusedChat(chatWidgetService, layoutService);
                return controller ?? VoiceChatSessionControllerFactory.create(accessor, 'view'); // fallback to 'view'
            }
            case 'view': {
                const chatWidget = await showChatView(viewsService);
                if (chatWidget) {
                    return VoiceChatSessionControllerFactory.doCreateForChatWidget('view', chatWidget);
                }
                break;
            }
            case 'inline': {
                const activeCodeEditor = getCodeEditor(editorService.activeTextEditorControl);
                if (activeCodeEditor) {
                    const inlineChat = InlineChatController.get(activeCodeEditor);
                    if (inlineChat) {
                        if (!inlineChat.isActive) {
                            inlineChat.run();
                        }
                        return VoiceChatSessionControllerFactory.doCreateForChatWidget('inline', inlineChat.widget.chatWidget);
                    }
                }
                break;
            }
            case 'quick': {
                quickChatService.open(); // this will populate focused chat widget in the chat widget service
                return VoiceChatSessionControllerFactory.create(accessor, 'focused');
            }
        }
        return undefined;
    }
    static doCreateForFocusedChat(chatWidgetService, layoutService) {
        const chatWidget = chatWidgetService.lastFocusedWidget;
        if (chatWidget?.hasInputFocus()) {
            // Figure out the context of the chat widget by asking
            // layout service for the part that has focus. Unfortunately
            // there is no better way because the widget does not know
            // its location.
            let context;
            if (layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
                context = chatWidget.location === ChatAgentLocation.Panel ? 'editor' : 'inline';
            }
            else if ([
                "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */,
                "workbench.parts.panel" /* Parts.PANEL_PART */,
                "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */,
                "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */,
                "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */,
                "workbench.parts.banner" /* Parts.BANNER_PART */,
                "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */,
            ].some((part) => layoutService.hasFocus(part))) {
                context = 'view';
            }
            else {
                context = 'quick';
            }
            return VoiceChatSessionControllerFactory.doCreateForChatWidget(context, chatWidget);
        }
        return undefined;
    }
    static createChatContextKeyController(contextKeyService, context) {
        const contextVoiceChatGettingReady = ScopedVoiceChatGettingReady.bindTo(contextKeyService);
        const contextVoiceChatInProgress = ScopedVoiceChatInProgress.bindTo(contextKeyService);
        return (state) => {
            switch (state) {
                case VoiceChatSessionState.GettingReady:
                    contextVoiceChatGettingReady.set(true);
                    contextVoiceChatInProgress.reset();
                    break;
                case VoiceChatSessionState.Started:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.set(context);
                    break;
                case VoiceChatSessionState.Stopped:
                    contextVoiceChatGettingReady.reset();
                    contextVoiceChatInProgress.reset();
                    break;
            }
        };
    }
    static doCreateForChatWidget(context, chatWidget) {
        return {
            context,
            scopedContextKeyService: chatWidget.scopedContextKeyService,
            onDidAcceptInput: chatWidget.onDidAcceptInput,
            onDidHideInput: chatWidget.onDidHide,
            focusInput: () => chatWidget.focusInput(),
            acceptInput: () => chatWidget.acceptInput(undefined, { isVoiceInput: true }),
            updateInput: (text) => chatWidget.setInput(text),
            getInput: () => chatWidget.getInput(),
            setInputPlaceholder: (text) => chatWidget.setInputPlaceholder(text),
            clearInputPlaceholder: () => chatWidget.resetInputPlaceholder(),
            updateState: VoiceChatSessionControllerFactory.createChatContextKeyController(chatWidget.scopedContextKeyService, context),
        };
    }
}
let VoiceChatSessions = class VoiceChatSessions {
    static { VoiceChatSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!VoiceChatSessions_1.instance) {
            VoiceChatSessions_1.instance = instantiationService.createInstance(VoiceChatSessions_1);
        }
        return VoiceChatSessions_1.instance;
    }
    constructor(voiceChatService, configurationService, instantiationService, accessibilityService) {
        this.voiceChatService = voiceChatService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.accessibilityService = accessibilityService;
        this.currentVoiceChatSession = undefined;
        this.voiceChatSessionIds = 0;
    }
    async start(controller, context) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        ChatSynthesizerSessions.getInstance(this.instantiationService).stop();
        let disableTimeout = false;
        const sessionId = ++this.voiceChatSessionIds;
        const session = (this.currentVoiceChatSession = {
            id: sessionId,
            controller,
            hasRecognizedInput: false,
            disposables: new DisposableStore(),
            setTimeoutDisabled: (disabled) => {
                disableTimeout = disabled;
            },
            accept: () => this.accept(sessionId),
            stop: () => this.stop(sessionId, controller.context),
        });
        const cts = new CancellationTokenSource();
        session.disposables.add(toDisposable(() => cts.dispose(true)));
        session.disposables.add(controller.onDidAcceptInput(() => this.stop(sessionId, controller.context)));
        session.disposables.add(controller.onDidHideInput(() => this.stop(sessionId, controller.context)));
        controller.focusInput();
        controller.updateState(VoiceChatSessionState.GettingReady);
        const voiceChatSession = await this.voiceChatService.createVoiceChatSession(cts.token, {
            usesAgents: controller.context !== 'inline',
            model: context?.widget?.viewModel?.model,
        });
        let inputValue = controller.getInput();
        let voiceChatTimeout = this.configurationService.getValue("accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */);
        if (!isNumber(voiceChatTimeout) || voiceChatTimeout < 0) {
            voiceChatTimeout = SpeechTimeoutDefault;
        }
        const acceptTranscriptionScheduler = session.disposables.add(new RunOnceScheduler(() => this.accept(sessionId), voiceChatTimeout));
        session.disposables.add(voiceChatSession.onDidChange(({ status, text, waitingForInput }) => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            switch (status) {
                case SpeechToTextStatus.Started:
                    this.onDidSpeechToTextSessionStart(controller, session.disposables);
                    break;
                case SpeechToTextStatus.Recognizing:
                    if (text) {
                        session.hasRecognizedInput = true;
                        session.controller.updateInput(inputValue ? [inputValue, text].join(' ') : text);
                        if (voiceChatTimeout > 0 &&
                            context?.voice?.disableTimeout !== true &&
                            !disableTimeout) {
                            acceptTranscriptionScheduler.cancel();
                        }
                    }
                    break;
                case SpeechToTextStatus.Recognized:
                    if (text) {
                        session.hasRecognizedInput = true;
                        inputValue = inputValue ? [inputValue, text].join(' ') : text;
                        session.controller.updateInput(inputValue);
                        if (voiceChatTimeout > 0 &&
                            context?.voice?.disableTimeout !== true &&
                            !waitingForInput &&
                            !disableTimeout) {
                            acceptTranscriptionScheduler.schedule();
                        }
                    }
                    break;
                case SpeechToTextStatus.Stopped:
                    this.stop(session.id, controller.context);
                    break;
            }
        }));
        return session;
    }
    onDidSpeechToTextSessionStart(controller, disposables) {
        controller.updateState(VoiceChatSessionState.Started);
        let dotCount = 0;
        const updatePlaceholder = () => {
            dotCount = (dotCount + 1) % 4;
            controller.setInputPlaceholder(`${localize('listening', "I'm listening")}${'.'.repeat(dotCount)}`);
            placeholderScheduler.schedule();
        };
        const placeholderScheduler = disposables.add(new RunOnceScheduler(updatePlaceholder, 500));
        updatePlaceholder();
    }
    stop(voiceChatSessionId = this.voiceChatSessionIds, context) {
        if (!this.currentVoiceChatSession ||
            this.voiceChatSessionIds !== voiceChatSessionId ||
            (context && this.currentVoiceChatSession.controller.context !== context)) {
            return;
        }
        this.currentVoiceChatSession.controller.clearInputPlaceholder();
        this.currentVoiceChatSession.controller.updateState(VoiceChatSessionState.Stopped);
        this.currentVoiceChatSession.disposables.dispose();
        this.currentVoiceChatSession = undefined;
    }
    async accept(voiceChatSessionId = this.voiceChatSessionIds) {
        if (!this.currentVoiceChatSession || this.voiceChatSessionIds !== voiceChatSessionId) {
            return;
        }
        if (!this.currentVoiceChatSession.hasRecognizedInput) {
            // If we have an active session but without recognized
            // input, we do not want to just accept the input that
            // was maybe typed before. But we still want to stop the
            // voice session because `acceptInput` would do that.
            this.stop(voiceChatSessionId, this.currentVoiceChatSession.controller.context);
            return;
        }
        const controller = this.currentVoiceChatSession.controller;
        const response = await controller.acceptInput();
        if (!response) {
            return;
        }
        const autoSynthesize = this.configurationService.getValue("accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */);
        if (autoSynthesize === 'on' ||
            (autoSynthesize !== 'off' && !this.accessibilityService.isScreenReaderOptimized())) {
            let context;
            if (controller.context === 'inline') {
                // This is ugly, but the lightweight inline chat turns into
                // a different widget as soon as a response comes in, so we fallback to
                // picking up from the focused chat widget
                context = 'focused';
            }
            else {
                context = controller;
            }
            ChatSynthesizerSessions.getInstance(this.instantiationService).start(this.instantiationService.invokeFunction((accessor) => ChatSynthesizerSessionController.create(accessor, context, response)));
        }
    }
};
VoiceChatSessions = VoiceChatSessions_1 = __decorate([
    __param(0, IVoiceChatService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IAccessibilityService)
], VoiceChatSessions);
export const VOICE_KEY_HOLD_THRESHOLD = 500;
async function startVoiceChatWithHoldMode(id, accessor, target, context) {
    const instantiationService = accessor.get(IInstantiationService);
    const keybindingService = accessor.get(IKeybindingService);
    const holdMode = keybindingService.enableKeybindingHoldMode(id);
    const controller = await VoiceChatSessionControllerFactory.create(accessor, target);
    if (!controller) {
        return;
    }
    const session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
    let acceptVoice = false;
    const handle = disposableTimeout(() => {
        acceptVoice = true;
        session?.setTimeoutDisabled(true); // disable accept on timeout when hold mode runs for VOICE_KEY_HOLD_THRESHOLD
    }, VOICE_KEY_HOLD_THRESHOLD);
    await holdMode;
    handle.dispose();
    if (acceptVoice) {
        session.accept();
    }
}
class VoiceChatWithHoldModeAction extends Action2 {
    constructor(desc, target) {
        super(desc);
        this.target = target;
    }
    run(accessor, context) {
        return startVoiceChatWithHoldMode(this.desc.id, accessor, this.target, context);
    }
}
export class VoiceChatInChatViewAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.voiceChatInChatView'; }
    constructor() {
        super({
            id: VoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.voiceChatInView.label', 'Voice Chat in Chat View'),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate()),
            f1: true,
        }, 'view');
    }
}
export class HoldToVoiceChatInChatViewAction extends Action2 {
    static { this.ID = 'workbench.action.chat.holdToVoiceChatInChatView'; }
    constructor() {
        super({
            id: HoldToVoiceChatInChatViewAction.ID,
            title: localize2('workbench.action.chat.holdToVoiceChatInChatView.label', 'Hold to Voice Chat in Chat View'),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate(), // disable when a chat request is in progress
                FocusInChatInput?.negate(), // when already in chat input, disable this action and prefer to start voice chat directly
                EditorContextKeys.focus.negate(), // do not steal the inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate(), // do not steal the notebook keybinding
                SearchContext.SearchViewFocusedKey.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
        });
    }
    async run(accessor, context) {
        // The intent of this action is to provide 2 modes to align with what `Ctrlcmd+I` in inline chat:
        // - if the user press and holds, we start voice chat in the chat view
        // - if the user press and releases quickly enough, we just open the chat view without voice chat
        const instantiationService = accessor.get(IInstantiationService);
        const keybindingService = accessor.get(IKeybindingService);
        const viewsService = accessor.get(IViewsService);
        const holdMode = keybindingService.enableKeybindingHoldMode(HoldToVoiceChatInChatViewAction.ID);
        let session;
        const handle = disposableTimeout(async () => {
            const controller = await VoiceChatSessionControllerFactory.create(accessor, 'view');
            if (controller) {
                session = await VoiceChatSessions.getInstance(instantiationService).start(controller, context);
                session.setTimeoutDisabled(true);
            }
        }, VOICE_KEY_HOLD_THRESHOLD);
        (await showChatView(viewsService))?.focusInput();
        await holdMode;
        handle.dispose();
        if (session) {
            session.accept();
        }
    }
}
export class InlineVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.inlineVoiceChat'; }
    constructor() {
        super({
            id: InlineVoiceChatAction.ID,
            title: localize2('workbench.action.chat.inlineVoiceChat', 'Inline Voice Chat'),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ActiveEditorContext, ChatContextKeys.requestInProgress.negate()),
            f1: true,
        }, 'inline');
    }
}
export class QuickVoiceChatAction extends VoiceChatWithHoldModeAction {
    static { this.ID = 'workbench.action.chat.quickVoiceChat'; }
    constructor() {
        super({
            id: QuickVoiceChatAction.ID,
            title: localize2('workbench.action.chat.quickVoiceChat.label', 'Quick Voice Chat'),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.requestInProgress.negate()),
            f1: true,
        }, 'quick');
    }
}
const primaryVoiceActionMenu = (when) => {
    return [
        {
            id: MenuId.ChatInput,
            when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession)), when),
            group: 'navigation',
            order: 3,
        },
        {
            id: MenuId.ChatExecute,
            when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel).negate(), ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession).negate(), when),
            group: 'navigation',
            order: 2,
        },
    ];
};
export class StartVoiceChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.startVoiceChat'; }
    constructor() {
        super({
            id: StartVoiceChatAction.ID,
            title: localize2('workbench.action.chat.startVoiceChat.label', 'Start Voice Chat'),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, // scope this action to chat input fields only
                EditorContextKeys.focus.negate(), // do not steal the editor inline-chat keybinding
                NOTEBOOK_EDITOR_FOCUSED.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
            icon: Codicon.mic,
            precondition: ContextKeyExpr.and(CanVoiceChat, ScopedVoiceChatGettingReady.negate(), // disable when voice chat is getting ready
            AnyChatRequestInProgress?.negate(), // disable when any chat request is in progress
            SpeechToTextInProgress.negate()),
            menu: primaryVoiceActionMenu(ContextKeyExpr.and(HasSpeechProvider, ScopedChatSynthesisInProgress.negate(), // hide when text to speech is in progress
            AnyScopedVoiceChatInProgress?.negate())),
        });
    }
    async run(accessor, context) {
        const widget = context?.widget;
        if (widget) {
            // if we already get a context when the action is executed
            // from a toolbar within the chat widget, then make sure
            // to move focus into the input field so that the controller
            // is properly retrieved
            widget.focusInput();
        }
        return startVoiceChatWithHoldMode(this.desc.id, accessor, 'focused', context);
    }
}
export class StopListeningAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListening'; }
    constructor() {
        super({
            id: StopListeningAction.ID,
            title: localize2('workbench.action.chat.stopListening.label', 'Stop Listening'),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: AnyScopedVoiceChatInProgress,
            },
            icon: spinningLoading,
            precondition: GlobalVoiceChatInProgress, // need global context here because of `f1: true`
            menu: primaryVoiceActionMenu(AnyScopedVoiceChatInProgress),
        });
    }
    async run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopListeningAndSubmitAction extends Action2 {
    static { this.ID = 'workbench.action.chat.stopListeningAndSubmit'; }
    constructor() {
        super({
            id: StopListeningAndSubmitAction.ID,
            title: localize2('workbench.action.chat.stopListeningAndSubmit.label', 'Stop Listening and Submit'),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FocusInChatInput, AnyScopedVoiceChatInProgress),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
            precondition: GlobalVoiceChatInProgress, // need global context here because of `f1: true`
        });
    }
    run(accessor) {
        VoiceChatSessions.getInstance(accessor.get(IInstantiationService)).accept();
    }
}
//#endregion
//#region Text to Speech
const ScopedChatSynthesisInProgress = new RawContextKey('scopedChatSynthesisInProgress', false, {
    type: 'boolean',
    description: localize('scopedChatSynthesisInProgress', 'Defined as a location where voice recording from microphone is in progress for voice chat. This key is only defined scoped, per chat context.'),
});
class ChatSynthesizerSessionController {
    static create(accessor, context, response) {
        if (context === 'focused') {
            return ChatSynthesizerSessionController.doCreateForFocusedChat(accessor, response);
        }
        else {
            return {
                onDidHideChat: context.onDidHideInput,
                contextKeyService: context.scopedContextKeyService,
                response,
            };
        }
    }
    static doCreateForFocusedChat(accessor, response) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const contextKeyService = accessor.get(IContextKeyService);
        let chatWidget = chatWidgetService.getWidgetBySessionId(response.session.sessionId);
        if (chatWidget?.location === ChatAgentLocation.Editor) {
            // workaround for https://github.com/microsoft/vscode/issues/212785
            chatWidget = chatWidgetService.lastFocusedWidget;
        }
        return {
            onDidHideChat: chatWidget?.onDidHide ?? Event.None,
            contextKeyService: chatWidget?.scopedContextKeyService ?? contextKeyService,
            response,
        };
    }
}
let ChatSynthesizerSessions = class ChatSynthesizerSessions {
    static { ChatSynthesizerSessions_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService) {
        if (!ChatSynthesizerSessions_1.instance) {
            ChatSynthesizerSessions_1.instance =
                instantiationService.createInstance(ChatSynthesizerSessions_1);
        }
        return ChatSynthesizerSessions_1.instance;
    }
    constructor(speechService, configurationService, instantiationService) {
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.activeSession = undefined;
    }
    async start(controller) {
        // Stop running text-to-speech or speech-to-text sessions in chats
        this.stop();
        VoiceChatSessions.getInstance(this.instantiationService).stop();
        const activeSession = (this.activeSession = new CancellationTokenSource());
        const disposables = new DisposableStore();
        activeSession.token.onCancellationRequested(() => disposables.dispose());
        const session = await this.speechService.createTextToSpeechSession(activeSession.token, 'chat');
        if (activeSession.token.isCancellationRequested) {
            return;
        }
        disposables.add(controller.onDidHideChat(() => this.stop()));
        const scopedChatToSpeechInProgress = ScopedChatSynthesisInProgress.bindTo(controller.contextKeyService);
        disposables.add(toDisposable(() => scopedChatToSpeechInProgress.reset()));
        disposables.add(session.onDidChange((e) => {
            switch (e.status) {
                case TextToSpeechStatus.Started:
                    scopedChatToSpeechInProgress.set(true);
                    break;
                case TextToSpeechStatus.Stopped:
                    scopedChatToSpeechInProgress.reset();
                    break;
            }
        }));
        for await (const chunk of this.nextChatResponseChunk(controller.response, activeSession.token)) {
            if (activeSession.token.isCancellationRequested) {
                return;
            }
            await raceCancellation(session.synthesize(chunk), activeSession.token);
        }
    }
    async *nextChatResponseChunk(response, token) {
        const context = {
            ignoreCodeBlocks: this.configurationService.getValue("accessibility.voice.ignoreCodeBlocks" /* AccessibilityVoiceSettingId.IgnoreCodeBlocks */),
            insideCodeBlock: false,
        };
        let totalOffset = 0;
        let complete = false;
        do {
            const responseLength = response.response.toString().length;
            const { chunk, offset } = this.parseNextChatResponseChunk(response, totalOffset, context);
            totalOffset = offset;
            complete = response.isComplete;
            if (chunk) {
                yield chunk;
            }
            if (token.isCancellationRequested) {
                return;
            }
            if (!complete && responseLength === response.response.toString().length) {
                await raceCancellation(Event.toPromise(response.onDidChange), token); // wait for the response to change
            }
        } while (!token.isCancellationRequested && !complete);
    }
    parseNextChatResponseChunk(response, offset, context) {
        let chunk = undefined;
        const text = response.response.toString();
        if (response.isComplete) {
            chunk = text.substring(offset);
            offset = text.length + 1;
        }
        else {
            const res = parseNextChatResponseChunk(text, offset);
            chunk = res.chunk;
            offset = res.offset;
        }
        if (chunk && context.ignoreCodeBlocks) {
            chunk = this.filterCodeBlocks(chunk, context);
        }
        return {
            chunk: chunk ? renderStringAsPlaintext({ value: chunk }) : chunk, // convert markdown to plain text
            offset,
        };
    }
    filterCodeBlocks(chunk, context) {
        return chunk
            .split('\n')
            .filter((line) => {
            if (line.trimStart().startsWith('```')) {
                context.insideCodeBlock = !context.insideCodeBlock;
                return false;
            }
            return !context.insideCodeBlock;
        })
            .join('\n');
    }
    stop() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
};
ChatSynthesizerSessions = ChatSynthesizerSessions_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService)
], ChatSynthesizerSessions);
const sentenceDelimiter = ['.', '!', '?', ':'];
const lineDelimiter = '\n';
const wordDelimiter = ' ';
export function parseNextChatResponseChunk(text, offset) {
    let chunk = undefined;
    for (let i = text.length - 1; i >= offset; i--) {
        // going from end to start to produce largest chunks
        const cur = text[i];
        const next = text[i + 1];
        if ((sentenceDelimiter.includes(cur) && next === wordDelimiter) || // end of sentence
            lineDelimiter === cur // end of line
        ) {
            chunk = text.substring(offset, i + 1).trim();
            offset = i + 1;
            break;
        }
    }
    return { chunk, offset };
}
export class ReadChatResponseAloud extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.readChatResponseAloud',
            title: localize2('workbench.action.chat.readChatResponseAloud', 'Read Aloud'),
            icon: Codicon.unmute,
            precondition: CanVoiceChat,
            menu: [
                {
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10, // first
                },
                {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(CanVoiceChat, ChatContextKeys.isResponse, // only for responses
                    ScopedChatSynthesisInProgress.negate(), // but not when already in progress
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10, // first
                },
            ],
        });
    }
    run(accessor, ...args) {
        const instantiationService = accessor.get(IInstantiationService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        let response = undefined;
        if (args.length > 0) {
            const responseArg = args[0];
            if (isResponseVM(responseArg)) {
                response = responseArg;
            }
        }
        else {
            const chatWidget = chatWidgetService.lastFocusedWidget;
            if (chatWidget) {
                // pick focused response
                const focus = chatWidget.getFocus();
                if (focus instanceof ChatResponseViewModel) {
                    response = focus;
                }
                // pick the last response
                else {
                    const chatViewModel = chatWidget.viewModel;
                    if (chatViewModel) {
                        const items = chatViewModel.getItems();
                        for (let i = items.length - 1; i >= 0; i--) {
                            const item = items[i];
                            if (isResponseVM(item)) {
                                response = item;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!response) {
            return;
        }
        const controller = ChatSynthesizerSessionController.create(accessor, 'focused', response.model);
        ChatSynthesizerSessions.getInstance(instantiationService).start(controller);
    }
}
export class StopReadAloud extends Action2 {
    static { this.ID = 'workbench.action.speech.stopReadAloud'; }
    constructor() {
        super({
            id: StopReadAloud.ID,
            icon: syncing,
            title: localize2('workbench.action.speech.stopReadAloud', 'Stop Reading Aloud'),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: GlobalTextToSpeechInProgress, // need global context here because of `f1: true`
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
                when: ScopedChatSynthesisInProgress,
            },
            menu: primaryVoiceActionMenu(ScopedChatSynthesisInProgress),
        });
    }
    async run(accessor) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
export class StopReadChatItemAloud extends Action2 {
    static { this.ID = 'workbench.action.chat.stopReadChatItemAloud'; }
    constructor() {
        super({
            id: StopReadChatItemAloud.ID,
            icon: Codicon.mute,
            title: localize2('workbench.action.chat.stopReadChatItemAloud', 'Stop Reading Aloud'),
            precondition: ScopedChatSynthesisInProgress,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [
                {
                    id: MenuId.ChatMessageFooter,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10, // first
                },
                {
                    id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                    when: ContextKeyExpr.and(ScopedChatSynthesisInProgress, // only when in progress
                    ChatContextKeys.isResponse, // only for responses
                    ChatContextKeys.responseIsFiltered.negate()),
                    group: 'navigation',
                    order: -10, // first
                },
            ],
        });
    }
    async run(accessor, ...args) {
        ChatSynthesizerSessions.getInstance(accessor.get(IInstantiationService)).stop();
    }
}
//#endregion
//#region Keyword Recognition
function supportsKeywordActivation(configurationService, speechService, chatAgentService) {
    if (!speechService.hasSpeechProvider ||
        !chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
        return false;
    }
    const value = configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
    return typeof value === 'string' && value !== KeywordActivationContribution.SETTINGS_VALUE.OFF;
}
let KeywordActivationContribution = class KeywordActivationContribution extends Disposable {
    static { KeywordActivationContribution_1 = this; }
    static { this.ID = 'workbench.contrib.keywordActivation'; }
    static { this.SETTINGS_VALUE = {
        OFF: 'off',
        INLINE_CHAT: 'inlineChat',
        QUICK_CHAT: 'quickChat',
        VIEW_CHAT: 'chatInView',
        CHAT_IN_CONTEXT: 'chatInContext',
    }; }
    constructor(speechService, configurationService, commandService, instantiationService, editorService, hostService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.editorService = editorService;
        this.hostService = hostService;
        this.chatAgentService = chatAgentService;
        this.activeSession = undefined;
        this._register(instantiationService.createInstance(KeywordActivationStatusEntry));
        this.registerListeners();
    }
    registerListeners() {
        this._register(Event.runAndSubscribe(this.speechService.onDidChangeHasSpeechProvider, () => {
            this.updateConfiguration();
            this.handleKeywordActivation();
        }));
        const onDidAddDefaultAgent = this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
                this.updateConfiguration();
                this.handleKeywordActivation();
                onDidAddDefaultAgent.dispose();
            }
        }));
        this._register(this.speechService.onDidStartSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.speechService.onDidEndSpeechToTextSession(() => this.handleKeywordActivation()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.handleKeywordActivation();
            }
        }));
    }
    updateConfiguration() {
        if (!this.speechService.hasSpeechProvider ||
            !this.chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)) {
            return; // these settings require a speech and chat provider
        }
        const registry = Registry.as(Extensions.Configuration);
        registry.registerConfiguration({
            ...accessibilityConfigurationNodeBase,
            properties: {
                [KEYWORD_ACTIVIATION_SETTING_ID]: {
                    type: 'string',
                    enum: [
                        KeywordActivationContribution_1.SETTINGS_VALUE.OFF,
                        KeywordActivationContribution_1.SETTINGS_VALUE.VIEW_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT,
                        KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT,
                    ],
                    enumDescriptions: [
                        localize('voice.keywordActivation.off', 'Keyword activation is disabled.'),
                        localize('voice.keywordActivation.chatInView', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the chat view."),
                        localize('voice.keywordActivation.quickChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the quick chat."),
                        localize('voice.keywordActivation.inlineChat', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor if possible."),
                        localize('voice.keywordActivation.chatInContext', "Keyword activation is enabled and listening for 'Hey Code' to start a voice chat session in the active editor or view depending on keyboard focus."),
                    ],
                    description: localize('voice.keywordActivation', "Controls whether the keyword phrase 'Hey Code' is recognized to start a voice chat session. Enabling this will start recording from the microphone but the audio is processed locally and never sent to a server."),
                    default: 'off',
                    tags: ['accessibility'],
                },
            },
        });
    }
    handleKeywordActivation() {
        const enabled = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService) && !this.speechService.hasActiveSpeechToTextSession;
        if ((enabled && this.activeSession) || (!enabled && !this.activeSession)) {
            return; // already running or stopped
        }
        // Start keyword activation
        if (enabled) {
            this.enableKeywordActivation();
        }
        // Stop keyword activation
        else {
            this.disableKeywordActivation();
        }
    }
    async enableKeywordActivation() {
        const session = (this.activeSession = new CancellationTokenSource());
        const result = await this.speechService.recognizeKeyword(session.token);
        if (session.token.isCancellationRequested || session !== this.activeSession) {
            return; // cancelled
        }
        this.activeSession = undefined;
        if (result === KeywordRecognitionStatus.Recognized) {
            if (this.hostService.hasFocus) {
                this.commandService.executeCommand(this.getKeywordCommand());
            }
            // Immediately start another keyboard activation session
            // because we cannot assume that the command we execute
            // will trigger a speech recognition session.
            this.handleKeywordActivation();
        }
    }
    getKeywordCommand() {
        const setting = this.configurationService.getValue(KEYWORD_ACTIVIATION_SETTING_ID);
        switch (setting) {
            case KeywordActivationContribution_1.SETTINGS_VALUE.INLINE_CHAT:
                return InlineVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.QUICK_CHAT:
                return QuickVoiceChatAction.ID;
            case KeywordActivationContribution_1.SETTINGS_VALUE.CHAT_IN_CONTEXT: {
                const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
                if (activeCodeEditor?.hasWidgetFocus()) {
                    return InlineVoiceChatAction.ID;
                }
            }
            default:
                return VoiceChatInChatViewAction.ID;
        }
    }
    disableKeywordActivation() {
        this.activeSession?.dispose(true);
        this.activeSession = undefined;
    }
    dispose() {
        this.activeSession?.dispose();
        super.dispose();
    }
};
KeywordActivationContribution = KeywordActivationContribution_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IConfigurationService),
    __param(2, ICommandService),
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, IHostService),
    __param(6, IChatAgentService)
], KeywordActivationContribution);
export { KeywordActivationContribution };
let KeywordActivationStatusEntry = class KeywordActivationStatusEntry extends Disposable {
    static { KeywordActivationStatusEntry_1 = this; }
    static { this.STATUS_NAME = localize('keywordActivation.status.name', 'Voice Keyword Activation'); }
    static { this.STATUS_COMMAND = 'keywordActivation.status.command'; }
    static { this.STATUS_ACTIVE = localize('keywordActivation.status.active', "Listening to 'Hey Code'..."); }
    static { this.STATUS_INACTIVE = localize('keywordActivation.status.inactive', 'Waiting for voice chat to end...'); }
    constructor(speechService, statusbarService, commandService, configurationService, chatAgentService) {
        super();
        this.speechService = speechService;
        this.statusbarService = statusbarService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.chatAgentService = chatAgentService;
        this.entry = this._register(new MutableDisposable());
        this._register(CommandsRegistry.registerCommand(KeywordActivationStatusEntry_1.STATUS_COMMAND, () => this.commandService.executeCommand('workbench.action.openSettings', KEYWORD_ACTIVIATION_SETTING_ID)));
        this.registerListeners();
        this.updateStatusEntry();
    }
    registerListeners() {
        this._register(this.speechService.onDidStartKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.speechService.onDidEndKeywordRecognition(() => this.updateStatusEntry()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(KEYWORD_ACTIVIATION_SETTING_ID)) {
                this.updateStatusEntry();
            }
        }));
    }
    updateStatusEntry() {
        const visible = supportsKeywordActivation(this.configurationService, this.speechService, this.chatAgentService);
        if (visible) {
            if (!this.entry.value) {
                this.createStatusEntry();
            }
            this.updateStatusLabel();
        }
        else {
            this.entry.clear();
        }
    }
    createStatusEntry() {
        this.entry.value = this.statusbarService.addEntry(this.getStatusEntryProperties(), 'status.voiceKeywordActivation', 1 /* StatusbarAlignment.RIGHT */, 103);
    }
    getStatusEntryProperties() {
        return {
            name: KeywordActivationStatusEntry_1.STATUS_NAME,
            text: this.speechService.hasActiveKeywordRecognition ? '$(mic-filled)' : '$(mic)',
            tooltip: this.speechService.hasActiveKeywordRecognition
                ? KeywordActivationStatusEntry_1.STATUS_ACTIVE
                : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            ariaLabel: this.speechService.hasActiveKeywordRecognition
                ? KeywordActivationStatusEntry_1.STATUS_ACTIVE
                : KeywordActivationStatusEntry_1.STATUS_INACTIVE,
            command: KeywordActivationStatusEntry_1.STATUS_COMMAND,
            kind: 'prominent',
            showInAllWindows: true,
        };
    }
    updateStatusLabel() {
        this.entry.value?.update(this.getStatusEntryProperties());
    }
};
KeywordActivationStatusEntry = KeywordActivationStatusEntry_1 = __decorate([
    __param(0, ISpeechService),
    __param(1, IStatusbarService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IChatAgentService)
], KeywordActivationStatusEntry);
//#endregion
//#region Install Provider Actions
const InstallingSpeechProvider = new RawContextKey('installingSpeechProvider', false, true);
class BaseInstallSpeechProviderAction extends Action2 {
    static { this.SPEECH_EXTENSION_ID = 'ms-vscode.vscode-speech'; }
    async run(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const dialogService = accessor.get(IDialogService);
        try {
            InstallingSpeechProvider.bindTo(contextKeyService).set(true);
            await this.installExtension(extensionsWorkbenchService, dialogService);
        }
        finally {
            InstallingSpeechProvider.bindTo(contextKeyService).reset();
        }
    }
    async installExtension(extensionsWorkbenchService, dialogService) {
        try {
            await extensionsWorkbenchService.install(BaseInstallSpeechProviderAction.SPEECH_EXTENSION_ID, {
                justification: this.getJustification(),
                enable: true,
            }, 15 /* ProgressLocation.Notification */);
        }
        catch (error) {
            const { confirmed } = await dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSetupError', 'An error occurred while setting up voice chat. Would you like to try again?'),
                detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                primaryButton: localize('retry', 'Retry'),
            });
            if (confirmed) {
                return this.installExtension(extensionsWorkbenchService, dialogService);
            }
        }
    }
}
export class InstallSpeechProviderForVoiceChatAction extends BaseInstallSpeechProviderAction {
    static { this.ID = 'workbench.action.chat.installProviderForVoiceChat'; }
    constructor() {
        super({
            id: InstallSpeechProviderForVoiceChatAction.ID,
            title: localize2('workbench.action.chat.installProviderForVoiceChat.label', 'Start Voice Chat'),
            icon: Codicon.mic,
            precondition: InstallingSpeechProvider.negate(),
            menu: primaryVoiceActionMenu(HasSpeechProvider.negate()),
        });
    }
    getJustification() {
        return localize('installProviderForVoiceChat.justification', 'Microphone support requires this extension.');
    }
}
//#endregion
registerThemingParticipant((theme, collector) => {
    let activeRecordingColor;
    let activeRecordingDimmedColor;
    if (theme.type === ColorScheme.LIGHT || theme.type === ColorScheme.DARK) {
        activeRecordingColor =
            theme.getColor(ACTIVITY_BAR_BADGE_BACKGROUND) ?? theme.getColor(focusBorder);
        activeRecordingDimmedColor = activeRecordingColor?.transparent(0.38);
    }
    else {
        activeRecordingColor = theme.getColor(contrastBorder);
        activeRecordingDimmedColor = theme.getColor(contrastBorder);
    }
    // Show a "microphone" or "pulse" icon when speech-to-text or text-to-speech is in progress that glows via outline.
    collector.addRule(`
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled),
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled) {
			color: ${activeRecordingColor};
			outline: 1px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1s infinite;
			border-radius: 50%;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::after,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::after {
			outline: 2px solid ${activeRecordingColor};
			outline-offset: -1px;
			animation: pulseAnimation 1500ms cubic-bezier(0.75, 0, 0.25, 1) infinite;
		}

		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-sync.codicon-modifier-spin:not(.disabled)::before,
		.monaco-workbench:not(.reduce-motion) .interactive-input-part .monaco-action-bar .action-label.codicon-loading.codicon-modifier-spin:not(.disabled)::before {
			position: absolute;
			outline: 1px solid ${activeRecordingColor};
			outline-offset: 2px;
			border-radius: 50%;
			width: 16px;
			height: 16px;
		}

		@keyframes pulseAnimation {
			0% {
				outline-width: 2px;
			}
			62% {
				outline-width: 5px;
				outline-color: ${activeRecordingDimmedColor};
			}
			100% {
				outline-width: 2px;
			}
		}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tc2FuZGJveC9hY3Rpb25zL3ZvaWNlQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsZ0JBQWdCLEdBQ2hCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGVBQWUsR0FDZixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixVQUFVLEdB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