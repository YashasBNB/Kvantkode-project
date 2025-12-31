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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza0NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBSTdELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQU12RCxPQUFPLEVBRU4sb0JBQW9CLEVBRXBCLHFCQUFxQixFQUNyQixzQkFBc0IsR0FFdEIsTUFBTSxxQkFBcUIsQ0FBQTtBQUc1QixPQUFPLEtBQUssS0FBSyxNQUFNLFlBQVksQ0FBQTtBQUNuQyxPQUFPLEVBQTJCLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHN0YsT0FBTyxFQUFFLDhCQUE4QixFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFNbkcsTUFBTSxDQUFOLElBQWtCLFlBZWpCO0FBZkQsV0FBa0IsWUFBWTtJQUM3Qjs7T0FFRztJQUNILG1EQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILG1EQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILCtDQUFRLENBQUE7QUFDVCxDQUFDLEVBZmlCLFlBQVksS0FBWixZQUFZLFFBZTdCO0FBOEdELE1BQU0sS0FBVyxlQUFlLENBSy9CO0FBTEQsV0FBaUIsZUFBZTtJQUMvQixTQUFnQixFQUFFLENBQUMsS0FBVTtRQUM1QixNQUFNLFNBQVMsR0FBb0IsS0FBSyxDQUFBO1FBQ3hDLE9BQU8sU0FBUyxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJ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