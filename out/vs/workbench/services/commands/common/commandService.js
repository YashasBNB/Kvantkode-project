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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService, CommandsRegistry, } from '../../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { timeout } from '../../../../base/common/async.js';
let CommandService = class CommandService extends Disposable {
    constructor(_instantiationService, _extensionService, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._extensionHostIsReady = false;
        this._onWillExecuteCommand = this._register(new Emitter());
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this._onDidExecuteCommand = new Emitter();
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._extensionService
            .whenInstalledExtensionsRegistered()
            .then((value) => (this._extensionHostIsReady = value));
        this._starActivation = null;
    }
    _activateStar() {
        if (!this._starActivation) {
            // wait for * activation, limited to at most 30s
            this._starActivation = Promise.race([
                this._extensionService.activateByEvent(`*`),
                timeout(30000),
            ]);
        }
        return this._starActivation;
    }
    async executeCommand(id, ...args) {
        this._logService.trace('CommandService#executeCommand', id);
        const activationEvent = `onCommand:${id}`;
        const commandIsRegistered = !!CommandsRegistry.getCommand(id);
        if (commandIsRegistered) {
            // if the activation event has already resolved (i.e. subsequent call),
            // we will execute the registered command immediately
            if (this._extensionService.activationEventIsDone(activationEvent)) {
                return this._tryExecuteCommand(id, args);
            }
            // if the extension host didn't start yet, we will execute the registered
            // command immediately and send an activation event, but not wait for it
            if (!this._extensionHostIsReady) {
                this._extensionService.activateByEvent(activationEvent); // intentionally not awaited
                return this._tryExecuteCommand(id, args);
            }
            // we will wait for a simple activation event (e.g. in case an extension wants to overwrite it)
            await this._extensionService.activateByEvent(activationEvent);
            return this._tryExecuteCommand(id, args);
        }
        // finally, if the command is not registered we will send a simple activation event
        // as well as a * activation event raced against registration and against 30s
        await Promise.all([
            this._extensionService.activateByEvent(activationEvent),
            Promise.race([
                // race * activation against command registration
                this._activateStar(),
                Event.toPromise(Event.filter(CommandsRegistry.onDidRegisterCommand, (e) => e === id)),
            ]),
        ]);
        return this._tryExecuteCommand(id, args);
    }
    _tryExecuteCommand(id, args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction(command.handler, ...args);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
};
CommandService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, ILogService)
], CommandService);
export { CommandService };
registerSingleton(ICommandService, CommandService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29tbWFuZHMvY29tbW9uL2NvbW1hbmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixlQUFlLEVBRWYsZ0JBQWdCLEdBQ2hCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFjN0MsWUFDd0IscUJBQTZELEVBQ2pFLGlCQUFxRCxFQUMzRCxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQTtRQUppQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2hELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFkL0MsMEJBQXFCLEdBQVksS0FBSyxDQUFBO1FBRzdCLDBCQUFxQixHQUEyQixJQUFJLENBQUMsU0FBUyxDQUM5RSxJQUFJLE9BQU8sRUFBaUIsQ0FDNUIsQ0FBQTtRQUNlLHlCQUFvQixHQUF5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