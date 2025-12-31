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
import { coalesce, isNonEmptyArray } from '../../../../base/common/arrays.js';
// import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
// import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
// import { URI } from '../../../../base/common/uri.js';
// import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize } from '../../../../nls.js';
// import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
// import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../platform/log/common/log.js';
// import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { Extensions, } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
// import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
// import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation } from '../common/constants.js';
import { ChatViewId } from './chat.js';
// import { CHAT_EDITING_SIDEBAR_PANEL_ID, CHAT_SIDEBAR_PANEL_ID, ChatViewPane } from './chatViewPane.js';
// --- Chat Container &  View Registration
// Void commented this out
// const chatViewContainer: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
// 	id: CHAT_SIDEBAR_PANEL_ID,
// 	title: localize2('chat.viewContainer.label', "Chat"),
// 	icon: Codicon.commentDiscussion,
// 	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
// 	storageId: CHAT_SIDEBAR_PANEL_ID,
// 	hideIfEmpty: true,
// 	order: 100,
// }, ViewContainerLocation.AuxiliaryBar, { isDefault: true, doNotRegisterOpenCommand: true });
// const chatViewDescriptor: IViewDescriptor[] = [{
// 	id: ChatViewId,
// 	containerIcon: chatViewContainer.icon,
// 	containerTitle: chatViewContainer.title.value,
// 	singleViewPaneContainerTitle: chatViewContainer.title.value,
// 	name: localize2('chat.viewContainer.label', "Chat"),
// 	canToggleVisibility: false,
// 	canMoveView: true,
// 	openCommandActionDescriptor: {
// 		id: CHAT_SIDEBAR_PANEL_ID,
// 		title: chatViewContainer.title,
// 		mnemonicTitle: localize({ key: 'miToggleChat', comment: ['&& denotes a mnemonic'] }, "&&Chat"),
// 		keybindings: {
// 			primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KeyI,
// 			mac: {
// 				primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KeyI
// 			}
// 		},
// 		order: 1
// 	},
// 	ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.Panel }]),
// 	when: ContextKeyExpr.or(
// 		ChatContextKeys.Setup.hidden.negate(),
// 		ChatContextKeys.Setup.installed,
// 		ChatContextKeys.panelParticipantRegistered,
// 		ChatContextKeys.extensionInvalid
// 	)
// }];
// Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews(chatViewDescriptor, chatViewContainer);
// --- Edits Container &  View Registration
// Void commented this out
// const editsViewContainer: ViewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
// 	id: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 	title: localize2('chatEditing.viewContainer.label', "Copilot Edits"),
// 	icon: Codicon.editSession,
// 	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_EDITING_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
// 	storageId: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 	hideIfEmpty: true,
// 	order: 101,
// }, ViewContainerLocation.AuxiliaryBar, { doNotRegisterOpenCommand: true });
const chatParticipantExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatParticipants',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatParticipant', 'Contributes a chat participant'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name', 'id'],
            properties: {
                id: {
                    description: localize('chatParticipantId', 'A unique id for this chat participant.'),
                    type: 'string',
                },
                name: {
                    description: localize('chatParticipantName', "User-facing name for this chat participant. The user will use '@' with this name to invoke the participant. Name must not contain whitespace."),
                    type: 'string',
                    pattern: '^[\\w-]+$',
                },
                fullName: {
                    markdownDescription: localize('chatParticipantFullName', 'The full name of this chat participant, which is shown as the label for responses coming from this participant. If not provided, {0} is used.', '`name`'),
                    type: 'string',
                },
                description: {
                    description: localize('chatParticipantDescription', 'A description of this chat participant, shown in the UI.'),
                    type: 'string',
                },
                isSticky: {
                    description: localize('chatCommandSticky', 'Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message.'),
                    type: 'boolean',
                },
                sampleRequest: {
                    description: localize('chatSampleRequest', 'When the user clicks this participant in `/help`, this text will be submitted to the participant.'),
                    type: 'string',
                },
                when: {
                    description: localize('chatParticipantWhen', 'A condition which must be true to enable this participant.'),
                    type: 'string',
                },
                disambiguation: {
                    description: localize('chatParticipantDisambiguation', 'Metadata to help with automatically routing user questions to this chat participant.'),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                        required: ['category', 'description', 'examples'],
                        properties: {
                            category: {
                                markdownDescription: localize('chatParticipantDisambiguationCategory', 'A detailed name for this category, e.g. `workspace_questions` or `web_questions`.'),
                                type: 'string',
                            },
                            description: {
                                description: localize('chatParticipantDisambiguationDescription', 'A detailed description of the kinds of questions that are suitable for this chat participant.'),
                                type: 'string',
                            },
                            examples: {
                                description: localize('chatParticipantDisambiguationExamples', 'A list of representative example questions that are suitable for this chat participant.'),
                                type: 'array',
                            },
                        },
                    },
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', 'Commands available for this chat participant, which the user can invoke with a `/`.'),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('chatCommand', 'A short name by which this command is referred to in the UI, e.g. `fix` or * `explain` for commands that fix an issue or explain code. The name should be unique among the commands provided by this participant.'),
                                type: 'string',
                            },
                            description: {
                                description: localize('chatCommandDescription', 'A description of this command.'),
                                type: 'string',
                            },
                            when: {
                                description: localize('chatCommandWhen', 'A condition which must be true to enable this command.'),
                                type: 'string',
                            },
                            sampleRequest: {
                                description: localize('chatCommandSampleRequest', 'When the user clicks this command in `/help`, this text will be submitted to the participant.'),
                                type: 'string',
                            },
                            isSticky: {
                                description: localize('chatCommandSticky', 'Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message.'),
                                type: 'boolean',
                            },
                            disambiguation: {
                                description: localize('chatCommandDisambiguation', 'Metadata to help with automatically routing user questions to this chat command.'),
                                type: 'array',
                                items: {
                                    additionalProperties: false,
                                    type: 'object',
                                    defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                                    required: ['category', 'description', 'examples'],
                                    properties: {
                                        category: {
                                            markdownDescription: localize('chatCommandDisambiguationCategory', 'A detailed name for this category, e.g. `workspace_questions` or `web_questions`.'),
                                            type: 'string',
                                        },
                                        description: {
                                            description: localize('chatCommandDisambiguationDescription', 'A detailed description of the kinds of questions that are suitable for this chat command.'),
                                            type: 'string',
                                        },
                                        examples: {
                                            description: localize('chatCommandDisambiguationExamples', 'A list of representative example questions that are suitable for this chat command.'),
                                            type: 'array',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onChatParticipant:${contrib.id}`);
        }
    },
});
let ChatExtensionPointHandler = class ChatExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatExtensionPointHandler'; }
    constructor(_chatAgentService, logService) {
        this._chatAgentService = _chatAgentService;
        this.logService = logService;
        this._participantRegistrationDisposables = new DisposableMap();
        this.handleAndRegisterChatExtensions();
    }
    handleAndRegisterChatExtensions() {
        chatParticipantExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    if (!providerDescriptor.name?.match(/^[\w-]+$/)) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with invalid name: ${providerDescriptor.name}. Name must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (providerDescriptor.fullName &&
                        strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter(providerDescriptor.fullName)) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains ambiguous characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    // Spaces are allowed but considered "invisible"
                    if (providerDescriptor.fullName &&
                        strings.InvisibleCharacters.containsInvisibleCharacter(providerDescriptor.fullName.replace(/ /g, ''))) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains invisible characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    if ((providerDescriptor.isDefault || providerDescriptor.isAgent) &&
                        !isProposedApiEnabled(extension.description, 'defaultChatParticipant')) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: defaultChatParticipant.`);
                        continue;
                    }
                    if (providerDescriptor.locations &&
                        !isProposedApiEnabled(extension.description, 'chatParticipantAdditions')) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: chatParticipantAdditions.`);
                        continue;
                    }
                    if (!providerDescriptor.id || !providerDescriptor.name) {
                        this.logService.error(`Extension '${extension.description.identifier.value}' CANNOT register participant without both id and name.`);
                        continue;
                    }
                    const participantsDisambiguation = [];
                    if (providerDescriptor.disambiguation?.length) {
                        participantsDisambiguation.push(...providerDescriptor.disambiguation.map((d) => ({
                            ...d,
                            category: d.category ?? d.categoryName,
                        })));
                    }
                    try {
                        const store = new DisposableStore();
                        store.add(this._chatAgentService.registerAgent(providerDescriptor.id, {
                            extensionId: extension.description.identifier,
                            publisherDisplayName: extension.description.publisherDisplayName ?? extension.description.publisher, // May not be present in OSS
                            extensionPublisherId: extension.description.publisher,
                            extensionDisplayName: extension.description.displayName ?? extension.description.name,
                            id: providerDescriptor.id,
                            description: providerDescriptor.description,
                            when: providerDescriptor.when,
                            metadata: {
                                isSticky: providerDescriptor.isSticky,
                                sampleRequest: providerDescriptor.sampleRequest,
                            },
                            name: providerDescriptor.name,
                            fullName: providerDescriptor.fullName,
                            isDefault: providerDescriptor.isDefault,
                            isToolsAgent: providerDescriptor.isAgent,
                            locations: isNonEmptyArray(providerDescriptor.locations)
                                ? providerDescriptor.locations.map(ChatAgentLocation.fromRaw)
                                : [ChatAgentLocation.Panel],
                            slashCommands: providerDescriptor.commands ?? [],
                            disambiguation: coalesce(participantsDisambiguation.flat()),
                        }));
                        this._participantRegistrationDisposables.set(getParticipantKey(extension.description.identifier, providerDescriptor.id), store);
                    }
                    catch (e) {
                        this.logService.error(`Failed to register participant ${providerDescriptor.id}: ${toErrorMessage(e, true)}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const providerDescriptor of extension.value) {
                    this._participantRegistrationDisposables.deleteAndDispose(getParticipantKey(extension.description.identifier, providerDescriptor.id));
                }
            }
        });
    }
};
ChatExtensionPointHandler = __decorate([
    __param(0, IChatAgentService),
    __param(1, ILogService)
], ChatExtensionPointHandler);
export { ChatExtensionPointHandler };
function getParticipantKey(extensionId, participantName) {
    return `${extensionId.value}_${participantName}`;
}
let ChatCompatibilityNotifier = class ChatCompatibilityNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatCompatNotifier'; }
    constructor(extensionsWorkbenchService, contextKeyService, productService) {
        super();
        this.productService = productService;
        this.registeredWelcomeView = false;
        // It may be better to have some generic UI for this, for any extension that is incompatible,
        // but this is only enabled for Copilot Chat now and it needs to be obvious.
        const isInvalid = ChatContextKeys.extensionInvalid.bindTo(contextKeyService);
        this._register(Event.runAndSubscribe(extensionsWorkbenchService.onDidChangeExtensionsNotification, () => {
            const notification = extensionsWorkbenchService.getExtensionsNotification();
            const chatExtension = notification?.extensions.find((ext) => ExtensionIdentifier.equals(ext.identifier.id, this.productService.defaultChatAgent?.chatExtensionId));
            if (chatExtension) {
                isInvalid.set(true);
                this.registerWelcomeView(chatExtension);
            }
            else {
                isInvalid.set(false);
            }
        }));
    }
    registerWelcomeView(chatExtension) {
        if (this.registeredWelcomeView) {
            return;
        }
        this.registeredWelcomeView = true;
        const showExtensionLabel = localize('showExtension', 'Show Extension');
        const mainMessage = localize('chatFailErrorMessage', 'Chat failed to load because the installed version of the Copilot Chat extension is not compatible with this version of {0}. Please ensure that the Copilot Chat extension is up to date.', this.productService.nameLong);
        const commandButton = `[${showExtensionLabel}](command:${showExtensionsWithIdsCommandId}?${encodeURIComponent(JSON.stringify([[this.productService.defaultChatAgent?.chatExtensionId]]))})`;
        const versionMessage = `Copilot Chat version: ${chatExtension.version}`;
        const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this._register(viewsRegistry.registerViewWelcomeContent(ChatViewId, {
            content: [mainMessage, commandButton, versionMessage].join('\n\n'),
            when: ChatContextKeys.extensionInvalid,
        }));
    }
};
ChatCompatibilityNotifier = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IContextKeyService),
    __param(2, IProductService)
], ChatCompatibilityNotifier);
export { ChatCompatibilityNotifier };
class ChatParticipantDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.chatParticipants;
    }
    render(manifest) {
        const nonDefaultContributions = manifest.contributes?.chatParticipants?.filter((c) => !c.isDefault) ?? [];
        if (!nonDefaultContributions.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('participantName', 'Name'),
            localize('participantFullName', 'Full Name'),
            localize('participantDescription', 'Description'),
            localize('participantCommands', 'Commands'),
        ];
        const rows = nonDefaultContributions.map((d) => {
            return [
                '@' + d.name,
                d.fullName,
                d.description ?? '-',
                d.commands?.length
                    ? new MarkdownString(d.commands.map((c) => `- /` + c.name).join('\n'))
                    : '-',
            ];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'chatParticipants',
    label: localize('chatParticipants', 'Chat Participants'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ChatParticipantDataRenderer),
});
// Void commented this out
// // TODO@roblourens remove after a few months
// export class MovedChatEditsViewPane extends ViewPane {
// 	override shouldShowWelcome(): boolean {
// 		return true;
// 	}
// }
// const editsViewId = 'workbench.panel.chat.view.edits';
// const baseEditsViewDescriptor: IViewDescriptor = {
// 	id: editsViewId,
// 	containerIcon: editsViewContainer.icon,
// 	containerTitle: editsViewContainer.title.value,
// 	singleViewPaneContainerTitle: editsViewContainer.title.value,
// 	name: editsViewContainer.title,
// 	canToggleVisibility: false,
// 	canMoveView: true,
// 	openCommandActionDescriptor: {
// 		id: CHAT_EDITING_SIDEBAR_PANEL_ID,
// 		title: editsViewContainer.title,
// 		mnemonicTitle: localize({ key: 'miToggleEdits', comment: ['&& denotes a mnemonic'] }, "Copilot Ed&&its"),
// 		keybindings: {
// 			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
// 			linux: {
// 				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | KeyCode.KeyI
// 			}
// 		},
// 		order: 2
// 	},
// 	ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.EditingSession }]),
// 	when: ContextKeyExpr.and(
// 		ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedChatView}`).negate(),
// 		ContextKeyExpr.or(
// 			ChatContextKeys.Setup.hidden.negate(),
// 			ChatContextKeys.Setup.installed,
// 			ChatContextKeys.editingParticipantRegistered
// 		)
// 	)
// };
// const ShowMovedChatEditsView = new RawContextKey<boolean>('showMovedChatEditsView', true, { type: 'boolean', description: localize('hideMovedChatEditsView', "True when the moved chat edits view should be hidden.") });
// class EditsViewContribution extends Disposable implements IWorkbenchContribution {
// 	static readonly ID = 'workbench.contrib.chatEditsView';
// 	private static readonly HideMovedEditsViewKey = 'chatEditsView.hideMovedEditsView';
// 	private readonly showWelcomeViewCtx: IContextKey<boolean>;
// 	constructor(
// 		@IConfigurationService private readonly configurationService: IConfigurationService,
// 		@IStorageService private readonly storageService: IStorageService,
// 		@IContextKeyService private readonly contextKeyService: IContextKeyService,
// 		@IChatService private readonly chatService: IChatService,
// 	) {
// 		super();
// 		this.showWelcomeViewCtx = ShowMovedChatEditsView.bindTo(this.contextKeyService);
// 		const unifiedViewEnabled = this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
// 		const movedEditsViewDescriptor = {
// 			...baseEditsViewDescriptor,
// 			ctorDescriptor: new SyncDescriptor(MovedChatEditsViewPane),
// 			when: ContextKeyExpr.and(
// 				ContextKeyExpr.has(`config.${ChatConfiguration.UnifiedChatView}`),
// 				ShowMovedChatEditsView,
// 				ContextKeyExpr.or(
// 					ChatContextKeys.Setup.hidden.negate(),
// 					ChatContextKeys.Setup.installed,
// 					ChatContextKeys.editingParticipantRegistered
// 				)
// 			)
// 		};
// 		const editsViewToRegister = unifiedViewEnabled ?
// 			movedEditsViewDescriptor : baseEditsViewDescriptor;
// 		if (unifiedViewEnabled) {
// 			this.init();
// 			this.updateContextKey();
// 			this.registerWelcomeView();
// 			this.registerCommands();
// 		}
// 		Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([editsViewToRegister], editsViewContainer);
// 	}
// 	private registerWelcomeView(): void {
// 		const welcomeViewMainMessage = localize('editsMovedMainMessage', "Copilot Edits has been moved to the [main Chat view](command:workbench.action.chat.open). You can switch between modes by using the dropdown in the Chat input box.");
// 		const okButton = `[${localize('ok', "Got it")}](command:_movedEditsView.ok)`;
// 		const welcomeViewFooterMessage = localize('editsMovedFooterMessage', "[Learn more](command:_movedEditsView.learnMore) about the Chat view.");
// 		const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
// 		this._register(viewsRegistry.registerViewWelcomeContent(editsViewId, {
// 			content: [welcomeViewMainMessage, okButton, welcomeViewFooterMessage].join('\n\n'),
// 			renderSecondaryButtons: true,
// 			when: ShowMovedChatEditsView
// 		}));
// 	}
// 	private markViewToHide(): void {
// 		this.storageService.store(EditsViewContribution.HideMovedEditsViewKey, true, StorageScope.APPLICATION, StorageTarget.USER);
// 		this.updateContextKey();
// 	}
// 	private init() {
// 		const hasChats = this.chatService.hasSessions();
// 		if (!hasChats) {
// 			// No chats from previous sessions, might be a new user, so hide the view.
// 			// Could also be a previous user who happened to first open a workspace with no chats.
// 			this.markViewToHide();
// 		}
// 	}
// 	private updateContextKey(): void {
// 		const hidden = this.storageService.getBoolean(EditsViewContribution.HideMovedEditsViewKey, StorageScope.APPLICATION, false);
// 		const hasChats = this.chatService.hasSessions();
// 		this.showWelcomeViewCtx.set(!hidden && hasChats);
// 	}
// 	private registerCommands(): void {
// 		this._register(CommandsRegistry.registerCommand({
// 			id: '_movedEditsView.ok',
// 			handler: async (accessor: ServicesAccessor) => {
// 				showChatView(accessor.get(IViewsService));
// 				this.markViewToHide();
// 			}
// 		}));
// 		this._register(CommandsRegistry.registerCommand({
// 			id: '_movedEditsView.learnMore',
// 			handler: async (accessor: ServicesAccessor) => {
// 				const openerService = accessor.get(IOpenerService);
// 				openerService.open(URI.parse('https://aka.ms/vscode-chat-modes'));
// 			}
// 		}));
// 	}
// }
// registerWorkbenchContribution2(EditsViewContribution.ID, EditsViewContribution, WorkbenchPhase.BlockRestore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UGFydGljaXBhbnQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsaUVBQWlFO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLHlFQUF5RTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELHdEQUF3RDtBQUN4RCxxRkFBcUY7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLHVGQUF1RjtBQUN2RixzR0FBc0c7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsaUZBQWlGO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsUUFBUSxF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