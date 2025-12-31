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
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { TerminalChatContextKeys } from './terminalChat.js';
let TerminalChatEnabler = class TerminalChatEnabler {
    static { this.Id = 'terminalChat.enabler'; }
    constructor(chatAgentService, contextKeyService) {
        this._store = new DisposableStore();
        this._ctxHasProvider = TerminalChatContextKeys.hasChatAgent.bindTo(contextKeyService);
        this._store.add(Event.runAndSubscribe(chatAgentService.onDidChangeAgents, () => {
            const hasTerminalAgent = Boolean(chatAgentService.getDefaultAgent(ChatAgentLocation.Terminal));
            this._ctxHasProvider.set(hasTerminalAgent);
        }));
    }
    dispose() {
        this._ctxHasProvider.reset();
        this._store.dispose();
    }
};
TerminalChatEnabler = __decorate([
    __param(0, IChatAgentService),
    __param(1, IContextKeyService)
], TerminalChatEnabler);
export { TerminalChatEnabler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0RW5hYmxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0RW5hYmxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUVwRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjthQUN4QixPQUFFLEdBQUcsc0JBQXNCLEFBQXpCLENBQXlCO0lBTWxDLFlBQ29CLGdCQUFtQyxFQUNsQyxpQkFBcUM7UUFKekMsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFNOUMsSUFBSSxDQUFDLGVBQWUsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDckYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2QsS0FBSyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQy9CLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FDNUQsQ0FBQTtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDM0MsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7O0FBekJXLG1CQUFtQjtJQVE3QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsa0JBQWtCLENBQUE7R0FUUixtQkFBbUIsQ0EwQi9CIn0=