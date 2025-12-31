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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUs3RCxPQUFPLEVBQ04sYUFBYSxHQUViLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFLcEUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFBO0FBRTlDLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLElBQUksYUFBYSxDQUNsRCxhQUFhLEVBQ2IsS0FBSyxFQUNMLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsc0NBQXNDLENBQUMsQ0FDaEYsQ0FBQTtBQUNELHNEQUFzRDtBQUN0RCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGFBQWEsQ0FDcEQsb0JBQW9CLEVBQ3BCLEtBQUssRUFDTCxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGlEQUFpRCxDQUFDLENBQ3JGLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFFckUsTUFBTSxDQUFOLElBQVksWUFlWDtBQWZELFdBQVksWUFBWTtJQUN2Qjs7T0FFRztJQUNILG1EQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILG1EQUFVLENB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