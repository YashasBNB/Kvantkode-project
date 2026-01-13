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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QWdlbnRIb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUNOLG1CQUFtQixFQUVuQixxQkFBcUIsRUFDckIsaUJBQWlCLEdBQ2pCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFFaEcsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FB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