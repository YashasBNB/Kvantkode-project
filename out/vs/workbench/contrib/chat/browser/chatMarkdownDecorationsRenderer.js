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
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { contentRefUrl } from '../common/annotations.js';
import { getFullyQualifiedId, IChatAgentNameService, IChatAgentService, } from '../common/chatAgents.js';
import { chatSlashCommandBackground, chatSlashCommandForeground } from '../common/chatColors.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestTextPart, ChatRequestToolPart, chatSubcommandLeader, } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from './chatAgentHover.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { InlineAnchorWidget } from './chatInlineAnchorWidget.js';
import './media/chatInlineAnchorWidget.css';
/** For rendering slash commands, variables */
const decorationRefUrl = `http://_vscodedecoration_`;
/** For rendering agent decorations with hover */
const agentRefUrl = `http://_chatagent_`;
/** For rendering agent decorations with hover */
const agentSlashRefUrl = `http://_chatslash_`;
export function agentToMarkdown(agent, isClickable, accessor) {
    const chatAgentNameService = accessor.get(IChatAgentNameService);
    const chatAgentService = accessor.get(IChatAgentService);
    const isAllowed = chatAgentNameService.getAgentNameRestriction(agent);
    let name = `${isAllowed ? agent.name : getFullyQualifiedId(agent)}`;
    const isDupe = isAllowed && chatAgentService.agentHasDupeName(agent.id);
    if (isDupe) {
        name += ` (${agent.publisherDisplayName})`;
    }
    const args = { agentId: agent.id, name, isClickable };
    return `[${agent.name}](${agentRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
}
export function agentSlashCommandToMarkdown(agent, command) {
    const text = `${chatSubcommandLeader}${command.name}`;
    const args = { agentId: agent.id, command: command.name };
    return `[${text}](${agentSlashRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
}
let ChatMarkdownDecorationsRenderer = class ChatMarkdownDecorationsRenderer {
    constructor(keybindingService, logService, chatAgentService, instantiationService, hoverService, chatService, chatWidgetService, commandService, labelService, toolsService, chatMarkdownAnchorService) {
        this.keybindingService = keybindingService;
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.instantiationService = instantiationService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.chatWidgetService = chatWidgetService;
        this.commandService = commandService;
        this.labelService = labelService;
        this.toolsService = toolsService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
    }
    convertParsedRequestToMarkdown(parsedRequest) {
        let result = '';
        for (const part of parsedRequest.parts) {
            if (part instanceof ChatRequestTextPart) {
                result += part.text;
            }
            else if (part instanceof ChatRequestAgentPart) {
                result += this.instantiationService.invokeFunction((accessor) => agentToMarkdown(part.agent, false, accessor));
            }
            else {
                result += this.genericDecorationToMarkdown(part);
            }
        }
        return result;
    }
    genericDecorationToMarkdown(part) {
        const uri = part instanceof ChatRequestDynamicVariablePart && part.data instanceof URI
            ? part.data
            : undefined;
        const title = uri
            ? this.labelService.getUriLabel(uri, { relative: true })
            : part instanceof ChatRequestSlashCommandPart
                ? part.slashCommand.detail
                : part instanceof ChatRequestAgentSubcommandPart
                    ? part.command.description
                    : part instanceof ChatRequestToolPart
                        ? this.toolsService.getTool(part.toolId)?.userDescription
                        : '';
        const args = { title };
        const text = part.text;
        return `[${text}](${decorationRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
    }
    walkTreeAndAnnotateReferenceLinks(content, element) {
        const store = new DisposableStore();
        element.querySelectorAll('a').forEach((a) => {
            const href = a.getAttribute('data-href');
            if (href) {
                if (href.startsWith(agentRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(agentRefUrl.length + 1)));
                    }
                    catch (e) {
                        this.logService.error('Invalid chat widget render data JSON', toErrorMessage(e));
                    }
                    if (args) {
                        a.parentElement.replaceChild(this.renderAgentWidget(args, store), a);
                    }
                }
                else if (href.startsWith(agentSlashRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(agentRefUrl.length + 1)));
                    }
                    catch (e) {
                        this.logService.error('Invalid chat slash command render data JSON', toErrorMessage(e));
                    }
                    if (args) {
                        a.parentElement.replaceChild(this.renderSlashCommandWidget(a.textContent, args, store), a);
                    }
                }
                else if (href.startsWith(decorationRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(decorationRefUrl.length + 1)));
                    }
                    catch (e) { }
                    a.parentElement.replaceChild(this.renderResourceWidget(a.textContent, args, store), a);
                }
                else if (href.startsWith(contentRefUrl)) {
                    this.renderFileWidget(content, href, a, store);
                }
                else if (href.startsWith('command:')) {
                    this.injectKeybindingHint(a, href, this.keybindingService);
                }
            }
        });
        return store;
    }
    renderAgentWidget(args, store) {
        const nameWithLeader = `${chatAgentLeader}${args.name}`;
        let container;
        if (args.isClickable) {
            container = dom.$('span.chat-agent-widget');
            const button = store.add(new Button(container, {
                buttonBackground: asCssVariable(chatSlashCommandBackground),
                buttonForeground: asCssVariable(chatSlashCommandForeground),
                buttonHoverBackground: undefined,
            }));
            button.label = nameWithLeader;
            store.add(button.onDidClick(() => {
                const agent = this.chatAgentService.getAgent(args.agentId);
                const widget = this.chatWidgetService.lastFocusedWidget;
                if (!widget || !agent) {
                    return;
                }
                this.chatService.sendRequest(widget.viewModel.sessionId, agent.metadata.sampleRequest ?? '', {
                    location: widget.location,
                    agentId: agent.id,
                    userSelectedModelId: widget.input.currentLanguageModel,
                    mode: widget.input.currentMode,
                });
            }));
        }
        else {
            container = this.renderResourceWidget(nameWithLeader, undefined, store);
        }
        const agent = this.chatAgentService.getAgent(args.agentId);
        const hover = new Lazy(() => store.add(this.instantiationService.createInstance(ChatAgentHover)));
        store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), container, () => {
            hover.value.setAgent(args.agentId);
            return hover.value.domNode;
        }, agent && getChatAgentHoverOptions(() => agent, this.commandService)));
        return container;
    }
    renderSlashCommandWidget(name, args, store) {
        const container = dom.$('span.chat-agent-widget.chat-command-widget');
        const agent = this.chatAgentService.getAgent(args.agentId);
        const button = store.add(new Button(container, {
            buttonBackground: asCssVariable(chatSlashCommandBackground),
            buttonForeground: asCssVariable(chatSlashCommandForeground),
            buttonHoverBackground: undefined,
        }));
        button.label = name;
        store.add(button.onDidClick(() => {
            const widget = this.chatWidgetService.lastFocusedWidget;
            if (!widget || !agent) {
                return;
            }
            const command = agent.slashCommands.find((c) => c.name === args.command);
            this.chatService.sendRequest(widget.viewModel.sessionId, command?.sampleRequest ?? '', {
                location: widget.location,
                agentId: agent.id,
                slashCommand: args.command,
                userSelectedModelId: widget.input.currentLanguageModel,
                mode: widget.input.currentMode,
            });
        }));
        return container;
    }
    renderFileWidget(content, href, a, store) {
        // TODO this can be a nicer FileLabel widget with an icon. Do a simple link for now.
        const fullUri = URI.parse(href);
        const data = content.inlineReferences?.[fullUri.path.slice(1)];
        if (!data) {
            this.logService.error('Invalid chat widget render data JSON');
            return;
        }
        const inlineAnchor = store.add(this.instantiationService.createInstance(InlineAnchorWidget, a, data));
        store.add(this.chatMarkdownAnchorService.register(inlineAnchor));
    }
    renderResourceWidget(name, args, store) {
        const container = dom.$('span.chat-resource-widget');
        const alias = dom.$('span', undefined, name);
        if (args?.title) {
            store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), container, args.title));
        }
        container.appendChild(alias);
        return container;
    }
    injectKeybindingHint(a, href, keybindingService) {
        const command = href.match(/command:([^\)]+)/)?.[1];
        if (command) {
            const kb = keybindingService.lookupKeybinding(command);
            if (kb) {
                const keybinding = kb.getLabel();
                if (keybinding) {
                    a.textContent = `${a.textContent} (${keybinding})`;
                }
            }
        }
    }
};
ChatMarkdownDecorationsRenderer = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILogService),
    __param(2, IChatAgentService),
    __param(3, IInstantiationService),
    __param(4, IHoverService),
    __param(5, IChatService),
    __param(6, IChatWidgetService),
    __param(7, ICommandService),
    __param(8, ILabelService),
    __param(9, ILanguageModelToolsService),
    __param(10, IChatMarkdownAnchorService)
], ChatMarkdownDecorationsRenderer);
export { ChatMarkdownDecorationsRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duRGVjb3JhdGlvbnNSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRNYXJrZG93bkRlY29yYXRpb25zUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtB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