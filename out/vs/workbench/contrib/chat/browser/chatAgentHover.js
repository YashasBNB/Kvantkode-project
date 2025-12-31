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
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { getFullyQualifiedId, IChatAgentNameService, IChatAgentService, } from '../common/chatAgents.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { verifiedPublisherIcon } from '../../../services/extensionManagement/common/extensionsIcons.js';
let ChatAgentHover = class ChatAgentHover extends Disposable {
    constructor(chatAgentService, extensionService, chatAgentNameService) {
        super();
        this.chatAgentService = chatAgentService;
        this.extensionService = extensionService;
        this.chatAgentNameService = chatAgentNameService;
        this._onDidChangeContents = this._register(new Emitter());
        this.onDidChangeContents = this._onDidChangeContents.event;
        const hoverElement = dom.h('.chat-agent-hover@root', [
            dom.h('.chat-agent-hover-header', [
                dom.h('.chat-agent-hover-icon@icon'),
                dom.h('.chat-agent-hover-details', [
                    dom.h('.chat-agent-hover-name@name'),
                    dom.h('.chat-agent-hover-extension', [
                        dom.h('.chat-agent-hover-extension-name@extensionName'),
                        dom.h('.chat-agent-hover-separator@separator'),
                        dom.h('.chat-agent-hover-publisher@publisher'),
                    ]),
                ]),
            ]),
            dom.h('.chat-agent-hover-warning@warning'),
            dom.h('span.chat-agent-hover-description@description'),
        ]);
        this.domNode = hoverElement.root;
        this.icon = hoverElement.icon;
        this.name = hoverElement.name;
        this.extensionName = hoverElement.extensionName;
        this.description = hoverElement.description;
        hoverElement.separator.textContent = '|';
        const verifiedBadge = dom.$('span.extension-verified-publisher', undefined, renderIcon(verifiedPublisherIcon));
        this.publisherName = dom.$('span.chat-agent-hover-publisher-name');
        dom.append(hoverElement.publisher, verifiedBadge, this.publisherName);
        hoverElement.warning.appendChild(renderIcon(Codicon.warning));
        hoverElement.warning.appendChild(dom.$('span', undefined, localize('reservedName', 'This chat extension is using a reserved name.')));
    }
    setAgent(id) {
        const agent = this.chatAgentService.getAgent(id);
        if (agent.metadata.icon instanceof URI) {
            const avatarIcon = dom.$('img.icon');
            avatarIcon.src = FileAccess.uriToBrowserUri(agent.metadata.icon).toString(true);
            this.icon.replaceChildren(dom.$('.avatar', undefined, avatarIcon));
        }
        else if (agent.metadata.themeIcon) {
            const avatarIcon = dom.$(ThemeIcon.asCSSSelector(agent.metadata.themeIcon));
            this.icon.replaceChildren(dom.$('.avatar.codicon-avatar', undefined, avatarIcon));
        }
        this.domNode.classList.toggle('noExtensionName', !!agent.isDynamic);
        const isAllowed = this.chatAgentNameService.getAgentNameRestriction(agent);
        this.name.textContent = isAllowed ? `@${agent.name}` : getFullyQualifiedId(agent);
        this.extensionName.textContent = agent.extensionDisplayName;
        this.publisherName.textContent = agent.publisherDisplayName ?? agent.extensionPublisherId;
        let description = agent.description ?? '';
        if (description) {
            if (!description.match(/[\.\?\!] *$/)) {
                description += '.';
            }
        }
        this.description.textContent = description;
        this.domNode.classList.toggle('allowedName', isAllowed);
        this.domNode.classList.toggle('verifiedPublisher', false);
        if (!agent.isDynamic) {
            const cancel = this._register(new CancellationTokenSource());
            this.extensionService
                .getExtensions([{ id: agent.extensionId.value }], cancel.token)
                .then((extensions) => {
                cancel.dispose();
                const extension = extensions[0];
                if (extension?.publisherDomain?.verified) {
                    this.domNode.classList.toggle('verifiedPublisher', true);
                    this._onDidChangeContents.fire();
                }
            });
        }
    }
};
ChatAgentHover = __decorate([
    __param(0, IChatAgentService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IChatAgentNameService)
], ChatAgentHover);
export { ChatAgentHover };
export function getChatAgentHoverOptions(getAgent, commandService) {
    return {
        actions: [
            {
                commandId: showExtensionsWithIdsCommandId,
                label: localize('viewExtensionLabel', 'View Extension'),
                run: () => {
                    const agent = getAgent();
                    if (agent) {
                        commandService.executeCommand(showExtensionsWithIdsCommandId, [agent.extensionId.value]);
                    }
                },
            },
        ],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEFnZW50SG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFDTixtQkFBbUIsRUFFbkIscUJBQXFCLEVBQ3JCLGlCQUFpQixHQUNqQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRWhHLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBWTdDLFlBQ29C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