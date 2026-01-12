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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUlyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7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