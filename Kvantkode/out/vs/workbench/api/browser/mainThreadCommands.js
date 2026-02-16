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
import { DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { CommandsRegistry, ICommandService, } from '../../../platform/commands/common/commands.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers, } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { isString } from '../../../base/common/types.js';
let MainThreadCommands = class MainThreadCommands {
    constructor(extHostContext, _commandService, _extensionService) {
        this._commandService = _commandService;
        this._extensionService = _extensionService;
        this._commandRegistrations = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCommands);
        this._generateCommandsDocumentationRegistration = CommandsRegistry.registerCommand('_generateCommandsDocumentation', () => this._generateCommandsDocumentation());
    }
    dispose() {
        this._commandRegistrations.dispose();
        this._generateCommandsDocumentationRegistration.dispose();
    }
    async _generateCommandsDocumentation() {
        const result = await this._proxy.$getContributedCommandMetadata();
        // add local commands
        const commands = CommandsRegistry.getCommands();
        for (const [id, command] of commands) {
            if (command.metadata) {
                result[id] = command.metadata;
            }
        }
        // print all as markdown
        const all = [];
        for (const id in result) {
            all.push('`' + id + '` - ' + _generateMarkdown(result[id]));
        }
        console.log(all.join('\n'));
    }
    $registerCommand(id) {
        this._commandRegistrations.set(id, CommandsRegistry.registerCommand(id, (accessor, ...args) => {
            return this._proxy.$executeContributedCommand(id, ...args).then((result) => {
                return revive(result);
            });
        }));
    }
    $unregisterCommand(id) {
        this._commandRegistrations.deleteAndDispose(id);
    }
    $fireCommandActivationEvent(id) {
        const activationEvent = `onCommand:${id}`;
        if (!this._extensionService.activationEventIsDone(activationEvent)) {
            // this is NOT awaited because we only use it as drive-by-activation
            // for commands that are already known inside the extension host
            this._extensionService.activateByEvent(activationEvent);
        }
    }
    async $executeCommand(id, args, retry) {
        if (args instanceof SerializableObjectWithBuffers) {
            args = args.value;
        }
        for (let i = 0; i < args.length; i++) {
            args[i] = revive(args[i]);
        }
        if (retry && args.length > 0 && !CommandsRegistry.getCommand(id)) {
            await this._extensionService.activateByEvent(`onCommand:${id}`);
            throw new Error('$executeCommand:retry');
        }
        return this._commandService.executeCommand(id, ...args);
    }
    $getCommands() {
        return Promise.resolve([...CommandsRegistry.getCommands().keys()]);
    }
};
MainThreadCommands = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCommands),
    __param(1, ICommandService),
    __param(2, IExtensionService)
], MainThreadCommands);
export { MainThreadCommands };
// --- command doc
function _generateMarkdown(description) {
    if (typeof description === 'string') {
        return description;
    }
    else {
        const descriptionString = isString(description.description)
            ? description.description
            : // Our docs website is in English, so keep the original here.
                description.description.original;
        const parts = [descriptionString];
        parts.push('\n\n');
        if (description.args) {
            for (const arg of description.args) {
                parts.push(`* _${arg.name}_ - ${arg.description || ''}\n`);
            }
        }
        if (description.returns) {
            parts.push(`* _(returns)_ - ${description.returns}`);
        }
        parts.push('\n\n');
        return parts.join('');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixlQUFlLEdBQ2YsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUVOLDZCQUE2QixHQUM3QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR2pELElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBSzlCLFlBQ0MsY0FBK0IsRUFDZCxlQUFpRCxFQUMvQyxpQkFBcUQ7UUFEdEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzlCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFQeEQsMEJBQXFCLEdBQUcsSUFBSSxhQUFhLEVBQVUsQ0FBQTtRQVNuRSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXJFLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFl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