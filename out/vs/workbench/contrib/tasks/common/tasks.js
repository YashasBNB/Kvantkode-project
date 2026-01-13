/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import * as Objects from '../../../../base/common/objects.js';
import { RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
export const USER_TASKS_GROUP_KEY = 'settings';
export const TASK_RUNNING_STATE = new RawContextKey('taskRunning', false, nls.localize('tasks.taskRunningContext', 'Whether a task is currently running.'));
/** Whether the active terminal is a task terminal. */
export const TASK_TERMINAL_ACTIVE = new RawContextKey('taskTerminalActive', false, nls.localize('taskTerminalActive', 'Whether the active terminal is a task terminal.'));
export const TASKS_CATEGORY = nls.localize2('tasksCategory', 'Tasks');
export var ShellQuoting;
(function (ShellQuoting) {
    /**
     * Use character escaping.
     */
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    /**
     * Use strong quoting
     */
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    /**
     * Use weak quoting.
     */
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
export const CUSTOMIZED_TASK_TYPE = '$customized';
(function (ShellQuoting) {
    function from(value) {
        if (!value) {
            return ShellQuoting.Strong;
        }
        switch (value.toLowerCase()) {
            case 'escape':
                return ShellQuoting.Escape;
            case 'strong':
                return ShellQuoting.Strong;
            case 'weak':
                return ShellQuoting.Weak;
            default:
                return ShellQuoting.Strong;
        }
    }
    ShellQuoting.from = from;
})(ShellQuoting || (ShellQuoting = {}));
export var CommandOptions;
(function (CommandOptions) {
    CommandOptions.defaults = { cwd: '${workspaceFolder}' };
})(CommandOptions || (CommandOptions = {}));
export var RevealKind;
(function (RevealKind) {
    /**
     * Always brings the terminal to front if the task is executed.
     */
    RevealKind[RevealKind["Always"] = 1] = "Always";
    /**
     * Only brings the terminal to front if a problem is detected executing the task
     * e.g. the task couldn't be started,
     * the task ended with an exit code other than zero,
     * or the problem matcher found an error.
     */
    RevealKind[RevealKind["Silent"] = 2] = "Silent";
    /**
     * The terminal never comes to front when the task is executed.
     */
    RevealKind[RevealKind["Never"] = 3] = "Never";
})(RevealKind || (RevealKind = {}));
(function (RevealKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'always':
                return RevealKind.Always;
            case 'silent':
                return RevealKind.Silent;
            case 'never':
                return RevealKind.Never;
            default:
                return RevealKind.Always;
        }
    }
    RevealKind.fromString = fromString;
})(RevealKind || (RevealKind = {}));
export var RevealProblemKind;
(function (RevealProblemKind) {
    /**
     * Never reveals the problems panel when this task is executed.
     */
    RevealProblemKind[RevealProblemKind["Never"] = 1] = "Never";
    /**
     * Only reveals the problems panel if a problem is found.
     */
    RevealProblemKind[RevealProblemKind["OnProblem"] = 2] = "OnProblem";
    /**
     * Never reveals the problems panel when this task is executed.
     */
    RevealProblemKind[RevealProblemKind["Always"] = 3] = "Always";
})(RevealProblemKind || (RevealProblemKind = {}));
(function (RevealProblemKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'always':
                return RevealProblemKind.Always;
            case 'never':
                return RevealProblemKind.Never;
            case 'onproblem':
                return RevealProblemKind.OnProblem;
            default:
                return RevealProblemKind.OnProblem;
        }
    }
    RevealProblemKind.fromString = fromString;
})(RevealProblemKind || (RevealProblemKind = {}));
export var PanelKind;
(function (PanelKind) {
    /**
     * Shares a panel with other tasks. This is the default.
     */
    PanelKind[PanelKind["Shared"] = 1] = "Shared";
    /**
     * Uses a dedicated panel for this tasks. The panel is not
     * shared with other tasks.
     */
    PanelKind[PanelKind["Dedicated"] = 2] = "Dedicated";
    /**
     * Creates a new panel whenever this task is executed.
     */
    PanelKind[PanelKind["New"] = 3] = "New";
})(PanelKind || (PanelKind = {}));
(function (PanelKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'shared':
                return PanelKind.Shared;
            case 'dedicated':
                return PanelKind.Dedicated;
            case 'new':
                return PanelKind.New;
            default:
                return PanelKind.Shared;
        }
    }
    PanelKind.fromString = fromString;
})(PanelKind || (PanelKind = {}));
export var PresentationOptions;
(function (PresentationOptions) {
    PresentationOptions.defaults = {
        echo: true,
        reveal: RevealKind.Always,
        revealProblems: RevealProblemKind.Never,
        focus: false,
        panel: PanelKind.Shared,
        showReuseMessage: true,
        clear: false,
    };
})(PresentationOptions || (PresentationOptions = {}));
export var RuntimeType;
(function (RuntimeType) {
    RuntimeType[RuntimeType["Shell"] = 1] = "Shell";
    RuntimeType[RuntimeType["Process"] = 2] = "Process";
    RuntimeType[RuntimeType["CustomExecution"] = 3] = "CustomExecution";
})(RuntimeType || (RuntimeType = {}));
(function (RuntimeType) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'shell':
                return RuntimeType.Shell;
            case 'process':
                return RuntimeType.Process;
            case 'customExecution':
                return RuntimeType.CustomExecution;
            default:
                return RuntimeType.Process;
        }
    }
    RuntimeType.fromString = fromString;
    function toString(value) {
        switch (value) {
            case RuntimeType.Shell:
                return 'shell';
            case RuntimeType.Process:
                return 'process';
            case RuntimeType.CustomExecution:
                return 'customExecution';
            default:
                return 'process';
        }
    }
    RuntimeType.toString = toString;
})(RuntimeType || (RuntimeType = {}));
export var CommandString;
(function (CommandString) {
    function value(value) {
        if (Types.isString(value)) {
            return value;
        }
        else {
            return value.value;
        }
    }
    CommandString.value = value;
})(CommandString || (CommandString = {}));
export var TaskGroup;
(function (TaskGroup) {
    TaskGroup.Clean = { _id: 'clean', isDefault: false };
    TaskGroup.Build = { _id: 'build', isDefault: false };
    TaskGroup.Rebuild = { _id: 'rebuild', isDefault: false };
    TaskGroup.Test = { _id: 'test', isDefault: false };
    function is(value) {
        return value === TaskGroup.Clean._id || value === TaskGroup.Build._id || value === TaskGroup.Rebuild._id || value === TaskGroup.Test._id;
    }
    TaskGroup.is = is;
    function from(value) {
        if (value === undefined) {
            return undefined;
        }
        else if (Types.isString(value)) {
            if (is(value)) {
                return { _id: value, isDefault: false };
            }
            return undefined;
        }
        else {
            return value;
        }
    }
    TaskGroup.from = from;
})(TaskGroup || (TaskGroup = {}));
export var TaskScope;
(function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
    TaskScope[TaskScope["Folder"] = 3] = "Folder";
})(TaskScope || (TaskScope = {}));
export var TaskSourceKind;
(function (TaskSourceKind) {
    TaskSourceKind.Workspace = 'workspace';
    TaskSourceKind.Extension = 'extension';
    TaskSourceKind.InMemory = 'inMemory';
    TaskSourceKind.WorkspaceFile = 'workspaceFile';
    TaskSourceKind.User = 'user';
    function toConfigurationTarget(kind) {
        switch (kind) {
            case TaskSourceKind.User:
                return 2 /* ConfigurationTarget.USER */;
            case TaskSourceKind.WorkspaceFile:
                return 5 /* ConfigurationTarget.WORKSPACE */;
            default:
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
    }
    TaskSourceKind.toConfigurationTarget = toConfigurationTarget;
})(TaskSourceKind || (TaskSourceKind = {}));
export var DependsOrder;
(function (DependsOrder) {
    DependsOrder["parallel"] = "parallel";
    DependsOrder["sequence"] = "sequence";
})(DependsOrder || (DependsOrder = {}));
export var RunOnOptions;
(function (RunOnOptions) {
    RunOnOptions[RunOnOptions["default"] = 1] = "default";
    RunOnOptions[RunOnOptions["folderOpen"] = 2] = "folderOpen";
})(RunOnOptions || (RunOnOptions = {}));
export var RunOptions;
(function (RunOptions) {
    RunOptions.defaults = {
        reevaluateOnRerun: true,
        runOn: RunOnOptions.default,
        instanceLimit: 1,
    };
})(RunOptions || (RunOptions = {}));
export class CommonTask {
    constructor(id, label, type, runOptions, configurationProperties, source) {
        /**
         * The cached label.
         */
        this._label = '';
        this._id = id;
        if (label) {
            this._label = label;
        }
        if (type) {
            this.type = type;
        }
        this.runOptions = runOptions;
        this.configurationProperties = configurationProperties;
        this._source = source;
    }
    getDefinition(useSource) {
        return undefined;
    }
    getMapKey() {
        return this._id;
    }
    getKey() {
        return undefined;
    }
    getCommonTaskId() {
        const key = { folder: this.getFolderId(), id: this._id };
        return JSON.stringify(key);
    }
    clone() {
        return this.fromObject(Object.assign({}, this));
    }
    getWorkspaceFolder() {
        return undefined;
    }
    getWorkspaceFileName() {
        return undefined;
    }
    getTelemetryKind() {
        return 'unknown';
    }
    matches(key, compareId = false) {
        if (key === undefined) {
            return false;
        }
        if (Types.isString(key)) {
            return (key === this._label ||
                key === this.configurationProperties.identifier ||
                (compareId && key === this._id));
        }
        const identifier = this.getDefinition(true);
        return identifier !== undefined && identifier._key === key._key;
    }
    getQualifiedLabel() {
        const workspaceFolder = this.getWorkspaceFolder();
        if (workspaceFolder) {
            return `${this._label} (${workspaceFolder.name})`;
        }
        else {
            return this._label;
        }
    }
    getTaskExecution() {
        const result = {
            id: this._id,
            task: this,
        };
        return result;
    }
    addTaskLoadMessages(messages) {
        if (this._taskLoadMessages === undefined) {
            this._taskLoadMessages = [];
        }
        if (messages) {
            this._taskLoadMessages = this._taskLoadMessages.concat(messages);
        }
    }
    get taskLoadMessages() {
        return this._taskLoadMessages;
    }
}
/**
 * For tasks of type shell or process, this is created upon parse
 * of the tasks.json or workspace file.
 * For ContributedTasks of all other types, this is the result of
 * resolving a ConfiguringTask.
 */
export class CustomTask extends CommonTask {
    constructor(id, source, label, type, command, hasDefinedMatchers, runOptions, configurationProperties) {
        super(id, label, undefined, runOptions, configurationProperties, source);
        /**
         * The command configuration
         */
        this.command = {};
        this._source = source;
        this.hasDefinedMatchers = hasDefinedMatchers;
        if (command) {
            this.command = command;
        }
    }
    clone() {
        return new CustomTask(this._id, this._source, this._label, this.type, this.command, this.hasDefinedMatchers, this.runOptions, this.configurationProperties);
    }
    customizes() {
        if (this._source && this._source.customizes) {
            return this._source.customizes;
        }
        return undefined;
    }
    getDefinition(useSource = false) {
        if (useSource && this._source.customizes !== undefined) {
            return this._source.customizes;
        }
        else {
            let type;
            const commandRuntime = this.command ? this.command.runtime : undefined;
            switch (commandRuntime) {
                case RuntimeType.Shell:
                    type = 'shell';
                    break;
                case RuntimeType.Process:
                    type = 'process';
                    break;
                case RuntimeType.CustomExecution:
                    type = 'customExecution';
                    break;
                case undefined:
                    type = '$composite';
                    break;
                default:
                    throw new Error('Unexpected task runtime');
            }
            const result = {
                type,
                _key: this._id,
                id: this._id,
            };
            return result;
        }
    }
    static is(value) {
        return value instanceof CustomTask;
    }
    getMapKey() {
        const workspaceFolder = this._source.config.workspaceFolder;
        return workspaceFolder
            ? `${workspaceFolder.uri.toString()}|${this._id}|${this.instance}`
            : `${this._id}|${this.instance}`;
    }
    getFolderId() {
        return this._source.kind === TaskSourceKind.User
            ? USER_TASKS_GROUP_KEY
            : this._source.config.workspaceFolder?.uri.toString();
    }
    getCommonTaskId() {
        return this._source.customizes
            ? super.getCommonTaskId()
            : (this.getKey() ?? super.getCommonTaskId());
    }
    /**
     * @returns A key representing the task
     */
    getKey() {
        const workspaceFolder = this.getFolderId();
        if (!workspaceFolder) {
            return undefined;
        }
        let id = this.configurationProperties.identifier;
        if (this._source.kind !== TaskSourceKind.Workspace) {
            id += this._source.kind;
        }
        const key = { type: CUSTOMIZED_TASK_TYPE, folder: workspaceFolder, id };
        return JSON.stringify(key);
    }
    getWorkspaceFolder() {
        return this._source.config.workspaceFolder;
    }
    getWorkspaceFileName() {
        return this._source.config.workspace && this._source.config.workspace.configuration
            ? resources.basename(this._source.config.workspace.configuration)
            : undefined;
    }
    getTelemetryKind() {
        if (this._source.customizes) {
            return 'workspace>extension';
        }
        else {
            return 'workspace';
        }
    }
    fromObject(object) {
        return new CustomTask(object._id, object._source, object._label, object.type, object.command, object.hasDefinedMatchers, object.runOptions, object.configurationProperties);
    }
}
/**
 * After a contributed task has been parsed, but before
 * the task has been resolved via the extension, its properties
 * are stored in this
 */
export class ConfiguringTask extends CommonTask {
    constructor(id, source, label, type, configures, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this._source = source;
        this.configures = configures;
    }
    static is(value) {
        return value instanceof ConfiguringTask;
    }
    fromObject(object) {
        return object;
    }
    getDefinition() {
        return this.configures;
    }
    getWorkspaceFileName() {
        return this._source.config.workspace && this._source.config.workspace.configuration
            ? resources.basename(this._source.config.workspace.configuration)
            : undefined;
    }
    getWorkspaceFolder() {
        return this._source.config.workspaceFolder;
    }
    getFolderId() {
        return this._source.kind === TaskSourceKind.User
            ? USER_TASKS_GROUP_KEY
            : this._source.config.workspaceFolder?.uri.toString();
    }
    getKey() {
        const workspaceFolder = this.getFolderId();
        if (!workspaceFolder) {
            return undefined;
        }
        let id = this.configurationProperties.identifier;
        if (this._source.kind !== TaskSourceKind.Workspace) {
            id += this._source.kind;
        }
        const key = { type: CUSTOMIZED_TASK_TYPE, folder: workspaceFolder, id };
        return JSON.stringify(key);
    }
}
/**
 * A task from an extension created via resolveTask or provideTask
 */
export class ContributedTask extends CommonTask {
    constructor(id, source, label, type, defines, command, hasDefinedMatchers, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this.defines = defines;
        this.hasDefinedMatchers = hasDefinedMatchers;
        this.command = command;
        this.icon = configurationProperties.icon;
        this.hide = configurationProperties.hide;
    }
    clone() {
        return new ContributedTask(this._id, this._source, this._label, this.type, this.defines, this.command, this.hasDefinedMatchers, this.runOptions, this.configurationProperties);
    }
    getDefinition() {
        return this.defines;
    }
    static is(value) {
        return value instanceof ContributedTask;
    }
    getMapKey() {
        const workspaceFolder = this._source.workspaceFolder;
        return workspaceFolder
            ? `${this._source.scope.toString()}|${workspaceFolder.uri.toString()}|${this._id}|${this.instance}`
            : `${this._source.scope.toString()}|${this._id}|${this.instance}`;
    }
    getFolderId() {
        if (this._source.scope === 3 /* TaskScope.Folder */ && this._source.workspaceFolder) {
            return this._source.workspaceFolder.uri.toString();
        }
        return undefined;
    }
    getKey() {
        const key = { type: 'contributed', scope: this._source.scope, id: this._id };
        key.folder = this.getFolderId();
        return JSON.stringify(key);
    }
    getWorkspaceFolder() {
        return this._source.workspaceFolder;
    }
    getTelemetryKind() {
        return 'extension';
    }
    fromObject(object) {
        return new ContributedTask(object._id, object._source, object._label, object.type, object.defines, object.command, object.hasDefinedMatchers, object.runOptions, object.configurationProperties);
    }
}
export class InMemoryTask extends CommonTask {
    constructor(id, source, label, type, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this._source = source;
    }
    clone() {
        return new InMemoryTask(this._id, this._source, this._label, this.type, this.runOptions, this.configurationProperties);
    }
    static is(value) {
        return value instanceof InMemoryTask;
    }
    getTelemetryKind() {
        return 'composite';
    }
    getMapKey() {
        return `${this._id}|${this.instance}`;
    }
    getFolderId() {
        return undefined;
    }
    fromObject(object) {
        return new InMemoryTask(object._id, object._source, object._label, object.type, object.runOptions, object.configurationProperties);
    }
}
export var ExecutionEngine;
(function (ExecutionEngine) {
    ExecutionEngine[ExecutionEngine["Process"] = 1] = "Process";
    ExecutionEngine[ExecutionEngine["Terminal"] = 2] = "Terminal";
})(ExecutionEngine || (ExecutionEngine = {}));
(function (ExecutionEngine) {
    ExecutionEngine._default = ExecutionEngine.Terminal;
})(ExecutionEngine || (ExecutionEngine = {}));
export var JsonSchemaVersion;
(function (JsonSchemaVersion) {
    JsonSchemaVersion[JsonSchemaVersion["V0_1_0"] = 1] = "V0_1_0";
    JsonSchemaVersion[JsonSchemaVersion["V2_0_0"] = 2] = "V2_0_0";
})(JsonSchemaVersion || (JsonSchemaVersion = {}));
export class TaskSorter {
    constructor(workspaceFolders) {
        this._order = new Map();
        for (let i = 0; i < workspaceFolders.length; i++) {
            this._order.set(workspaceFolders[i].uri.toString(), i);
        }
    }
    compare(a, b) {
        const aw = a.getWorkspaceFolder();
        const bw = b.getWorkspaceFolder();
        if (aw && bw) {
            let ai = this._order.get(aw.uri.toString());
            ai = ai === undefined ? 0 : ai + 1;
            let bi = this._order.get(bw.uri.toString());
            bi = bi === undefined ? 0 : bi + 1;
            if (ai === bi) {
                return a._label.localeCompare(b._label);
            }
            else {
                return ai - bi;
            }
        }
        else if (!aw && bw) {
            return -1;
        }
        else if (aw && !bw) {
            return +1;
        }
        else {
            return 0;
        }
    }
}
export var TaskRunType;
(function (TaskRunType) {
    TaskRunType["SingleRun"] = "singleRun";
    TaskRunType["Background"] = "background";
})(TaskRunType || (TaskRunType = {}));
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates that a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates that a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates that a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates that a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates that a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates that a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates that a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates that a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates that a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates that a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates that a task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates that a task's problem matcher has ended */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates that a task's problem matcher has found errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
export var TaskRunSource;
(function (TaskRunSource) {
    TaskRunSource[TaskRunSource["System"] = 0] = "System";
    TaskRunSource[TaskRunSource["User"] = 1] = "User";
    TaskRunSource[TaskRunSource["FolderOpen"] = 2] = "FolderOpen";
    TaskRunSource[TaskRunSource["ConfigurationChange"] = 3] = "ConfigurationChange";
    TaskRunSource[TaskRunSource["Reconnect"] = 4] = "Reconnect";
})(TaskRunSource || (TaskRunSource = {}));
export var TaskEvent;
(function (TaskEvent) {
    function common(task) {
        return {
            taskId: task._id,
            taskName: task.configurationProperties.name,
            runType: task.configurationProperties.isBackground
                ? "background" /* TaskRunType.Background */
                : "singleRun" /* TaskRunType.SingleRun */,
            group: task.configurationProperties.group,
            __task: task,
        };
    }
    function start(task, terminalId, resolvedVariables) {
        return {
            ...common(task),
            kind: TaskEventKind.Start,
            terminalId,
            resolvedVariables,
        };
    }
    TaskEvent.start = start;
    function processStarted(task, terminalId, processId) {
        return {
            ...common(task),
            kind: TaskEventKind.ProcessStarted,
            terminalId,
            processId,
        };
    }
    TaskEvent.processStarted = processStarted;
    function processEnded(task, terminalId, exitCode) {
        return {
            ...common(task),
            kind: TaskEventKind.ProcessEnded,
            terminalId,
            exitCode,
        };
    }
    TaskEvent.processEnded = processEnded;
    function terminated(task, terminalId, exitReason) {
        return {
            ...common(task),
            kind: TaskEventKind.Terminated,
            exitReason,
            terminalId,
        };
    }
    TaskEvent.terminated = terminated;
    function general(kind, task, terminalId) {
        return {
            ...common(task),
            kind,
            terminalId,
        };
    }
    TaskEvent.general = general;
    function changed() {
        return { kind: TaskEventKind.Changed };
    }
    TaskEvent.changed = changed;
})(TaskEvent || (TaskEvent = {}));
export var KeyedTaskIdentifier;
(function (KeyedTaskIdentifier) {
    function sortedStringify(literal) {
        const keys = Object.keys(literal).sort();
        let result = '';
        for (const key of keys) {
            let stringified = literal[key];
            if (stringified instanceof Object) {
                stringified = sortedStringify(stringified);
            }
            else if (typeof stringified === 'string') {
                stringified = stringified.replace(/,/g, ',,');
            }
            result += key + ',' + stringified + ',';
        }
        return result;
    }
    function create(value) {
        const resultKey = sortedStringify(value);
        const result = { _key: resultKey, type: value.taskType };
        Object.assign(result, value);
        return result;
    }
    KeyedTaskIdentifier.create = create;
})(KeyedTaskIdentifier || (KeyedTaskIdentifier = {}));
export var TaskSettingId;
(function (TaskSettingId) {
    TaskSettingId["AutoDetect"] = "task.autoDetect";
    TaskSettingId["SaveBeforeRun"] = "task.saveBeforeRun";
    TaskSettingId["ShowDecorations"] = "task.showDecorations";
    TaskSettingId["ProblemMatchersNeverPrompt"] = "task.problemMatchers.neverPrompt";
    TaskSettingId["SlowProviderWarning"] = "task.slowProviderWarning";
    TaskSettingId["QuickOpenHistory"] = "task.quickOpen.history";
    TaskSettingId["QuickOpenDetail"] = "task.quickOpen.detail";
    TaskSettingId["QuickOpenSkip"] = "task.quickOpen.skip";
    TaskSettingId["QuickOpenShowAll"] = "task.quickOpen.showAll";
    TaskSettingId["AllowAutomaticTasks"] = "task.allowAutomaticTasks";
    TaskSettingId["Reconnection"] = "task.reconnection";
    TaskSettingId["VerboseLogging"] = "task.verboseLogging";
})(TaskSettingId || (TaskSettingId = {}));
export var TasksSchemaProperties;
(function (TasksSchemaProperties) {
    TasksSchemaProperties["Tasks"] = "tasks";
    TasksSchemaProperties["SuppressTaskName"] = "tasks.suppressTaskName";
    TasksSchemaProperties["Windows"] = "tasks.windows";
    TasksSchemaProperties["Osx"] = "tasks.osx";
    TasksSchemaProperties["Linux"] = "tasks.linux";
    TasksSchemaProperties["ShowOutput"] = "tasks.showOutput";
    TasksSchemaProperties["IsShellCommand"] = "tasks.isShellCommand";
    TasksSchemaProperties["ServiceTestSetting"] = "tasks.service.testSetting";
})(TasksSchemaProperties || (TasksSchemaProperties = {}));
export var TaskDefinition;
(function (TaskDefinition) {
    function createTaskIdentifier(external, reporter) {
        const definition = TaskDefinitionRegistry.get(external.type);
        if (definition === undefined) {
            // We have no task definition so we can't sanitize the literal. Take it as is
            const copy = Objects.deepClone(external);
            delete copy._key;
            return KeyedTaskIdentifier.create(copy);
        }
        const literal = Object.create(null);
        literal.type = definition.taskType;
        const required = new Set();
        definition.required.forEach((element) => required.add(element));
        const properties = definition.properties;
        for (const property of Object.keys(properties)) {
            const value = external[property];
            if (value !== undefined && value !== null) {
                literal[property] = value;
            }
            else if (required.has(property)) {
                const schema = properties[property];
                if (schema.default !== undefined) {
                    literal[property] = Objects.deepClone(schema.default);
                }
                else {
                    switch (schema.type) {
                        case 'boolean':
                            literal[property] = false;
                            break;
                        case 'number':
                        case 'integer':
                            literal[property] = 0;
                            break;
                        case 'string':
                            literal[property] = '';
                            break;
                        default:
                            reporter.error(nls.localize('TaskDefinition.missingRequiredProperty', "Error: the task identifier '{0}' is missing the required property '{1}'. The task identifier will be ignored.", JSON.stringify(external, undefined, 0), property));
                            return undefined;
                    }
                }
            }
        }
        return KeyedTaskIdentifier.create(literal);
    }
    TaskDefinition.createTaskIdentifier = createTaskIdentifier;
})(TaskDefinition || (TaskDefinition = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2NvbW1vbi90YXNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBSzdELE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUtwRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUE7QUFFOUMsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxhQUFhLENBQ2xELGFBQWEsRUFDYixLQUFLLEVBQ0wsR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxzQ0FBc0MsQ0FBQyxDQUNoRixDQUFBO0FBQ0Qsc0RBQXNEO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLElBQUksYUFBYSxDQUNwRCxvQkFBb0IsRUFDcEIsS0FBSyxFQUNMLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsaURBQWlELENBQUMsQ0FDckYsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUVyRSxNQUFNLENBQU4sSUFBWSxZQWVYO0FBZkQsV0FBWSxZQUFZO0lBQ3ZCOztPQUVHO0lBQ0gsbURBQVUsQ0FBQTtJQUVWOztPQUVHO0lBQ0gsbURBQVUsQ0FBQTtJQUVWOztPQUVHO0lBQ0gsK0NBQVEsQ0FBQTtBQUNULENBQUMsRUFmVyxZQUFZLEtBQVosWUFBWSxRQWV2QjtBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGFBQWEsQ0FBQTtBQUVqRCxXQUFpQixZQUFZO0lBQzVCLFNBQWdCLElBQUksQ0FBYSxLQUFhO1FBQzdDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQTtRQUMzQixDQUFDO1FBQ0QsUUFBUSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUM3QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFBO1lBQzNCLEtBQUssUUFBUTtnQkFDWixPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUE7WUFDM0IsS0FBSyxNQUFNO2dCQUNWLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQTtZQUN6QjtnQkFDQyxPQUFPLFlBQVksQ0FBQyxNQUFNLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFkZSxpQkFBSSxPQWNuQixDQUFBO0FBQ0YsQ0FBQyxFQWhCZ0IsWUFBWSxLQUFaLFlBQVksUUFnQjVCO0FBNERELE1BQU0sS0FBVyxjQUFjLENBRTlCO0FBRkQsV0FBaUIsY0FBYztJQUNqQix1QkFBUSxHQUFtQixFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFBO0FBQ3RFLENBQUMsRUFGZ0IsY0FBYyxLQUFkLGNBQWMsUUFFOUI7QUFFRCxNQUFNLENBQU4sSUFBWSxVQWtCWDtBQWxCRCxXQUFZLFVBQVU7SUFDckI7O09BRUc7SUFDSCwrQ0FBVSxDQUFBO0lBRVY7Ozs7O09BS0c7SUFDSCwrQ0FBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCw2Q0FBUyxDQUFBO0FBQ1YsQ0FBQyxFQWxCVyxVQUFVLEtBQVYsVUFBVSxRQWtCckI7QUFFRCxXQUFpQixVQUFVO0lBQzFCLFNBQWdCLFVBQVUsQ0FBYSxLQUFhO1FBQ25ELFFBQVEsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDN0IsS0FBSyxRQUFRO2dCQUNaLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQTtZQUN6QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFBO1lBQ3pCLEtBQUssT0FBTztnQkFDWCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUE7WUFDeEI7Z0JBQ0MsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBWGUscUJBQVUsYUFXekIsQ0FBQTtBQUNGLENBQUMsRUFiZ0IsVUFBVSxLQUFWLFVBQVUsUUFhMUI7QUFFRCxNQUFNLENBQU4sSUFBWSxpQkFlWDtBQWZELFdBQVksaUJBQWlCO0lBQzVCOztPQUVHO0lBQ0gsMkRBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsbUVBQWEsQ0FBQTtJQUViOztPQUVHO0lBQ0gsNkRBQVUsQ0FBQTtBQUNYLENBQUMsRUFmVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBZTVCO0FBRUQsV0FBaUIsaUJBQWlCO0lBQ2pDLFNBQWdCLFVBQVUsQ0FBYSxLQUFhO1FBQ25ELFFBQVEsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDN0IsS0FBSyxRQUFRO2dCQUNaLE9BQU8saUJBQWlCLENBQUMsTUFBTSxDQUFBO1lBQ2hDLEtBQUssT0FBTztnQkFDWCxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtZQUMvQixLQUFLLFdBQVc7Z0JBQ2YsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUE7WUFDbkM7Z0JBQ0MsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUE7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFYZSw0QkFBVSxhQVd6QixDQUFBO0FBQ0YsQ0FBQyxFQWJnQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBYWpDO0FBRUQsTUFBTSxDQUFOLElBQVksU0FnQlg7QUFoQkQsV0FBWSxTQUFTO0lBQ3BCOztPQUVHO0lBQ0gsNkNBQVUsQ0FBQTtJQUVWOzs7T0FHRztJQUNILG1EQUFhLENBQUE7SUFFYjs7T0FFRztJQUNILHVDQUFPLENBQUE7QUFDUixDQUFDLEVBaEJXLFNBQVMsS0FBVCxTQUFTLFFBZ0JwQjtBQUVELFdBQWlCLFNBQVM7SUFDekIsU0FBZ0IsVUFBVSxDQUFDLEtBQWE7UUFDdkMsUUFBUSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUM3QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFBO1lBQ3hCLEtBQUssV0FBVztnQkFDZixPQUFPLFNBQVMsQ0FBQyxTQUFTLENBQUE7WUFDM0IsS0FBSyxLQUFLO2dCQUNULE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQTtZQUNyQjtnQkFDQyxPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFYZSxvQkFBVSxhQVd6QixDQUFBO0FBQ0YsQ0FBQyxFQWJnQixTQUFTLEtBQVQsU0FBUyxRQWF6QjtBQXNERCxNQUFNLEtBQVcsbUJBQW1CLENBVW5DO0FBVkQsV0FBaUIsbUJBQW1CO0lBQ3RCLDRCQUFRLEdBQXlCO1FBQzdDLElBQUksRUFBRSxJQUFJO1FBQ1YsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1FBQ3pCLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO1FBQ3ZDLEtBQUssRUFBRSxLQUFLO1FBQ1osS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNO1FBQ3ZCLGdCQUFnQixFQUFFLElBQUk7UUFDdEIsS0FBSyxFQUFFLEtBQUs7S0FDWixDQUFBO0FBQ0YsQ0FBQyxFQVZnQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBVW5DO0FBRUQsTUFBTSxDQUFOLElBQVksV0FJWDtBQUpELFdBQVksV0FBVztJQUN0QiwrQ0FBUyxDQUFBO0lBQ1QsbURBQVcsQ0FBQTtJQUNYLG1FQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFKVyxXQUFXLEtBQVgsV0FBVyxRQUl0QjtBQUVELFdBQWlCLFdBQVc7SUFDM0IsU0FBZ0IsVUFBVSxDQUFDLEtBQWE7UUFDdkMsUUFBUSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUM3QixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFBO1lBQ3pCLEtBQUssU0FBUztnQkFDYixPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUE7WUFDM0IsS0FBSyxpQkFBaUI7Z0JBQ3JCLE9BQU8sV0FBVyxDQUFDLGVBQWUsQ0FBQTtZQUNuQztnQkFDQyxPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFYZSxzQkFBVSxhQVd6QixDQUFBO0lBQ0QsU0FBZ0IsUUFBUSxDQUFDLEtBQWtCO1FBQzFDLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLFdBQVcsQ0FBQyxLQUFLO2dCQUNyQixPQUFPLE9BQU8sQ0FBQTtZQUNmLEtBQUssV0FBVyxDQUFDLE9BQU87Z0JBQ3ZCLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLEtBQUssV0FBVyxDQUFDLGVBQWU7Z0JBQy9CLE9BQU8saUJBQWlCLENBQUE7WUFDekI7Z0JBQ0MsT0FBTyxTQUFTLENBQUE7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFYZSxvQkFBUSxXQVd2QixDQUFBO0FBQ0YsQ0FBQyxFQXpCZ0IsV0FBVyxLQUFYLFdBQVcsUUF5QjNCO0FBU0QsTUFBTSxLQUFXLGFBQWEsQ0FRN0I7QUFSRCxXQUFpQixhQUFhO0lBQzdCLFNBQWdCLEtBQUssQ0FBQyxLQUFvQjtRQUN6QyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBTmUsbUJBQUssUUFNcEIsQ0FBQTtBQUNGLENBQUMsRUFSZ0IsYUFBYSxLQUFiLGFBQWEsUUFRN0I7QUF3Q0QsTUFBTSxLQUFXLFNBQVMsQ0F5QnpCO0FBekJELFdBQWlCLFNBQVM7SUFDWixlQUFLLEdBQWMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUVyRCxlQUFLLEdBQWMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUVyRCxpQkFBTyxHQUFjLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFFekQsY0FBSSxHQUFjLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFFaEUsU0FBZ0IsRUFBRSxDQUFDLEtBQVU7UUFDNUIsT0FBTyxLQUFLLEtBQUssVUFBQSxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssS0FBSyxVQUFBLEtBQUssQ0FBQyxHQUFHLElBQUksS0FBSyxLQUFLLFVBQUEsT0FBTyxDQUFDLEdBQUcsSUFBSSxLQUFLLEtBQUssVUFBQSxJQUFJLENBQUMsR0FBRyxDQUFBO0lBQ2pHLENBQUM7SUFGZSxZQUFFLEtBRWpCLENBQUE7SUFFRCxTQUFnQixJQUFJLENBQUMsS0FBcUM7UUFDekQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQzthQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFBO1lBQ3hDLENBQUM7WUFDRCxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFYZSxjQUFJLE9BV25CLENBQUE7QUFDRixDQUFDLEVBekJnQixTQUFTLEtBQVQsU0FBUyxRQXlCekI7QUFPRCxNQUFNLENBQU4sSUFBa0IsU0FJakI7QUFKRCxXQUFrQixTQUFTO0lBQzFCLDZDQUFVLENBQUE7SUFDVixtREFBYSxDQUFBO0lBQ2IsNkNBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIsU0FBUyxLQUFULFNBQVMsUUFJMUI7QUFFRCxNQUFNLEtBQVcsY0FBYyxDQWlCOUI7QUFqQkQsV0FBaUIsY0FBYztJQUNqQix3QkFBUyxHQUFnQixXQUFXLENBQUE7SUFDcEMsd0JBQVMsR0FBZ0IsV0FBVyxDQUFBO0lBQ3BDLHVCQUFRLEdBQWUsVUFBVSxDQUFBO0lBQ2pDLDRCQUFhLEdBQW9CLGVBQWUsQ0FBQTtJQUNoRCxtQkFBSSxHQUFXLE1BQU0sQ0FBQTtJQUVsQyxTQUFnQixxQkFBcUIsQ0FBQyxJQUFZO1FBQ2pELFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLGNBQWMsQ0FBQyxJQUFJO2dCQUN2Qix3Q0FBK0I7WUFDaEMsS0FBSyxjQUFjLENBQUMsYUFBYTtnQkFDaEMsNkNBQW9DO1lBQ3JDO2dCQUNDLG9EQUEyQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztJQVRlLG9DQUFxQix3QkFTcEMsQ0FBQTtBQUNGLENBQUMsRUFqQmdCLGNBQWMsS0FBZCxjQUFjLFFBaUI5QjtBQXNFRCxNQUFNLENBQU4sSUFBa0IsWUFHakI7QUFIRCxXQUFrQixZQUFZO0lBQzdCLHFDQUFxQixDQUFBO0lBQ3JCLHFDQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFIaUIsWUFBWSxLQUFaLFlBQVksUUFHN0I7QUFxRUQsTUFBTSxDQUFOLElBQVksWUFHWDtBQUhELFdBQVksWUFBWTtJQUN2QixxREFBVyxDQUFBO0lBQ1gsMkRBQWMsQ0FBQTtBQUNmLENBQUMsRUFIVyxZQUFZLEtBQVosWUFBWSxRQUd2QjtBQVFELE1BQU0sS0FBVyxVQUFVLENBTTFCO0FBTkQsV0FBaUIsVUFBVTtJQUNiLG1CQUFRLEdBQWdCO1FBQ3BDLGlCQUFpQixFQUFFLElBQUk7UUFDdkIsS0FBSyxFQUFFLFlBQVksQ0FBQyxPQUFPO1FBQzNCLGFBQWEsRUFBRSxDQUFDO0tBQ2hCLENBQUE7QUFDRixDQUFDLEVBTmdCLFVBQVUsS0FBVixVQUFVLFFBTTFCO0FBRUQsTUFBTSxPQUFnQixVQUFVO0lBcUIvQixZQUNDLEVBQVUsRUFDVixLQUF5QixFQUN6QixJQUF3QixFQUN4QixVQUF1QixFQUN2Qix1QkFBaUQsRUFDakQsTUFBdUI7UUFyQnhCOztXQUVHO1FBQ0gsV0FBTSxHQUFXLEVBQUUsQ0FBQTtRQW9CbEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDcEIsQ0FBQztRQUNELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHVCQUF1QixDQUFBO1FBQ3RELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxhQUFhLENBQUMsU0FBbUI7UUFDdkMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEIsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBSU0sZUFBZTtRQU1yQixNQUFNLEdBQUcsR0FBbUIsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDeEUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFTSxLQUFLO1FBQ1gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFPLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUlNLGtCQUFrQjtRQUN4QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU0sb0JBQW9CO1FBQzFCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVNLE9BQU8sQ0FDYixHQUE2QyxFQUM3QyxZQUFxQixLQUFLO1FBRTFCLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sQ0FDTixHQUFHLEtBQUssSUFBSSxDQUFDLE1BQU07Z0JBQ25CLEdBQUcsS0FBSyxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVTtnQkFDL0MsQ0FBQyxTQUFTLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDL0IsQ0FBQTtRQUNGLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNDLE9BQU8sVUFBVSxLQUFLLFNBQVMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUE7SUFDaEUsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxLQUFLLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQTtRQUNsRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVNLGdCQUFnQjtRQUN0QixNQUFNLE1BQU0sR0FBbUI7WUFDOUIsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ1osSUFBSSxFQUFPLElBQUk7U0FDZixDQUFBO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sbUJBQW1CLENBQUMsUUFBOEI7UUFDeEQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztDQUNEO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sVUFBVyxTQUFRLFVBQVU7SUFpQnpDLFlBQ0MsRUFBVSxFQUNWLE1BQTJCLEVBQzNCLEtBQWEsRUFDYixJQUFZLEVBQ1osT0FBMEMsRUFDMUMsa0JBQTJCLEVBQzNCLFVBQXVCLEVBQ3ZCLHVCQUFpRDtRQUVqRCxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBZnpFOztXQUVHO1FBQ0gsWUFBTyxHQUEwQixFQUFFLENBQUE7UUFhbEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFBO1FBQzVDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVlLEtBQUs7UUFDcEIsT0FBTyxJQUFJLFVBQVUsQ0FDcEIsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsdUJBQXVCLENBQzVCLENBQUE7SUFDRixDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM3QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBO1FBQy9CLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRWUsYUFBYSxDQUFDLFlBQXFCLEtBQUs7UUFDdkQsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksSUFBWSxDQUFBO1lBQ2hCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDdEUsUUFBUSxjQUFjLEVBQUUsQ0FBQztnQkFDeEIsS0FBSyxXQUFXLENBQUMsS0FBSztvQkFDckIsSUFBSSxHQUFHLE9BQU8sQ0FBQTtvQkFDZCxNQUFLO2dCQUVOLEtBQUssV0FBVyxDQUFDLE9BQU87b0JBQ3ZCLElBQUksR0FBRyxTQUFTLENBQUE7b0JBQ2hCLE1BQUs7Z0JBRU4sS0FBSyxXQUFXLENBQUMsZUFBZTtvQkFDL0IsSUFBSSxHQUFHLGlCQUFpQixDQUFBO29CQUN4QixNQUFLO2dCQUVOLEtBQUssU0FBUztvQkFDYixJQUFJLEdBQUcsWUFBWSxDQUFBO29CQUNuQixNQUFLO2dCQUVOO29CQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQXdCO2dCQUNuQyxJQUFJO2dCQUNKLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRztnQkFDZCxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUc7YUFDWixDQUFBO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBVTtRQUMxQixPQUFPLEtBQUssWUFBWSxVQUFVLENBQUE7SUFDbkMsQ0FBQztJQUVlLFNBQVM7UUFDeEIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO1FBQzNELE9BQU8sZUFBZTtZQUNyQixDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNsRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRVMsV0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxJQUFJO1lBQy9DLENBQUMsQ0FBQyxvQkFBb0I7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUVlLGVBQWU7UUFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVU7WUFDN0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUU7WUFDekIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRDs7T0FFRztJQUNhLE1BQU07UUFNckIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxFQUFFLEdBQVcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVcsQ0FBQTtRQUN6RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwRCxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFlLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFDbkYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFZSxrQkFBa0I7UUFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7SUFDM0MsQ0FBQztJQUVlLG9CQUFvQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYTtZQUNsRixDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO1lBQ2pFLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO0lBRWUsZ0JBQWdCO1FBQy9CLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM3QixPQUFPLHFCQUFxQixDQUFBO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxXQUFXLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFUyxVQUFVLENBQUMsTUFBa0I7UUFDdEMsT0FBTyxJQUFJLFVBQVUsQ0FDcEIsTUFBTSxDQUFDLEdBQUcsRUFDVixNQUFNLENBQUMsT0FBTyxFQUNkLE1BQU0sQ0FBQyxNQUFNLEVBQ2IsTUFBTSxDQUFDLElBQUksRUFDWCxNQUFNLENBQUMsT0FBTyxFQUNkLE1BQU0sQ0FBQyxrQkFBa0IsRUFDekIsTUFBTSxDQUFDLFVBQVUsRUFDakIsTUFBTSxDQUFDLHVCQUF1QixDQUM5QixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFROUMsWUFDQyxFQUFVLEVBQ1YsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsSUFBd0IsRUFDeEIsVUFBK0IsRUFDL0IsVUFBdUIsRUFDdkIsdUJBQWlEO1FBRWpELEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7SUFDN0IsQ0FBQztJQUVNLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBVTtRQUMxQixPQUFPLEtBQUssWUFBWSxlQUFlLENBQUE7SUFDeEMsQ0FBQztJQUVTLFVBQVUsQ0FBQyxNQUFXO1FBQy9CLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVlLGFBQWE7UUFDNUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFZSxvQkFBb0I7UUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWE7WUFDbEYsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUNqRSxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztJQUVlLGtCQUFrQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQTtJQUMzQyxDQUFDO0lBRVMsV0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxJQUFJO1lBQy9DLENBQUMsQ0FBQyxvQkFBb0I7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUVlLE1BQU07UUFNckIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsSUFBSSxFQUFFLEdBQVcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVcsQ0FBQTtRQUN6RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwRCxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEIsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFlLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFDbkYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQTRCOUMsWUFDQyxFQUFVLEVBQ1YsTUFBNEIsRUFDNUIsS0FBYSxFQUNiLElBQXdCLEVBQ3hCLE9BQTRCLEVBQzVCLE9BQThCLEVBQzlCLGtCQUEyQixFQUMzQixVQUF1QixFQUN2Qix1QkFBaUQ7UUFFakQsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtRQUN0QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUE7UUFDNUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLENBQUE7SUFDekMsQ0FBQztJQUVlLEtBQUs7UUFDcEIsT0FBTyxJQUFJLGVBQWUsQ0FDekIsSUFBSSxDQUFDLEdBQUcsRUFDUixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxPQUFPLEVBQ1osSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyx1QkFBdUIsQ0FDNUIsQ0FBQTtJQUNGLENBQUM7SUFFZSxhQUFhO1FBQzVCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFVO1FBQzFCLE9BQU8sS0FBSyxZQUFZLGVBQWUsQ0FBQTtJQUN4QyxDQUFDO0lBRWUsU0FBUztRQUN4QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQTtRQUNwRCxPQUFPLGVBQWU7WUFDckIsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDbkcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDbkUsQ0FBQztJQUVTLFdBQVc7UUFDcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssNkJBQXFCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM3RSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNuRCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVlLE1BQU07UUFRckIsTUFBTSxHQUFHLEdBQW9CLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM3RixHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUMvQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVlLGtCQUFrQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFBO0lBQ3BDLENBQUM7SUFFZSxnQkFBZ0I7UUFDL0IsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVTLFVBQVUsQ0FBQyxNQUF1QjtRQUMzQyxPQUFPLElBQUksZUFBZSxDQUN6QixNQUFNLENBQUMsR0FBRyxFQUNWLE1BQU0sQ0FBQyxPQUFPLEVBQ2QsTUFBTSxDQUFDLE1BQU0sRUFDYixNQUFNLENBQUMsSUFBSSxFQUNYLE1BQU0sQ0FBQyxPQUFPLEVBQ2QsTUFBTSxDQUFDLE9BQU8sRUFDZCxNQUFNLENBQUMsa0JBQWtCLEVBQ3pCLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDOUIsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxZQUFhLFNBQVEsVUFBVTtJQVUzQyxZQUNDLEVBQVUsRUFDVixNQUEyQixFQUMzQixLQUFhLEVBQ2IsSUFBWSxFQUNaLFVBQXVCLEVBQ3ZCLHVCQUFpRDtRQUVqRCxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3RCLENBQUM7SUFFZSxLQUFLO1FBQ3BCLE9BQU8sSUFBSSxZQUFZLENBQ3RCLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsdUJBQXVCLENBQzVCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFVO1FBQzFCLE9BQU8sS0FBSyxZQUFZLFlBQVksQ0FBQTtJQUNyQyxDQUFDO0lBRWUsZ0JBQWdCO1FBQy9CLE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFZSxTQUFTO1FBQ3hCLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0QyxDQUFDO0lBRVMsV0FBVztRQUNwQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVMsVUFBVSxDQUFDLE1BQW9CO1FBQ3hDLE9BQU8sSUFBSSxZQUFZLENBQ3RCLE1BQU0sQ0FBQyxHQUFHLEVBQ1YsTUFBTSxDQUFDLE9BQU8sRUFDZCxNQUFNLENBQUMsTUFBTSxFQUNiLE1BQU0sQ0FBQyxJQUFJLEVBQ1gsTUFBTSxDQUFDLFVBQVUsRUFDakIsTUFBTSxDQUFDLHVCQUF1QixDQUM5QixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBU0QsTUFBTSxDQUFOLElBQVksZUFHWDtBQUhELFdBQVksZUFBZTtJQUMxQiwyREFBVyxDQUFBO0lBQ1gsNkRBQVksQ0FBQTtBQUNiLENBQUMsRUFIVyxlQUFlLEtBQWYsZUFBZSxRQUcxQjtBQUVELFdBQWlCLGVBQWU7SUFDbEIsd0JBQVEsR0FBb0IsZUFBZSxDQUFDLFFBQVEsQ0FBQTtBQUNsRSxDQUFDLEVBRmdCLGVBQWUsS0FBZixlQUFlLFFBRS9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLGlCQUdqQjtBQUhELFdBQWtCLGlCQUFpQjtJQUNsQyw2REFBVSxDQUFBO0lBQ1YsNkRBQVUsQ0FBQTtBQUNYLENBQUMsRUFIaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUdsQztBQWVELE1BQU0sT0FBTyxVQUFVO0lBR3RCLFlBQVksZ0JBQW9DO1FBRnhDLFdBQU0sR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUc5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7SUFDRixDQUFDO0lBRU0sT0FBTyxDQUFDLENBQXlCLEVBQUUsQ0FBeUI7UUFDbEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDakMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDakMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7WUFDZCxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDM0MsRUFBRSxHQUFHLEVBQUUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNsQyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDM0MsRUFBRSxHQUFHLEVBQUUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNsQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDVixDQUFDO2FBQU0sSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQU4sSUFBa0IsV0FHakI7QUFIRCxXQUFrQixXQUFXO0lBQzVCLHNDQUF1QixDQUFBO0lBQ3ZCLHdDQUF5QixDQUFBO0FBQzFCLENBQUMsRUFIaUIsV0FBVyxLQUFYLFdBQVcsUUFHNUI7QUFNRCxNQUFNLENBQU4sSUFBWSxhQXVDWDtBQXZDRCxXQUFZLGFBQWE7SUFDeEIsdUVBQXVFO0lBQ3ZFLG9DQUFtQixDQUFBO0lBRW5CLGdEQUFnRDtJQUNoRCxrREFBaUMsQ0FBQTtJQUVqQyxrREFBa0Q7SUFDbEQsOENBQTZCLENBQUE7SUFFN0IsbUZBQW1GO0lBQ25GLDBDQUF5QixDQUFBO0lBRXpCLGdEQUFnRDtJQUNoRCxnQ0FBZSxDQUFBO0lBRWYsK0VBQStFO0lBQy9FLGdEQUErQixDQUFBO0lBRS9CLGtEQUFrRDtJQUNsRCxzREFBcUMsQ0FBQTtJQUVyQywyREFBMkQ7SUFDM0Qsa0NBQWlCLENBQUE7SUFFakIsK0RBQStEO0lBQy9ELHNDQUFxQixDQUFBO0lBRXJCLGdEQUFnRDtJQUNoRCw0QkFBVyxDQUFBO0lBRVgsMERBQTBEO0lBQzFELGdFQUErQyxDQUFBO0lBRS9DLHdEQUF3RDtJQUN4RCw0REFBMkMsQ0FBQTtJQUUzQywrREFBK0Q7SUFDL0Qsd0VBQXVELENBQUE7QUFDeEQsQ0FBQyxFQXZDVyxhQUFhLEtBQWIsYUFBYSxRQXVDeEI7QUE2REQsTUFBTSxDQUFOLElBQWtCLGFBTWpCO0FBTkQsV0FBa0IsYUFBYTtJQUM5QixxREFBTSxDQUFBO0lBQ04saURBQUksQ0FBQTtJQUNKLDZEQUFVLENBQUE7SUFDViwrRUFBbUIsQ0FBQTtJQUNuQiwyREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQU5pQixhQUFhLEtBQWIsYUFBYSxRQU05QjtBQUVELE1BQU0sS0FBVyxTQUFTLENBdUZ6QjtBQXZGRCxXQUFpQixTQUFTO0lBQ3pCLFNBQVMsTUFBTSxDQUFDLElBQVU7UUFDekIsT0FBTztZQUNOLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRztZQUNoQixRQUFRLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUk7WUFDM0MsT0FBTyxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZO2dCQUNqRCxDQUFDO2dCQUNELENBQUMsd0NBQXNCO1lBQ3hCLEtBQUssRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSztZQUN6QyxNQUFNLEVBQUUsSUFBSTtTQUNaLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBZ0IsS0FBSyxDQUNwQixJQUFVLEVBQ1YsVUFBa0IsRUFDbEIsaUJBQXNDO1FBRXRDLE9BQU87WUFDTixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZixJQUFJLEVBQUUsYUFBYSxDQUFDLEtBQUs7WUFDekIsVUFBVTtZQUNWLGlCQUFpQjtTQUNqQixDQUFBO0lBQ0YsQ0FBQztJQVhlLGVBQUssUUFXcEIsQ0FBQTtJQUVELFNBQWdCLGNBQWMsQ0FDN0IsSUFBVSxFQUNWLFVBQWtCLEVBQ2xCLFNBQWlCO1FBRWpCLE9BQU87WUFDTixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZixJQUFJLEVBQUUsYUFBYSxDQUFDLGNBQWM7WUFDbEMsVUFBVTtZQUNWLFNBQVM7U0FDVCxDQUFBO0lBQ0YsQ0FBQztJQVhlLHdCQUFjLGlCQVc3QixDQUFBO0lBQ0QsU0FBZ0IsWUFBWSxDQUMzQixJQUFVLEVBQ1YsVUFBOEIsRUFDOUIsUUFBNEI7UUFFNUIsT0FBTztZQUNOLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNmLElBQUksRUFBRSxhQUFhLENBQUMsWUFBWTtZQUNoQyxVQUFVO1lBQ1YsUUFBUTtTQUNSLENBQUE7SUFDRixDQUFDO0lBWGUsc0JBQVksZUFXM0IsQ0FBQTtJQUVELFNBQWdCLFVBQVUsQ0FDekIsSUFBVSxFQUNWLFVBQWtCLEVBQ2xCLFVBQTBDO1FBRTFDLE9BQU87WUFDTixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZixJQUFJLEVBQUUsYUFBYSxDQUFDLFVBQVU7WUFDOUIsVUFBVTtZQUNWLFVBQVU7U0FDVixDQUFBO0lBQ0YsQ0FBQztJQVhlLG9CQUFVLGFBV3pCLENBQUE7SUFFRCxTQUFnQixPQUFPLENBQ3RCLElBUTBDLEVBQzFDLElBQVUsRUFDVixVQUFtQjtRQUVuQixPQUFPO1lBQ04sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2YsSUFBSTtZQUNKLFVBQVU7U0FDVixDQUFBO0lBQ0YsQ0FBQztJQWxCZSxpQkFBTyxVQWtCdEIsQ0FBQTtJQUVELFNBQWdCLE9BQU87UUFDdEIsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUZlLGlCQUFPLFVBRXRCLENBQUE7QUFDRixDQUFDLEVBdkZnQixTQUFTLEtBQVQsU0FBUyxRQXVGekI7QUFFRCxNQUFNLEtBQVcsbUJBQW1CLENBcUJuQztBQXJCRCxXQUFpQixtQkFBbUI7SUFDbkMsU0FBUyxlQUFlLENBQUMsT0FBWTtRQUNwQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hDLElBQUksTUFBTSxHQUFXLEVBQUUsQ0FBQTtRQUN2QixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM5QixJQUFJLFdBQVcsWUFBWSxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUMzQyxDQUFDO2lCQUFNLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzVDLFdBQVcsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QyxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsV0FBVyxHQUFHLEdBQUcsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBQ0QsU0FBZ0IsTUFBTSxDQUFDLEtBQXNCO1FBQzVDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4QyxNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1QixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFMZSwwQkFBTSxTQUtyQixDQUFBO0FBQ0YsQ0FBQyxFQXJCZ0IsbUJBQW1CLEtBQW5CLG1CQUFtQixRQXFCbkM7QUFFRCxNQUFNLENBQU4sSUFBa0IsYUFhakI7QUFiRCxXQUFrQixhQUFhO0lBQzlCLCtDQUE4QixDQUFBO0lBQzlCLHFEQUFvQyxDQUFBO0lBQ3BDLHlEQUF3QyxDQUFBO0lBQ3hDLGdGQUErRCxDQUFBO0lBQy9ELGlFQUFnRCxDQUFBO0lBQ2hELDREQUEyQyxDQUFBO0lBQzNDLDBEQUF5QyxDQUFBO0lBQ3pDLHNEQUFxQyxDQUFBO0lBQ3JDLDREQUEyQyxDQUFBO0lBQzNDLGlFQUFnRCxDQUFBO0lBQ2hELG1EQUFrQyxDQUFBO0lBQ2xDLHVEQUFzQyxDQUFBO0FBQ3ZDLENBQUMsRUFiaUIsYUFBYSxLQUFiLGFBQWEsUUFhOUI7QUFFRCxNQUFNLENBQU4sSUFBa0IscUJBU2pCO0FBVEQsV0FBa0IscUJBQXFCO0lBQ3RDLHdDQUFlLENBQUE7SUFDZixvRUFBMkMsQ0FBQTtJQUMzQyxrREFBeUIsQ0FBQTtJQUN6QiwwQ0FBaUIsQ0FBQTtJQUNqQiw4Q0FBcUIsQ0FBQTtJQUNyQix3REFBK0IsQ0FBQTtJQUMvQixnRUFBdUMsQ0FBQTtJQUN2Qyx5RUFBZ0QsQ0FBQTtBQUNqRCxDQUFDLEVBVGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFTdEM7QUFFRCxNQUFNLEtBQVcsY0FBYyxDQXVEOUI7QUF2REQsV0FBaUIsY0FBYztJQUM5QixTQUFnQixvQkFBb0IsQ0FDbkMsUUFBeUIsRUFDekIsUUFBMEM7UUFFMUMsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1RCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM5Qiw2RUFBNkU7WUFDN0UsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN4QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7WUFDaEIsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUEwQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFFLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQTtRQUNsQyxNQUFNLFFBQVEsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUN2QyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUE7UUFDeEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDaEQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2hDLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUE7WUFDMUIsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNuQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ2xDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDdEQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNyQixLQUFLLFNBQVM7NEJBQ2IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQTs0QkFDekIsTUFBSzt3QkFDTixLQUFLLFFBQVEsQ0FBQzt3QkFDZCxLQUFLLFNBQVM7NEJBQ2IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTs0QkFDckIsTUFBSzt3QkFDTixLQUFLLFFBQVE7NEJBQ1osT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQTs0QkFDdEIsTUFBSzt3QkFDTjs0QkFDQyxRQUFRLENBQUMsS0FBSyxDQUNiLEdBQUcsQ0FBQyxRQUFRLENBQ1gsd0NBQXdDLEVBQ3hDLCtHQUErRyxFQUMvRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQ3RDLFFBQVEsQ0FDUixDQUNELENBQUE7NEJBQ0QsT0FBTyxTQUFTLENBQUE7b0JBQ2xCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQXJEZSxtQ0FBb0IsdUJBcURuQyxDQUFBO0FBQ0YsQ0FBQyxFQXZEZ0IsY0FBYyxLQUFkLGNBQWMsUUF1RDlCIn0=