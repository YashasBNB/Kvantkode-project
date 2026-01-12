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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50Q29tbWFuZENvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0QWdlbnRDb21tYW5kQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUl0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFMUQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBRzFELFlBQ0MsR0FBc0IsRUFDdEIsT0FBbUIsRUFDSixhQUE2QztRQUU1RCxLQUFLLEVBQUUsQ0FBQTtRQUZ5QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUxwRCxZQUFPLEdBQWdCLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7UUFRN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFM0MsTUFBTSxPQUFPLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFFOUIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNyQyxXQUFXLENBQUMsU0FBUyxHQUFHLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7UUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FDbkMsV0FBVyxFQUNYLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQy9ELEVBQUUsT0FBTyxFQUFFLENBQ1gsQ0FDRCxDQUFBO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkYsTUFBTSxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzFELEdBQUcsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUNuQyxHQUFHLENBQUMsT0FBTyxFQUNYLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDckQsRUFBRSxPQUFPLEVBQUUsQ0FDWCxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUNiLEtBQTJCLEVBQzNCLGdCQUF3QyxFQUN4QyxPQUFxQjtRQUVyQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCxDQUFBO0FBL0NZLDJCQUEyQjtJQU1yQyxXQUFBLGFBQWEsQ0FBQTtHQU5ILDJCQUEyQixDQStDdkMifQ==