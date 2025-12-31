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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duRGVjb3JhdGlvbnNSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TWFya2Rvd25EZWNvcmF0aW9uc1JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQs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