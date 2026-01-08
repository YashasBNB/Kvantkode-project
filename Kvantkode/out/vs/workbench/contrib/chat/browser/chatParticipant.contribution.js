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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRQYXJ0aWNpcGFudC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxpRUFBaUU7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUseUVBQXlFO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0Qsd0RBQXdEO0FBQ3hELHFGQUFxRjtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsdUZBQXVGO0FBQ3ZGLHNHQUFzRztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxpRkFBaUY7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxR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