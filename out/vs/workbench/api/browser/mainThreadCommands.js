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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsZUFBZSxHQUNmLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFFTiw2QkFBNkIsR0FDN0IsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sY0FBYyxFQUNkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdqRCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFrQjtJQUs5QixZQUNDLGNBQStCLEVBQ2QsZUFBaUQsRUFDL0MsaUJBQXFEO1FBRHRDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM5QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBUHhELDBCQUFxQixHQUFHLElBQUksYUFBYSxFQUFVLENBQUE7UUFTbkUsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVyRSxJQUFJLENBQUMsMENBQTBDLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUNqRixnQ0FBZ0MsRUFDaEMsR0FB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