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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWFuZHMvY29tbW9uL2NvbW1hbmRzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFRL0Ysd0RBQXdEO0FBQ3hELE1BQU0sV0FBWSxTQUFRLE9BQU87SUFDaEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsYUFBYTtZQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDO1lBQ25ELEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLHNCQUFzQixDQUFDO2dCQUM1RSxJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsSUFBSSxFQUFFLE1BQU07d0JBQ1osTUFBTSxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQzs0QkFDdEIsVUFBVSxFQUFFO2dDQUNYLFFBQVEsRUFBRTtvQ0FDVCxJQUFJLEVBQUUsT0FBTztvQ0FDYixXQUFXLEVBQUUs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