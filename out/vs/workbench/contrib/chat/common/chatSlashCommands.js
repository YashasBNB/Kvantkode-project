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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
export const IChatSlashCommandService = createDecorator('chatSlashCommandService');
let ChatSlashCommandService = class ChatSlashCommandService extends Disposable {
    constructor(_extensionService) {
        super();
        this._extensionService = _extensionService;
        this._commands = new Map();
        this._onDidChangeCommands = this._register(new Emitter());
        this.onDidChangeCommands = this._onDidChangeCommands.event;
    }
    dispose() {
        super.dispose();
        this._commands.clear();
    }
    registerSlashCommand(data, command) {
        if (this._commands.has(data.command)) {
            throw new Error(`Already registered a command with id ${data.command}}`);
        }
        this._commands.set(data.command, { data, command });
        this._onDidChangeCommands.fire();
        return toDisposable(() => {
            if (this._commands.delete(data.command)) {
                this._onDidChangeCommands.fire();
            }
        });
    }
    getCommands(location, mode) {
        return Array.from(this._commands.values(), (v) => v.data).filter((c) => c.locations.includes(location) && (!c.modes || c.modes.includes(mode)));
    }
    hasCommand(id) {
        return this._commands.has(id);
    }
    async executeCommand(id, prompt, progress, history, location, token) {
        const data = this._commands.get(id);
        if (!data) {
            throw new Error('No command with id ${id} NOT registered');
        }
        if (!data.command) {
            await this._extensionService.activateByEvent(`onSlash:${id}`);
        }
        if (!data.command) {
            throw new Error(`No command with id ${id} NOT resolved`);
        }
        return await data.command(prompt, progress, history, location, token);
    }
};
ChatSlashCommandService = __decorate([
    __param(0, IExtensionService)
], ChatSlashCommandService);
export { ChatSlashCommandService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNsYXNoQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0U2xhc2hDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFJNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUErQnJGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUE7QUF1QjlELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQVF0RCxZQUErQixpQkFBcUQ7UUFDbkYsS0FBSyxFQUFFLENBQUE7UUFEd0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUxuRSxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUE7UUFFcEMseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbEUsd0JBQW1CLEdBQWdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7SUFJM0UsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxJQUFvQixFQUFFLE9BQTJCO1FBQ3JFLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNuRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFaEMsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQTJCLEVBQUUsSUFBYztRQUN0RCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FDL0QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQzdFLENBQUE7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLEVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsRUFBVSxFQUNWLE1BQWMsRUFDZCxRQUFrQyxFQUNsQyxPQUF1QixFQUN2QixRQUEyQixFQUMzQixLQUF3QjtRQUV4QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUE7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3pELENBQUM7UUFFRCxPQUFPLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEUsQ0FBQztDQUNELENBQUE7QUEvRFksdUJBQXVCO0lBUXRCLFdBQUEsaUJBQWlCLENBQUE7R0FSbEIsdUJBQXVCLENBK0RuQyJ9