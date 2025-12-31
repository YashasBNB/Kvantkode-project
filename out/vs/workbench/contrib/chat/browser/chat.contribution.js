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
import { timeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { PromptsConfig } from '../../../../platform/prompts/common/config.js';
import { DEFAULT_SOURCE_FOLDER as PROMPT_FILES_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION, } from '../../../../platform/prompts/common/constants.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { allDiscoverySources, discoverySourceLabel, mcpConfigurationSection, mcpDiscoverySection, mcpEnabledSection, mcpSchemaExampleServers, } from '../../mcp/common/mcpConfiguration.js';
import { ChatAgentNameService, ChatAgentService, IChatAgentNameService, IChatAgentService, } from '../common/chatAgents.js';
import { CodeMapperService, ICodeMapperService } from '../common/chatCodeMapperService.js';
import '../common/chatColors.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { IChatEditingService } from '../common/chatEditingService.js';
import { ChatEntitlement, ChatEntitlementService, IChatEntitlementService, } from '../common/chatEntitlementService.js';
import { chatVariableLeader } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatService } from '../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatTransferService, IChatTransferService } from '../common/chatTransferService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService, } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode } from '../common/constants.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, } from '../common/ignoredFiles.js';
import { ILanguageModelsService, LanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelStatsService, LanguageModelStatsService, } from '../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { DOCUMENTATION_URL } from '../common/promptSyntax/constants.js';
import '../common/promptSyntax/languageFeatures/promptLinkDiagnosticsProvider.js';
import '../common/promptSyntax/languageFeatures/promptLinkProvider.js';
import '../common/promptSyntax/languageFeatures/promptPathAutocompletion.js';
import { PromptsService } from '../common/promptSyntax/service/promptsService.js';
import { IPromptsService } from '../common/promptSyntax/service/types.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { BuiltinToolsContribution } from '../common/tools/tools.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { AgentChatAccessibilityHelp, EditsChatAccessibilityHelp, PanelChatAccessibilityHelp, QuickChatAccessibilityHelp, } from './actions/chatAccessibilityHelp.js';
import { CopilotTitleBarMenuRendering, registerChatActions } from './actions/chatActions.js';
import { ACTION_ID_NEW_CHAT, registerNewChatActions } from './actions/chatClearActions.js';
import { CodeBlockActionRendering, registerChatCodeBlockActions, registerChatCodeCompareBlockActions, } from './actions/chatCodeblockActions.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { ChatSubmitAction, registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { registerChatToolActions } from './actions/chatToolActions.js';
import { ChatTransferContribution } from './actions/chatTransfer.js';
import { IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService, } from './chat.js';
import { ChatAccessibilityService } from './chatAccessibilityService.js';
import './chatAttachmentModel.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService, } from './chatContentParts/chatMarkdownAnchorService.js';
import { ChatInputBoxContentProvider } from './chatEdinputInputContentProvider.js';
import { ChatEditingEditorAccessibility } from './chatEditing/chatEditingEditorAccessibility.js';
import { registerChatEditorActions } from './chatEditing/chatEditingEditorActions.js';
import { ChatEditingEditorContextKeys } from './chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditingEditorOverlay } from './chatEditing/chatEditingEditorOverlay.js';
import { ChatEditingService } from './chatEditing/chatEditingServiceImpl.js';
import { ChatEditingNotebookFileSystemProviderContrib } from './chatEditing/notebook/chatEditingNotebookFileSystemProvider.js';
import { ChatEditor } from './chatEditor.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './chatEditorInput.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './chatMarkdownDecorationsRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler, } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './chatPasteProviders.js';
import { QuickChatService } from './chatQuick.js';
import { ChatResponseAccessibleView } from './chatResponseAccessibleView.js';
import { ChatSetupContribution } from './chatSetup.js';
import { ChatStatusBarEntry } from './chatStatus.js';
import { ChatVariablesService } from './chatVariables.js';
import { ChatWidgetService } from './chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import { ChatImplicitContextContribution } from './contrib/chatImplicitContext.js';
import './contrib/chatInputCompletions.js';
import './contrib/chatInputEditorContrib.js';
import './contrib/chatInputEditorHover.js';
import { ChatRelatedFilesContribution } from './contrib/chatInputRelatedFilesContrib.js';
import { LanguageModelToolsService } from './languageModelToolsService.js';
import './promptSyntax/contributions/createPromptCommand/createPromptCommand.js';
import './promptSyntax/contributions/usePromptCommand.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'chatSidebar',
    title: nls.localize('interactiveSessionConfigurationTitle', 'Chat'),
    type: 'object',
    properties: {
        'chat.editor.fontSize': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.fontSize', 'Controls the font size in pixels in chat codeblocks.'),
            default: isMacintosh ? 12 : 14,
        },
        'chat.editor.fontFamily': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontFamily', 'Controls the font family in chat codeblocks.'),
            default: 'default',
        },
        'chat.editor.fontWeight': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontWeight', 'Controls the font weight in chat codeblocks.'),
            default: 'default',
        },
        'chat.editor.wordWrap': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.wordWrap', 'Controls whether lines should wrap in chat codeblocks.'),
            default: 'off',
            enum: ['on', 'off'],
        },
        'chat.editor.lineHeight': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.lineHeight', 'Controls the line height in pixels in chat codeblocks. Use 0 to compute the line height from the font size.'),
            default: 0,
        },
        'chat.commandCenter.enabled': {
            type: 'boolean',
            markdownDescription: nls.localize('chat.commandCenter.enabled', 'Controls whether the command center shows a menu for actions to control Copilot (requires {0}).', '`#window.commandCenter#`'),
            default: true,
        },
        'chat.implicitContext.enabled': {
            type: 'object',
            tags: ['experimental'],
            description: nls.localize('chat.implicitContext.enabled.1', 'Enables automatically using the active editor as chat context for specified chat locations.'),
            additionalProperties: {
                type: 'string',
                enum: ['never', 'first', 'always'],
                description: nls.localize('chat.implicitContext.value', 'The value for the implicit context.'),
                enumDescriptions: [
                    nls.localize('chat.implicitContext.value.never', 'Implicit context is never enabled.'),
                    nls.localize('chat.implicitContext.value.first', 'Implicit context is enabled for the first interaction.'),
                    nls.localize('chat.implicitContext.value.always', 'Implicit context is always enabled.'),
                ],
            },
            default: {
                panel: 'always',
                'editing-session': 'first',
            },
        },
        'chat.editing.autoAcceptDelay': {
            type: 'number',
            markdownDescription: nls.localize('chat.editing.autoAcceptDelay', 'Delay after which changes made by chat are automatically accepted. Values are in seconds, `0` means disabled and `100` seconds is the maximum.'),
            default: 0,
            minimum: 0,
            maximum: 100,
        },
        'chat.editing.confirmEditRequestRemoval': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRemoval', 'Whether to show a confirmation before removing a request and its associated edits.'),
            default: true,
        },
        'chat.editing.confirmEditRequestRetry': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRetry', 'Whether to show a confirmation before retrying a request and its associated edits.'),
            default: true,
        },
        'chat.experimental.detectParticipant.enabled': {
            type: 'boolean',
            deprecationMessage: nls.localize('chat.experimental.detectParticipant.enabled.deprecated', 'This setting is deprecated. Please use `chat.detectParticipant.enabled` instead.'),
            description: nls.localize('chat.experimental.detectParticipant.enabled', 'Enables chat participant autodetection for panel chat.'),
            default: null,
        },
        'chat.detectParticipant.enabled': {
            type: 'boolean',
            description: nls.localize('chat.detectParticipant.enabled', 'Enables chat participant autodetection for panel chat.'),
            default: true,
        },
        'chat.renderRelatedFiles': {
            type: 'boolean',
            description: nls.localize('chat.renderRelatedFiles', 'Controls whether related files should be rendered in the chat input.'),
            default: false,
        },
        'chat.setupFromDialog': {
            // TODO@bpasero remove this eventually
            type: 'boolean',
            description: nls.localize('chat.setupFromChat', 'Controls whether Copilot setup starts from a dialog or from the welcome view.'),
            default: product.quality !== 'stable',
            tags: ['experimental', 'onExp'],
        },
        'chat.focusWindowOnConfirmation': {
            type: 'boolean',
            description: nls.localize('chat.focusWindowOnConfirmation', 'Controls whether the Copilot window should be focused when a confirmation is needed.'),
            default: true,
        },
        'chat.tools.autoApprove': {
            default: false,
            description: nls.localize('chat.tools.autoApprove', "Controls whether tool use should be automatically approved ('YOLO mode')."),
            type: 'boolean',
            tags: ['experimental'],
            policy: {
                name: 'ChatToolsAutoApprove',
                minimumVersion: '1.99',
                previewFeature: true,
                defaultValue: false,
            },
        },
        [mcpEnabledSection]: {
            type: 'boolean',
            description: nls.localize('chat.mcp.enabled', 'Enables integration with Model Context Protocol servers to provide additional tools and functionality.'),
            default: true,
            tags: ['preview'],
            policy: {
                name: 'ChatMCP',
                minimumVersion: '1.99',
                previewFeature: true,
                defaultValue: false,
            },
        },
        [mcpConfigurationSection]: {
            type: 'object',
            default: {
                inputs: [],
                servers: mcpSchemaExampleServers,
            },
            description: nls.localize('workspaceConfig.mcp.description', 'Model Context Protocol server configurations'),
            $ref: mcpSchemaId,
        },
        [ChatConfiguration.UnifiedChatView]: {
            type: 'boolean',
            description: nls.localize('chat.unifiedChatView', 'Enables the unified view with Ask, Edit, and Agent modes in one view.'),
            default: true,
            tags: ['preview'],
        },
        [ChatConfiguration.UseFileStorage]: {
            type: 'boolean',
            description: nls.localize('chat.useFileStorage', 'Enables storing chat sessions on disk instead of in the storage service. Enabling this does a one-time per-workspace migration of existing sessions to the new format.'),
            default: true,
            tags: ['experimental'],
        },
        [ChatConfiguration.Edits2Enabled]: {
            type: 'boolean',
            description: nls.localize('chat.edits2Enabled', "Enable the new Edits mode that is based on tool-calling. When this is enabled, models that don't support tool-calling are unavailable for Edits mode."),
            default: true,
            tags: ['onExp'],
        },
        [ChatConfiguration.ExtensionToolsEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.extensionToolsEnabled', 'Enable using tools contributed by third-party extensions in Copilot Chat agent mode.'),
            default: true,
            policy: {
                name: 'ChatAgentExtensionTools',
                minimumVersion: '1.99',
                description: nls.localize('chat.extensionToolsPolicy', 'Enable using tools contributed by third-party extensions in Copilot Chat agent mode.'),
                previewFeature: true,
                defaultValue: false,
            },
        },
        [mcpDiscoverySection]: {
            oneOf: [
                { type: 'boolean' },
                {
                    type: 'object',
                    default: Object.fromEntries(allDiscoverySources.map((k) => [k, true])),
                    properties: Object.fromEntries(allDiscoverySources.map((k) => [
                        k,
                        {
                            type: 'boolean',
                            description: nls.localize('mcp.discovery.source', 'Enables discovery of {0} servers', discoverySourceLabel[k]),
                        },
                    ])),
                },
            ],
            default: true,
            markdownDescription: nls.localize('mpc.discovery.enabled', 'Configures discovery of Model Context Protocol servers on the machine. It may be set to `true` or `false` to disable or enable all sources, and an mapping sources you wish to enable.'),
        },
        [PromptsConfig.KEY]: {
            type: 'boolean',
            title: nls.localize('chat.reusablePrompts.config.enabled.title', 'Prompt Files'),
            markdownDescription: nls.localize('chat.reusablePrompts.config.enabled.description', 'Enable reusable prompt files (`*{0}`) in Chat, Edits, and Inline Chat sessions. [Learn More]({1}).', PROMPT_FILE_EXTENSION, DOCUMENTATION_URL),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            policy: {
                name: 'ChatPromptFiles',
                minimumVersion: '1.99',
                description: nls.localize('chat.promptFiles.policy', 'Enables reusable prompt files in Chat, Edits, and Inline Chat sessions.'),
                previewFeature: true,
                defaultValue: false,
            },
        },
        [PromptsConfig.LOCATIONS_KEY]: {
            type: 'object',
            title: nls.localize('chat.reusablePrompts.config.locations.title', 'Prompt File Locations'),
            markdownDescription: nls.localize('chat.reusablePrompts.config.locations.description', 'Specify location(s) of reusable prompt files (`*{0}`) that can be attached in Chat, Edits, and Inline Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.', PROMPT_FILE_EXTENSION, DOCUMENTATION_URL),
            default: {
                [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [PROMPT_FILES_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/prompts': true,
                },
            ],
        },
    },
});
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatEditor, ChatEditorInput.EditorID, nls.localize('chat', 'Chat')), [new SyncDescriptor(ChatEditorInput)]);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'chat.experimental.detectParticipant.enabled',
        migrateFn: (value, _accessor) => [
            ['chat.experimental.detectParticipant.enabled', { value: undefined }],
            ['chat.detectParticipant.enabled', { value: value !== false }],
        ],
    },
]);
let ChatResolverContribution = class ChatResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`${Schemas.vscodeChatSesssion}:**/**`, {
            id: ChatEditorInput.EditorID,
            label: nls.localize('chat', 'Chat'),
            priority: RegisteredEditorPriority.builtin,
        }, {
            singlePerResource: true,
            canSupportResource: (resource) => resource.scheme === Schemas.vscodeChatSesssion,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: instantiationService.createInstance(ChatEditorInput, resource, options),
                    options,
                };
            },
        }));
    }
};
ChatResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], ChatResolverContribution);
let ChatAgentSettingContribution = class ChatAgentSettingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentSetting'; }
    constructor(experimentService, productService, contextKeyService, entitlementService) {
        super();
        this.experimentService = experimentService;
        this.productService = productService;
        this.entitlementService = entitlementService;
        if (this.productService.quality !== 'stable') {
            this.registerEnablementSetting();
        }
        const expDisabledKey = ChatContextKeys.Editing.agentModeDisallowed.bindTo(contextKeyService);
        experimentService.getTreatment('chatAgentEnabled').then((enabled) => {
            if (enabled || typeof enabled !== 'boolean') {
                // If enabled, or experiments not available, fall back to registering the setting
                this.registerEnablementSetting();
                expDisabledKey.set(false);
            }
            else {
                // If disabled, deregister the setting
                this.deregisterSetting();
                expDisabledKey.set(true);
            }
        });
        this.registerMaxRequestsSetting();
    }
    registerEnablementSetting() {
        if (this.registeredNode) {
            return;
        }
        this.registeredNode = configurationRegistry.registerConfiguration({
            id: 'chatAgent',
            title: nls.localize('interactiveSessionConfigurationTitle', 'Chat'),
            type: 'object',
            properties: {
                [ChatConfiguration.AgentEnabled]: {
                    type: 'boolean',
                    description: nls.localize('chat.agent.enabled.description', 'Enable agent mode for {0}. When this is enabled, a dropdown appears in the view to toggle agent mode.', 'Copilot Chat'),
                    default: this.productService.quality !== 'stable',
                    tags: ['onExp'],
                    policy: {
                        name: 'ChatAgentMode',
                        minimumVersion: '1.99',
                        previewFeature: false,
                        defaultValue: false,
                    },
                },
            },
        });
    }
    deregisterSetting() {
        if (this.registeredNode) {
            configurationRegistry.deregisterConfigurations([this.registeredNode]);
            this.registeredNode = undefined;
        }
    }
    registerMaxRequestsSetting() {
        let lastNode;
        const registerMaxRequestsSetting = () => {
            const treatmentId = this.entitlementService.entitlement === ChatEntitlement.Limited
                ? 'chatAgentMaxRequestsFree'
                : 'chatAgentMaxRequestsPro';
            this.experimentService.getTreatment(treatmentId).then((value) => {
                const defaultValue = value ?? (this.entitlementService.entitlement === ChatEntitlement.Limited ? 5 : 15);
                const node = {
                    id: 'chatSidebar',
                    title: nls.localize('interactiveSessionConfigurationTitle', 'Chat'),
                    type: 'object',
                    properties: {
                        'chat.agent.maxRequests': {
                            type: 'number',
                            markdownDescription: nls.localize('chat.agent.maxRequests', 'The maximum number of requests to allow Copilot Edits to use per-turn in agent mode. When the limit is reached, Copilot will ask the user to confirm that it should keep working. \n\n> **Note**: For users on the Copilot Free plan, note that each agent mode request currently uses one chat request.'),
                            default: defaultValue,
                        },
                    },
                };
                configurationRegistry.updateConfigurations({
                    remove: lastNode ? [lastNode] : [],
                    add: [node],
                });
                lastNode = node;
            });
        };
        this._register(Event.runAndSubscribe(Event.debounce(this.entitlementService.onDidChangeEntitlement, () => { }, 1000), () => registerMaxRequestsSetting()));
    }
};
ChatAgentSettingContribution = __decorate([
    __param(0, IWorkbenchAssignmentService),
    __param(1, IProductService),
    __param(2, IContextKeyService),
    __param(3, IChatEntitlementService)
], ChatAgentSettingContribution);
AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());
AccessibleViewRegistry.register(new EditsChatAccessibilityHelp());
AccessibleViewRegistry.register(new AgentChatAccessibilityHelp());
registerEditorFeature(ChatInputBoxContentProvider);
let ChatSlashStaticSlashCommandsContribution = class ChatSlashStaticSlashCommandsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSlashStaticSlashCommands'; }
    constructor(slashCommandService, commandService, chatAgentService, chatVariablesService, instantiationService) {
        super();
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'clear',
            detail: nls.localize('clear', 'Start a new chat'),
            sortText: 'z2_clear',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel],
        }, async () => {
            commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'help',
            detail: '',
            sortText: 'z1_help',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel],
            modes: [ChatMode.Ask],
        }, async (prompt, progress) => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
            const agents = chatAgentService.getAgents();
            // Report prefix
            if (defaultAgent?.metadata.helpTextPrefix) {
                if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
                    progress.report({
                        content: defaultAgent.metadata.helpTextPrefix,
                        kind: 'markdownContent',
                    });
                }
                else {
                    progress.report({
                        content: new MarkdownString(defaultAgent.metadata.helpTextPrefix),
                        kind: 'markdownContent',
                    });
                }
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
            }
            // Report agent list
            const agentText = (await Promise.all(agents
                .filter((a) => a.id !== defaultAgent?.id && !a.isCore)
                .filter((a) => a.locations.includes(ChatAgentLocation.Panel))
                .map(async (a) => {
                const description = a.description ? `- ${a.description}` : '';
                const agentMarkdown = instantiationService.invokeFunction((accessor) => agentToMarkdown(a, true, accessor));
                const agentLine = `- ${agentMarkdown} ${description}`;
                const commandText = a.slashCommands
                    .map((c) => {
                    const description = c.description ? `- ${c.description}` : '';
                    return `\t* ${agentSlashCommandToMarkdown(a, c)} ${description}`;
                })
                    .join('\n');
                return (agentLine + '\n' + commandText).trim();
            }))).join('\n');
            progress.report({
                content: new MarkdownString(agentText, {
                    isTrusted: { enabledCommands: [ChatSubmitAction.ID] },
                }),
                kind: 'markdownContent',
            });
            // Report variables
            if (defaultAgent?.metadata.helpTextVariablesPrefix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextVariablesPrefix)) {
                    progress.report({
                        content: defaultAgent.metadata.helpTextVariablesPrefix,
                        kind: 'markdownContent',
                    });
                }
                else {
                    progress.report({
                        content: new MarkdownString(defaultAgent.metadata.helpTextVariablesPrefix),
                        kind: 'markdownContent',
                    });
                }
                const variables = [
                    { name: 'file', description: nls.localize('file', 'Choose a file in the workspace') },
                ];
                const variableText = variables
                    .map((v) => `* \`${chatVariableLeader}${v.name}\` - ${v.description}`)
                    .join('\n');
                progress.report({
                    content: new MarkdownString('\n' + variableText),
                    kind: 'markdownContent',
                });
            }
            // Report help text ending
            if (defaultAgent?.metadata.helpTextPostfix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
                    progress.report({
                        content: defaultAgent.metadata.helpTextPostfix,
                        kind: 'markdownContent',
                    });
                }
                else {
                    progress.report({
                        content: new MarkdownString(defaultAgent.metadata.helpTextPostfix),
                        kind: 'markdownContent',
                    });
                }
            }
            // Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
            // rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
            // it has received all response data has been received.
            await timeout(200);
        }));
    }
};
ChatSlashStaticSlashCommandsContribution = __decorate([
    __param(0, IChatSlashCommandService),
    __param(1, ICommandService),
    __param(2, IChatAgentService),
    __param(3, IChatVariablesService),
    __param(4, IInstantiationService)
], ChatSlashStaticSlashCommandsContribution);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);
registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatSlashStaticSlashCommandsContribution.ID, ChatSlashStaticSlashCommandsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(CopilotTitleBarMenuRendering.ID, CopilotTitleBarMenuRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(CodeBlockActionRendering.ID, CodeBlockActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatRelatedFilesContribution.ID, ChatRelatedFilesContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatSetupContribution.ID, ChatSetupContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatStatusBarEntry.ID, ChatStatusBarEntry, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(BuiltinToolsContribution.ID, BuiltinToolsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatAgentSettingContribution.ID, ChatAgentSettingContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatEditingEditorAccessibility.ID, ChatEditingEditorAccessibility, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorOverlay.ID, ChatEditingEditorOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorContextKeys.ID, ChatEditingEditorContextKeys, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatTransferContribution.ID, ChatTransferContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerChatActions();
registerChatCopyActions();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatTitleActions();
registerChatExecuteActions();
registerQuickChatActions();
registerChatExportActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();
registerChatToolActions();
registerEditorFeature(ChatPasteProvidersFeature);
registerSingleton(IChatService, ChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetService, ChatWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickChatService, QuickChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsService, LanguageModelsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentService, ChatAgentService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentNameService, ChatAgentNameService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatVariablesService, ChatVariablesService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsService, LanguageModelToolsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IVoiceChatService, VoiceChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICodeMapperService, CodeMapperService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEditingService, ChatEditingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEntitlementService, ChatEntitlementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPromptsService, PromptsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatTransferService, ChatTransferService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(ChatEditingNotebookFileSystemProviderContrib.ID, ChatEditingNotebookFileSystemProviderContrib, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FJckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xH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