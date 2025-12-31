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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { chatSubcommandLeader } from '../../common/chatParserTypes.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize } from '../../../../../nls.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
let ChatAgentCommandContentPart = class ChatAgentCommandContentPart extends Disposable {
    constructor(cmd, onClick, _hoverService) {
        super();
        this._hoverService = _hoverService;
        this.domNode = document.createElement('span');
        this.domNode.classList.add('chat-agent-command');
        this.domNode.setAttribute('aria-label', cmd.name);
        this.domNode.setAttribute('role', 'button');
        const groupId = generateUuid();
        const commandSpan = document.createElement('span');
        this.domNode.appendChild(commandSpan);
        commandSpan.innerText = chatSubcommandLeader + cmd.name;
        this._store.add(this._hoverService.setupDelayedHover(commandSpan, { content: cmd.description, appearance: { showPointer: true } }, { groupId }));
        const rerun = localize('rerun', 'Rerun without {0}{1}', chatSubcommandLeader, cmd.name);
        const btn = new Button(this.domNode, { ariaLabel: rerun });
        btn.icon = Codicon.close;
        this._store.add(btn.onDidClick(() => onClick()));
        this._store.add(btn);
        this._store.add(this._hoverService.setupDelayedHover(btn.element, { content: rerun, appearance: { showPointer: true } }, { groupId }));
    }
    hasSameContent(other, followingContent, element) {
        return false;
    }
};
ChatAgentCommandContentPart = __decorate([
    __param(2, IHoverService)
], ChatAgentCommandContentPart);
export { ChatAgentCommandContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50Q29tbWFuZENvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdEFnZW50Q29tbWFuZENvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFJdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTFELElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUcxRCxZQUNDLEdBQXNCLEVBQ3RCLE9BQW1CLEVBQ0osYUFBNkM7UUFFNUQsS0FBSyxFQUFFLENBQUE7UUFGeUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFMcEQsWUFBTyxHQUFnQixRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBUTdELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTNDLE1BQU0sT0FBTyxHQUFHLFlBQVksRUFBRSxDQUFBO1FBRTlCLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDckMsV0FBVyxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFBO1FBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLElBQUksQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQ25DLFdBQVcsRUFDWCxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUMvRCxFQUFFLE9BQU8sRUFBRSxDQUNYLENBQ0QsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sR0FBRyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxHQUFHLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FDbkMsR0FBRyxDQUFDLE9BQU8sRUFDWCxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQ3JELEVBQUUsT0FBTyxFQUFFLENBQ1gsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FDYixLQUEyQixFQUMzQixnQkFBd0MsRUFDeEMsT0FBcUI7UUFFckIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQS9DWSwyQkFBMkI7SUFNckMsV0FBQSxhQUFhLENBQUE7R0FOSCwyQkFBMkIsQ0ErQ3ZDIn0=