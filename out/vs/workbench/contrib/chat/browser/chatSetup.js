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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sUUFBUSxHQUdSLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGVBQWUsRUFFZixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDakgsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV2RyxPQUFPLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sMEJBQTBCLENBQUE7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQy9GLE9BQU8sRUFFTixzQkFBc0IsR0FDdEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25GLE9BQU8sRUFJTixpQkFBaUIsR0FFakIsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUNOLGVBQWUsRUFFZix1QkFBdUIsRUFFdkIsdUJBQXVCLEdBQ3ZCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkcsT0FBTyxFQUNOLFVBQVUsRUFDVixXQUFXLEVBQ1gseUJBQXlCLEVBQ3pCLGtCQUFrQixFQUNsQixzQkFBc0IsRUFDdEIsZUFBZSxHQUNmLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBS3hGLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsaUJBQWlCLEVBRWpCLGdCQUFnQixHQUNoQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHN0YsTUFBTSxXQUFXLEdBQUc7SUFDbkIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLElBQUksRUFBRTtJQUN4RCxlQUFlLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGVBQWUsSUFBSSxFQUFFO0lBQ2hFLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsSUFBSSxFQUFFO0lBQ2xFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsSUFBSSxFQUFFO0lBQ3BFLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsSUFBSSxFQUFFO0lBQ3hFLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsSUFBSSxFQUFFO0lBQzFFLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsSUFBSSxFQUFFO0lBQzFFLGNBQWMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxJQUFJLEVBQUU7SUFDOUQsWUFBWSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLElBQUksRUFBRTtJQUMxRCxvQkFBb0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLElBQUksRUFBRTtJQUMxRSxzQkFBc0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLElBQUksRUFBRTtJQUM5RSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLElBQUksRUFBRTtJQUN0RSxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLElBQUksRUFBRTtJQUNwRSwwQkFBMEIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsMEJBQTBCLElBQUksRUFBRTtJQUN0RixrQkFBa0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLElBQUksRUFBRTtJQUN0RSw4QkFBOEIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsOEJBQThCLElBQUksRUFBRTtJQUM5Rix1QkFBdUIsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsdUJBQXVCLElBQUksRUFBRTtDQUNoRixDQUFBO0FBRUQsc0JBQXNCO0FBRXRCLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ3hDLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFDdkUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsRUFDcEQsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUM3QyxDQUFBO0FBRUQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVOztJQUNwRCxNQUFNLENBQUMsUUFBUSxDQUNkLG9CQUEyQyxFQUMzQyxRQUEyQixFQUMzQixZQUFxQixFQUNyQixPQUErQixFQUMvQixVQUFxQztRQUVyQyxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBRXhELElBQUksRUFBVSxDQUFBO1lBQ2QsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzVELElBQUkscUJBQTZELENBQUE7WUFDakUsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUMzQixhQUFhLEVBQ2IseUZBQXlGLENBQ3pGLENBQUE7WUFDRCxRQUFRLFFBQVEsRUFBRSxDQUFDO2dCQUNsQixLQUFLLGlCQUFpQixDQUFDLEtBQUs7b0JBQzNCLEVBQUUsR0FBRyxZQUFZLENBQUE7b0JBQ2pCLHFCQUFxQixHQUFHO3dCQUN2QixLQUFLLEVBQUUsV0FBVzt3QkFDbEIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQzt3QkFDeEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO3FCQUMxQixDQUFBO29CQUNELE1BQUs7Z0JBQ04sS0FBSyxpQkFBaUIsQ0FBQyxjQUFjO29CQUNwQyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQTtvQkFDakQsV0FBVyxHQUFHLFlBQVk7d0JBQ3pCLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsNENBQTRDLENBQUM7d0JBQzVFLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtvQkFDL0QscUJBQXFCLEdBQUcsWUFBWTt3QkFDbkMsQ0FBQyxDQUFDOzRCQUNBLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLG1CQUFtQixDQUFDOzRCQUNsRCxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQzFCLFFBQVEsQ0FDUCxjQUFjLEVBQ2QsNEtBQTRLLEVBQzVLLHFDQUFxQyxDQUNyQyxHQUFHLE9BQU8sV0FBVyxFQUFFLENBQ3hCOzRCQUNELElBQUksRUFBRSxPQUFPLENBQUMsWUFBWTt5QkFDMUI7d0JBQ0YsQ0FBQyxDQUFDOzRCQUNBLEtBQUssRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLG1CQUFtQixDQUFDOzRCQUNsRCxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQzFCLFFBQVEsQ0FDUCxjQUFjLEVBQ2Qsc0lBQXNJLENBQ3RJLEdBQUcsT0FBTyxXQUFXLEVBQUUsQ0FDeEI7NEJBQ0QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO3lCQUMxQixDQUFBO29CQUNILE1BQUs7Z0JBQ04sS0FBSyxpQkFBaUIsQ0FBQyxRQUFRO29CQUM5QixFQUFFLEdBQUcsZ0JBQWdCLENBQUE7b0JBQ3JCLE1BQUs7Z0JBQ04sS0FBSyxpQkFBaUIsQ0FBQyxNQUFNO29CQUM1QixFQUFFLEdBQUcsY0FBYyxDQUFBO29CQUNuQixNQUFLO2dCQUNOLEtBQUssaUJBQWlCLENBQUMsUUFBUTtvQkFDOUIsRUFBRSxHQUFHLGdCQUFnQixDQUFBO29CQUNyQixNQUFLO1lBQ1AsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFFeEMsVUFBVSxDQUFDLEdBQUcsQ0FDYixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFO2dCQUNsQyxFQUFFO2dCQUNGLElBQUksRUFBRSxHQUFHLFdBQVcsQ0FBQyxZQUFZLFVBQVU7Z0JBQzNDLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFlBQVk7Z0JBQ1osSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM1RCxhQUFhLEVBQUUsRUFBRTtnQkFDakIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDckIsUUFBUSxFQUFFO29CQUNULHFCQUFxQjtvQkFDckIsY0FBYyxFQUFFLDhCQUE0QixDQUFDLG9CQUFvQjtpQkFDakU7Z0JBQ0QsV0FBVztnQkFDWCxXQUFXLEVBQUUsd0JBQXdCLENBQUMsVUFBVTtnQkFDaEQsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsSUFBSTtnQkFDbkQsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsU0FBUzthQUN4RCxDQUFDLENBQ0YsQ0FBQTtZQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQzNCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsOEJBQTRCLEVBQzVCLE9BQU8sRUFDUCxVQUFVLEVBQ1YsUUFBUSxDQUNSLENBQ0QsQ0FBQTtZQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFFdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7YUFFdUIseUJBQW9CLEdBQUcsSUFBSSxjQUFjLENBQ2hFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx5Q0FBeUMsQ0FBQyxDQUM3RSxBQUYyQyxDQUUzQztJQUtELFlBQ2tCLE9BQStCLEVBQy9CLFVBQXFDLEVBQ3JDLFFBQTJCLEVBQ3JCLG9CQUE0RCxFQUN0RSxVQUF3QyxFQUM5QixvQkFBNEQsRUFDaEUsZ0JBQW9EO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBUlUsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFDL0IsZUFBVSxHQUFWLFVBQVUsQ0FBMkI7UUFDckMsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDSix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDYix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQy9DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFWdkQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbEUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtJQVk5RCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FDWCxPQUEwQixFQUMxQixRQUF1QztRQUV2QyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ2xFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUEsQ0FBQyxnQ0FBZ0M7WUFDL0UsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUEsQ0FBQywyQkFBMkI7WUFDOUYsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFeEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUNuQixPQUFPLEVBQ1AsUUFBUSxFQUNSLFdBQVcsRUFDWCxxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLGdCQUFnQixDQUNoQixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLFFBQVEsQ0FDckIsT0FBMEIsRUFDMUIsUUFBdUMsRUFDdkMsV0FBeUIsRUFDekIscUJBQTZDLEVBQzdDLGlCQUFxQyxFQUNyQyxnQkFBbUM7UUFFbkMsSUFDQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxTQUFTO1lBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUN6RCxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQzVCLE9BQU8sRUFDUCxRQUFRLEVBQ1IsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQy9CLE9BQU8sRUFDUCxRQUFRLEVBQ1IsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsZ0JBQWdCLENBQ2hCLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUNqQyxPQUEwQixFQUMxQixRQUF1QyxFQUN2QyxXQUF5QixFQUN6QixxQkFBNkMsRUFDN0MsaUJBQXFDLEVBQ3JDLGdCQUFtQztRQUVuQyxNQUFNLFlBQVksR0FBRyxpQkFBaUI7YUFDcEMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUN4QyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFO2FBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ1IsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUE7WUFDekYsT0FBTyxFQUFFLENBQUEsQ0FBQyx5QkFBeUI7UUFDcEMsQ0FBQztRQUVELFFBQVEsQ0FBQztZQUNSLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1NBQ2pGLENBQUMsQ0FBQTtRQUVGLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUNqQyxZQUFZLEVBQ1osUUFBUSxFQUNSLFdBQVcsRUFDWCxxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLGlCQUFpQixDQUNqQixDQUFBO1FBRUQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBR08sS0FBSyxDQUFDLHVCQUF1QixDQUNwQyxZQUErQixFQUMvQixRQUF1QyxFQUN2QyxXQUF5QixFQUN6QixxQkFBNkMsRUFDN0MsZ0JBQW1DLEVBQ25DLGlCQUFxQztRQUVyQyxJQUFJLElBQUksQ0FBQyx5QkFBeUIsS0FBSyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xFLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsSUFBSSxDQUFDLHlCQUF5QixHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBRTFELDZEQUE2RDtRQUM3RCw0REFBNEQ7UUFDNUQseURBQXlEO1FBRXpELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDakYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRTVELElBQUksc0JBQXNCLFlBQVksT0FBTyxJQUFJLGNBQWMsWUFBWSxPQUFPLEVBQUUsQ0FBQztZQUNwRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNyQyxRQUFRLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGlCQUFpQjtvQkFDdkIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO2lCQUNwRixDQUFDLENBQUE7WUFDSCxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFVCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQztvQkFDckMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUM1RCxDQUFDLENBQUE7Z0JBRUYsSUFBSSxLQUFLLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQzFCLFFBQVEsQ0FBQzt3QkFDUixJQUFJLEVBQUUsU0FBUzt3QkFDZixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQzFCLFFBQVEsQ0FDUCx3QkFBd0IsRUFDeEIsdURBQXVELENBQ3ZELENBQ0Q7cUJBQ0QsQ0FBQyxDQUFBO29CQUVGLDBEQUEwRDtvQkFDMUQsb0RBQW9EO29CQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ2hDLE9BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7b0JBQVMsQ0FBQztnQkFDVixZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JGLFdBQVcsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFO1lBQ3ZDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDL0IsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxvQkFBb0I7U0FDdkQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixxQkFBNkM7UUFFN0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7WUFDOUQsTUFBTSxLQUFLLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDM0QsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixPQUFNLENBQUMsMkJBQTJCO1lBQ25DLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUNyQixLQUFLLENBQUMsTUFBTSxDQUNYLHFCQUFxQixDQUFDLHlCQUF5QixFQUMvQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUNsRSxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLGdCQUFtQztRQUN6RCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BFLElBQUksWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFDLE9BQU0sQ0FBQyw2Q0FBNkM7UUFDckQsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FDckIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDckQsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNwRSxPQUFPLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQzlCLE9BQTBCLEVBQzFCLFFBQXVDLEVBQ3ZDLFdBQXlCLEVBQ3pCLHFCQUE2QyxFQUM3QyxpQkFBcUMsRUFDckMsZ0JBQW1DO1FBRW5DLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBRzlCLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBRXhFLE1BQU0sWUFBWSxHQUFHLGlCQUFpQjthQUNwQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ3hDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUU7YUFDL0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFUixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7WUFDbkYsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxhQUFhLENBQUMsU0FBUztvQkFDM0IsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxpQkFBaUI7d0JBQ3ZCLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FDMUIsUUFBUSxDQUNQLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQzs0QkFDNUQsV0FBVyxDQUFDLG9CQUFvQjs0QkFDaEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0I7NEJBQ3BDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUMzQixDQUNEO3FCQUNELENBQUMsQ0FBQTtvQkFDRixNQUFLO2dCQUNOLEtBQUssYUFBYSxDQUFDLFVBQVU7b0JBQzVCLFFBQVEsQ0FBQzt3QkFDUixJQUFJLEVBQUUsaUJBQWlCO3dCQUN2QixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixDQUFDLENBQUM7cUJBQ3BGLENBQUMsQ0FBQTtvQkFDRixNQUFLO1lBQ1AsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFBO1FBQ3ZCLElBQUksQ0FBQztZQUNKLE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQ3BDLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsVUFBVSxDQUNmLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDUixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuRixDQUFDO2dCQUFTLENBQUM7WUFDVixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDeEIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLE9BQU8sT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQ2pDLFlBQVksRUFDWixRQUFRLEVBQ1IsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsaUJBQWlCLENBQ2pCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUM7b0JBQ1IsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO2lCQUNuRixDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELCtCQUErQjthQUMxQixDQUFDO1lBQ0wsUUFBUSxDQUFDO2dCQUNSLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLE9BQU8sRUFBRSw4QkFBNEIsQ0FBQyxvQkFBb0I7YUFDMUQsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQzs7QUExWUksNEJBQTRCO0lBbUgvQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBdEhkLDRCQUE0QixDQTJZakM7QUFFRCxJQUFLLGlCQUtKO0FBTEQsV0FBSyxpQkFBaUI7SUFDckIsaUVBQVksQ0FBQTtJQUNaLHlFQUFnQixDQUFBO0lBQ2hCLDZHQUFrQyxDQUFBO0lBQ2xDLHVHQUErQixDQUFBO0FBQ2hDLENBQUMsRUFMSSxpQkFBaUIsS0FBakIsaUJBQWlCLFFBS3JCO0FBRUQsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFTOzthQUNDLGFBQVEsR0FBMEIsU0FBUyxBQUFuQyxDQUFtQztJQUMxRCxNQUFNLENBQUMsV0FBVyxDQUNqQixvQkFBMkMsRUFDM0MsT0FBK0IsRUFDL0IsVUFBcUM7UUFFckMsSUFBSSxRQUFRLEdBQUcsV0FBUyxDQUFDLFFBQVEsQ0FBQTtRQUNqQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixRQUFRLEdBQUcsV0FBUyxDQUFDLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDaEYsT0FBTyxJQUFJLFdBQVMsQ0FDbkIsT0FBTyxFQUNQLFVBQVUsRUFDVixvQkFBb0IsRUFDcEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUMvQixRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEVBQ2pDLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFDckMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNoQyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEVBQ3JDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQ3pCLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBSUQsWUFDa0IsT0FBK0IsRUFDL0IsVUFBcUMsRUFDL0Isb0JBQTRELEVBQ2hFLGdCQUFvRCxFQUNsRCxrQkFBd0QsRUFDN0QsYUFBdUQsRUFDbkQsaUJBQXNELEVBQ2pELHNCQUFnRSxFQUM1RSxVQUF3QztRQVJwQyxZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQUNkLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzVDLGtCQUFhLEdBQWIsYUFBYSxDQUF5QjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2hDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVg5QyxlQUFVLEdBQTZDLFNBQVMsQ0FBQTtJQVlyRSxDQUFDO0lBRUosS0FBSyxDQUFDLEdBQUc7UUFDUixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTlCLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFBO1FBQzdCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzVCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUs7UUFDbEIsSUFBSSxhQUFnQyxDQUFBO1FBQ3BDLElBQ0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsR0FBRztZQUMvRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLEVBQ2xFLENBQUM7WUFDRixhQUFhLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFBLENBQUMsaURBQWlEO1FBQ2pHLENBQUM7YUFBTSxDQUFDO1lBQ1AsYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3hDLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxTQUFTLENBQUE7UUFDdkIsSUFBSSxDQUFDO1lBQ0osUUFBUSxhQUFhLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxpQkFBaUIsQ0FBQywyQkFBMkI7b0JBQ2pELE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDO3dCQUN2RCxlQUFlLEVBQUUsSUFBSTt3QkFDckIscUJBQXFCLEVBQUUsSUFBSTtxQkFDM0IsQ0FBQyxDQUFBO29CQUNGLE1BQUs7Z0JBQ04sS0FBSyxpQkFBaUIsQ0FBQyw4QkFBOEI7b0JBQ3BELE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDO3dCQUN2RCxlQUFlLEVBQUUsSUFBSTt3QkFDckIscUJBQXFCLEVBQUUsS0FBSztxQkFDNUIsQ0FBQyxDQUFBO29CQUNGLE1BQUs7Z0JBQ04sS0FBSyxpQkFBaUIsQ0FBQyxZQUFZO29CQUNsQyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtvQkFDdEUsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNsRixPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ2hCLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN2QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLElBQUksTUFBTSxHQUFrQyxTQUFTLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFFaEYsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0IsSUFBSSxNQUFNLENBQ1QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQ2xDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFDckIsT0FBTyxFQUNQLDRCQUE0QixDQUMzQjtZQUNDLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzFCLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDNUIsVUFBVSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEUscUJBQXFCLEVBQUU7Z0JBQ3RCLG1CQUFtQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7Z0JBQzVDLDBCQUEwQixFQUFFLEtBQUs7Z0JBQ2pDLE9BQU8sRUFBRTtvQkFDUixRQUFRLENBQUM7d0JBQ1IsRUFBRSxFQUFFLG1CQUFtQjt3QkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FDZCxtQkFBbUIsRUFDbkIsNEJBQTRCLEVBQzVCLFdBQVcsQ0FBQyxZQUFZLENBQ3hCO3dCQUNELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyw4QkFBOEIsQ0FBQztxQkFDdEUsQ0FBQztvQkFDRixRQUFRLENBQUM7d0JBQ1IsRUFBRSxFQUFFLDZCQUE2Qjt3QkFDakMsS0FBSyxFQUFFLFFBQVEsQ0FDZCw2QkFBNkIsRUFDN0IsNEJBQTRCLEVBQzVCLFdBQVcsQ0FBQyxzQkFBc0IsQ0FDbEM7d0JBQ0QsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLGlCQUFpQixDQUFDLDJCQUEyQixDQUFDO3FCQUNuRSxDQUFDO2lCQUNGO2FBQ0Q7U0FDRCxFQUNELElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUFDLGFBQWEsQ0FDbEIsQ0FDRCxDQUNELENBQUE7UUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDdEMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXJCLE9BQU8sTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQTtJQUM5RixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoRSxPQUFPLFFBQVEsQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVU7Z0JBQ25DLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDO2dCQUM5QyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUQsT0FBTyxRQUFRLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVO1lBQ25DLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLHFCQUFxQixDQUFDO1lBQ2pELENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRU8sWUFBWSxDQUFDLFdBQTRCO1FBQ2hELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFL0UsU0FBUztRQUNULE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLDJCQUEyQixDQUFDLEVBQUUsRUFDL0QsbUxBQW1MLEVBQ25MLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDNUIsQ0FBQTtRQUNELE9BQU8sQ0FBQyxXQUFXLENBQ2xCLENBQUMsQ0FDQSxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUN6RixDQUNELENBQUE7UUFFRCxRQUFRO1FBQ1IsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUNyQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEVBQUUsRUFDckYseUVBQXlFLEVBQ3pFLFdBQVcsQ0FBQyxpQkFBaUIsRUFDN0IsV0FBVyxDQUFDLG1CQUFtQixDQUMvQixDQUFBO1FBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FDbEIsQ0FBQyxDQUNBLGVBQWUsRUFDZixTQUFTLEVBQ1QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQ3hGLENBQ0QsQ0FBQTtRQUVELGVBQWU7UUFDZixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLGdDQUF3QixFQUFFLENBQUM7WUFDbEUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUN4QixFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEVBQUUsRUFDeEYsa0tBQWtLLEVBQ2xLLFdBQVcsQ0FBQyxvQkFBb0IsRUFDaEMsV0FBVyxDQUFDLGlCQUFpQixDQUM3QixDQUFBO1lBQ0QsT0FBTyxDQUFDLFdBQVcsQ0FDbEIsQ0FBQyxDQUNBLGtCQUFrQixFQUNsQixTQUFTLEVBQ1QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2pGLE9BQU8sQ0FDVCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDOztBQWpPSSxTQUFTO0lBZ0NaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsV0FBVyxDQUFBO0dBdENSLFNBQVMsQ0FrT2Q7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQztJQUVsRCxZQUNtQyxjQUErQixFQUN6QixvQkFBMkMsRUFDakQsY0FBK0IsRUFDN0IsZ0JBQW1DLEVBQzlDLHNCQUE4QyxFQUMvQixvQkFBMkMsRUFDckQsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFSMkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ3pCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSXJELE1BQU0sT0FBTyxHQUFHLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUE7UUFDckQsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQTtRQUN2RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0IsT0FBTSxDQUFDLFdBQVc7UUFDbkIsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUNoQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUNoRixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ25ELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFFTyxtQkFBbUIsQ0FDMUIsT0FBK0IsRUFDL0IsVUFBcUM7UUFFckMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBLENBQUMsb0NBQW9DO1FBRWxHLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQy9CLE1BQU0sUUFBUSxHQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3BGLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsR0FDdkQsNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLEtBQUssRUFDdkIsS0FBSyxFQUNMLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQTtnQkFDRixZQUFZLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUN0QyxlQUFlLEVBQ2YsNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLFFBQVEsRUFDMUIsS0FBSyxFQUNMLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQyxVQUFVLEVBQ1osNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLFFBQVEsRUFDMUIsS0FBSyxFQUNMLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQyxVQUFVLEVBQ1osNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLE1BQU0sRUFDeEIsS0FBSyxFQUNMLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQyxVQUFVLEVBQ1osNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLGNBQWMsRUFDaEMsS0FBSyxFQUNMLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQyxVQUFVLEVBQ1osNEJBQTRCLENBQUMsUUFBUSxDQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLGlCQUFpQixDQUFDLGNBQWMsRUFDaEMsSUFBSSxFQUNKLE9BQU8sRUFDUCxVQUFVLENBQ1YsQ0FBQyxVQUFVLEVBQ1osVUFBVSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRTtvQkFDbkMsZ0VBQWdFO29CQUNoRSwyREFBMkQ7b0JBQzNELGlFQUFpRTtvQkFDakUsaUVBQWlFO29CQUNqRSxzQkFBc0I7b0JBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQix5RkFBeUYsQ0FDekYsQ0FBQTtvQkFDRCxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQzFCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksUUFBUSxJQUFJLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDM0MsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQ1IsT0FBTyxDQUFDLFdBQVcsRUFDbkIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN0RSxDQUFDLENBQUMsb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsQ0FDOUMsQ0FDRCxFQUNELEdBQUcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQzFCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FDMUIsT0FBK0IsRUFDL0IsVUFBcUM7UUFFckMsUUFBUSxDQUFDLEVBQUUsa0dBRVYsQ0FBQyxRQUFRLENBQUM7WUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQztZQUNwRCxJQUFJLEVBQUUsZUFBZSxDQUFDLGtCQUFrQjtZQUN4QyxJQUFJLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDMUIsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FDeEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2Qyx1QkFBdUIsRUFDdkIsVUFBVSxDQUFDLEtBQUssRUFDaEIsT0FBTyxDQUNQLENBQ0QsQ0FBQyxPQUFPO1NBQ1YsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsT0FBK0IsRUFDL0IsUUFBaUMsRUFDakMsVUFBcUM7UUFFckMsTUFBTSx1QkFBdUIsR0FBRyxjQUFjLENBQUMsRUFBRSxDQUNoRCxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFDeEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQ3JDLENBQUE7UUFFRCxNQUFNLHVCQUF1QixHQUFHLFNBQVMsQ0FDeEMsa0JBQWtCLEVBQ2xCLDBDQUEwQyxDQUMxQyxDQUFBO1FBRUQsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO1lBQzNDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixLQUFLLEVBQUUsdUJBQXVCO29CQUM5QixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsRUFBRSxFQUFFLElBQUk7b0JBQ1IsWUFBWSxFQUFFLHVCQUF1QjtvQkFDckMsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3dCQUMzQixLQUFLLEVBQUUsUUFBUTt3QkFDZixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsdUJBQXVCLEVBQ3ZCLGNBQWMsQ0FBQyxFQUFFLENBQ2hCLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLHFEQUFxRDt3QkFDaEcsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQzVCLENBQ0Q7cUJBQ0Q7aUJBQ0QsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUFjO2dCQUM1RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtnQkFDbEUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDM0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ3hELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUNoRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtnQkFFeEQsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBRXZDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtnQkFDdEUsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixNQUFNLFVBQVUsR0FBRyxNQUFNLGlCQUFpQixDQUFBO29CQUMxQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztnQkFFRCxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtnQkFDN0UsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN0Qix5QkFBeUIsQ0FBQyxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQzlFLENBQUM7Z0JBRUQsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ25FLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFFcEUsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7b0JBQzlFLE1BQU0sTUFBTSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO29CQUNoQyxJQUFJLE1BQU0sS0FBSyxLQUFLLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQzt3QkFDeEQsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQzs0QkFDakQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLOzRCQUNwQixPQUFPLEVBQUUsUUFBUSxDQUNoQixrQkFBa0IsRUFDbEIsb0RBQW9ELENBQ3BEOzRCQUNELGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzt5QkFDekMsQ0FBQyxDQUFBO3dCQUVGLElBQUksU0FBUyxFQUFFLENBQUM7NEJBQ2YsY0FBYyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO3dCQUNwRCxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRDtRQUVELE1BQU0sbUJBQW9CLFNBQVEsT0FBTztxQkFDeEIsT0FBRSxHQUFHLGlDQUFpQyxDQUFBO3FCQUN0QyxVQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUVsRTtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7b0JBQzFCLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLO29CQUNoQyxFQUFFLEVBQUUsSUFBSTtvQkFDUixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUN4QyxlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FDckM7b0JBQ0QsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3dCQUMzQixLQUFLLEVBQUUsUUFBUTt3QkFDZixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO3FCQUM5QztpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDNUMsTUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7Z0JBQ25FLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDM0QsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUV4RCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxhQUFhLENBQUMsT0FBTyxDQUFDO29CQUNqRCxPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdDQUF3QyxDQUFDO29CQUNuRixNQUFNLEVBQUUsUUFBUSxDQUNmLHFCQUFxQixFQUNyQix1REFBdUQsRUFDdkQsdUJBQXVCLENBQUMsS0FBSyxDQUM3QjtvQkFDRCxhQUFhLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQztpQkFDOUQsQ0FBQyxDQUFBO2dCQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDaEIsT0FBTTtnQkFDUCxDQUFDO2dCQUVELE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUV2RSxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFFdEMsSUFBSSxRQUFRLCtDQUF1QyxFQUFFLENBQUM7b0JBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCO3lCQUM3QywyQkFBMkIsQ0FBQyxRQUFRLENBQUM7eUJBQ3JDLE1BQU0sQ0FDTixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQ2Isc0JBQXNCLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUMscUJBQXFCO3lCQUMzRSxNQUFNLEdBQUcsQ0FBQyxDQUNiLENBQUE7b0JBQ0YsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ25DLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSwrREFBMEIsQ0FBQSxDQUFDLHNEQUFzRDtvQkFDbEgsQ0FBQztnQkFDRixDQUFDO2dCQUVELGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNwRSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEUsQ0FBQzs7UUFHRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDbkUsTUFBTSxpQkFBa0IsU0FBUSxPQUFPO1lBQ3RDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsbUNBQW1DO29CQUN2QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSx3QkFBd0IsQ0FBQztvQkFDeEQsUUFBUSxFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDO29CQUM1QyxFQUFFLEVBQUUsSUFBSTtvQkFDUixZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDOUIsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQ3JDLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUNuQztvQkFDRCxJQUFJLEVBQUU7d0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7d0JBQzNCLEtBQUssRUFBRSxTQUFTO3dCQUNoQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDdEIsZUFBZSxDQUFDLGlCQUFpQixFQUNqQyxlQUFlLENBQUMsd0JBQXdCLENBQ3hDO3FCQUNEO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUM7WUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBYTtnQkFDM0QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDOUMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFFcEQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQTtnQkFDN0MsSUFBSSxXQUFXLEtBQUssZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUN6Qyw2RUFBNkU7b0JBQzdFLHlFQUF5RTtvQkFDekUsbUJBQW1CLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ2xFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUN6QyxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFjLEVBQUUsY0FBK0I7Z0JBQzFFLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBRTNCLE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUN0RSxJQUFJLFlBQVksRUFBRSxXQUFXLEtBQUssZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUN2RCxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBQzlCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRDtRQUVELGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3ZDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3BDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixtQ0FBbUMsQ0FBQyxlQUFlLENBQUM7WUFDbkQsWUFBWSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3JCLE9BQU8sQ0FDTixHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVztvQkFDOUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFDLENBQzVELENBQUE7WUFDRixDQUFDO1lBQ0QsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qix5QkFBeUIsRUFBRTtvQkFDNUIsRUFBRSxFQUFFLG9CQUFvQjtvQkFDeEIsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksU0FBUztpQkFDM0MsQ0FBQyxDQUFBO2dCQUVGLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQ3ZDLG9CQUFvQixFQUNwQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3BDLENBQUE7Z0JBRUQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDOztBQXpYVyxxQkFBcUI7SUFJL0IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxXQUFXLENBQUE7R0FWRCxxQkFBcUIsQ0EwWGpDOztBQTZDRCxJQUFLLGFBSUo7QUFKRCxXQUFLLGFBQWE7SUFDakIsdURBQVcsQ0FBQTtJQUNYLDJEQUFTLENBQUE7SUFDVCw2REFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUpJLGFBQWEsS0FBYixhQUFhLFFBSWpCO0FBRUQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBSzNDLElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixDQUFDO0lBRUQsWUFDa0IsT0FBK0IsRUFDL0IsUUFBaUMsRUFDL0IsZ0JBQW9ELEVBQy9DLHFCQUE4RCxFQUN2RSxZQUE0QyxFQUUzRCwwQkFBd0UsRUFDdkQsY0FBZ0QsRUFDcEQsVUFBd0MsRUFDbkMsZUFBa0QsRUFDakQsZ0JBQW9ELEVBQ3JELGVBQWtELEVBQ25ELGNBQWdELEVBQ3hDLGFBQXVELEVBRWhGLDRCQUE0RSxFQUM1RCxhQUE4QyxFQUN2QyxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ25ELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQTtRQXJCVSxZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixhQUFRLEdBQVIsUUFBUSxDQUF5QjtRQUNkLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDOUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN0RCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUUxQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3RDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNuQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2xCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNoQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3BDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNsQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQXlCO1FBRS9ELGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDM0Msa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3RCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBNUIxRCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFFdEMsVUFBSyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUE2QnBDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRU8sT0FBTyxDQUFDLElBQW1CO1FBQ2xDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBOEQ7UUFDekUsTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDdkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FDM0Qsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN4QyxDQUFDLENBQUMsNkJBQTZCO1lBQy9CLENBQUMsQ0FBQyxxQkFBcUIsRUFDeEI7WUFDQyxLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO1NBQ3JDLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FDN0M7Z0JBQ0MsUUFBUSxrQ0FBeUI7Z0JBQ2pDLE9BQU8sRUFBRSxtQkFBbUI7Z0JBQzVCLEtBQUs7YUFDTCxFQUNELEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FDeEMsQ0FBQTtRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQ3BCLE9BQTZELEVBQzdELEtBQWdCO1FBRWhCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUEsQ0FBQyxrQkFBa0I7UUFFekMsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1FBQzFCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDaEYsSUFBSSxPQUEwQyxDQUFBO1lBQzlDLElBQUksV0FBd0MsQ0FBQTtZQUU1QyxnRUFBZ0U7WUFDaEUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUMvQiwyQkFBMkIsRUFDM0I7d0JBQ0MsYUFBYSxFQUFFLG1CQUFtQjt3QkFDbEMsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7d0JBQ2hDLGVBQWUsRUFBRSxTQUFTO3dCQUMxQixlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7cUJBQ2pELENBQ0QsQ0FBQTtvQkFDRCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUVELE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFBO2dCQUN4QixXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLENBQUM7Z0JBQzdFLE9BQU8sRUFBRSxRQUFRLENBQ2hCLHVCQUF1QixFQUN2Qiw0REFBNEQsQ0FDNUQ7YUFDRCxDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDL0IsMkJBQTJCLEVBQzNCO29CQUNDLGFBQWEsRUFBRSxrQkFBa0I7b0JBQ2pDLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFO29CQUNoQyxlQUFlLEVBQUUsU0FBUztvQkFDMUIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO2lCQUNqRCxDQUNELENBQUE7Z0JBQ0QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQTtZQUV4QyxVQUFVO1lBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDdEMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FDM0IsT0FBTyxFQUNQLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQzdDLFVBQVUsRUFDVixPQUFPLEVBQ1AsS0FBSyxDQUNMLENBQUE7WUFFRCxNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixFQUFFLENBQUE7WUFDL0MsY0FBYztnQkFDYixhQUFhLEtBQUssb0JBQW9CLElBQUksb0JBQW9CLEtBQUssVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUE7UUFDN0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsSUFBSSxjQUFjLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDaEQsQ0FBQztZQUFBLENBQUMsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQTtRQUM5RSxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQU0sQ0FDbkIsVUFBa0IsRUFDbEIsT0FBdUM7UUFLdkMsSUFBSSxPQUEwQyxDQUFBO1FBQzlDLElBQUksWUFBWSxDQUFBO1FBQ2hCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUM7Z0JBQy9CLGVBQWUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBRUQsQ0FBQztZQUFBLENBQUMsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN6RCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNyRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLEVBQUUsUUFBUSxDQUNoQixvQkFBb0IsRUFDcEIsd0RBQXdELEVBQ3hELHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7b0JBQzVELFdBQVcsQ0FBQyxvQkFBb0I7b0JBQ2hDLENBQUMsQ0FBQyxXQUFXLENBQUMsc0JBQXNCO29CQUNwQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FDM0I7Z0JBQ0QsTUFBTSxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx1Q0FBdUMsQ0FBQztnQkFDckYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2FBQ3pDLENBQUMsQ0FBQTtZQUVGLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUMzRCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FDcEIsT0FBMEMsRUFDMUMsV0FBNEIsRUFDNUIsVUFBa0IsRUFDbEIsT0FBc0MsRUFDdEMsS0FBZ0I7UUFFaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFBO1FBQ2pELElBQUksWUFBWSxHQUFnRCxTQUFTLENBQUE7UUFFekUsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQztnQkFDL0IsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7WUFFRCxJQUNDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxJQUFJLHdDQUF3QztnQkFDbkYsV0FBVyxLQUFLLGVBQWUsQ0FBQyxHQUFHLElBQUksdUNBQXVDO2dCQUM5RSxXQUFXLEtBQUssZUFBZSxDQUFDLFdBQVcsQ0FBQyxvQ0FBb0M7Y0FDL0UsQ0FBQztnQkFDRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDO3dCQUNKLE9BQU8sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDM0UsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQiw0REFBNEQ7b0JBQzdELENBQUM7b0JBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLDJCQUEyQixFQUMzQjs0QkFDQyxhQUFhLEVBQUUsaUJBQWlCOzRCQUNoQyxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRTs0QkFDaEMsZUFBZSxFQUFFLFNBQVM7NEJBQzFCLGVBQWUsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQzt5QkFDakQsQ0FDRCxDQUFBO3dCQUNELE9BQU8sS0FBSyxDQUFBLENBQUMsYUFBYTtvQkFDM0IsQ0FBQztnQkFDRixDQUFDO2dCQUVELFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUV6RCxJQUFJLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDL0IsMkJBQTJCLEVBQzNCO3dCQUNDLGFBQWEsRUFBRSxjQUFjO3dCQUM3QixlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRTt3QkFDaEMsZUFBZSxFQUFFLFlBQVksQ0FBQyxTQUFTO3dCQUN2QyxlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7cUJBQ2pELENBQ0QsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3ZCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLCtCQUErQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQzdELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLDJCQUEyQixFQUMzQjtnQkFDQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsZUFBZTtnQkFDekUsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQ2hDLGVBQWUsRUFBRSxTQUFTO2dCQUMxQixlQUFlLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7YUFDakQsQ0FDRCxDQUFBO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDL0IsMkJBQTJCLEVBQzNCO1lBQ0MsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFdBQVc7WUFDOUQsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDaEMsZUFBZSxFQUFFLFNBQVM7WUFDMUIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO1NBQ2pELENBQ0QsQ0FBQTtRQUVELElBQUksWUFBWSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDO1lBQy9CLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLGtEQUFrRDtnQkFDakUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBRSwwREFBMEQ7YUFDcEgsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTO1FBQ3RCLElBQUksS0FBd0IsQ0FBQTtRQUM1QixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQzVDLFdBQVcsQ0FBQyxXQUFXLEVBQ3ZCO2dCQUNDLE1BQU0sRUFBRSxJQUFJO2dCQUNaLG1CQUFtQixFQUFFLElBQUksRUFBRSw0QkFBNEI7Z0JBQ3ZELGVBQWUsRUFBRSxLQUFLLEVBQUUscUJBQXFCO2dCQUM3QyxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsOEJBQThCO2dCQUN2RCx3QkFBd0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRO2FBQ2xFLEVBQ0Qsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FDcEUsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsK0JBQStCLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDN0QsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7b0JBQ3RELElBQUksRUFBRSxRQUFRLENBQUMsS0FBSztvQkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsbUJBQW1CLEVBQ25CLDBFQUEwRSxDQUMxRTtvQkFDRCxNQUFNLEVBQUUsS0FBSyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDaEYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2lCQUN6QyxDQUFDLENBQUE7Z0JBRUYsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDeEIsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLEtBQUssQ0FBQTtRQUNaLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BR3ZCO1FBQ0EsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0YsUUFBUSxDQUFDLHFCQUFxQixDQUFDO1lBQzlCLEVBQUUsRUFBRSxlQUFlO1lBQ25CLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLEVBQUU7b0JBQ3pDLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDWCxZQUFZLEVBQUU7NEJBQ2IsSUFBSSxFQUFFLFFBQVE7eUJBQ2Q7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRTtvQkFDakMsSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDbkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtZQUNyRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxLQUFLLENBQUEsQ0FBQyxpQ0FBaUM7WUFDL0MsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLHVCQUF1QixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQzlELFdBQVcsQ0FBQywwQkFBMEIsQ0FDdEMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFBO1FBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7WUFDeEMsdUJBQXVCLEdBQUcsRUFBRSxDQUFBO1FBQzdCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDMUMsR0FBRyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsRUFDM0M7Z0JBQ0MsR0FBRyx1QkFBdUI7Z0JBQzFCLFlBQVksRUFBRSxXQUFXLENBQUMsb0JBQW9CO2FBQzlDLG1DQUVELENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDMUMsR0FBRyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsRUFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUM5QyxDQUFDLENBQUM7b0JBQ0EsR0FBRyx1QkFBdUI7b0JBQzFCLFlBQVksRUFBRSxTQUFTO2lCQUN2QjtnQkFDRixDQUFDLENBQUMsU0FBUyxtQ0FFWixDQUFBO1lBQ0QsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUMxQyxXQUFXLENBQUMsa0JBQWtCLEVBQzlCLFNBQVMsbUNBRVQsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QjtRQUNyQyxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQTtRQUNwQyxNQUFNLFlBQVksR0FBRyw2REFBNkQsQ0FBQTtRQUVsRixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3RGLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLElBQUksQ0FBQSxDQUFDLGlDQUFpQztRQUM5QyxDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztZQUNqRCxNQUFNLEVBQUUsUUFBUSxDQUNmLG9CQUFvQixFQUNwQiw0QkFBNEIsRUFDNUIsV0FBVyxDQUFDLHNCQUFzQixDQUNsQztZQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLCtCQUErQixFQUMvQixnREFBZ0QsQ0FDaEQ7WUFDRCxlQUFlLEVBQUUsSUFBSTtZQUNyQixLQUFLLEVBQUUsR0FBRztZQUNWLGFBQWEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQzlCLFlBQVksR0FBRyxLQUFLLENBQUE7Z0JBQ3BCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDWixPQUFPLFNBQVMsQ0FBQTtnQkFDakIsQ0FBQztnQkFFRCxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDN0IsWUFBWSxHQUFHLElBQUksQ0FBQTtvQkFDbkIsT0FBTzt3QkFDTixPQUFPLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEtBQUssVUFBVSxDQUFDO3dCQUNyRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7cUJBQ3ZCLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUMvQixPQUFPO3dCQUNOLE9BQU8sRUFBRSxRQUFRLENBQ2hCLDJCQUEyQixFQUMzQixtRkFBbUYsRUFDbkYsV0FBVyxDQUFDLHNCQUFzQixDQUNsQzt3QkFDRCxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUs7cUJBQ3hCLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7Z0JBQ3RELElBQUksRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsc0JBQXNCLEVBQ3RCLHlFQUF5RSxFQUN6RSxXQUFXLENBQUMsc0JBQXNCLENBQ2xDO2dCQUNELGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzthQUN6QyxDQUFDLENBQUE7WUFFRixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDdkMsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQTtRQUN4QixJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFdBQVcsR0FBRyxXQUFXLFdBQVcsVUFBVSxDQUFBO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQzFDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLFdBQVcsR0FBRyxXQUFXLE1BQU0sRUFBRSxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUMxQyxXQUFXLENBQUMsa0JBQWtCLEVBQzlCLFdBQVcsbUNBRVgsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUF0ZUssbUJBQW1CO0lBWXRCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSx1QkFBdUIsQ0FBQTtJQUN2QixZQUFBLDZCQUE2QixDQUFBO0lBRTdCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsa0JBQWtCLENBQUE7R0E3QmYsbUJBQW1CLENBc2V4QjtBQUVELFlBQVk7QUFFWiw0QkFBNEI7QUFFNUIsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBRy9DLFlBQ2tCLFVBQStCLEVBQy9CLE9BQStCLEVBQ3pCLG9CQUE0RCxFQUM5RCxrQkFBd0QsRUFDdEQsb0JBQTRELEVBQ2hFLGdCQUFvRDtRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQVBVLGVBQVUsR0FBVixVQUFVLENBQXFCO1FBQy9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQ1IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQVIvRCxZQUFPLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFZdkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU07UUFDYixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRS9FLFNBQVM7UUFDVCxDQUFDO1lBQ0EsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUN6RCw0Q0FBNEMsRUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDM0IsQ0FBQyxDQUFDLFdBQVcsV0FBVyxDQUFDLGtCQUFrQixFQUFFO2dCQUM3QyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUMvQixDQUFBO1lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ3ZCLENBQUMsQ0FDQSxHQUFHLEVBQ0gsU0FBUyxFQUNULElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUN4RixDQUNELENBQUE7WUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FDdkIsQ0FBQyxDQUNBLDZCQUE2QixFQUM3QixTQUFTLEVBQ1QsQ0FBQyxDQUNBLEtBQUssRUFDTCxTQUFTLEVBQ1QsQ0FBQyxDQUNBLDRCQUE0QixFQUM1QixTQUFTLEVBQ1QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFDeEIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDLENBQzdFLEVBQ0QsQ0FBQyxDQUNBLDRCQUE0QixFQUM1QixTQUFTLEVBQ1QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDL0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDLENBQ25GLEVBQ0QsQ0FBQyxDQUNBLDRCQUE0QixFQUM1QixTQUFTLEVBQ1QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUNyQyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUNuRixDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELGNBQWM7UUFDZCxNQUFNLElBQUksR0FBRyxRQUFRLENBQ3BCLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQ2hELHlEQUF5RCxFQUN6RCxXQUFXLENBQUMsb0JBQW9CLENBQ2hDLENBQUE7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FDN0MsQ0FBQyxDQUNBLEdBQUcsRUFDSCxTQUFTLEVBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FDYixRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUN2RixDQUFDLE9BQU8sQ0FDVCxDQUNELENBQUE7UUFFRCxlQUFlO1FBQ2YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDeEQsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNqRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QixJQUFJLGtCQUFrQixDQUFDLGVBQWUsRUFBRTtZQUN2QyxPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxDQUFDO29CQUNSLEVBQUUsRUFBRSw2QkFBNkI7b0JBQ2pDLEtBQUssRUFBRSxRQUFRLENBQ2QsbUJBQW1CLEVBQ25CLDRCQUE0QixFQUM1QixXQUFXLENBQUMsWUFBWSxDQUN4QjtvQkFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxDQUFDO2lCQUM5RSxDQUFDO2dCQUNGLFFBQVEsQ0FBQztvQkFDUixFQUFFLEVBQUUsdUNBQXVDO29CQUMzQyxLQUFLLEVBQUUsUUFBUSxDQUNkLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIsV0FBVyxDQUFDLHNCQUFzQixDQUNsQztvQkFDRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxDQUFDO2lCQUM3RSxDQUFDO2FBQ0Y7WUFDRCwwQkFBMEIsRUFBRSxLQUFLO1lBQ2pDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7WUFDNUMsWUFBWSxFQUFFLElBQUk7WUFDbEIsR0FBRyxtQkFBbUI7U0FDdEIsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEUsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FDckIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQ3JGLHlFQUF5RSxFQUN6RSxXQUFXLENBQUMsaUJBQWlCLEVBQzdCLFdBQVcsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUN2QixDQUFDLENBQ0EsR0FBRyxFQUNILFNBQVMsRUFDVCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDdkYsQ0FDRCxDQUFBO1FBRUQsZUFBZTtRQUNmLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FDeEIsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQ3hGLGtLQUFrSyxFQUNsSyxXQUFXLENBQUMsb0JBQW9CLEVBQ2hDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FDN0IsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ2pELENBQUMsQ0FDQSxHQUFHLEVBQ0gsU0FBUyxFQUNULElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUMxRixDQUNELENBQUE7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FDckQsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FDYixhQUEwQixFQUMxQixpQkFBOEIsRUFDOUIsTUFBMEI7UUFFMUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsZ0NBQXdCLENBQUE7UUFDakYsSUFBSSxRQUFpQixDQUFBO1FBQ3JCLElBQUksV0FBbUIsQ0FBQTtRQUV2QixRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3hDLEtBQUssZUFBZSxDQUFDLE9BQU87Z0JBQzNCLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2YsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVU7b0JBQzFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDO29CQUM5QyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsQ0FBQyxDQUFBO2dCQUM1RCxNQUFLO1lBQ04sS0FBSyxlQUFlLENBQUMsVUFBVTtnQkFDOUIsUUFBUSxHQUFHLElBQUksQ0FBQTtnQkFDZixXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVTtvQkFDMUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDO29CQUNwQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDLENBQUE7Z0JBQ3JELE1BQUs7WUFDTixLQUFLLGVBQWUsQ0FBQyxTQUFTLENBQUM7WUFDL0IsS0FBSyxlQUFlLENBQUMsT0FBTztnQkFDM0IsUUFBUSxHQUFHLElBQUksQ0FBQTtnQkFDZixXQUFXLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixDQUFDLENBQUE7Z0JBQ2hFLE1BQUs7WUFDTixLQUFLLGVBQWUsQ0FBQyxHQUFHLENBQUM7WUFDekIsS0FBSyxlQUFlLENBQUMsV0FBVztnQkFDL0IsUUFBUSxHQUFHLEtBQUssQ0FBQTtnQkFDaEIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQ2hELE1BQUs7UUFDUCxDQUFDO1FBRUQsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLEtBQUssYUFBYSxDQUFDLFNBQVM7Z0JBQzNCLFdBQVcsR0FBRyxRQUFRLENBQ3JCLGlCQUFpQixFQUNqQixzQ0FBc0MsRUFDdEMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztvQkFDNUQsV0FBVyxDQUFDLG9CQUFvQjtvQkFDaEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxzQkFBc0I7b0JBQ3BDLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUMzQixDQUFBO2dCQUNELE1BQUs7WUFDTixLQUFLLGFBQWEsQ0FBQyxVQUFVO2dCQUM1QixXQUFXLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDBDQUEwQyxDQUFDLENBQUE7Z0JBQ3pGLE1BQUs7UUFDUCxDQUFDO1FBRUQsYUFBYSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN0QyxhQUFhLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUE7UUFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsT0FBTyxDQUFBO0lBQ2hFLENBQUM7Q0FDRCxDQUFBO0FBak5LLHVCQUF1QjtJQU0xQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlCQUFpQixDQUFBO0dBVGQsdUJBQXVCLENBaU41QjtBQUVELFlBQVk7QUFFWixTQUFTLGFBQWEsQ0FBQyxjQUErQjtJQUNyRCx5RUFBeUU7SUFDekUsY0FBYyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQTtJQUN6RSxjQUFjLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0FBQ25FLENBQUMifQ==