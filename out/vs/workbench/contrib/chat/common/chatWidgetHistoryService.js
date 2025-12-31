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
import { Emitter } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { CHAT_PROVIDER_ID } from './chatParticipantContribTypes.js';
import { ChatAgentLocation } from './constants.js';
export const IChatWidgetHistoryService = createDecorator('IChatWidgetHistoryService');
export const ChatInputHistoryMaxEntries = 40;
let ChatWidgetHistoryService = class ChatWidgetHistoryService {
    constructor(storageService) {
        this._onDidClearHistory = new Emitter();
        this.onDidClearHistory = this._onDidClearHistory.event;
        this.memento = new Memento('interactive-session', storageService);
        const loadedState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        for (const provider in loadedState.history) {
            // Migration from old format
            loadedState.history[provider] = loadedState.history[provider].map((entry) => typeof entry === 'string' ? { text: entry } : entry);
        }
        this.viewState = loadedState;
    }
    getHistory(location) {
        const key = this.getKey(location);
        return this.viewState.history?.[key] ?? [];
    }
    getKey(location) {
        // Preserve history for panel by continuing to use the same old provider id. Use the location as a key for other chat locations.
        return location === ChatAgentLocation.Panel ? CHAT_PROVIDER_ID : location;
    }
    saveHistory(location, history) {
        if (!this.viewState.history) {
            this.viewState.history = {};
        }
        const key = this.getKey(location);
        this.viewState.history[key] = history.slice(-ChatInputHistoryMaxEntries);
        this.memento.saveMemento();
    }
    clearHistory() {
        this.viewState.history = {};
        this.memento.saveMemento();
        this._onDidClearHistory.fire();
    }
};
ChatWidgetHistoryService = __decorate([
    __param(0, IStorageService)
], ChatWidgetHistoryService);
export { ChatWidgetHistoryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldEhpc3RvcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFdpZGdldEhpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUdwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQVksTUFBTSxnQkFBZ0IsQ0FBQTtBQWU1RCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDJCQUEyQixDQUMzQixDQUFBO0FBZUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsRUFBRSxDQUFBO0FBRXJDLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCO0lBU3BDLFlBQTZCLGNBQStCO1FBSDNDLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDaEQsc0JBQWlCLEdBQWdCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUE7UUFHdEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsK0RBRzFCLENBQUE7UUFDakIsS0FBSyxNQUFNLFFBQVEsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUMsNEJBQTRCO1lBQzVCLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUMzRSxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ25ELENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUE7SUFDN0IsQ0FBQztJQUVELFVBQVUsQ0FBQyxRQUEyQjtRQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDM0MsQ0FBQztJQUVPLE1BQU0sQ0FBQyxRQUEyQjtRQUN6QyxnSUFBZ0k7UUFDaEksT0FBTyxRQUFRLEtBQUssaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO0lBQzFFLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBMkIsRUFBRSxPQUE0QjtRQUNwRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzFCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0NBQ0QsQ0FBQTtBQWxEWSx3QkFBd0I7SUFTdkIsV0FBQSxlQUFlLENBQUE7R0FUaEIsd0JBQXdCLENBa0RwQyJ9