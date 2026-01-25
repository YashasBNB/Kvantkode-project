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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0RW5hYmxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXRFbmFibGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRXBELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO2FBQ3hCLE9BQUUsR0FBRyxzQkFBc0IsQUFBekIsQ0FBeUI7SUFNbEMsWUFDb0IsZ0JBQW1DLEVBQ2xDLGlCQUFxQztRQUp6QyxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU05QyxJQUFJLENBQUMsZUFBZSxHQUFHLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtZQUM5RCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FDL0IsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUM1RCxDQUFBO1lBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMzQyxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQzs7QUF6QlcsbUJBQW1CO0lBUTdCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxrQkFBa0IsQ0FBQTtHQVRSLG1CQUFtQixDQTBCL0IifQ==