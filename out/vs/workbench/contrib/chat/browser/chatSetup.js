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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUNOLFFBQVEsR0FHUixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixlQUFlLEVBRWYsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFB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