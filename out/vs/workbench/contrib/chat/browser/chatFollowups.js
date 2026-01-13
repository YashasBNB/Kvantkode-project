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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { formatChatQuestion } from '../common/chatParserTypes.js';
const $ = dom.$;
let ChatFollowups = class ChatFollowups extends Disposable {
    constructor(container, followups, location, options, clickHandler, chatAgentService) {
        super();
        this.location = location;
        this.options = options;
        this.clickHandler = clickHandler;
        this.chatAgentService = chatAgentService;
        const followupsContainer = dom.append(container, $('.interactive-session-followups'));
        followups.forEach((followup) => this.renderFollowup(followupsContainer, followup));
    }
    renderFollowup(container, followup) {
        if (!this.chatAgentService.getDefaultAgent(this.location)) {
            // No default agent yet, which affects how followups are rendered, so can't render this yet
            return;
        }
        const tooltipPrefix = formatChatQuestion(this.chatAgentService, this.location, '', followup.agentId, followup.subCommand);
        if (tooltipPrefix === undefined) {
            return;
        }
        const baseTitle = followup.kind === 'reply' ? followup.title || followup.message : followup.title;
        const message = followup.kind === 'reply' ? followup.message : followup.title;
        const tooltip = (tooltipPrefix + (('tooltip' in followup && followup.tooltip) || message)).trim();
        const button = this._register(new Button(container, { ...this.options, title: tooltip }));
        if (followup.kind === 'reply') {
            button.element.classList.add('interactive-followup-reply');
        }
        else if (followup.kind === 'command') {
            button.element.classList.add('interactive-followup-command');
        }
        button.element.ariaLabel = localize('followUpAriaLabel', 'Follow up question: {0}', baseTitle);
        button.label = new MarkdownString(baseTitle);
        this._register(button.onDidClick(() => this.clickHandler(followup)));
    }
};
ChatFollowups = __decorate([
    __param(5, IChatAgentService)
], ChatFollowups);
export { ChatFollowups };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZvbGxvd3Vwcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRGb2xsb3d1cHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFpQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBSWpFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFUixJQUFNLGFBQWEsR0FBbkIsTUFBTSxhQUF1QyxTQUFRLFVBQVU7SUFDckUsWUFDQyxTQUFzQixFQUN0QixTQUFjLEVBQ0csUUFBMkIsRUFDM0IsT0FBa0MsRUFDbEMsWUFBbUMsRUFDaEIsZ0JBQW1DO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBTFUsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7UUFDbEMsaUJBQVksR0FBWixZQUFZLENBQXVCO1FBQ2hCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFJdkUsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsZ0NBQWdDLENB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