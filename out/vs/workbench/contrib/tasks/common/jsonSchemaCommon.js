/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Schemas } from './problemMatcher.js';
const schema = {
    definitions: {
        showOutputType: {
            type: 'string',
            enum: ['always', 'silent', 'never'],
        },
        options: {
            type: 'object',
            description: nls.localize('JsonSchema.options', 'Additional command options'),
            properties: {
                cwd: {
                    type: 'string',
                    description: nls.localize('JsonSchema.options.cwd', "The current working directory of the executed program or script. If omitted Code's current workspace root is used."),
                },
                env: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string',
                    },
                    description: nls.localize('JsonSchema.options.env', "The environment of the executed program or shell. If omitted the parent process' environment is used."),
                },
            },
            additionalProperties: {
                type: ['string', 'array', 'object'],
            },
        },
        problemMatcherType: {
            oneOf: [
                {
                    type: 'string',
                    errorMessage: nls.localize('JsonSchema.tasks.matcherError', 'Unrecognized problem matcher. Is the extension that contributes this problem matcher installed?'),
                },
                Schemas.LegacyProblemMatcher,
                {
                    type: 'array',
                    items: {
                        anyOf: [
                            {
                                type: 'string',
                                errorMessage: nls.localize('JsonSchema.tasks.matcherError', 'Unrecognized problem matcher. Is the extension that contributes this problem matcher installed?'),
                            },
                            Schemas.LegacyProblemMatcher,
                        ],
                    },
                },
            ],
        },
        shellConfiguration: {
            type: 'object',
            additionalProperties: false,
            description: nls.localize('JsonSchema.shellConfiguration', 'Configures the shell to be used.'),
            properties: {
                executable: {
                    type: 'string',
                    description: nls.localize('JsonSchema.shell.executable', 'The shell to be used.'),
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.shell.args', 'The shell arguments.'),
                    items: {
                        type: 'string',
                    },
                },
            },
        },
        commandConfiguration: {
            type: 'object',
            additionalProperties: false,
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.'),
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.'),
                    items: {
                        type: 'string',
                    },
                },
                options: {
                    $ref: '#/definitions/options',
                },
            },
        },
        taskDescription: {
            type: 'object',
            required: ['taskName'],
            additionalProperties: false,
            properties: {
                taskName: {
                    type: 'string',
                    description: nls.localize('JsonSchema.tasks.taskName', "The task's name"),
                },
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.'),
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.'),
                    items: {
                        type: 'string',
                    },
                },
                options: {
                    $ref: '#/definitions/options',
                },
                windows: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.windows', 'Windows specific command configuration'),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
                                },
                            },
                        },
                    ],
                },
                osx: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.mac', 'Mac specific command configuration'),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
                                },
                            },
                        },
                    ],
                },
                linux: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize('JsonSchema.tasks.linux', 'Linux specific command configuration'),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
                                },
                            },
                        },
                    ],
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.suppressTaskName', 'Controls whether the task name is added as an argument to the command. If omitted the globally defined value is used.'),
                    default: true,
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize('JsonSchema.tasks.showOutput', 'Controls whether the output of the running task is shown or not. If omitted the globally defined value is used.'),
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.echoCommand', 'Controls whether the executed command is echoed to the output. Default is false.'),
                    default: true,
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize('JsonSchema.tasks.watching.deprecation', 'Deprecated. Use isBackground instead.'),
                    description: nls.localize('JsonSchema.tasks.watching', 'Whether the executed task is kept alive and is watching the file system.'),
                    default: true,
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.background', 'Whether the executed task is kept alive and is running in the background.'),
                    default: true,
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.promptOnClose', 'Whether the user is prompted when VS Code closes with a running task.'),
                    default: false,
                },
                isBuildCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.build', "Maps this task to Code's default build command."),
                    default: true,
                },
                isTestCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.tasks.test', "Maps this task to Code's default test command."),
                    default: true,
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
                },
            },
        },
        taskRunnerConfiguration: {
            type: 'object',
            required: [],
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.'),
                },
                args: {
                    type: 'array',
                    description: nls.localize('JsonSchema.args', 'Additional arguments passed to the command.'),
                    items: {
                        type: 'string',
                    },
                },
                options: {
                    $ref: '#/definitions/options',
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize('JsonSchema.showOutput', "Controls whether the output of the running task is shown or not. If omitted 'always' is used."),
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize('JsonSchema.watching.deprecation', 'Deprecated. Use isBackground instead.'),
                    description: nls.localize('JsonSchema.watching', 'Whether the executed task is kept alive and is watching the file system.'),
                    default: true,
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.background', 'Whether the executed task is kept alive and is running in the background.'),
                    default: true,
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.promptOnClose', 'Whether the user is prompted when VS Code closes with a running background task.'),
                    default: false,
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.echoCommand', 'Controls whether the executed command is echoed to the output. Default is false.'),
                    default: true,
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize('JsonSchema.suppressTaskName', 'Controls whether the task name is added as an argument to the command. Default is false.'),
                    default: true,
                },
                taskSelector: {
                    type: 'string',
                    description: nls.localize('JsonSchema.taskSelector', 'Prefix to indicate that an argument is task.'),
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize('JsonSchema.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
                },
                tasks: {
                    type: 'array',
                    description: nls.localize('JsonSchema.tasks', 'The task configurations. Usually these are enrichments of task already defined in the external task runner.'),
                    items: {
                        type: 'object',
                        $ref: '#/definitions/taskDescription',
                    },
                },
            },
        },
    },
};
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYUNvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL2pzb25TY2hlbWFDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFN0MsTUFBTSxNQUFNLEdBQWdCO0lBQzNCLFdBQVcsRUFBRTtRQUNaLGNBQWMsRUFBRTtZQUNmLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUM7U0FDbkM7UUFDRCxPQUFPLEVBQUU7WUFDUixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDRCQUE0QixDQUFDO1lBQzdFLFVBQVUsRUFBRTtnQkFDWCxHQUFHLEVBQUU7b0JBQ0osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdCQUF3QixFQUN4QixvSEFBb0gsQ0FDcEg7aUJBQ0Q7Z0JBQ0QsR0FBRyxFQUFFO29CQUNKLElBQUksRUFBRSxRQUFRO29CQUNkLG9CQUFvQixFQUFFO3dCQUNyQixJQUFJLEVBQUUsUUFBUTtxQkFDZDtvQkFDRCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsd0JBQXdCLEVBQ3hCLHVHQUF1RyxDQUN2RztpQkFDRDthQUNEO1lBQ0Qsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDO2FBQ25DO1NBQ0Q7UUFDRCxrQkFBa0IsRUFBRTtZQUNuQixL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