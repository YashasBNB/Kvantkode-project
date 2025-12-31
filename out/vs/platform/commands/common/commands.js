/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { markAsSingleton, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { validateConstraints } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ICommandService = createDecorator('commandService');
export const CommandsRegistry = new (class {
    constructor() {
        this._commands = new Map();
        this._onDidRegisterCommand = new Emitter();
        this.onDidRegisterCommand = this._onDidRegisterCommand.event;
    }
    registerCommand(idOrCommand, handler) {
        if (!idOrCommand) {
            throw new Error(`invalid command`);
        }
        if (typeof idOrCommand === 'string') {
            if (!handler) {
                throw new Error(`invalid command`);
            }
            return this.registerCommand({ id: idOrCommand, handler });
        }
        // add argument validation if rich command metadata is provided
        if (idOrCommand.metadata && Array.isArray(idOrCommand.metadata.args)) {
            const constraints = [];
            for (const arg of idOrCommand.metadata.args) {
                constraints.push(arg.constraint);
            }
            const actualHandler = idOrCommand.handler;
            idOrCommand.handler = function (accessor, ...args) {
                validateConstraints(args, constraints);
                return actualHandler(accessor, ...args);
            };
        }
        // find a place to store the command
        const { id } = idOrCommand;
        let commands = this._commands.get(id);
        if (!commands) {
            commands = new LinkedList();
            this._commands.set(id, commands);
        }
        const removeFn = commands.unshift(idOrCommand);
        const ret = toDisposable(() => {
            removeFn();
            const command = this._commands.get(id);
            if (command?.isEmpty()) {
                this._commands.delete(id);
            }
        });
        // tell the world about this command
        this._onDidRegisterCommand.fire(id);
        return markAsSingleton(ret);
    }
    registerCommandAlias(oldId, newId) {
        return CommandsRegistry.registerCommand(oldId, (accessor, ...args) => accessor.get(ICommandService).executeCommand(newId, ...args));
    }
    getCommand(id) {
        const list = this._commands.get(id);
        if (!list || list.isEmpty()) {
            return undefined;
        }
        return Iterable.first(list);
    }
    getCommands() {
        const result = new Map();
        for (const key of this._commands.keys()) {
            const command = this.getCommand(key);
            if (command) {
                result.set(key, command);
            }
        }
        return result;
    }
})();
CommandsRegistry.registerCommand('noop', () => { });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb21tYW5kcy9jb21tb24vY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQWUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQWtCLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFbkYsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUvRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFrQixnQkFBZ0IsQ0FBQyxDQUFBO0FBc0RqRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBcUIsSUFBSSxDQUFDO0lBQUE7UUFDckMsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFnQyxDQUFBO1FBRW5ELDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFVLENBQUE7UUFDckQseUJBQW9CLEdBQWtCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7SUE0RWhGLENBQUM7SUExRUEsZUFBZSxDQUFDLFdBQThCLEVBQUUsT0FBeUI7UUFDeEUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2Qs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