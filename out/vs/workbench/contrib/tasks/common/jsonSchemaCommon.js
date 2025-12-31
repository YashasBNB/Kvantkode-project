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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYUNvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi9qc29uU2NoZW1hQ29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFHekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTdDLE1BQU0sTUFBTSxHQUFnQjtJQUMzQixXQUFXLEVBQUU7UUFDWixjQUFjLEVBQUU7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDO1NBQ25DO1FBQ0QsT0FBTyxFQUFFO1lBQ1IsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0QkFBNEIsQ0FBQztZQUM3RSxVQUFVLEVBQUU7Z0JBQ1gsR0FBRyxFQUFFO29CQUNKLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4Qix3QkFBd0IsRUFDeEIsb0hBQW9ILENBQ3BIO2lCQUNEO2dCQUNELEdBQUcsRUFBRTtvQkFDSixJQUFJLEVBQUUsUUFBUTtvQkFDZCxvQkFBb0IsRUFBRTt3QkFDckIsSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7b0JBQ0QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLHdCQUF3QixFQUN4Qix1R0FBdUcsQ0FDdkc7aUJBQ0Q7YUFDRDtZQUNELG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzthQUNuQztTQUNEO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsS0FBSyxF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