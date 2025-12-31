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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEZvbGxvd3Vwcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Rm9sbG93dXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBaUIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUlqRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRVIsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBdUMsU0FBUSxVQUFVO0lBQ3JFLFlBQ0MsU0FBc0IsRUFDdEIsU0FBYyxFQUNHLFFBQTJCLEVBQzNCLE9BQWtDLEVBQ2xDLFlBQW1DLEVBQ2hCLGdCQUFtQztRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUxVLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQzNCLFlBQU8sR0FBUCxPQUFPLENBQTJCO1FBQ2xDLGlCQUFZLEdBQVosWUFBWSxDQUF1QjtRQUNoQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBSXZFLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUVPLGNBQWMsQ0FBQyxTQUFzQixFQUFFLFFBQVc7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0QsMkZBQTJGO1lBQzNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsSUFBSSxDQUFDLFFBQVEsRUFDYixFQUFFLEVBQ0YsUUFBUSxDQUFDLE9BQU8sRUFDaEIsUUFBUSxDQUFDLFVBQVUsQ0FDbkIsQ0FBQTtRQUNELElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQ2QsUUFBUSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUNoRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUM3RSxNQUFNLE9BQU8sR0FBRyxDQUNmLGFBQWEsR0FBRyxDQUFDLENBQUMsU0FBUyxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLENBQ3hFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDUixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUMzRCxDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDOUYsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU1QyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztDQUNELENBQUE7QUFqRFksYUFBYTtJQU92QixXQUFBLGlCQUFpQixDQUFBO0dBUFAsYUFBYSxDQWlEekIifQ==