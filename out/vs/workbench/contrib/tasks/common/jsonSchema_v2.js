/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import commonSchema from './jsonSchemaCommon.js';
import { ProblemMatcherRegistry } from './problemMatcher.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { getAllCodicons } from '../../../../base/common/codicons.js';
function fixReferences(literal) {
    if (Array.isArray(literal)) {
        literal.forEach(fixReferences);
    }
    else if (typeof literal === 'object') {
        if (literal['$ref']) {
            literal['$ref'] = literal['$ref'] + '2';
        }
        Object.getOwnPropertyNames(literal).forEach((property) => {
            const value = literal[property];
            if (Array.isArray(value) || typeof value === 'object') {
                fixReferences(value);
            }
        });
    }
}
const shellCommand = {
    anyOf: [
        {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.shell', 'Specifies whether the command is a shell command or an external program. Defaults to false if omitted.'),
        },
        {
            $ref: '#/definitions/shellConfiguration',
        },
    ],
    deprecationMessage: nls.localize('JsonSchema.tasks.isShellCommand.deprecated', 'The property isShellCommand is deprecated. Use the type property of the task and the shell property in the options instead. See also the 1.14 release notes.'),
};
const hide = {
    type: 'boolean',
    description: nls.localize('JsonSchema.hide', 'Hide this task from the run task quick pick'),
    default: true,
};
const taskIdentifier = {
    type: 'object',
    additionalProperties: true,
    properties: {
        type: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.identifier', 'The task identifier.'),
        },
    },
};
const dependsOn = {
    anyOf: [
        {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.dependsOn.string', 'Another task this task depends on.'),
        },
        taskIdentifier,
        {
            type: 'array',
            description: nls.localize('JsonSchema.tasks.dependsOn.array', 'The other tasks this task depends on.'),
            items: {
                anyOf: [
                    {
                        type: 'string',
                    },
                    taskIdentifier,
                ],
            },
        },
    ],
    description: nls.localize('JsonSchema.tasks.dependsOn', 'Either a string representing another task or an array of other tasks that this task depends on.'),
};
const dependsOrder = {
    type: 'string',
    enum: ['parallel', 'sequence'],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.dependsOrder.parallel', 'Run all dependsOn tasks in parallel.'),
        nls.localize('JsonSchema.tasks.dependsOrder.sequence', 'Run all dependsOn tasks in sequence.'),
    ],
    default: 'parallel',
    description: nls.localize('JsonSchema.tasks.dependsOrder', 'Determines the order of the dependsOn tasks for this task. Note that this property is not recursive.'),
};
const detail = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.detail', 'An optional description of a task that shows in the Run Task quick pick as a detail.'),
};
const icon = {
    type: 'object',
    description: nls.localize('JsonSchema.tasks.icon', 'An optional icon for the task'),
    properties: {
        id: {
            description: nls.localize('JsonSchema.tasks.icon.id', 'An optional codicon ID to use'),
            type: ['string', 'null'],
            enum: Array.from(getAllCodicons(), (icon) => icon.id),
            markdownEnumDescriptions: Array.from(getAllCodicons(), (icon) => `$(${icon.id})`),
        },
        color: {
            description: nls.localize('JsonSchema.tasks.icon.color', 'An optional color of the icon'),
            type: ['string', 'null'],
            enum: [
                'terminal.ansiBlack',
                'terminal.ansiRed',
                'terminal.ansiGreen',
                'terminal.ansiYellow',
                'terminal.ansiBlue',
                'terminal.ansiMagenta',
                'terminal.ansiCyan',
                'terminal.ansiWhite',
            ],
        },
    },
};
const presentation = {
    type: 'object',
    default: {
        echo: true,
        reveal: 'always',
        focus: false,
        panel: 'shared',
        showReuseMessage: true,
        clear: false,
    },
    description: nls.localize('JsonSchema.tasks.presentation', "Configures the panel that is used to present the task's output and reads its input."),
    additionalProperties: false,
    properties: {
        echo: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.echo', 'Controls whether the executed command is echoed to the panel. Default is true.'),
        },
        focus: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.focus', 'Controls whether the panel takes focus. Default is false. If set to true the panel is revealed as well.'),
        },
        revealProblems: {
            type: 'string',
            enum: ['always', 'onProblem', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.revealProblems.always', 'Always reveals the problems panel when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.onProblem', 'Only reveals the problems panel if a problem is found.'),
                nls.localize('JsonSchema.tasks.presentation.revealProblems.never', 'Never reveals the problems panel when this task is executed.'),
            ],
            default: 'never',
            description: nls.localize('JsonSchema.tasks.presentation.revealProblems', 'Controls whether the problems panel is revealed when running this task or not. Takes precedence over option \"reveal\". Default is \"never\".'),
        },
        reveal: {
            type: 'string',
            enum: ['always', 'silent', 'never'],
            enumDescriptions: [
                nls.localize('JsonSchema.tasks.presentation.reveal.always', 'Always reveals the terminal when this task is executed.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.silent', 'Only reveals the terminal if the task exits with an error or the problem matcher finds an error.'),
                nls.localize('JsonSchema.tasks.presentation.reveal.never', 'Never reveals the terminal when this task is executed.'),
            ],
            default: 'always',
            description: nls.localize('JsonSchema.tasks.presentation.reveal', 'Controls whether the terminal running the task is revealed or not. May be overridden by option \"revealProblems\". Default is \"always\".'),
        },
        panel: {
            type: 'string',
            enum: ['shared', 'dedicated', 'new'],
            default: 'shared',
            description: nls.localize('JsonSchema.tasks.presentation.instance', 'Controls if the panel is shared between tasks, dedicated to this task or a new one is created on every run.'),
        },
        showReuseMessage: {
            type: 'boolean',
            default: true,
            description: nls.localize('JsonSchema.tasks.presentation.showReuseMessage', 'Controls whether to show the `Terminal will be reused by tasks, press any key to close it` message.'),
        },
        clear: {
            type: 'boolean',
            default: false,
            description: nls.localize('JsonSchema.tasks.presentation.clear', 'Controls whether the terminal is cleared before executing the task.'),
        },
        group: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.presentation.group', 'Controls whether the task is executed in a specific terminal group using split panes.'),
        },
        close: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.presentation.close', 'Controls whether the terminal the task runs in is closed when the task exits.'),
        },
    },
};
const terminal = Objects.deepClone(presentation);
terminal.deprecationMessage = nls.localize('JsonSchema.tasks.terminal', 'The terminal property is deprecated. Use presentation instead');
const groupStrings = {
    type: 'string',
    enum: ['build', 'test', 'none'],
    enumDescriptions: [
        nls.localize('JsonSchema.tasks.group.build', "Marks the task as a build task accessible through the 'Run Build Task' command."),
        nls.localize('JsonSchema.tasks.group.test', "Marks the task as a test task accessible through the 'Run Test Task' command."),
        nls.localize('JsonSchema.tasks.group.none', 'Assigns the task to no group'),
    ],
    description: nls.localize('JsonSchema.tasks.group.kind', "The task's execution group."),
};
const group = {
    oneOf: [
        groupStrings,
        {
            type: 'object',
            properties: {
                kind: groupStrings,
                isDefault: {
                    type: ['boolean', 'string'],
                    default: false,
                    description: nls.localize('JsonSchema.tasks.group.isDefault', 'Defines if this task is the default task in the group, or a glob to match the file which should trigger this task.'),
                },
            },
        },
    ],
    defaultSnippets: [
        {
            body: { kind: 'build', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultBuild', 'Marks the task as the default build task.'),
        },
        {
            body: { kind: 'test', isDefault: true },
            description: nls.localize('JsonSchema.tasks.group.defaultTest', 'Marks the task as the default test task.'),
        },
    ],
    description: nls.localize('JsonSchema.tasks.group', 'Defines to which execution group this task belongs to. It supports "build" to add it to the build group and "test" to add it to the test group.'),
};
const taskType = {
    type: 'string',
    enum: ['shell'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.'),
};
const command = {
    oneOf: [
        {
            oneOf: [
                {
                    type: 'string',
                },
                {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character'),
                },
            ],
        },
        {
            type: 'object',
            required: ['value', 'quoting'],
            properties: {
                value: {
                    oneOf: [
                        {
                            type: 'string',
                        },
                        {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: nls.localize('JsonSchema.commandArray', 'The shell command to be executed. Array items will be joined using a space character'),
                        },
                    ],
                    description: nls.localize('JsonSchema.command.quotedString.value', 'The actual command value'),
                },
                quoting: {
                    type: 'string',
                    enum: ['escape', 'strong', 'weak'],
                    enumDescriptions: [
                        nls.localize('JsonSchema.tasks.quoting.escape', "Escapes characters using the shell's escape character (e.g. ` under PowerShell and \\ under bash)."),
                        nls.localize('JsonSchema.tasks.quoting.strong', "Quotes the argument using the shell's strong quote character (e.g. ' under PowerShell and bash)."),
                        nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                    ],
                    default: 'strong',
                    description: nls.localize('JsonSchema.command.quotesString.quote', 'How the command value should be quoted.'),
                },
            },
        },
    ],
    description: nls.localize('JsonSchema.command', 'The command to be executed. Can be an external program or a shell command.'),
};
const args = {
    type: 'array',
    items: {
        oneOf: [
            {
                type: 'string',
            },
            {
                type: 'object',
                required: ['value', 'quoting'],
                properties: {
                    value: {
                        type: 'string',
                        description: nls.localize('JsonSchema.args.quotedString.value', 'The actual argument value'),
                    },
                    quoting: {
                        type: 'string',
                        enum: ['escape', 'strong', 'weak'],
                        enumDescriptions: [
                            nls.localize('JsonSchema.tasks.quoting.escape', "Escapes characters using the shell's escape character (e.g. ` under PowerShell and \\ under bash)."),
                            nls.localize('JsonSchema.tasks.quoting.strong', "Quotes the argument using the shell's strong quote character (e.g. ' under PowerShell and bash)."),
                            nls.localize('JsonSchema.tasks.quoting.weak', 'Quotes the argument using the shell\'s weak quote character (e.g. " under PowerShell and bash).'),
                        ],
                        default: 'strong',
                        description: nls.localize('JsonSchema.args.quotesString.quote', 'How the argument value should be quoted.'),
                    },
                },
            },
        ],
    },
    description: nls.localize('JsonSchema.tasks.args', 'Arguments passed to the command when this task is invoked.'),
};
const label = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.label', "The task's user interface label"),
};
const version = {
    type: 'string',
    enum: ['2.0.0'],
    description: nls.localize('JsonSchema.version', "The config's version number."),
};
const identifier = {
    type: 'string',
    description: nls.localize('JsonSchema.tasks.identifier', 'A user defined identifier to reference the task in launch.json or a dependsOn clause.'),
    deprecationMessage: nls.localize('JsonSchema.tasks.identifier.deprecated', 'User defined identifiers are deprecated. For custom task use the name as a reference and for tasks provided by extensions use their defined task identifier.'),
};
const runOptions = {
    type: 'object',
    additionalProperties: false,
    properties: {
        reevaluateOnRerun: {
            type: 'boolean',
            description: nls.localize('JsonSchema.tasks.reevaluateOnRerun', 'Whether to reevaluate task variables on rerun.'),
            default: true,
        },
        runOn: {
            type: 'string',
            enum: ['default', 'folderOpen'],
            description: nls.localize('JsonSchema.tasks.runOn', 'Configures when the task should be run. If set to folderOpen, then the task will be run automatically when the folder is opened.'),
            default: 'default',
        },
        instanceLimit: {
            type: 'number',
            description: nls.localize('JsonSchema.tasks.instanceLimit', 'The number of instances of the task that are allowed to run simultaneously.'),
            default: 1,
        },
    },
    description: nls.localize('JsonSchema.tasks.runOptions', "The task's run related options"),
};
const commonSchemaDefinitions = commonSchema.definitions;
const options = Objects.deepClone(commonSchemaDefinitions.options);
const optionsProperties = options.properties;
optionsProperties.shell = Objects.deepClone(commonSchemaDefinitions.shellConfiguration);
const taskConfiguration = {
    type: 'object',
    additionalProperties: false,
    properties: {
        label: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskLabel', "The task's label"),
        },
        taskName: {
            type: 'string',
            description: nls.localize('JsonSchema.tasks.taskName', "The task's name"),
            deprecationMessage: nls.localize('JsonSchema.tasks.taskName.deprecated', "The task's name property is deprecated. Use the label property instead."),
        },
        identifier: Objects.deepClone(identifier),
        group: Objects.deepClone(group),
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
        presentation: Objects.deepClone(presentation),
        icon: Objects.deepClone(icon),
        hide: Objects.deepClone(hide),
        options: options,
        problemMatcher: {
            $ref: '#/definitions/problemMatcherType',
            description: nls.localize('JsonSchema.tasks.matchers', 'The problem matcher(s) to use. Can either be a string or a problem matcher definition or an array of strings and problem matchers.'),
        },
        runOptions: Objects.deepClone(runOptions),
        dependsOn: Objects.deepClone(dependsOn),
        dependsOrder: Objects.deepClone(dependsOrder),
        detail: Objects.deepClone(detail),
    },
};
const taskDefinitions = [];
TaskDefinitionRegistry.onReady().then(() => {
    updateTaskDefinitions();
});
export function updateTaskDefinitions() {
    for (const taskType of TaskDefinitionRegistry.all()) {
        // Check that we haven't already added this task type
        if (taskDefinitions.find((schema) => {
            return schema.properties?.type?.enum?.find
                ? schema.properties?.type.enum.find((element) => element === taskType.taskType)
                : undefined;
        })) {
            continue;
        }
        const schema = Objects.deepClone(taskConfiguration);
        const schemaProperties = schema.properties;
        // Since we do this after the schema is assigned we need to patch the refs.
        schemaProperties.type = {
            type: 'string',
            description: nls.localize('JsonSchema.customizations.customizes.type', 'The task type to customize'),
            enum: [taskType.taskType],
        };
        if (taskType.required) {
            schema.required = taskType.required.slice();
        }
        else {
            schema.required = [];
        }
        // Customized tasks require that the task type be set.
        schema.required.push('type');
        if (taskType.properties) {
            for (const key of Object.keys(taskType.properties)) {
                const property = taskType.properties[key];
                schemaProperties[key] = Objects.deepClone(property);
            }
        }
        fixReferences(schema);
        taskDefinitions.push(schema);
    }
}
const customize = Objects.deepClone(taskConfiguration);
customize.properties.customize = {
    type: 'string',
    deprecationMessage: nls.localize('JsonSchema.tasks.customize.deprecated', 'The customize property is deprecated. See the 1.14 release notes on how to migrate to the new task customization approach'),
};
if (!customize.required) {
    customize.required = [];
}
customize.required.push('customize');
taskDefinitions.push(customize);
const definitions = Objects.deepClone(commonSchemaDefinitions);
const taskDescription = definitions.taskDescription;
taskDescription.required = ['label'];
const taskDescriptionProperties = taskDescription.properties;
taskDescriptionProperties.label = Objects.deepClone(label);
taskDescriptionProperties.command = Objects.deepClone(command);
taskDescriptionProperties.args = Objects.deepClone(args);
taskDescriptionProperties.isShellCommand = Objects.deepClone(shellCommand);
taskDescriptionProperties.dependsOn = dependsOn;
taskDescriptionProperties.hide = Objects.deepClone(hide);
taskDescriptionProperties.dependsOrder = dependsOrder;
taskDescriptionProperties.identifier = Objects.deepClone(identifier);
taskDescriptionProperties.type = Objects.deepClone(taskType);
taskDescriptionProperties.presentation = Objects.deepClone(presentation);
taskDescriptionProperties.terminal = terminal;
taskDescriptionProperties.icon = Objects.deepClone(icon);
taskDescriptionProperties.group = Objects.deepClone(group);
taskDescriptionProperties.runOptions = Objects.deepClone(runOptions);
taskDescriptionProperties.detail = detail;
taskDescriptionProperties.taskName.deprecationMessage = nls.localize('JsonSchema.tasks.taskName.deprecated', "The task's name property is deprecated. Use the label property instead.");
// Clone the taskDescription for process task before setting a default to prevent two defaults #115281
const processTask = Objects.deepClone(taskDescription);
taskDescription.default = {
    label: 'My Task',
    type: 'shell',
    command: 'echo Hello',
    problemMatcher: [],
};
definitions.showOutputType.deprecationMessage = nls.localize('JsonSchema.tasks.showOutput.deprecated', 'The property showOutput is deprecated. Use the reveal property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.echoCommand.deprecationMessage = nls.localize('JsonSchema.tasks.echoCommand.deprecated', 'The property echoCommand is deprecated. Use the echo property inside the presentation property instead. See also the 1.14 release notes.');
taskDescriptionProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
taskDescriptionProperties.isBuildCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isBuildCommand.deprecated', 'The property isBuildCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
taskDescriptionProperties.isTestCommand.deprecationMessage = nls.localize('JsonSchema.tasks.isTestCommand.deprecated', 'The property isTestCommand is deprecated. Use the group property instead. See also the 1.14 release notes.');
// Process tasks are almost identical schema-wise to shell tasks, but they are required to have a command
processTask.properties.type = {
    type: 'string',
    enum: ['process'],
    default: 'process',
    description: nls.localize('JsonSchema.tasks.type', 'Defines whether the task is run as a process or as a command inside a shell.'),
};
processTask.required.push('command');
processTask.required.push('type');
taskDefinitions.push(processTask);
taskDefinitions.push({
    $ref: '#/definitions/taskDescription',
});
const definitionsTaskRunnerConfigurationProperties = definitions.taskRunnerConfiguration.properties;
const tasks = definitionsTaskRunnerConfigurationProperties.tasks;
tasks.items = {
    oneOf: taskDefinitions,
};
definitionsTaskRunnerConfigurationProperties.inputs = inputsSchema.definitions.inputs;
definitions.commandConfiguration.properties.isShellCommand = Objects.deepClone(shellCommand);
definitions.commandConfiguration.properties.args = Objects.deepClone(args);
definitions.options.properties.shell = {
    $ref: '#/definitions/shellConfiguration',
};
definitionsTaskRunnerConfigurationProperties.isShellCommand = Objects.deepClone(shellCommand);
definitionsTaskRunnerConfigurationProperties.type = Objects.deepClone(taskType);
definitionsTaskRunnerConfigurationProperties.group = Objects.deepClone(group);
definitionsTaskRunnerConfigurationProperties.presentation = Objects.deepClone(presentation);
definitionsTaskRunnerConfigurationProperties.suppressTaskName.deprecationMessage = nls.localize('JsonSchema.tasks.suppressTaskName.deprecated', 'The property suppressTaskName is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
definitionsTaskRunnerConfigurationProperties.taskSelector.deprecationMessage = nls.localize('JsonSchema.tasks.taskSelector.deprecated', 'The property taskSelector is deprecated. Inline the command with its arguments into the task instead. See also the 1.14 release notes.');
const osSpecificTaskRunnerConfiguration = Objects.deepClone(definitions.taskRunnerConfiguration);
delete osSpecificTaskRunnerConfiguration.properties.tasks;
osSpecificTaskRunnerConfiguration.additionalProperties = false;
definitions.osSpecificTaskRunnerConfiguration = osSpecificTaskRunnerConfiguration;
definitionsTaskRunnerConfigurationProperties.version = Objects.deepClone(version);
const schema = {
    oneOf: [
        {
            allOf: [
                {
                    type: 'object',
                    required: ['version'],
                    properties: {
                        version: Objects.deepClone(version),
                        windows: {
                            $ref: '#/definitions/osSpecificTaskRunnerConfiguration',
                            description: nls.localize('JsonSchema.windows', 'Windows specific command configuration'),
                        },
                        osx: {
                            $ref: '#/definitions/osSpecificTaskRunnerConfiguration',
                            description: nls.localize('JsonSchema.mac', 'Mac specific command configuration'),
                        },
                        linux: {
                            $ref: '#/definitions/osSpecificTaskRunnerConfiguration',
                            description: nls.localize('JsonSchema.linux', 'Linux specific command configuration'),
                        },
                    },
                },
                {
                    $ref: '#/definitions/taskRunnerConfiguration',
                },
            ],
        },
    ],
};
schema.definitions = definitions;
function deprecatedVariableMessage(schemaMap, property) {
    const mapAtProperty = schemaMap[property].properties;
    if (mapAtProperty) {
        Object.keys(mapAtProperty).forEach((name) => {
            deprecatedVariableMessage(mapAtProperty, name);
        });
    }
    else {
        ConfigurationResolverUtils.applyDeprecatedVariableMessage(schemaMap[property]);
    }
}
Object.getOwnPropertyNames(definitions).forEach((key) => {
    const newKey = key + '2';
    definitions[newKey] = definitions[key];
    delete definitions[key];
    deprecatedVariableMessage(definitions, newKey);
});
fixReferences(schema);
export function updateProblemMatchers() {
    try {
        const matcherIds = ProblemMatcherRegistry.keys().map((key) => '$' + key);
        definitions.problemMatcherType2.oneOf[0].enum = matcherIds;
        definitions.problemMatcherType2.oneOf[2].items.anyOf[0].enum = matcherIds;
    }
    catch (err) {
        console.log('Installing problem matcher ids failed');
    }
}
ProblemMatcherRegistry.onReady().then(() => {
    updateProblemMatchers();
});
export default schema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvblNjaGVtYV92Mi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi9qc29uU2NoZW1hX3YyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUc3RCxPQUFPLFlBQVksTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEtBQUssMEJBQTBCLE1BQU0sOEVBQThFLENBQUE7QUFDMUgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxTQUFTLGFBQWEsQ0FBQyxPQUFZO0lBQ2xDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzVCLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDL0IsQ0FBQztTQUFNLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDeEMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3hELE1BQU0sS0FB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