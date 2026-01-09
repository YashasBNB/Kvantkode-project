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
var SetupChatAgentImplementation_1, ChatSetup_1;
import './media/chatSetup.css';
import { $, getActiveElement, setVisibility } from '../../../../base/browser/dom.js';
import { ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { toAction, } from '../../../../base/common/actions.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { combinedDisposable, Disposable, DisposableStore, markAsSingleton, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService, } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IAuthenticationService, } from '../../../services/authentication/common/authentication.js';
import { ExtensionUrlHandlerOverrideRegistry } from '../../../services/extensions/browser/extensionUrlHandler.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService, } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, ChatEntitlementRequests, IChatEntitlementService, } from '../common/chatEntitlementService.js';
import { IChatService } from '../common/chatService.js';
import { CHAT_CATEGORY, CHAT_OPEN_ACTION_ID, CHAT_SETUP_ACTION_ID } from './actions/chatActions.js';
import { ChatViewId, EditsViewId, ensureSideBarChatViewSize, IChatWidgetService, preferCopilotEditsView, showCopilotView, } from './chat.js';
import { CHAT_EDITING_SIDEBAR_PANEL_ID, CHAT_SIDEBAR_PANEL_ID } from './chatViewPane.js';
import { ChatAgentLocation, ChatConfiguration, validateChatMode, } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
    privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? '',
    skusDocumentationUrl: product.defaultChatAgent?.skusDocumentationUrl ?? '',
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    providerName: product.defaultChatAgent?.providerName ?? '',
    enterpriseProviderId: product.defaultChatAgent?.enterpriseProviderId ?? '',
    enterpriseProviderName: product.defaultChatAgent?.enterpriseProviderName ?? '',
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    walkthroughCommand: product.defaultChatAgent?.walkthroughCommand ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
};
//#region Contribution
const ToolsAgentWhen = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${ChatConfiguration.AgentEnabled}`, true), ChatContextKeys.Editing.agentModeDisallowed.negate(), ContextKeyExpr.not(`previewFeaturesDisabled`));
let SetupChatAgentImplementation = class SetupChatAgentImplementation extends Disposable {
    static { SetupChatAgentImplementation_1 = this; }
    static register(instantiationService, location, isToolsAgent, context, controller) {
        return instantiationService.invokeFunction((accessor) => {
            const chatAgentService = accessor.get(IChatAgentService);
            let id;
            let description = localize('chatDescription', 'Ask Copilot');
            let welcomeMessageContent;
            const baseMessage = localize('chatMessage', 'Copilot is powered by AI, so mistakes are possible. Review output carefully before use.');
            switch (location) {
                case ChatAgentLocation.Panel:
                    id = 'setup.chat';
                    welcomeMessageContent = {
                        title: description,
                        message: new MarkdownString(baseMessage),
                        icon: Codicon.copilotLarge,
                    };
                    break;
                case ChatAgentLocation.EditingSession:
                    id = isToolsAgent ? 'setup.agent' : 'setup.edits';
                    description = isToolsAgent
                        ? localize('agentDescription', 'Edit files in your workspace in agent mode')
                        : localize('editsDescription', 'Edit files in your workspace');
                    welcomeMessageContent = isToolsAgent
                        ? {
                            title: localize('editsTitle', 'Edit with Copilot'),
                            message: new MarkdownString(localize('agentMessage', 'Ask Copilot to edit your files in [agent mode]({0}). Copilot will automatically use multiple requests to pick files to edit, run terminal commands, and iterate on errors.', `https://aka.ms/vscode-copilot-agent`) + `\n\n${baseMessage}`),
                            icon: Codicon.copilotLarge,
                        }
                        : {
                            title: localize('editsTitle', 'Edit with Copilot'),
                            message: new MarkdownString(localize('editsMessage', 'Start your editing session by defining a set of files that you want to work with. Then ask Copilot for the changes you want to make.') + `\n\n${baseMessage}`),
                            icon: Codicon.copilotLarge,
                        };
                    break;
                case ChatAgentLocation.Terminal:
                    id = 'setup.terminal';
                    break;
                case ChatAgentLocation.Editor:
                    id = 'setup.editor';
                    break;
                case ChatAgentLocation.Notebook:
                    id = 'setup.notebook';
                    break;
            }
            const disposable = new DisposableStore();
            disposable.add(chatAgentService.registerAgent(id, {
                id,
                name: `${defaultChat.providerName} Copilot`,
                isDefault: true,
                isCore: true,
                isToolsAgent,
                when: isToolsAgent ? ToolsAgentWhen?.serialize() : undefined,
                slashCommands: [],
                disambiguation: [],
                locations: [location],
                metadata: {
                    welcomeMessageContent,
                    helpTextPrefix: SetupChatAgentImplementation_1.SETUP_NEEDED_MESSAGE,
                },
                description,
                extensionId: nullExtensionDescription.identifier,
                extensionDisplayName: nullExtensionDescription.name,
                extensionPublisherId: nullExtensionDescription.publisher,
            }));
            const agent = disposable.add(instantiationService.createInstance(SetupChatAgentImplementation_1, context, controller, location));
            disposable.add(chatAgentService.registerAgentImplementation(id, agent));
            return { agent, disposable };
        });
    }
    static { this.SETUP_NEEDED_MESSAGE = new MarkdownString(localize('settingUpCopilotNeeded', 'You need to set up Copilot to use Chat.')); }
    constructor(context, controller, location, instantiationService, logService, configurationService, telemetryService) {
        super();
        this.context = context;
        this.controller = controller;
        this.location = location;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this._onUnresolvableError = this._register(new Emitter());
        this.onUnresolvableError = this._onUnresolvableError.event;
    }
    async invoke(request, progress) {
        return this.instantiationService.invokeFunction(async (accessor) => {
            const chatService = accessor.get(IChatService); // use accessor for lazy loading
            const languageModelsService = accessor.get(ILanguageModelsService); // of chat related services
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            return this.doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
        });
    }
    async doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        if (!this.context.state.installed ||
            this.context.state.entitlement === ChatEntitlement.Available ||
            this.context.state.entitlement === ChatEntitlement.Unknown) {
            return this.doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
        }
        return this.doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService);
    }
    async doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        const requestModel = chatWidgetService
            .getWidgetBySessionId(request.sessionId)
            ?.viewModel?.model.getRequests()
            .at(-1);
        if (!requestModel) {
            this.logService.error('[chat setup] Request model not found, cannot redispatch request.');
            return {}; // this should not happen
        }
        progress({
            kind: 'progressMessage',
            content: new MarkdownString(localize('waitingCopilot', 'Getting Copilot ready.')),
        });
        await this.forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService);
        return {};
    }
    async forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService) {
        if (this._handlingForwardedRequest === requestModel.message.text) {
            throw new Error('Already handling this request');
        }
        this._handlingForwardedRequest = requestModel.message.text;
        // We need a signal to know when we can resend the request to
        // Copilot. Waiting for the registration of the agent is not
        // enough, we also need a language model to be available.
        const whenLanguageModelReady = this.whenLanguageModelReady(languageModelsService);
        const whenAgentReady = this.whenAgentReady(chatAgentService);
        if (whenLanguageModelReady instanceof Promise || whenAgentReady instanceof Promise) {
            const timeoutHandle = setTimeout(() => {
                progress({
                    kind: 'progressMessage',
                    content: new MarkdownString(localize('waitingCopilot2', 'Copilot is almost ready.')),
                });
            }, 10000);
            try {
                const ready = await Promise.race([
                    timeout(20000).then(() => 'timedout'),
                    Promise.allSettled([whenLanguageModelReady, whenAgentReady]),
                ]);
                if (ready === 'timedout') {
                    progress({
                        kind: 'warning',
                        content: new MarkdownString(localize('copilotTookLongWarning', 'Copilot took too long to get ready. Please try again.')),
                    });
                    // This means Copilot is unhealthy and we cannot retry the
                    // request. Signal this to the outside via an event.
                    this._onUnresolvableError.fire();
                    return;
                }
            }
            finally {
                clearTimeout(timeoutHandle);
            }
        }
        const widget = chatWidgetService.getWidgetBySessionId(requestModel.session.sessionId);
        chatService.resendRequest(requestModel, {
            mode: widget?.input.currentMode,
            userSelectedModelId: widget?.input.currentLanguageModel,
        });
    }
    whenLanguageModelReady(languageModelsService) {
        for (const id of languageModelsService.getLanguageModelIds()) {
            const model = languageModelsService.lookupLanguageModel(id);
            if (model && model.isDefault) {
                return; // we have language models!
            }
        }
        return Event.toPromise(Event.filter(languageModelsService.onDidChangeLanguageModels, (e) => e.added?.some((added) => added.metadata.isDefault) ?? false));
    }
    whenAgentReady(chatAgentService) {
        const defaultAgent = chatAgentService.getDefaultAgent(this.location);
        if (defaultAgent && !defaultAgent.isCore) {
            return; // we have a default agent from an extension!
        }
        return Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(this.location);
            return Boolean(defaultAgent && !defaultAgent.isCore);
        }));
    }
    async doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'chat' });
        const requestModel = chatWidgetService
            .getWidgetBySessionId(request.sessionId)
            ?.viewModel?.model.getRequests()
            .at(-1);
        const setupListener = Event.runAndSubscribe(this.controller.value.onDidChange, () => {
            switch (this.controller.value.step) {
                case ChatSetupStep.SigningIn:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('setupChatSignIn2', 'Signing in to {0}.', ChatEntitlementRequests.providerId(this.configurationService) ===
                            defaultChat.enterpriseProviderId
                            ? defaultChat.enterpriseProviderName
                            : defaultChat.providerName)),
                    });
                    break;
                case ChatSetupStep.Installing:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('installingCopilot', 'Getting Copilot ready.')),
                    });
                    break;
            }
        });
        let success = undefined;
        try {
            success = await ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run();
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
        }
        finally {
            setupListener.dispose();
        }
        // User has agreed to run the setup
        if (typeof success === 'boolean') {
            if (success) {
                if (requestModel) {
                    await this.forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService);
                }
            }
            else {
                progress({
                    kind: 'warning',
                    content: new MarkdownString(localize('copilotSetupError', 'Copilot setup failed.')),
                });
            }
        }
        // User has cancelled the setup
        else {
            progress({
                kind: 'markdownContent',
                content: SetupChatAgentImplementation_1.SETUP_NEEDED_MESSAGE,
            });
        }
        return {};
    }
};
SetupChatAgentImplementation = SetupChatAgentImplementation_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService)
], SetupChatAgentImplementation);
var ChatSetupStrategy;
(function (ChatSetupStrategy) {
    ChatSetupStrategy[ChatSetupStrategy["Canceled"] = 0] = "Canceled";
    ChatSetupStrategy[ChatSetupStrategy["DefaultSetup"] = 1] = "DefaultSetup";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithoutEnterpriseProvider"] = 2] = "SetupWithoutEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithEnterpriseProvider"] = 3] = "SetupWithEnterpriseProvider";
})(ChatSetupStrategy || (ChatSetupStrategy = {}));
let ChatSetup = class ChatSetup {
    static { ChatSetup_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService, context, controller) {
        let instance = ChatSetup_1.instance;
        if (!instance) {
            instance = ChatSetup_1.instance = instantiationService.invokeFunction((accessor) => {
                return new ChatSetup_1(context, controller, instantiationService, accessor.get(ITelemetryService), accessor.get(IContextMenuService), accessor.get(IWorkbenchLayoutService), accessor.get(IKeybindingService), accessor.get(IChatEntitlementService), accessor.get(ILogService));
            });
        }
        return instance;
    }
    constructor(context, controller, instantiationService, telemetryService, contextMenuService, layoutService, keybindingService, chatEntitlementService, logService) {
        this.context = context;
        this.controller = controller;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.contextMenuService = contextMenuService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.chatEntitlementService = chatEntitlementService;
        this.logService = logService;
        this.pendingRun = undefined;
    }
    async run() {
        if (this.pendingRun) {
            return this.pendingRun;
        }
        this.pendingRun = this.doRun();
        try {
            return await this.pendingRun;
        }
        finally {
            this.pendingRun = undefined;
        }
    }
    async doRun() {
        let setupStrategy;
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Pro ||
            this.chatEntitlementService.entitlement === ChatEntitlement.Limited) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // existing pro/free users setup without a dialog
        }
        else {
            setupStrategy = await this.showDialog();
        }
        let success = undefined;
        try {
            switch (setupStrategy) {
                case ChatSetupStrategy.SetupWithEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({
                        setupFromDialog: true,
                        useEnterpriseProvider: true,
                    });
                    break;
                case ChatSetupStrategy.SetupWithoutEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({
                        setupFromDialog: true,
                        useEnterpriseProvider: false,
                    });
                    break;
                case ChatSetupStrategy.DefaultSetup:
                    success = await this.controller.value.setup({ setupFromDialog: true });
                    break;
            }
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
            success = false;
        }
        return success;
    }
    async showDialog() {
        const disposables = new DisposableStore();
        let result = undefined;
        const buttons = [this.getPrimaryButton(), localize('maybeLater', 'Maybe Later')];
        const dialog = disposables.add(new Dialog(this.layoutService.activeContainer, this.getDialogTitle(), buttons, createWorkbenchDialogOptions({
            type: 'none',
            icon: Codicon.copilotLarge,
            cancelId: buttons.length - 1,
            renderBody: (body) => body.appendChild(this.createDialog(disposables)),
            primaryButtonDropdown: {
                contextMenuProvider: this.contextMenuService,
                addPrimaryActionToDropdown: false,
                actions: [
                    toAction({
                        id: 'setupWithProvider',
                        label: localize('setupWithProvider', 'Sign in with a {0} Account', defaultChat.providerName),
                        run: () => (result = ChatSetupStrategy.SetupWithoutEnterpriseProvider),
                    }),
                    toAction({
                        id: 'setupWithEnterpriseProvider',
                        label: localize('setupWithEnterpriseProvider', 'Sign in with a {0} Account', defaultChat.enterpriseProviderName),
                        run: () => (result = ChatSetupStrategy.SetupWithEnterpriseProvider),
                    }),
                ],
            },
        }, this.keybindingService, this.layoutService)));
        const { button } = await dialog.show();
        disposables.dispose();
        return button === 0 ? (result ?? ChatSetupStrategy.DefaultSetup) : ChatSetupStrategy.Canceled;
    }
    getPrimaryButton() {
        if (this.context.state.entitlement === ChatEntitlement.Unknown) {
            return localize('signInButton', 'Sign in');
        }
        return localize('useCopilotButton', 'Use Copilot');
    }
    getDialogTitle() {
        if (this.context.state.entitlement === ChatEntitlement.Unknown) {
            return this.context.state.registered
                ? localize('signUp', 'Sign in to use Copilot')
                : localize('signUpFree', 'Sign in to use Copilot for free');
        }
        if (this.context.state.entitlement === ChatEntitlement.Pro) {
            return localize('copilotProTitle', 'Start using Copilot Pro');
        }
        return this.context.state.registered
            ? localize('copilotTitle', 'Start using Copilot')
            : localize('copilotFreeTitle', 'Start using Copilot for free');
    }
    createDialog(disposables) {
        const element = $('.chat-setup-view');
        const markdown = this.instantiationService.createInstance(MarkdownRenderer, {});
        // Header
        const header = localize({ key: 'headerDialog', comment: ['{Locked="[Copilot]({0})"}'] }, '[Copilot]({0}) is your AI pair programmer. Write code faster with completions, fix bugs and build new features across multiple files, and learn about your codebase through chat.', defaultChat.documentationUrl);
        element.appendChild($('p.setup-header', undefined, disposables.add(markdown.render(new MarkdownString(header, { isTrusted: true }))).element));
        // Terms
        const terms = localize({ key: 'terms', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, 'By continuing, you agree to the [Terms]({0}) and [Privacy Policy]({1}).', defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        element.appendChild($('p.setup-legal', undefined, disposables.add(markdown.render(new MarkdownString(terms, { isTrusted: true }))).element));
        // SKU Settings
        if (this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */) {
            const settings = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, 'Copilot Free and Pro may show [public code]({0}) suggestions and we may use your data for product improvement. You can change these [settings]({1}) at any time.', defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
            element.appendChild($('p.setup-settings', undefined, disposables.add(markdown.render(new MarkdownString(settings, { isTrusted: true })))
                .element));
        }
        return element;
    }
};
ChatSetup = ChatSetup_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITelemetryService),
    __param(4, IContextMenuService),
    __param(5, ILayoutService),
    __param(6, IKeybindingService),
    __param(7, IChatEntitlementService),
    __param(8, ILogService)
], ChatSetup);
let ChatSetupContribution = class ChatSetupContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSetup'; }
    constructor(productService, instantiationService, commandService, telemetryService, chatEntitlementService, configurationService, logService) {
        super();
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.logService = logService;
        const context = chatEntitlementService.context?.value;
        const requests = chatEntitlementService.requests?.value;
        if (!context || !requests) {
            return; // disabled
        }
        const controller = new Lazy(() => this._register(this.instantiationService.createInstance(ChatSetupController, context, requests)));
        this.registerSetupAgents(context, controller);
        this.registerChatWelcome(context, controller);
        this.registerActions(context, requests, controller);
        this.registerUrlLinkHandler();
    }
    registerSetupAgents(context, controller) {
        const registration = markAsSingleton(new MutableDisposable()); // prevents flicker on window reload
        const updateRegistration = () => {
            const disabled = context.state.hidden || !this.configurationService.getValue('chat.setupFromDialog');
            if (!disabled && !registration.value) {
                const { agent: panelAgent, disposable: panelDisposable } = SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Panel, false, context, controller);
                registration.value = combinedDisposable(panelDisposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Terminal, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Notebook, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.Editor, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.EditingSession, false, context, controller).disposable, SetupChatAgentImplementation.register(this.instantiationService, ChatAgentLocation.EditingSession, true, context, controller).disposable, panelAgent.onUnresolvableError(() => {
                    // An unresolvable error from our agent registrations means that
                    // Copilot is unhealthy for some reason. We clear our panel
                    // registration to give Copilot a chance to show a custom message
                    // to the user from the views and stop pretending as if there was
                    // a functional agent.
                    this.logService.error('[chat setup] Unresolvable error from Copilot agent registration, clearing registration.');
                    panelDisposable.dispose();
                }));
            }
            else if (disabled && registration.value) {
                registration.clear();
            }
        };
        this._register(Event.runAndSubscribe(Event.any(context.onDidChange, Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('chat.setupFromDialog'))), () => updateRegistration()));
    }
    registerChatWelcome(context, controller) {
        Registry.as("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */).register({
            title: localize('welcomeChat', 'Welcome to Copilot'),
            when: ChatContextKeys.SetupViewCondition,
            icon: Codicon.copilotLarge,
            content: (disposables) => disposables.add(this.instantiationService.createInstance(ChatSetupWelcomeContent, controller.value, context)).element,
        });
    }
    registerActions(context, requests, controller) {
        const chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
        const CHAT_SETUP_ACTION_LABEL = localize2('triggerChatSetup', 'Use AI Features with Copilot for free...');
        class ChatSetupTriggerAction extends Action2 {
            constructor() {
                super({
                    id: CHAT_SETUP_ACTION_ID,
                    title: CHAT_SETUP_ACTION_LABEL,
                    category: CHAT_CATEGORY,
                    f1: true,
                    precondition: chatSetupTriggerContext,
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_last',
                        order: 1,
                        when: ContextKeyExpr.and(chatSetupTriggerContext, ContextKeyExpr.or(ChatContextKeys.Setup.fromDialog.negate(), // reduce noise when using the skeleton-view approach
                        ChatContextKeys.Setup.hidden)),
                    },
                });
            }
            async run(accessor, mode) {
                const viewsService = accessor.get(IViewsService);
                const viewDescriptorService = accessor.get(IViewDescriptorService);
                const configurationService = accessor.get(IConfigurationService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const statusbarService = accessor.get(IStatusbarService);
                const instantiationService = accessor.get(IInstantiationService);
                const dialogService = accessor.get(IDialogService);
                const commandService = accessor.get(ICommandService);
                const lifecycleService = accessor.get(ILifecycleService);
                await context.update({ hidden: false });
                const chatWidgetPromise = showCopilotView(viewsService, layoutService);
                if (mode) {
                    const chatWidget = await chatWidgetPromise;
                    chatWidget?.input.setChatMode(mode);
                }
                const setupFromDialog = configurationService.getValue('chat.setupFromDialog');
                if (!setupFromDialog) {
                    ensureSideBarChatViewSize(viewDescriptorService, layoutService, viewsService);
                }
                statusbarService.updateEntryVisibility('chat.statusBarEntry', true);
                configurationService.updateValue('chat.commandCenter.enabled', true);
                if (setupFromDialog) {
                    const setup = ChatSetup.getInstance(instantiationService, context, controller);
                    const result = await setup.run();
                    if (result === false && !lifecycleService.willShutdown) {
                        const { confirmed } = await dialogService.confirm({
                            type: Severity.Error,
                            message: localize('setupErrorDialog', 'Copilot setup failed. Would you like to try again?'),
                            primaryButton: localize('retry', 'Retry'),
                        });
                        if (confirmed) {
                            commandService.executeCommand(CHAT_SETUP_ACTION_ID);
                        }
                    }
                }
            }
        }
        class ChatSetupHideAction extends Action2 {
            static { this.ID = 'workbench.action.chat.hideSetup'; }
            static { this.TITLE = localize2('hideChatSetup', 'Hide Copilot'); }
            constructor() {
                super({
                    id: ChatSetupHideAction.ID,
                    title: ChatSetupHideAction.TITLE,
                    f1: true,
                    category: CHAT_CATEGORY,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Setup.hidden.negate()),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'z_hide',
                        order: 1,
                        when: ChatContextKeys.Setup.installed.negate(),
                    },
                });
            }
            async run(accessor) {
                const viewsDescriptorService = accessor.get(IViewDescriptorService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const configurationService = accessor.get(IConfigurationService);
                const dialogService = accessor.get(IDialogService);
                const statusbarService = accessor.get(IStatusbarService);
                const { confirmed } = await dialogService.confirm({
                    message: localize('hideChatSetupConfirm', 'Are you sure you want to hide Copilot?'),
                    detail: localize('hideChatSetupDetail', "You can restore Copilot by running the '{0}' command.", CHAT_SETUP_ACTION_LABEL.value),
                    primaryButton: localize('hideChatSetupButton', 'Hide Copilot'),
                });
                if (!confirmed) {
                    return;
                }
                const location = viewsDescriptorService.getViewLocationById(ChatViewId);
                await context.update({ hidden: true });
                if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                    const activeContainers = viewsDescriptorService
                        .getViewContainersByLocation(location)
                        .filter((container) => viewsDescriptorService.getViewContainerModel(container).activeViewDescriptors
                        .length > 0);
                    if (activeContainers.length === 0) {
                        layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */); // hide if there are no views in the secondary sidebar
                    }
                }
                statusbarService.updateEntryVisibility('chat.statusBarEntry', false);
                configurationService.updateValue('chat.commandCenter.enabled', false);
            }
        }
        const windowFocusListener = this._register(new MutableDisposable());
        class UpgradePlanAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.upgradePlan',
                    title: localize2('managePlan', 'Upgrade to Copilot Pro'),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Entitlement.limited),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded),
                    },
                });
            }
            async run(accessor, from) {
                const openerService = accessor.get(IOpenerService);
                const hostService = accessor.get(IHostService);
                const commandService = accessor.get(ICommandService);
                openerService.open(URI.parse(defaultChat.upgradePlanUrl));
                const entitlement = context.state.entitlement;
                if (entitlement !== ChatEntitlement.Pro) {
                    // If the user is not yet Pro, we listen to window focus to refresh the token
                    // when the user has come back to the window assuming the user signed up.
                    windowFocusListener.value = hostService.onDidChangeFocus((focus) => this.onWindowFocus(focus, commandService));
                }
            }
            async onWindowFocus(focus, commandService) {
                if (focus) {
                    windowFocusListener.clear();
                    const entitlements = await requests.forceResolveEntitlement(undefined);
                    if (entitlements?.entitlement === ChatEntitlement.Pro) {
                        refreshTokens(commandService);
                    }
                }
            }
        }
        registerAction2(ChatSetupTriggerAction);
        registerAction2(ChatSetupHideAction);
        registerAction2(UpgradePlanAction);
    }
    registerUrlLinkHandler() {
        this._register(ExtensionUrlHandlerOverrideRegistry.registerHandler({
            canHandleURL: (url) => {
                return (url.scheme === this.productService.urlProtocol &&
                    equalsIgnoreCase(url.authority, defaultChat.chatExtensionId));
            },
            handleURL: async (url) => {
                const params = new URLSearchParams(url.query);
                this.telemetryService.publicLog2('workbenchActionExecuted', {
                    id: CHAT_SETUP_ACTION_ID,
                    from: 'url',
                    detail: params.get('referrer') ?? undefined,
                });
                await this.commandService.executeCommand(CHAT_SETUP_ACTION_ID, validateChatMode(params.get('mode')));
                return true;
            },
        }));
    }
};
ChatSetupContribution = __decorate([
    __param(0, IProductService),
    __param(1, IInstantiationService),
    __param(2, ICommandService),
    __param(3, ITelemetryService),
    __param(4, IChatEntitlementService),
    __param(5, IConfigurationService),
    __param(6, ILogService)
], ChatSetupContribution);
export { ChatSetupContribution };
var ChatSetupStep;
(function (ChatSetupStep) {
    ChatSetupStep[ChatSetupStep["Initial"] = 1] = "Initial";
    ChatSetupStep[ChatSetupStep["SigningIn"] = 2] = "SigningIn";
    ChatSetupStep[ChatSetupStep["Installing"] = 3] = "Installing";
})(ChatSetupStep || (ChatSetupStep = {}));
let ChatSetupController = class ChatSetupController extends Disposable {
    get step() {
        return this._step;
    }
    constructor(context, requests, telemetryService, authenticationService, viewsService, extensionsWorkbenchService, productService, logService, progressService, chatAgentService, activityService, commandService, layoutService, workspaceTrustRequestService, dialogService, configurationService, lifecycleService, quickInputService) {
        super();
        this.context = context;
        this.requests = requests;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.viewsService = viewsService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.productService = productService;
        this.logService = logService;
        this.progressService = progressService;
        this.chatAgentService = chatAgentService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.layoutService = layoutService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.lifecycleService = lifecycleService;
        this.quickInputService = quickInputService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._step = ChatSetupStep.Initial;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.context.onDidChange(() => this._onDidChange.fire()));
    }
    setStep(step) {
        if (this._step === step) {
            return;
        }
        this._step = step;
        this._onDidChange.fire();
    }
    async setup(options) {
        const watch = new StopWatch(false);
        const title = localize('setupChatProgress', 'Getting Copilot ready...');
        const badge = this.activityService.showViewContainerActivity(preferCopilotEditsView(this.viewsService)
            ? CHAT_EDITING_SIDEBAR_PANEL_ID
            : CHAT_SIDEBAR_PANEL_ID, {
            badge: new ProgressBadge(() => title),
        });
        try {
            return await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                command: CHAT_OPEN_ACTION_ID,
                title,
            }, () => this.doSetup(options ?? {}, watch));
        }
        finally {
            badge.dispose();
        }
    }
    async doSetup(options, watch) {
        this.context.suspend(); // reduces flicker
        let focusChatInput = false;
        let success = false;
        try {
            const providerId = ChatEntitlementRequests.providerId(this.configurationService);
            let session;
            let entitlement;
            // Entitlement Unknown or `forceSignIn`: we need to sign-in user
            if (this.context.state.entitlement === ChatEntitlement.Unknown || options.forceSignIn) {
                this.setStep(ChatSetupStep.SigningIn);
                const result = await this.signIn(providerId, options);
                if (!result.session) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', {
                        installResult: 'failedNotSignedIn',
                        installDuration: watch.elapsed(),
                        signUpErrorCode: undefined,
                        setupFromDialog: Boolean(options.setupFromDialog),
                    });
                    return false;
                }
                session = result.session;
                entitlement = result.entitlement;
            }
            const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
                message: localize('copilotWorkspaceTrust', 'Copilot is currently only supported in trusted workspaces.'),
            });
            if (!trusted) {
                this.telemetryService.publicLog2('commandCenter.chatInstall', {
                    installResult: 'failedNotTrusted',
                    installDuration: watch.elapsed(),
                    signUpErrorCode: undefined,
                    setupFromDialog: Boolean(options.setupFromDialog),
                });
                return false;
            }
            const activeElement = getActiveElement();
            // Install
            this.setStep(ChatSetupStep.Installing);
            success = await this.install(session, entitlement ?? this.context.state.entitlement, providerId, options, watch);
            const currentActiveElement = getActiveElement();
            focusChatInput =
                activeElement === currentActiveElement || currentActiveElement === mainWindow.document.body;
        }
        finally {
            this.setStep(ChatSetupStep.Initial);
            this.context.resume();
        }
        if (focusChatInput && !options.setupFromDialog) {
            ;
            (await showCopilotView(this.viewsService, this.layoutService))?.focusInput();
        }
        return success;
    }
    async signIn(providerId, options) {
        let session;
        let entitlements;
        try {
            if (!options?.setupFromDialog) {
                showCopilotView(this.viewsService, this.layoutService);
            }
            ;
            ({ session, entitlements } = await this.requests.signIn());
        }
        catch (e) {
            this.logService.error(`[chat setup] signIn: error ${e}`);
        }
        if (!session && !this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignInError', 'Failed to sign in to {0}. Would you like to try again?', ChatEntitlementRequests.providerId(this.configurationService) ===
                    defaultChat.enterpriseProviderId
                    ? defaultChat.enterpriseProviderName
                    : defaultChat.providerName),
                detail: localize('unknownSignInErrorDetail', 'You must be signed in to use Copilot.'),
                primaryButton: localize('retry', 'Retry'),
            });
            if (confirmed) {
                return this.signIn(providerId, options);
            }
        }
        return { session, entitlement: entitlements?.entitlement };
    }
    async install(session, entitlement, providerId, options, watch) {
        const wasInstalled = this.context.state.installed;
        let signUpResult = undefined;
        try {
            if (!options?.setupFromDialog) {
                showCopilotView(this.viewsService, this.layoutService);
            }
            if (entitlement !== ChatEntitlement.Limited && // User is not signed up to Copilot Free
                entitlement !== ChatEntitlement.Pro && // User is not signed up to Copilot Pro
                entitlement !== ChatEntitlement.Unavailable // User is eligible for Copilot Free
            ) {
                if (!session) {
                    try {
                        session = (await this.authenticationService.getSessions(providerId)).at(0);
                    }
                    catch (error) {
                        // ignore - errors can throw if a provider is not registered
                    }
                    if (!session) {
                        this.telemetryService.publicLog2('commandCenter.chatInstall', {
                            installResult: 'failedNoSession',
                            installDuration: watch.elapsed(),
                            signUpErrorCode: undefined,
                            setupFromDialog: Boolean(options.setupFromDialog),
                        });
                        return false; // unexpected
                    }
                }
                signUpResult = await this.requests.signUpLimited(session);
                if (typeof signUpResult !== 'boolean' /* error */) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', {
                        installResult: 'failedSignUp',
                        installDuration: watch.elapsed(),
                        signUpErrorCode: signUpResult.errorCode,
                        setupFromDialog: Boolean(options.setupFromDialog),
                    });
                }
            }
            await this.doInstall();
        }
        catch (error) {
            this.logService.error(`[chat setup] install: error ${error}`);
            this.telemetryService.publicLog2('commandCenter.chatInstall', {
                installResult: isCancellationError(error) ? 'cancelled' : 'failedInstall',
                installDuration: watch.elapsed(),
                signUpErrorCode: undefined,
                setupFromDialog: Boolean(options.setupFromDialog),
            });
            return false;
        }
        this.telemetryService.publicLog2('commandCenter.chatInstall', {
            installResult: wasInstalled ? 'alreadyInstalled' : 'installed',
            installDuration: watch.elapsed(),
            signUpErrorCode: undefined,
            setupFromDialog: Boolean(options.setupFromDialog),
        });
        if (wasInstalled && signUpResult === true) {
            refreshTokens(this.commandService);
        }
        if (!options?.setupFromDialog) {
            await Promise.race([
                timeout(5000), // helps prevent flicker with sign-in welcome view
                Event.toPromise(this.chatAgentService.onDidChangeAgents), // https://github.com/microsoft/vscode-copilot/issues/9274
            ]);
        }
        return true;
    }
    async doInstall() {
        let error;
        try {
            await this.extensionsWorkbenchService.install(defaultChat.extensionId, {
                enable: true,
                isApplicationScoped: true, // install into all profiles
                isMachineScoped: false, // do not ask to sync
                installEverywhere: true, // install in local and remote
                installPreReleaseVersion: this.productService.quality !== 'stable',
            }, preferCopilotEditsView(this.viewsService) ? EditsViewId : ChatViewId);
        }
        catch (e) {
            this.logService.error(`[chat setup] install: error ${error}`);
            error = e;
        }
        if (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: localize('unknownSetupError', 'An error occurred while setting up Copilot. Would you like to try again?'),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize('retry', 'Retry'),
                });
                if (confirmed) {
                    return this.doInstall();
                }
            }
            throw error;
        }
    }
    async setupWithProvider(options) {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            id: 'copilot.setup',
            type: 'object',
            properties: {
                [defaultChat.completionsAdvancedSetting]: {
                    type: 'object',
                    properties: {
                        authProvider: {
                            type: 'string',
                        },
                    },
                },
                [defaultChat.providerUriSetting]: {
                    type: 'string',
                },
            },
        });
        if (options.useEnterpriseProvider) {
            const success = await this.handleEnterpriseInstance();
            if (!success) {
                return false; // not properly configured, abort
            }
        }
        let existingAdvancedSetting = this.configurationService.inspect(defaultChat.completionsAdvancedSetting).user?.value;
        if (!isObject(existingAdvancedSetting)) {
            existingAdvancedSetting = {};
        }
        if (options.useEnterpriseProvider) {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, {
                ...existingAdvancedSetting,
                authProvider: defaultChat.enterpriseProviderId,
            }, 2 /* ConfigurationTarget.USER */);
        }
        else {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, Object.keys(existingAdvancedSetting).length > 0
                ? {
                    ...existingAdvancedSetting,
                    authProvider: undefined,
                }
                : undefined, 2 /* ConfigurationTarget.USER */);
            await this.configurationService.updateValue(defaultChat.providerUriSetting, undefined, 2 /* ConfigurationTarget.USER */);
        }
        return this.setup({ ...options, forceSignIn: true });
    }
    async handleEnterpriseInstance() {
        const domainRegEx = /^[a-zA-Z\-_]+$/;
        const fullUriRegEx = /^(https:\/\/)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.ghe\.com\/?$/;
        const uri = this.configurationService.getValue(defaultChat.providerUriSetting);
        if (typeof uri === 'string' && fullUriRegEx.test(uri)) {
            return true; // already setup with a valid URI
        }
        let isSingleWord = false;
        const result = await this.quickInputService.input({
            prompt: localize('enterpriseInstance', 'What is your {0} instance?', defaultChat.enterpriseProviderName),
            placeHolder: localize('enterpriseInstancePlaceholder', 'i.e. "octocat" or "https://octocat.ghe.com"...'),
            ignoreFocusLost: true,
            value: uri,
            validateInput: async (value) => {
                isSingleWord = false;
                if (!value) {
                    return undefined;
                }
                if (domainRegEx.test(value)) {
                    isSingleWord = true;
                    return {
                        content: localize('willResolveTo', 'Will resolve to {0}', `https://${value}.ghe.com`),
                        severity: Severity.Info,
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize('invalidEnterpriseInstance', 'You must enter a valid {0} instance (i.e. "octocat" or "https://octocat.ghe.com")', defaultChat.enterpriseProviderName),
                        severity: Severity.Error,
                    };
                }
                return undefined;
            },
        });
        if (!result) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('enterpriseSetupError', 'The provided {0} instance is invalid. Would you like to enter it again?', defaultChat.enterpriseProviderName),
                primaryButton: localize('retry', 'Retry'),
            });
            if (confirmed) {
                return this.handleEnterpriseInstance();
            }
            return false;
        }
        let resolvedUri = result;
        if (isSingleWord) {
            resolvedUri = `https://${resolvedUri}.ghe.com`;
        }
        else {
            const normalizedUri = result.toLowerCase();
            const hasHttps = normalizedUri.startsWith('https://');
            if (!hasHttps) {
                resolvedUri = `https://${result}`;
            }
        }
        await this.configurationService.updateValue(defaultChat.providerUriSetting, resolvedUri, 2 /* ConfigurationTarget.USER */);
        return true;
    }
};
ChatSetupController = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, IViewsService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IProductService),
    __param(7, ILogService),
    __param(8, IProgressService),
    __param(9, IChatAgentService),
    __param(10, IActivityService),
    __param(11, ICommandService),
    __param(12, IWorkbenchLayoutService),
    __param(13, IWorkspaceTrustRequestService),
    __param(14, IDialogService),
    __param(15, IConfigurationService),
    __param(16, ILifecycleService),
    __param(17, IQuickInputService)
], ChatSetupController);
//#endregion
//#region Setup View Welcome
let ChatSetupWelcomeContent = class ChatSetupWelcomeContent extends Disposable {
    constructor(controller, context, instantiationService, contextMenuService, configurationService, telemetryService) {
        super();
        this.controller = controller;
        this.context = context;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.element = $('.chat-setup-view');
        this.create();
    }
    create() {
        const markdown = this.instantiationService.createInstance(MarkdownRenderer, {});
        // Header
        {
            const header = localize({ key: 'header', comment: ['{Locked="[Copilot]({0})"}'] }, '[Copilot]({0}) is your AI pair programmer.', this.context.state.installed
                ? `command:${defaultChat.walkthroughCommand}`
                : defaultChat.documentationUrl);
            this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(header, { isTrusted: true }))).element));
            this.element.appendChild($('div.chat-features-container', undefined, $('div', undefined, $('div.chat-feature-container', undefined, renderIcon(Codicon.code), $('span', undefined, localize('featureChat', 'Code faster with Completions'))), $('div.chat-feature-container', undefined, renderIcon(Codicon.editSession), $('span', undefined, localize('featureEdits', 'Build features with Copilot Edits'))), $('div.chat-feature-container', undefined, renderIcon(Codicon.commentDiscussion), $('span', undefined, localize('featureExplore', 'Explore your codebase with Chat'))))));
        }
        // Limited SKU
        const free = localize({ key: 'free', comment: ['{Locked="[]({0})"}'] }, '$(sparkle-filled) We now offer [Copilot for free]({0}).', defaultChat.skusDocumentationUrl);
        const freeContainer = this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(free, { isTrusted: true, supportThemeIcons: true }))).element));
        // Setup Button
        const buttonContainer = this.element.appendChild($('p'));
        buttonContainer.classList.add('button-container');
        const button = this._register(new ButtonWithDropdown(buttonContainer, {
            actions: [
                toAction({
                    id: 'chatSetup.setupWithProvider',
                    label: localize('setupWithProvider', 'Sign in with a {0} Account', defaultChat.providerName),
                    run: () => this.controller.setupWithProvider({ useEnterpriseProvider: false }),
                }),
                toAction({
                    id: 'chatSetup.setupWithEnterpriseProvider',
                    label: localize('setupWithEnterpriseProvider', 'Sign in with a {0} Account', defaultChat.enterpriseProviderName),
                    run: () => this.controller.setupWithProvider({ useEnterpriseProvider: true }),
                }),
            ],
            addPrimaryActionToDropdown: false,
            contextMenuProvider: this.contextMenuService,
            supportIcons: true,
            ...defaultButtonStyles,
        }));
        this._register(button.onDidClick(() => this.controller.setup()));
        // Terms
        const terms = localize({ key: 'terms', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, 'By continuing, you agree to the [Terms]({0}) and [Privacy Policy]({1}).', defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(terms, { isTrusted: true }))).element));
        // SKU Settings
        const settings = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, 'Copilot Free and Pro may show [public code]({0}) suggestions and we may use your data for product improvement. You can change these [settings]({1}) at any time.', defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
        const settingsContainer = this.element.appendChild($('p', undefined, this._register(markdown.render(new MarkdownString(settings, { isTrusted: true }))).element));
        // Update based on model state
        this._register(Event.runAndSubscribe(this.controller.onDidChange, () => this.update(freeContainer, settingsContainer, button)));
    }
    update(freeContainer, settingsContainer, button) {
        const showSettings = this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */;
        let showFree;
        let buttonLabel;
        switch (this.context.state.entitlement) {
            case ChatEntitlement.Unknown:
                showFree = true;
                buttonLabel = this.context.state.registered
                    ? localize('signUp', 'Sign in to use Copilot')
                    : localize('signUpFree', 'Sign in to use Copilot for free');
                break;
            case ChatEntitlement.Unresolved:
                showFree = true;
                buttonLabel = this.context.state.registered
                    ? localize('startUp', 'Use Copilot')
                    : localize('startUpLimited', 'Use Copilot for free');
                break;
            case ChatEntitlement.Available:
            case ChatEntitlement.Limited:
                showFree = true;
                buttonLabel = localize('startUpLimited', 'Use Copilot for free');
                break;
            case ChatEntitlement.Pro:
            case ChatEntitlement.Unavailable:
                showFree = false;
                buttonLabel = localize('startUp', 'Use Copilot');
                break;
        }
        switch (this.controller.step) {
            case ChatSetupStep.SigningIn:
                buttonLabel = localize('setupChatSignIn', '$(loading~spin) Signing in to {0}...', ChatEntitlementRequests.providerId(this.configurationService) ===
                    defaultChat.enterpriseProviderId
                    ? defaultChat.enterpriseProviderName
                    : defaultChat.providerName);
                break;
            case ChatSetupStep.Installing:
                buttonLabel = localize('setupChatInstalling', '$(loading~spin) Getting Copilot Ready...');
                break;
        }
        setVisibility(showFree, freeContainer);
        setVisibility(showSettings, settingsContainer);
        button.label = buttonLabel;
        button.enabled = this.controller.step === ChatSetupStep.Initial;
    }
};
ChatSetupWelcomeContent = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, ITelemetryService)
], ChatSetupWelcomeContent);
//#endregion
function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
