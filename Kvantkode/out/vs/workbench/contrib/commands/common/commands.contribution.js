/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeStringify } from '../../../../base/common/objects.js';
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
/** Runs several commands passed to it as an argument */
class RunCommands extends Action2 {
    constructor() {
        super({
            id: 'runCommands',
            title: nls.localize2('runCommands', 'Run Commands'),
            f1: false,
            metadata: {
                description: nls.localize('runCommands.description', 'Run several commands'),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            required: ['commands'],
                            properties: {
                                commands: {
                                    type: 'array',
                                    description: nls.localize('runCommands.commands', 'Commands to run'),
                                    items: {
                                        anyOf: [
                                            {
                                                $ref: 'vscode://schemas/keybindings#/definitions/commandNames',
                                            },
                                            {
                                                type: 'string',
                                            },
                                            {
                                                type: 'object',
                                                required: ['command'],
                                                properties: {
                                                    command: {
                                                        anyOf: [
                                                            {
                                                                $ref: 'vscode://schemas/keybindings#/definitions/commandNames',
                                                            },
                                                            {
                                                                type: 'string',
                                                            },
                                                        ],
                                                    },
                                                },
                                                $ref: 'vscode://schemas/keybindings#/definitions/commandsSchemas',
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    // dev decisions:
    // - this command takes a single argument-object because
    //	- keybinding definitions don't allow running commands with several arguments
    //  - and we want to be able to take on different other arguments in future, e.g., `runMode : 'serial' | 'concurrent'`
    async run(accessor, args) {
        const notificationService = accessor.get(INotificationService);
        if (!this._isCommandArgs(args)) {
            notificationService.error(nls.localize('runCommands.invalidArgs', "'runCommands' has received an argument with incorrect type. Please, review the argument passed to the command."));
            return;
        }
        if (args.commands.length === 0) {
            notificationService.warn(nls.localize('runCommands.noCommandsToRun', "'runCommands' has not received commands to run. Did you forget to pass commands in the 'runCommands' argument?"));
            return;
        }
        const commandService = accessor.get(ICommandService);
        const logService = accessor.get(ILogService);
        let i = 0;
        try {
            for (; i < args.commands.length; ++i) {
                const cmd = args.commands[i];
                logService.debug(`runCommands: executing ${i}-th command: ${safeStringify(cmd)}`);
                await this._runCommand(commandService, cmd);
                logService.debug(`runCommands: executed ${i}-th command`);
            }
        }
        catch (err) {
            logService.debug(`runCommands: executing ${i}-th command resulted in an error: ${err instanceof Error ? err.message : safeStringify(err)}`);
            notificationService.error(err);
        }
    }
    _isCommandArgs(args) {
        if (!args || typeof args !== 'object') {
            return false;
        }
        if (!('commands' in args) || !Array.isArray(args.commands)) {
            return false;
        }
        for (const cmd of args.commands) {
            if (typeof cmd === 'string') {
                continue;
            }
            if (typeof cmd === 'object' && typeof cmd.command === 'string') {
                continue;
            }
            return false;
        }
        return true;
    }
    _runCommand(commandService, cmd) {
        let commandID, commandArgs;
        if (typeof cmd === 'string') {
            commandID = cmd;
        }
        else {
            commandID = cmd.command;
            commandArgs = cmd.args;
        }
        if (commandArgs === undefined) {
            return commandService.executeCommand(commandID);
        }
        else {
            if (Array.isArray(commandArgs)) {
                return commandService.executeCommand(commandID, ...commandArgs);
            }
            else {
                return commandService.executeCommand(commandID, commandArgs);
            }
        }
    }
}
registerAction2(RunCommands);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tYW5kcy9jb21tb24vY29tbWFuZHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQVEvRix3REFBd0Q7QUFDeEQsTUFBTSxXQUFZLFNBQVEsT0FBTztJQUNoQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxhQUFhO1lBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUM7WUFDbkQsRUFBRSxFQUFFLEtBQUs7WUFDVCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsc0JBQXNCLENBQUM7Z0JBQzVFLElBQUksRUFBRTtvQkFDTDt3QkFDQyxJQUFJLEVBQUUsTUFBTTt3QkFDWixNQUFNLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDOzRCQUN0QixVQUFVLEVBQUU7Z0NBQ1gsUUFBUSxFQUFFO29DQUNULElBQUksRUFBRSxPQUFPO29DQUNiLFdBQVcs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