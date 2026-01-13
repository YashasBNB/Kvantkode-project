/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import * as Types from '../../../../base/common/types.js';
import * as UUID from '../../../../base/common/uuid.js';
import { ProblemMatcherParser, isNamedProblemMatcher, ProblemMatcherRegistry, } from './problemMatcher.js';
import * as Tasks from './tasks.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import { ShellExecutionSupportedContext, ProcessExecutionSupportedContext } from './taskService.js';
export var ShellQuoting;
(function (ShellQuoting) {
    /**
     * Default is character escaping.
     */
    ShellQuoting[ShellQuoting["escape"] = 1] = "escape";
    /**
     * Default is strong quoting
     */
    ShellQuoting[ShellQuoting["strong"] = 2] = "strong";
    /**
     * Default is weak quoting.
     */
    ShellQuoting[ShellQuoting["weak"] = 3] = "weak";
})(ShellQuoting || (ShellQuoting = {}));
export var ITaskIdentifier;
(function (ITaskIdentifier) {
    function is(value) {
        const candidate = value;
        return candidate !== undefined && Types.isString(value.type);
    }
    ITaskIdentifier.is = is;
})(ITaskIdentifier || (ITaskIdentifier = {}));
export var CommandString;
(function (CommandString) {
    function value(value) {
        if (Types.isString(value)) {
            return value;
        }
        else if (Types.isStringArray(value)) {
            return value.join(' ');
        }
        else {
            if (Types.isString(value.value)) {
                return value.value;
            }
            else {
                return value.value.join(' ');
            }
        }
    }
    CommandString.value = value;
})(CommandString || (CommandString = {}));
var ProblemMatcherKind;
(function (ProblemMatcherKind) {
    ProblemMatcherKind[ProblemMatcherKind["Unknown"] = 0] = "Unknown";
    ProblemMatcherKind[ProblemMatcherKind["String"] = 1] = "String";
    ProblemMatcherKind[ProblemMatcherKind["ProblemMatcher"] = 2] = "ProblemMatcher";
    ProblemMatcherKind[ProblemMatcherKind["Array"] = 3] = "Array";
})(ProblemMatcherKind || (ProblemMatcherKind = {}));
const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
function assignProperty(target, source, key) {
    const sourceAtKey = source[key];
    if (sourceAtKey !== undefined) {
        target[key] = sourceAtKey;
    }
}
function fillProperty(target, source, key) {
    const sourceAtKey = source[key];
    if (target[key] === undefined && sourceAtKey !== undefined) {
        target[key] = sourceAtKey;
    }
}
function _isEmpty(value, properties, allowEmptyArray = false) {
    if (value === undefined || value === null || properties === undefined) {
        return true;
    }
    for (const meta of properties) {
        const property = value[meta.property];
        if (property !== undefined && property !== null) {
            if (meta.type !== undefined && !meta.type.isEmpty(property)) {
                return false;
            }
            else if (!Array.isArray(property) || property.length > 0 || allowEmptyArray) {
                return false;
            }
        }
    }
    return true;
}
function _assignProperties(target, source, properties) {
    if (!source || _isEmpty(source, properties)) {
        return target;
    }
    if (!target || _isEmpty(target, properties)) {
        return source;
    }
    for (const meta of properties) {
        const property = meta.property;
        let value;
        if (meta.type !== undefined) {
            value = meta.type.assignProperties(target[property], source[property]);
        }
        else {
            value = source[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _fillProperties(target, source, properties, allowEmptyArray = false) {
    if (!source || _isEmpty(source, properties)) {
        return target;
    }
    if (!target || _isEmpty(target, properties, allowEmptyArray)) {
        return source;
    }
    for (const meta of properties) {
        const property = meta.property;
        let value;
        if (meta.type) {
            value = meta.type.fillProperties(target[property], source[property]);
        }
        else if (target[property] === undefined) {
            value = source[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _fillDefaults(target, defaults, properties, context) {
    if (target && Object.isFrozen(target)) {
        return target;
    }
    if (target === undefined || target === null || defaults === undefined || defaults === null) {
        if (defaults !== undefined && defaults !== null) {
            return Objects.deepClone(defaults);
        }
        else {
            return undefined;
        }
    }
    for (const meta of properties) {
        const property = meta.property;
        if (target[property] !== undefined) {
            continue;
        }
        let value;
        if (meta.type) {
            value = meta.type.fillDefaults(target[property], context);
        }
        else {
            value = defaults[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _freeze(target, properties) {
    if (target === undefined || target === null) {
        return undefined;
    }
    if (Object.isFrozen(target)) {
        return target;
    }
    for (const meta of properties) {
        if (meta.type) {
            const value = target[meta.property];
            if (value) {
                meta.type.freeze(value);
            }
        }
    }
    Object.freeze(target);
    return target;
}
export var RunOnOptions;
(function (RunOnOptions) {
    function fromString(value) {
        if (!value) {
            return Tasks.RunOnOptions.default;
        }
        switch (value.toLowerCase()) {
            case 'folderopen':
                return Tasks.RunOnOptions.folderOpen;
            case 'default':
            default:
                return Tasks.RunOnOptions.default;
        }
    }
    RunOnOptions.fromString = fromString;
})(RunOnOptions || (RunOnOptions = {}));
export var RunOptions;
(function (RunOptions) {
    const properties = [
        { property: 'reevaluateOnRerun' },
        { property: 'runOn' },
        { property: 'instanceLimit' },
    ];
    function fromConfiguration(value) {
        return {
            reevaluateOnRerun: value ? value.reevaluateOnRerun : true,
            runOn: value ? RunOnOptions.fromString(value.runOn) : Tasks.RunOnOptions.default,
            instanceLimit: value ? value.instanceLimit : 1,
        };
    }
    RunOptions.fromConfiguration = fromConfiguration;
    function assignProperties(target, source) {
        return _assignProperties(target, source, properties);
    }
    RunOptions.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    RunOptions.fillProperties = fillProperties;
})(RunOptions || (RunOptions = {}));
var ShellConfiguration;
(function (ShellConfiguration) {
    const properties = [
        { property: 'executable' },
        { property: 'args' },
        { property: 'quoting' },
    ];
    function is(value) {
        const candidate = value;
        return (candidate && (Types.isString(candidate.executable) || Types.isStringArray(candidate.args)));
    }
    ShellConfiguration.is = is;
    function from(config, context) {
        if (!is(config)) {
            return undefined;
        }
        const result = {};
        if (config.executable !== undefined) {
            result.executable = config.executable;
        }
        if (config.args !== undefined) {
            result.args = config.args.slice();
        }
        if (config.quoting !== undefined) {
            result.quoting = Objects.deepClone(config.quoting);
        }
        return result;
    }
    ShellConfiguration.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties, true);
    }
    ShellConfiguration.isEmpty = isEmpty;
    function assignProperties(target, source) {
        return _assignProperties(target, source, properties);
    }
    ShellConfiguration.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties, true);
    }
    ShellConfiguration.fillProperties = fillProperties;
    function fillDefaults(value, context) {
        return value;
    }
    ShellConfiguration.fillDefaults = fillDefaults;
    function freeze(value) {
        if (!value) {
            return undefined;
        }
        return Object.freeze(value);
    }
    ShellConfiguration.freeze = freeze;
})(ShellConfiguration || (ShellConfiguration = {}));
var CommandOptions;
(function (CommandOptions) {
    const properties = [
        { property: 'cwd' },
        { property: 'env' },
        { property: 'shell', type: ShellConfiguration },
    ];
    const defaults = { cwd: '${workspaceFolder}' };
    function from(options, context) {
        const result = {};
        if (options.cwd !== undefined) {
            if (Types.isString(options.cwd)) {
                result.cwd = options.cwd;
            }
            else {
                context.taskLoadIssues.push(nls.localize('ConfigurationParser.invalidCWD', 'Warning: options.cwd must be of type string. Ignoring value {0}\n', options.cwd));
            }
        }
        if (options.env !== undefined) {
            result.env = Objects.deepClone(options.env);
        }
        result.shell = ShellConfiguration.from(options.shell, context);
        return isEmpty(result) ? undefined : result;
    }
    CommandOptions.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    CommandOptions.isEmpty = isEmpty;
    function assignProperties(target, source) {
        if (source === undefined || isEmpty(source)) {
            return target;
        }
        if (target === undefined || isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'cwd');
        if (target.env === undefined) {
            target.env = source.env;
        }
        else if (source.env !== undefined) {
            const env = Object.create(null);
            if (target.env !== undefined) {
                Object.keys(target.env).forEach((key) => (env[key] = target.env[key]));
            }
            if (source.env !== undefined) {
                Object.keys(source.env).forEach((key) => (env[key] = source.env[key]));
            }
            target.env = env;
        }
        target.shell = ShellConfiguration.assignProperties(target.shell, source.shell);
        return target;
    }
    CommandOptions.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    CommandOptions.fillProperties = fillProperties;
    function fillDefaults(value, context) {
        return _fillDefaults(value, defaults, properties, context);
    }
    CommandOptions.fillDefaults = fillDefaults;
    function freeze(value) {
        return _freeze(value, properties);
    }
    CommandOptions.freeze = freeze;
})(CommandOptions || (CommandOptions = {}));
var CommandConfiguration;
(function (CommandConfiguration) {
    let PresentationOptions;
    (function (PresentationOptions) {
        const properties = [
            { property: 'echo' },
            { property: 'reveal' },
            { property: 'revealProblems' },
            { property: 'focus' },
            { property: 'panel' },
            { property: 'showReuseMessage' },
            { property: 'clear' },
            { property: 'group' },
            { property: 'close' },
        ];
        function from(config, context) {
            let echo;
            let reveal;
            let revealProblems;
            let focus;
            let panel;
            let showReuseMessage;
            let clear;
            let group;
            let close;
            let hasProps = false;
            if (Types.isBoolean(config.echoCommand)) {
                echo = config.echoCommand;
                hasProps = true;
            }
            if (Types.isString(config.showOutput)) {
                reveal = Tasks.RevealKind.fromString(config.showOutput);
                hasProps = true;
            }
            const presentation = config.presentation || config.terminal;
            if (presentation) {
                if (Types.isBoolean(presentation.echo)) {
                    echo = presentation.echo;
                }
                if (Types.isString(presentation.reveal)) {
                    reveal = Tasks.RevealKind.fromString(presentation.reveal);
                }
                if (Types.isString(presentation.revealProblems)) {
                    revealProblems = Tasks.RevealProblemKind.fromString(presentation.revealProblems);
                }
                if (Types.isBoolean(presentation.focus)) {
                    focus = presentation.focus;
                }
                if (Types.isString(presentation.panel)) {
                    panel = Tasks.PanelKind.fromString(presentation.panel);
                }
                if (Types.isBoolean(presentation.showReuseMessage)) {
                    showReuseMessage = presentation.showReuseMessage;
                }
                if (Types.isBoolean(presentation.clear)) {
                    clear = presentation.clear;
                }
                if (Types.isString(presentation.group)) {
                    group = presentation.group;
                }
                if (Types.isBoolean(presentation.close)) {
                    close = presentation.close;
                }
                hasProps = true;
            }
            if (!hasProps) {
                return undefined;
            }
            return {
                echo: echo,
                reveal: reveal,
                revealProblems: revealProblems,
                focus: focus,
                panel: panel,
                showReuseMessage: showReuseMessage,
                clear: clear,
                group,
                close: close,
            };
        }
        PresentationOptions.from = from;
        function assignProperties(target, source) {
            return _assignProperties(target, source, properties);
        }
        PresentationOptions.assignProperties = assignProperties;
        function fillProperties(target, source) {
            return _fillProperties(target, source, properties);
        }
        PresentationOptions.fillProperties = fillProperties;
        function fillDefaults(value, context) {
            const defaultEcho = context.engine === Tasks.ExecutionEngine.Terminal ? true : false;
            return _fillDefaults(value, {
                echo: defaultEcho,
                reveal: Tasks.RevealKind.Always,
                revealProblems: Tasks.RevealProblemKind.Never,
                focus: false,
                panel: Tasks.PanelKind.Shared,
                showReuseMessage: true,
                clear: false,
            }, properties, context);
        }
        PresentationOptions.fillDefaults = fillDefaults;
        function freeze(value) {
            return _freeze(value, properties);
        }
        PresentationOptions.freeze = freeze;
        function isEmpty(value) {
            return _isEmpty(value, properties);
        }
        PresentationOptions.isEmpty = isEmpty;
    })(PresentationOptions = CommandConfiguration.PresentationOptions || (CommandConfiguration.PresentationOptions = {}));
    let ShellString;
    (function (ShellString) {
        function from(value) {
            if (value === undefined || value === null) {
                return undefined;
            }
            if (Types.isString(value)) {
                return value;
            }
            else if (Types.isStringArray(value)) {
                return value.join(' ');
            }
            else {
                const quoting = Tasks.ShellQuoting.from(value.quoting);
                const result = Types.isString(value.value)
                    ? value.value
                    : Types.isStringArray(value.value)
                        ? value.value.join(' ')
                        : undefined;
                if (result) {
                    return {
                        value: result,
                        quoting: quoting,
                    };
                }
                else {
                    return undefined;
                }
            }
        }
        ShellString.from = from;
    })(ShellString || (ShellString = {}));
    const properties = [
        { property: 'runtime' },
        { property: 'name' },
        { property: 'options', type: CommandOptions },
        { property: 'args' },
        { property: 'taskSelector' },
        { property: 'suppressTaskName' },
        { property: 'presentation', type: PresentationOptions },
    ];
    function from(config, context) {
        let result = fromBase(config, context);
        let osConfig = undefined;
        if (config.windows && context.platform === 3 /* Platform.Windows */) {
            osConfig = fromBase(config.windows, context);
        }
        else if (config.osx && context.platform === 1 /* Platform.Mac */) {
            osConfig = fromBase(config.osx, context);
        }
        else if (config.linux && context.platform === 2 /* Platform.Linux */) {
            osConfig = fromBase(config.linux, context);
        }
        if (osConfig) {
            result = assignProperties(result, osConfig, context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */);
        }
        return isEmpty(result) ? undefined : result;
    }
    CommandConfiguration.from = from;
    function fromBase(config, context) {
        const name = ShellString.from(config.command);
        let runtime;
        if (Types.isString(config.type)) {
            if (config.type === 'shell' || config.type === 'process') {
                runtime = Tasks.RuntimeType.fromString(config.type);
            }
        }
        if (Types.isBoolean(config.isShellCommand) || ShellConfiguration.is(config.isShellCommand)) {
            runtime = Tasks.RuntimeType.Shell;
        }
        else if (config.isShellCommand !== undefined) {
            runtime = !!config.isShellCommand ? Tasks.RuntimeType.Shell : Tasks.RuntimeType.Process;
        }
        const result = {
            name: name,
            runtime: runtime,
            presentation: PresentationOptions.from(config, context),
        };
        if (config.args !== undefined) {
            result.args = [];
            for (const arg of config.args) {
                const converted = ShellString.from(arg);
                if (converted !== undefined) {
                    result.args.push(converted);
                }
                else {
                    context.taskLoadIssues.push(nls.localize('ConfigurationParser.inValidArg', 'Error: command argument must either be a string or a quoted string. Provided value is:\n{0}', arg ? JSON.stringify(arg, undefined, 4) : 'undefined'));
                }
            }
        }
        if (config.options !== undefined) {
            result.options = CommandOptions.from(config.options, context);
            if (result.options &&
                result.options.shell === undefined &&
                ShellConfiguration.is(config.isShellCommand)) {
                result.options.shell = ShellConfiguration.from(config.isShellCommand, context);
                if (context.engine !== Tasks.ExecutionEngine.Terminal) {
                    context.taskLoadIssues.push(nls.localize('ConfigurationParser.noShell', 'Warning: shell configuration is only supported when executing tasks in the terminal.'));
                }
            }
        }
        if (Types.isString(config.taskSelector)) {
            result.taskSelector = config.taskSelector;
        }
        if (Types.isBoolean(config.suppressTaskName)) {
            result.suppressTaskName = config.suppressTaskName;
        }
        return isEmpty(result) ? undefined : result;
    }
    function hasCommand(value) {
        return value && !!value.name;
    }
    CommandConfiguration.hasCommand = hasCommand;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    CommandConfiguration.isEmpty = isEmpty;
    function assignProperties(target, source, overwriteArgs) {
        if (isEmpty(source)) {
            return target;
        }
        if (isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'name');
        assignProperty(target, source, 'runtime');
        assignProperty(target, source, 'taskSelector');
        assignProperty(target, source, 'suppressTaskName');
        if (source.args !== undefined) {
            if (target.args === undefined || overwriteArgs) {
                target.args = source.args;
            }
            else {
                target.args = target.args.concat(source.args);
            }
        }
        target.presentation = PresentationOptions.assignProperties(target.presentation, source.presentation);
        target.options = CommandOptions.assignProperties(target.options, source.options);
        return target;
    }
    CommandConfiguration.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    CommandConfiguration.fillProperties = fillProperties;
    function fillGlobals(target, source, taskName) {
        if (source === undefined || isEmpty(source)) {
            return target;
        }
        target = target || {
            name: undefined,
            runtime: undefined,
            presentation: undefined,
        };
        if (target.name === undefined) {
            fillProperty(target, source, 'name');
            fillProperty(target, source, 'taskSelector');
            fillProperty(target, source, 'suppressTaskName');
            let args = source.args ? source.args.slice() : [];
            if (!target.suppressTaskName && taskName) {
                if (target.taskSelector !== undefined) {
                    args.push(target.taskSelector + taskName);
                }
                else {
                    args.push(taskName);
                }
            }
            if (target.args) {
                args = args.concat(target.args);
            }
            target.args = args;
        }
        fillProperty(target, source, 'runtime');
        target.presentation = PresentationOptions.fillProperties(target.presentation, source.presentation);
        target.options = CommandOptions.fillProperties(target.options, source.options);
        return target;
    }
    CommandConfiguration.fillGlobals = fillGlobals;
    function fillDefaults(value, context) {
        if (!value || Object.isFrozen(value)) {
            return;
        }
        if (value.name !== undefined && value.runtime === undefined) {
            value.runtime = Tasks.RuntimeType.Process;
        }
        value.presentation = PresentationOptions.fillDefaults(value.presentation, context);
        if (!isEmpty(value)) {
            value.options = CommandOptions.fillDefaults(value.options, context);
        }
        if (value.args === undefined) {
            value.args = EMPTY_ARRAY;
        }
        if (value.suppressTaskName === undefined) {
            value.suppressTaskName = context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
        }
    }
    CommandConfiguration.fillDefaults = fillDefaults;
    function freeze(value) {
        return _freeze(value, properties);
    }
    CommandConfiguration.freeze = freeze;
})(CommandConfiguration || (CommandConfiguration = {}));
export var ProblemMatcherConverter;
(function (ProblemMatcherConverter) {
    function namedFrom(declares, context) {
        const result = Object.create(null);
        if (!Array.isArray(declares)) {
            return result;
        }
        ;
        declares.forEach((value) => {
            const namedProblemMatcher = new ProblemMatcherParser(context.problemReporter).parse(value);
            if (isNamedProblemMatcher(namedProblemMatcher)) {
                result[namedProblemMatcher.name] = namedProblemMatcher;
            }
            else {
                context.problemReporter.error(nls.localize('ConfigurationParser.noName', 'Error: Problem Matcher in declare scope must have a name:\n{0}\n', JSON.stringify(value, undefined, 4)));
            }
        });
        return result;
    }
    ProblemMatcherConverter.namedFrom = namedFrom;
    function fromWithOsConfig(external, context) {
        let result = {};
        if (external.windows &&
            external.windows.problemMatcher &&
            context.platform === 3 /* Platform.Windows */) {
            result = from(external.windows.problemMatcher, context);
        }
        else if (external.osx && external.osx.problemMatcher && context.platform === 1 /* Platform.Mac */) {
            result = from(external.osx.problemMatcher, context);
        }
        else if (external.linux &&
            external.linux.problemMatcher &&
            context.platform === 2 /* Platform.Linux */) {
            result = from(external.linux.problemMatcher, context);
        }
        else if (external.problemMatcher) {
            result = from(external.problemMatcher, context);
        }
        return result;
    }
    ProblemMatcherConverter.fromWithOsConfig = fromWithOsConfig;
    function from(config, context) {
        const result = [];
        if (config === undefined) {
            return { value: result };
        }
        const errors = [];
        function addResult(matcher) {
            if (matcher.value) {
                result.push(matcher.value);
            }
            if (matcher.errors) {
                errors.push(...matcher.errors);
            }
        }
        const kind = getProblemMatcherKind(config);
        if (kind === ProblemMatcherKind.Unknown) {
            const error = nls.localize('ConfigurationParser.unknownMatcherKind', 'Warning: the defined problem matcher is unknown. Supported types are string | ProblemMatcher | Array<string | ProblemMatcher>.\n{0}\n', JSON.stringify(config, null, 4));
            context.problemReporter.warn(error);
        }
        else if (kind === ProblemMatcherKind.String || kind === ProblemMatcherKind.ProblemMatcher) {
            addResult(resolveProblemMatcher(config, context));
        }
        else if (kind === ProblemMatcherKind.Array) {
            const problemMatchers = config;
            problemMatchers.forEach((problemMatcher) => {
                addResult(resolveProblemMatcher(problemMatcher, context));
            });
        }
        return { value: result, errors };
    }
    ProblemMatcherConverter.from = from;
    function getProblemMatcherKind(value) {
        if (Types.isString(value)) {
            return ProblemMatcherKind.String;
        }
        else if (Array.isArray(value)) {
            return ProblemMatcherKind.Array;
        }
        else if (!Types.isUndefined(value)) {
            return ProblemMatcherKind.ProblemMatcher;
        }
        else {
            return ProblemMatcherKind.Unknown;
        }
    }
    function resolveProblemMatcher(value, context) {
        if (Types.isString(value)) {
            let variableName = value;
            if (variableName.length > 1 && variableName[0] === '$') {
                variableName = variableName.substring(1);
                const global = ProblemMatcherRegistry.get(variableName);
                if (global) {
                    return { value: Objects.deepClone(global) };
                }
                let localProblemMatcher = context.namedProblemMatchers[variableName];
                if (localProblemMatcher) {
                    localProblemMatcher = Objects.deepClone(localProblemMatcher);
                    // remove the name
                    delete localProblemMatcher.name;
                    return { value: localProblemMatcher };
                }
            }
            return {
                errors: [
                    nls.localize('ConfigurationParser.invalidVariableReference', 'Error: Invalid problemMatcher reference: {0}\n', value),
                ],
            };
        }
        else {
            const json = value;
            return { value: new ProblemMatcherParser(context.problemReporter).parse(json) };
        }
    }
})(ProblemMatcherConverter || (ProblemMatcherConverter = {}));
export var GroupKind;
(function (GroupKind) {
    function from(external) {
        if (external === undefined) {
            return undefined;
        }
        else if (Types.isString(external) && Tasks.TaskGroup.is(external)) {
            return { _id: external, isDefault: false };
        }
        else if (Types.isString(external.kind) && Tasks.TaskGroup.is(external.kind)) {
            const group = external.kind;
            const isDefault = Types.isUndefined(external.isDefault)
                ? false
                : external.isDefault;
            return { _id: group, isDefault };
        }
        return undefined;
    }
    GroupKind.from = from;
    function to(group) {
        if (Types.isString(group)) {
            return group;
        }
        else if (!group.isDefault) {
            return group._id;
        }
        return {
            kind: group._id,
            isDefault: group.isDefault,
        };
    }
    GroupKind.to = to;
})(GroupKind || (GroupKind = {}));
var TaskDependency;
(function (TaskDependency) {
    function uriFromSource(context, source) {
        switch (source) {
            case TaskConfigSource.User:
                return Tasks.USER_TASKS_GROUP_KEY;
            case TaskConfigSource.TasksJson:
                return context.workspaceFolder.uri;
            default:
                return context.workspace && context.workspace.configuration
                    ? context.workspace.configuration
                    : context.workspaceFolder.uri;
        }
    }
    function from(external, context, source) {
        if (Types.isString(external)) {
            return { uri: uriFromSource(context, source), task: external };
        }
        else if (ITaskIdentifier.is(external)) {
            return {
                uri: uriFromSource(context, source),
                task: Tasks.TaskDefinition.createTaskIdentifier(external, context.problemReporter),
            };
        }
        else {
            return undefined;
        }
    }
    TaskDependency.from = from;
})(TaskDependency || (TaskDependency = {}));
var DependsOrder;
(function (DependsOrder) {
    function from(order) {
        switch (order) {
            case "sequence" /* Tasks.DependsOrder.sequence */:
                return "sequence" /* Tasks.DependsOrder.sequence */;
            case "parallel" /* Tasks.DependsOrder.parallel */:
            default:
                return "parallel" /* Tasks.DependsOrder.parallel */;
        }
    }
    DependsOrder.from = from;
})(DependsOrder || (DependsOrder = {}));
var ConfigurationProperties;
(function (ConfigurationProperties) {
    const properties = [
        { property: 'name' },
        { property: 'identifier' },
        { property: 'group' },
        { property: 'isBackground' },
        { property: 'promptOnClose' },
        { property: 'dependsOn' },
        { property: 'presentation', type: CommandConfiguration.PresentationOptions },
        { property: 'problemMatchers' },
        { property: 'options' },
        { property: 'icon' },
        { property: 'hide' },
    ];
    function from(external, context, includeCommandOptions, source, properties) {
        if (!external) {
            return {};
        }
        const result = {};
        if (properties) {
            for (const propertyName of Object.keys(properties)) {
                if (external[propertyName] !== undefined) {
                    result[propertyName] = Objects.deepClone(external[propertyName]);
                }
            }
        }
        if (Types.isString(external.taskName)) {
            result.name = external.taskName;
        }
        if (Types.isString(external.label) &&
            context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            result.name = external.label;
        }
        if (Types.isString(external.identifier)) {
            result.identifier = external.identifier;
        }
        result.icon = external.icon;
        result.hide = external.hide;
        if (external.isBackground !== undefined) {
            result.isBackground = !!external.isBackground;
        }
        if (external.promptOnClose !== undefined) {
            result.promptOnClose = !!external.promptOnClose;
        }
        result.group = GroupKind.from(external.group);
        if (external.dependsOn !== undefined) {
            if (Array.isArray(external.dependsOn)) {
                result.dependsOn = external.dependsOn.reduce((dependencies, item) => {
                    const dependency = TaskDependency.from(item, context, source);
                    if (dependency) {
                        dependencies.push(dependency);
                    }
                    return dependencies;
                }, []);
            }
            else {
                const dependsOnValue = TaskDependency.from(external.dependsOn, context, source);
                result.dependsOn = dependsOnValue ? [dependsOnValue] : undefined;
            }
        }
        result.dependsOrder = DependsOrder.from(external.dependsOrder);
        if (includeCommandOptions &&
            (external.presentation !== undefined ||
                external.terminal !== undefined)) {
            result.presentation = CommandConfiguration.PresentationOptions.from(external, context);
        }
        if (includeCommandOptions && external.options !== undefined) {
            result.options = CommandOptions.from(external.options, context);
        }
        const configProblemMatcher = ProblemMatcherConverter.fromWithOsConfig(external, context);
        if (configProblemMatcher.value !== undefined) {
            result.problemMatchers = configProblemMatcher.value;
        }
        if (external.detail) {
            result.detail = external.detail;
        }
        return isEmpty(result) ? {} : { value: result, errors: configProblemMatcher.errors };
    }
    ConfigurationProperties.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    ConfigurationProperties.isEmpty = isEmpty;
})(ConfigurationProperties || (ConfigurationProperties = {}));
const label = 'Workspace';
var ConfiguringTask;
(function (ConfiguringTask) {
    const grunt = 'grunt.';
    const jake = 'jake.';
    const gulp = 'gulp.';
    const npm = 'vscode.npm.';
    const typescript = 'vscode.typescript.';
    function from(external, context, index, source, registry) {
        if (!external) {
            return undefined;
        }
        const type = external.type;
        const customize = external.customize;
        if (!type && !customize) {
            context.problemReporter.error(nls.localize('ConfigurationParser.noTaskType', 'Error: tasks configuration must have a type property. The configuration will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        const typeDeclaration = type
            ? registry?.get?.(type) || TaskDefinitionRegistry.get(type)
            : undefined;
        if (!typeDeclaration) {
            const message = nls.localize('ConfigurationParser.noTypeDefinition', "Error: there is no registered task type '{0}'. Did you miss installing an extension that provides a corresponding task provider?", type);
            context.problemReporter.error(message);
            return undefined;
        }
        let identifier;
        if (Types.isString(customize)) {
            if (customize.indexOf(grunt) === 0) {
                identifier = { type: 'grunt', task: customize.substring(grunt.length) };
            }
            else if (customize.indexOf(jake) === 0) {
                identifier = { type: 'jake', task: customize.substring(jake.length) };
            }
            else if (customize.indexOf(gulp) === 0) {
                identifier = { type: 'gulp', task: customize.substring(gulp.length) };
            }
            else if (customize.indexOf(npm) === 0) {
                identifier = { type: 'npm', script: customize.substring(npm.length + 4) };
            }
            else if (customize.indexOf(typescript) === 0) {
                identifier = { type: 'typescript', tsconfig: customize.substring(typescript.length + 6) };
            }
        }
        else {
            if (Types.isString(external.type)) {
                identifier = external;
            }
        }
        if (identifier === undefined) {
            context.problemReporter.error(nls.localize('ConfigurationParser.missingType', "Error: the task configuration '{0}' is missing the required property 'type'. The task configuration will be ignored.", JSON.stringify(external, undefined, 0)));
            return undefined;
        }
        const taskIdentifier = Tasks.TaskDefinition.createTaskIdentifier(identifier, context.problemReporter);
        if (taskIdentifier === undefined) {
            context.problemReporter.error(nls.localize('ConfigurationParser.incorrectType', "Error: the task configuration '{0}' is using an unknown type. The task configuration will be ignored.", JSON.stringify(external, undefined, 0)));
            return undefined;
        }
        const configElement = {
            workspaceFolder: context.workspaceFolder,
            file: '.vscode/tasks.json',
            index,
            element: external,
        };
        let taskSource;
        switch (source) {
            case TaskConfigSource.User: {
                taskSource = { kind: Tasks.TaskSourceKind.User, config: configElement, label };
                break;
            }
            case TaskConfigSource.WorkspaceFile: {
                taskSource = { kind: Tasks.TaskSourceKind.WorkspaceFile, config: configElement, label };
                break;
            }
            default: {
                taskSource = { kind: Tasks.TaskSourceKind.Workspace, config: configElement, label };
                break;
            }
        }
        const result = new Tasks.ConfiguringTask(`${typeDeclaration.extensionId}.${taskIdentifier._key}`, taskSource, undefined, type, taskIdentifier, RunOptions.fromConfiguration(external.runOptions), { hide: external.hide });
        const configuration = ConfigurationProperties.from(external, context, true, source, typeDeclaration.properties);
        result.addTaskLoadMessages(configuration.errors);
        if (configuration.value) {
            result.configurationProperties = Object.assign(result.configurationProperties, configuration.value);
            if (result.configurationProperties.name) {
                result._label = result.configurationProperties.name;
            }
            else {
                let label = result.configures.type;
                if (typeDeclaration.required && typeDeclaration.required.length > 0) {
                    for (const required of typeDeclaration.required) {
                        const value = result.configures[required];
                        if (value) {
                            label = label + ': ' + value;
                            break;
                        }
                    }
                }
                result._label = label;
            }
            if (!result.configurationProperties.identifier) {
                result.configurationProperties.identifier = taskIdentifier._key;
            }
        }
        return result;
    }
    ConfiguringTask.from = from;
})(ConfiguringTask || (ConfiguringTask = {}));
var CustomTask;
(function (CustomTask) {
    function from(external, context, index, source) {
        if (!external) {
            return undefined;
        }
        let type = external.type;
        if (type === undefined || type === null) {
            type = Tasks.CUSTOMIZED_TASK_TYPE;
        }
        if (type !== Tasks.CUSTOMIZED_TASK_TYPE && type !== 'shell' && type !== 'process') {
            context.problemReporter.error(nls.localize('ConfigurationParser.notCustom', 'Error: tasks is not declared as a custom task. The configuration will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        let taskName = external.taskName;
        if (Types.isString(external.label) &&
            context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            taskName = external.label;
        }
        if (!taskName) {
            context.problemReporter.error(nls.localize('ConfigurationParser.noTaskName', 'Error: a task must provide a label property. The task will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        let taskSource;
        switch (source) {
            case TaskConfigSource.User: {
                taskSource = {
                    kind: Tasks.TaskSourceKind.User,
                    config: {
                        index,
                        element: external,
                        file: '.vscode/tasks.json',
                        workspaceFolder: context.workspaceFolder,
                    },
                    label,
                };
                break;
            }
            case TaskConfigSource.WorkspaceFile: {
                taskSource = {
                    kind: Tasks.TaskSourceKind.WorkspaceFile,
                    config: {
                        index,
                        element: external,
                        file: '.vscode/tasks.json',
                        workspaceFolder: context.workspaceFolder,
                        workspace: context.workspace,
                    },
                    label,
                };
                break;
            }
            default: {
                taskSource = {
                    kind: Tasks.TaskSourceKind.Workspace,
                    config: {
                        index,
                        element: external,
                        file: '.vscode/tasks.json',
                        workspaceFolder: context.workspaceFolder,
                    },
                    label,
                };
                break;
            }
        }
        const result = new Tasks.CustomTask(context.uuidMap.getUUID(taskName), taskSource, taskName, Tasks.CUSTOMIZED_TASK_TYPE, undefined, false, RunOptions.fromConfiguration(external.runOptions), {
            name: taskName,
            identifier: taskName,
        });
        const configuration = ConfigurationProperties.from(external, context, false, source);
        result.addTaskLoadMessages(configuration.errors);
        if (configuration.value) {
            result.configurationProperties = Object.assign(result.configurationProperties, configuration.value);
        }
        const supportLegacy = true; //context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0;
        if (supportLegacy) {
            const legacy = external;
            if (result.configurationProperties.isBackground === undefined &&
                legacy.isWatching !== undefined) {
                result.configurationProperties.isBackground = !!legacy.isWatching;
            }
            if (result.configurationProperties.group === undefined) {
                if (legacy.isBuildCommand === true) {
                    result.configurationProperties.group = Tasks.TaskGroup.Build;
                }
                else if (legacy.isTestCommand === true) {
                    result.configurationProperties.group = Tasks.TaskGroup.Test;
                }
            }
        }
        const command = CommandConfiguration.from(external, context);
        if (command) {
            result.command = command;
        }
        if (external.command !== undefined) {
            // if the task has its own command then we suppress the
            // task name by default.
            command.suppressTaskName = true;
        }
        return result;
    }
    CustomTask.from = from;
    function fillGlobals(task, globals) {
        // We only merge a command from a global definition if there is no dependsOn
        // or there is a dependsOn and a defined command.
        if (CommandConfiguration.hasCommand(task.command) ||
            task.configurationProperties.dependsOn === undefined) {
            task.command = CommandConfiguration.fillGlobals(task.command, globals.command, task.configurationProperties.name);
        }
        if (task.configurationProperties.problemMatchers === undefined &&
            globals.problemMatcher !== undefined) {
            task.configurationProperties.problemMatchers = Objects.deepClone(globals.problemMatcher);
            task.hasDefinedMatchers = true;
        }
        // promptOnClose is inferred from isBackground if available
        if (task.configurationProperties.promptOnClose === undefined &&
            task.configurationProperties.isBackground === undefined &&
            globals.promptOnClose !== undefined) {
            task.configurationProperties.promptOnClose = globals.promptOnClose;
        }
    }
    CustomTask.fillGlobals = fillGlobals;
    function fillDefaults(task, context) {
        CommandConfiguration.fillDefaults(task.command, context);
        if (task.configurationProperties.promptOnClose === undefined) {
            task.configurationProperties.promptOnClose =
                task.configurationProperties.isBackground !== undefined
                    ? !task.configurationProperties.isBackground
                    : true;
        }
        if (task.configurationProperties.isBackground === undefined) {
            task.configurationProperties.isBackground = false;
        }
        if (task.configurationProperties.problemMatchers === undefined) {
            task.configurationProperties.problemMatchers = EMPTY_ARRAY;
        }
    }
    CustomTask.fillDefaults = fillDefaults;
    function createCustomTask(contributedTask, configuredProps) {
        const result = new Tasks.CustomTask(configuredProps._id, Object.assign({}, configuredProps._source, { customizes: contributedTask.defines }), configuredProps.configurationProperties.name || contributedTask._label, Tasks.CUSTOMIZED_TASK_TYPE, contributedTask.command, false, contributedTask.runOptions, {
            name: configuredProps.configurationProperties.name ||
                contributedTask.configurationProperties.name,
            identifier: configuredProps.configurationProperties.identifier ||
                contributedTask.configurationProperties.identifier,
            icon: configuredProps.configurationProperties.icon,
            hide: configuredProps.configurationProperties.hide,
        });
        result.addTaskLoadMessages(configuredProps.taskLoadMessages);
        const resultConfigProps = result.configurationProperties;
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'group');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'isBackground');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'dependsOn');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'problemMatchers');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'promptOnClose');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'detail');
        result.command.presentation = CommandConfiguration.PresentationOptions.assignProperties(result.command.presentation, configuredProps.configurationProperties.presentation);
        result.command.options = CommandOptions.assignProperties(result.command.options, configuredProps.configurationProperties.options);
        result.runOptions = RunOptions.assignProperties(result.runOptions, configuredProps.runOptions);
        const contributedConfigProps = contributedTask.configurationProperties;
        fillProperty(resultConfigProps, contributedConfigProps, 'group');
        fillProperty(resultConfigProps, contributedConfigProps, 'isBackground');
        fillProperty(resultConfigProps, contributedConfigProps, 'dependsOn');
        fillProperty(resultConfigProps, contributedConfigProps, 'problemMatchers');
        fillProperty(resultConfigProps, contributedConfigProps, 'promptOnClose');
        fillProperty(resultConfigProps, contributedConfigProps, 'detail');
        result.command.presentation = CommandConfiguration.PresentationOptions.fillProperties(result.command.presentation, contributedConfigProps.presentation);
        result.command.options = CommandOptions.fillProperties(result.command.options, contributedConfigProps.options);
        result.runOptions = RunOptions.fillProperties(result.runOptions, contributedTask.runOptions);
        if (contributedTask.hasDefinedMatchers === true) {
            result.hasDefinedMatchers = true;
        }
        return result;
    }
    CustomTask.createCustomTask = createCustomTask;
})(CustomTask || (CustomTask = {}));
export var TaskParser;
(function (TaskParser) {
    function isCustomTask(value) {
        const type = value.type;
        const customize = value.customize;
        return (customize === undefined &&
            (type === undefined ||
                type === null ||
                type === Tasks.CUSTOMIZED_TASK_TYPE ||
                type === 'shell' ||
                type === 'process'));
    }
    const builtinTypeContextMap = {
        shell: ShellExecutionSupportedContext,
        process: ProcessExecutionSupportedContext,
    };
    function from(externals, globals, context, source, registry) {
        const result = { custom: [], configured: [] };
        if (!externals) {
            return result;
        }
        const defaultBuildTask = {
            task: undefined,
            rank: -1,
        };
        const defaultTestTask = {
            task: undefined,
            rank: -1,
        };
        const schema2_0_0 = context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
        const baseLoadIssues = Objects.deepClone(context.taskLoadIssues);
        for (let index = 0; index < externals.length; index++) {
            const external = externals[index];
            const definition = external.type
                ? registry?.get?.(external.type) || TaskDefinitionRegistry.get(external.type)
                : undefined;
            let typeNotSupported = false;
            if (definition &&
                definition.when &&
                !context.contextKeyService.contextMatchesRules(definition.when)) {
                typeNotSupported = true;
            }
            else if (!definition && external.type) {
                for (const key of Object.keys(builtinTypeContextMap)) {
                    if (external.type === key) {
                        typeNotSupported = !ShellExecutionSupportedContext.evaluate(context.contextKeyService.getContext(null));
                        break;
                    }
                }
            }
            if (typeNotSupported) {
                context.problemReporter.info(nls.localize('taskConfiguration.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.\n', external.type));
                continue;
            }
            if (isCustomTask(external)) {
                const customTask = CustomTask.from(external, context, index, source);
                if (customTask) {
                    CustomTask.fillGlobals(customTask, globals);
                    CustomTask.fillDefaults(customTask, context);
                    if (schema2_0_0) {
                        if ((customTask.command === undefined || customTask.command.name === undefined) &&
                            (customTask.configurationProperties.dependsOn === undefined ||
                                customTask.configurationProperties.dependsOn.length === 0)) {
                            context.problemReporter.error(nls.localize('taskConfiguration.noCommandOrDependsOn', "Error: the task '{0}' neither specifies a command nor a dependsOn property. The task will be ignored. Its definition is:\n{1}", customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)));
                            continue;
                        }
                    }
                    else {
                        if (customTask.command === undefined || customTask.command.name === undefined) {
                            context.problemReporter.warn(nls.localize('taskConfiguration.noCommand', "Error: the task '{0}' doesn't define a command. The task will be ignored. Its definition is:\n{1}", customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)));
                            continue;
                        }
                    }
                    if (customTask.configurationProperties.group === Tasks.TaskGroup.Build &&
                        defaultBuildTask.rank < 2) {
                        defaultBuildTask.task = customTask;
                        defaultBuildTask.rank = 2;
                    }
                    else if (customTask.configurationProperties.group === Tasks.TaskGroup.Test &&
                        defaultTestTask.rank < 2) {
                        defaultTestTask.task = customTask;
                        defaultTestTask.rank = 2;
                    }
                    else if (customTask.configurationProperties.name === 'build' &&
                        defaultBuildTask.rank < 1) {
                        defaultBuildTask.task = customTask;
                        defaultBuildTask.rank = 1;
                    }
                    else if (customTask.configurationProperties.name === 'test' &&
                        defaultTestTask.rank < 1) {
                        defaultTestTask.task = customTask;
                        defaultTestTask.rank = 1;
                    }
                    customTask.addTaskLoadMessages(context.taskLoadIssues);
                    result.custom.push(customTask);
                }
            }
            else {
                const configuredTask = ConfiguringTask.from(external, context, index, source, registry);
                if (configuredTask) {
                    configuredTask.addTaskLoadMessages(context.taskLoadIssues);
                    result.configured.push(configuredTask);
                }
            }
            context.taskLoadIssues = Objects.deepClone(baseLoadIssues);
        }
        // There is some special logic for tasks with the labels "build" and "test".
        // Even if they are not marked as a task group Build or Test, we automagically group them as such.
        // However, if they are already grouped as Build or Test, we don't need to add this grouping.
        const defaultBuildGroupName = Types.isString(defaultBuildTask.task?.configurationProperties.group)
            ? defaultBuildTask.task?.configurationProperties.group
            : defaultBuildTask.task?.configurationProperties.group?._id;
        const defaultTestTaskGroupName = Types.isString(defaultTestTask.task?.configurationProperties.group)
            ? defaultTestTask.task?.configurationProperties.group
            : defaultTestTask.task?.configurationProperties.group?._id;
        if (defaultBuildGroupName !== Tasks.TaskGroup.Build._id &&
            defaultBuildTask.rank > -1 &&
            defaultBuildTask.rank < 2 &&
            defaultBuildTask.task) {
            defaultBuildTask.task.configurationProperties.group = Tasks.TaskGroup.Build;
        }
        else if (defaultTestTaskGroupName !== Tasks.TaskGroup.Test._id &&
            defaultTestTask.rank > -1 &&
            defaultTestTask.rank < 2 &&
            defaultTestTask.task) {
            defaultTestTask.task.configurationProperties.group = Tasks.TaskGroup.Test;
        }
        return result;
    }
    TaskParser.from = from;
    function assignTasks(target, source) {
        if (source === undefined || source.length === 0) {
            return target;
        }
        if (target === undefined || target.length === 0) {
            return source;
        }
        if (source) {
            // Tasks are keyed by ID but we need to merge by name
            const map = Object.create(null);
            target.forEach((task) => {
                map[task.configurationProperties.name] = task;
            });
            source.forEach((task) => {
                map[task.configurationProperties.name] = task;
            });
            const newTarget = [];
            target.forEach((task) => {
                newTarget.push(map[task.configurationProperties.name]);
                delete map[task.configurationProperties.name];
            });
            Object.keys(map).forEach((key) => newTarget.push(map[key]));
            target = newTarget;
        }
        return target;
    }
    TaskParser.assignTasks = assignTasks;
})(TaskParser || (TaskParser = {}));
var Globals;
(function (Globals) {
    function from(config, context) {
        let result = fromBase(config, context);
        let osGlobals = undefined;
        if (config.windows && context.platform === 3 /* Platform.Windows */) {
            osGlobals = fromBase(config.windows, context);
        }
        else if (config.osx && context.platform === 1 /* Platform.Mac */) {
            osGlobals = fromBase(config.osx, context);
        }
        else if (config.linux && context.platform === 2 /* Platform.Linux */) {
            osGlobals = fromBase(config.linux, context);
        }
        if (osGlobals) {
            result = Globals.assignProperties(result, osGlobals);
        }
        const command = CommandConfiguration.from(config, context);
        if (command) {
            result.command = command;
        }
        Globals.fillDefaults(result, context);
        Globals.freeze(result);
        return result;
    }
    Globals.from = from;
    function fromBase(config, context) {
        const result = {};
        if (config.suppressTaskName !== undefined) {
            result.suppressTaskName = !!config.suppressTaskName;
        }
        if (config.promptOnClose !== undefined) {
            result.promptOnClose = !!config.promptOnClose;
        }
        if (config.problemMatcher) {
            result.problemMatcher = ProblemMatcherConverter.from(config.problemMatcher, context).value;
        }
        return result;
    }
    Globals.fromBase = fromBase;
    function isEmpty(value) {
        return (!value ||
            (value.command === undefined &&
                value.promptOnClose === undefined &&
                value.suppressTaskName === undefined));
    }
    Globals.isEmpty = isEmpty;
    function assignProperties(target, source) {
        if (isEmpty(source)) {
            return target;
        }
        if (isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'promptOnClose');
        assignProperty(target, source, 'suppressTaskName');
        return target;
    }
    Globals.assignProperties = assignProperties;
    function fillDefaults(value, context) {
        if (!value) {
            return;
        }
        CommandConfiguration.fillDefaults(value.command, context);
        if (value.suppressTaskName === undefined) {
            value.suppressTaskName = context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
        }
        if (value.promptOnClose === undefined) {
            value.promptOnClose = true;
        }
    }
    Globals.fillDefaults = fillDefaults;
    function freeze(value) {
        Object.freeze(value);
        if (value.command) {
            CommandConfiguration.freeze(value.command);
        }
    }
    Globals.freeze = freeze;
})(Globals || (Globals = {}));
export var ExecutionEngine;
(function (ExecutionEngine) {
    function from(config) {
        const runner = config.runner || config._runner;
        let result;
        if (runner) {
            switch (runner) {
                case 'terminal':
                    result = Tasks.ExecutionEngine.Terminal;
                    break;
                case 'process':
                    result = Tasks.ExecutionEngine.Process;
                    break;
            }
        }
        const schemaVersion = JsonSchemaVersion.from(config);
        if (schemaVersion === 1 /* Tasks.JsonSchemaVersion.V0_1_0 */) {
            return result || Tasks.ExecutionEngine.Process;
        }
        else if (schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            return Tasks.ExecutionEngine.Terminal;
        }
        else {
            throw new Error("Shouldn't happen.");
        }
    }
    ExecutionEngine.from = from;
})(ExecutionEngine || (ExecutionEngine = {}));
export var JsonSchemaVersion;
(function (JsonSchemaVersion) {
    const _default = 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
    function from(config) {
        const version = config.version;
        if (!version) {
            return _default;
        }
        switch (version) {
            case '0.1.0':
                return 1 /* Tasks.JsonSchemaVersion.V0_1_0 */;
            case '2.0.0':
                return 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
            default:
                return _default;
        }
    }
    JsonSchemaVersion.from = from;
})(JsonSchemaVersion || (JsonSchemaVersion = {}));
export class UUIDMap {
    constructor(other) {
        this.current = Object.create(null);
        if (other) {
            for (const key of Object.keys(other.current)) {
                const value = other.current[key];
                if (Array.isArray(value)) {
                    this.current[key] = value.slice();
                }
                else {
                    this.current[key] = value;
                }
            }
        }
    }
    start() {
        this.last = this.current;
        this.current = Object.create(null);
    }
    getUUID(identifier) {
        const lastValue = this.last ? this.last[identifier] : undefined;
        let result = undefined;
        if (lastValue !== undefined) {
            if (Array.isArray(lastValue)) {
                result = lastValue.shift();
                if (lastValue.length === 0) {
                    delete this.last[identifier];
                }
            }
            else {
                result = lastValue;
                delete this.last[identifier];
            }
        }
        if (result === undefined) {
            result = UUID.generateUuid();
        }
        const currentValue = this.current[identifier];
        if (currentValue === undefined) {
            this.current[identifier] = result;
        }
        else {
            if (Array.isArray(currentValue)) {
                currentValue.push(result);
            }
            else {
                const arrayValue = [currentValue];
                arrayValue.push(result);
                this.current[identifier] = arrayValue;
            }
        }
        return result;
    }
    finish() {
        this.last = undefined;
    }
}
export var TaskConfigSource;
(function (TaskConfigSource) {
    TaskConfigSource[TaskConfigSource["TasksJson"] = 0] = "TasksJson";
    TaskConfigSource[TaskConfigSource["WorkspaceFile"] = 1] = "WorkspaceFile";
    TaskConfigSource[TaskConfigSource["User"] = 2] = "User";
})(TaskConfigSource || (TaskConfigSource = {}));
class ConfigurationParser {
    constructor(workspaceFolder, workspace, platform, problemReporter, uuidMap) {
        this.workspaceFolder = workspaceFolder;
        this.workspace = workspace;
        this.platform = platform;
        this.problemReporter = problemReporter;
        this.uuidMap = uuidMap;
    }
    run(fileConfig, source, contextKeyService) {
        const engine = ExecutionEngine.from(fileConfig);
        const schemaVersion = JsonSchemaVersion.from(fileConfig);
        const context = {
            workspaceFolder: this.workspaceFolder,
            workspace: this.workspace,
            problemReporter: this.problemReporter,
            uuidMap: this.uuidMap,
            namedProblemMatchers: {},
            engine,
            schemaVersion,
            platform: this.platform,
            taskLoadIssues: [],
            contextKeyService,
        };
        const taskParseResult = this.createTaskRunnerConfiguration(fileConfig, context, source);
        return {
            validationStatus: this.problemReporter.status,
            custom: taskParseResult.custom,
            configured: taskParseResult.configured,
            engine,
        };
    }
    createTaskRunnerConfiguration(fileConfig, context, source) {
        const globals = Globals.from(fileConfig, context);
        if (this.problemReporter.status.isFatal()) {
            return { custom: [], configured: [] };
        }
        context.namedProblemMatchers = ProblemMatcherConverter.namedFrom(fileConfig.declares, context);
        let globalTasks = undefined;
        let externalGlobalTasks = undefined;
        if (fileConfig.windows && context.platform === 3 /* Platform.Windows */) {
            globalTasks = TaskParser.from(fileConfig.windows.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.windows.tasks;
        }
        else if (fileConfig.osx && context.platform === 1 /* Platform.Mac */) {
            globalTasks = TaskParser.from(fileConfig.osx.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.osx.tasks;
        }
        else if (fileConfig.linux && context.platform === 2 /* Platform.Linux */) {
            globalTasks = TaskParser.from(fileConfig.linux.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.linux.tasks;
        }
        if (context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */ &&
            globalTasks &&
            globalTasks.length > 0 &&
            externalGlobalTasks &&
            externalGlobalTasks.length > 0) {
            const taskContent = [];
            for (const task of externalGlobalTasks) {
                taskContent.push(JSON.stringify(task, null, 4));
            }
            context.problemReporter.error(nls.localize({
                key: 'TaskParse.noOsSpecificGlobalTasks',
                comment: [
                    '\"Task version 2.0.0\" refers to the 2.0.0 version of the task system. The \"version 2.0.0\" is not localizable as it is a json key and value.',
                ],
            }, "Task version 2.0.0 doesn't support global OS specific tasks. Convert them to a task with a OS specific command. Affected tasks are:\n{0}", taskContent.join('\n')));
        }
        let result = { custom: [], configured: [] };
        if (fileConfig.tasks) {
            result = TaskParser.from(fileConfig.tasks, globals, context, source);
        }
        if (globalTasks) {
            result.custom = TaskParser.assignTasks(result.custom, globalTasks);
        }
        if ((!result.custom || result.custom.length === 0) && globals.command && globals.command.name) {
            const matchers = ProblemMatcherConverter.from(fileConfig.problemMatcher, context).value ?? [];
            const isBackground = fileConfig.isBackground
                ? !!fileConfig.isBackground
                : fileConfig.isWatching
                    ? !!fileConfig.isWatching
                    : undefined;
            const name = Tasks.CommandString.value(globals.command.name);
            const task = new Tasks.CustomTask(context.uuidMap.getUUID(name), Object.assign({}, source, 'workspace', {
                config: { index: -1, element: fileConfig, workspaceFolder: context.workspaceFolder },
            }), name, Tasks.CUSTOMIZED_TASK_TYPE, {
                name: undefined,
                runtime: undefined,
                presentation: undefined,
                suppressTaskName: true,
            }, false, { reevaluateOnRerun: true }, {
                name: name,
                identifier: name,
                group: Tasks.TaskGroup.Build,
                isBackground: isBackground,
                problemMatchers: matchers,
            });
            const taskGroupKind = GroupKind.from(fileConfig.group);
            if (taskGroupKind !== undefined) {
                task.configurationProperties.group = taskGroupKind;
            }
            else if (fileConfig.group === 'none') {
                task.configurationProperties.group = undefined;
            }
            CustomTask.fillGlobals(task, globals);
            CustomTask.fillDefaults(task, context);
            result.custom = [task];
        }
        result.custom = result.custom || [];
        result.configured = result.configured || [];
        return result;
    }
}
const uuidMaps = new Map();
const recentUuidMaps = new Map();
export function parse(workspaceFolder, workspace, platform, configuration, logger, source, contextKeyService, isRecents = false) {
    const recentOrOtherMaps = isRecents ? recentUuidMaps : uuidMaps;
    let selectedUuidMaps = recentOrOtherMaps.get(source);
    if (!selectedUuidMaps) {
        recentOrOtherMaps.set(source, new Map());
        selectedUuidMaps = recentOrOtherMaps.get(source);
    }
    let uuidMap = selectedUuidMaps.get(workspaceFolder.uri.toString());
    if (!uuidMap) {
        uuidMap = new UUIDMap();
        selectedUuidMaps.set(workspaceFolder.uri.toString(), uuidMap);
    }
    try {
        uuidMap.start();
        return new ConfigurationParser(workspaceFolder, workspace, platform, logger, uuidMap).run(configuration, source, contextKeyService);
    }
    finally {
        uuidMap.finish();
    }
}
export function createCustomTask(contributedTask, configuredProps) {
    return CustomTask.createCustomTask(contributedTask, configuredProps);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi90YXNrQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFJN0QsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBTXZELE9BQU8sRUFFTixvQkFBb0IsRUFFcEIscUJBQXFCLEVBQ3JCLHNCQUFzQixHQUV0QixNQUFNLHFCQUFxQixDQUFBO0FBRzVCLE9BQU8sS0FBSyxLQUFLLE1BQU0sWUFBWSxDQUFBO0FBQ25DLE9BQU8sRUFBMkIsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUc3RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQU1uRyxNQUFNLENBQU4sSUFBa0IsWUFlakI7QUFmRCxXQUFrQixZQUFZO0lBQzdCOztPQUVHO0lBQ0gsbURBQVUsQ0FBQTtJQUVWOztPQUVHO0lBQ0gsbURBQVUsQ0FBQTtJQUVWOztPQUVHO0lBQ0gsK0NBQVEsQ0FBQTtBQUNULENBQUMsRUFmaUIsWUFBWSxLQUFaLFlBQVksUUFlN0I7QUE4R0QsTUFBTSxLQUFXLGVBQWUsQ0FLL0I7QUFMRCxXQUFpQixlQUFlO0lBQy9CLFNBQWdCLEVBQUUsQ0FBQyxLQUFVO1FBQzVCLE1BQU0sU0FBUyxHQUFvQixLQUFLLENBQUE7UUFDeEMsT0FBTyxTQUFTLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FB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