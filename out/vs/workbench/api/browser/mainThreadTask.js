/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../nls.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as Types from '../../../base/common/types.js';
import * as Platform from '../../../base/common/platform.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IWorkspaceContextService, } from '../../../platform/workspace/common/workspace.js';
import { ContributedTask, ConfiguringTask, CommandOptions, RuntimeType, CustomTask, TaskSourceKind, TaskDefinition, PresentationOptions, RunOptions, } from '../../contrib/tasks/common/tasks.js';
import { ITaskService } from '../../contrib/tasks/common/taskService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { TaskEventKind, } from '../common/shared/tasks.js';
import { IConfigurationResolverService } from '../../services/configurationResolver/common/configurationResolver.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { ConfigurationResolverExpression } from '../../services/configurationResolver/common/configurationResolverExpression.js';
var TaskExecutionDTO;
(function (TaskExecutionDTO) {
    function from(value) {
        return {
            id: value.id,
            task: TaskDTO.from(value.task),
        };
    }
    TaskExecutionDTO.from = from;
})(TaskExecutionDTO || (TaskExecutionDTO = {}));
export var TaskProblemMatcherStartedDto;
(function (TaskProblemMatcherStartedDto) {
    function from(value) {
        return {
            execution: {
                id: value.execution.id,
                task: TaskDTO.from(value.execution.task),
            },
        };
    }
    TaskProblemMatcherStartedDto.from = from;
})(TaskProblemMatcherStartedDto || (TaskProblemMatcherStartedDto = {}));
export var TaskProblemMatcherEndedDto;
(function (TaskProblemMatcherEndedDto) {
    function from(value) {
        return {
            execution: {
                id: value.execution.id,
                task: TaskDTO.from(value.execution.task),
            },
            hasErrors: value.hasErrors,
        };
    }
    TaskProblemMatcherEndedDto.from = from;
})(TaskProblemMatcherEndedDto || (TaskProblemMatcherEndedDto = {}));
var TaskProcessStartedDTO;
(function (TaskProcessStartedDTO) {
    function from(value, processId) {
        return {
            id: value.id,
            processId,
        };
    }
    TaskProcessStartedDTO.from = from;
})(TaskProcessStartedDTO || (TaskProcessStartedDTO = {}));
var TaskProcessEndedDTO;
(function (TaskProcessEndedDTO) {
    function from(value, exitCode) {
        return {
            id: value.id,
            exitCode,
        };
    }
    TaskProcessEndedDTO.from = from;
})(TaskProcessEndedDTO || (TaskProcessEndedDTO = {}));
var TaskDefinitionDTO;
(function (TaskDefinitionDTO) {
    function from(value) {
        const result = Object.assign(Object.create(null), value);
        delete result._key;
        return result;
    }
    TaskDefinitionDTO.from = from;
    function to(value, executeOnly) {
        let result = TaskDefinition.createTaskIdentifier(value, console);
        if (result === undefined && executeOnly) {
            result = {
                _key: generateUuid(),
                type: '$executeOnly',
            };
        }
        return result;
    }
    TaskDefinitionDTO.to = to;
})(TaskDefinitionDTO || (TaskDefinitionDTO = {}));
var TaskPresentationOptionsDTO;
(function (TaskPresentationOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return Object.assign(Object.create(null), value);
    }
    TaskPresentationOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return PresentationOptions.defaults;
        }
        return Object.assign(Object.create(null), PresentationOptions.defaults, value);
    }
    TaskPresentationOptionsDTO.to = to;
})(TaskPresentationOptionsDTO || (TaskPresentationOptionsDTO = {}));
var RunOptionsDTO;
(function (RunOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return Object.assign(Object.create(null), value);
    }
    RunOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return RunOptions.defaults;
        }
        return Object.assign(Object.create(null), RunOptions.defaults, value);
    }
    RunOptionsDTO.to = to;
})(RunOptionsDTO || (RunOptionsDTO = {}));
var ProcessExecutionOptionsDTO;
(function (ProcessExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return {
            cwd: value.cwd,
            env: value.env,
        };
    }
    ProcessExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return CommandOptions.defaults;
        }
        return {
            cwd: value.cwd || CommandOptions.defaults.cwd,
            env: value.env,
        };
    }
    ProcessExecutionOptionsDTO.to = to;
})(ProcessExecutionOptionsDTO || (ProcessExecutionOptionsDTO = {}));
var ProcessExecutionDTO;
(function (ProcessExecutionDTO) {
    function is(value) {
        const candidate = value;
        return candidate && !!candidate.process;
    }
    ProcessExecutionDTO.is = is;
    function from(value) {
        const process = Types.isString(value.name) ? value.name : value.name.value;
        const args = value.args
            ? value.args.map((value) => (Types.isString(value) ? value : value.value))
            : [];
        const result = {
            process: process,
            args: args,
        };
        if (value.options) {
            result.options = ProcessExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ProcessExecutionDTO.from = from;
    function to(value) {
        const result = {
            runtime: RuntimeType.Process,
            name: value.process,
            args: value.args,
            presentation: undefined,
        };
        result.options = ProcessExecutionOptionsDTO.to(value.options);
        return result;
    }
    ProcessExecutionDTO.to = to;
})(ProcessExecutionDTO || (ProcessExecutionDTO = {}));
var ShellExecutionOptionsDTO;
(function (ShellExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {
            cwd: value.cwd || CommandOptions.defaults.cwd,
            env: value.env,
        };
        if (value.shell) {
            result.executable = value.shell.executable;
            result.shellArgs = value.shell.args;
            result.shellQuoting = value.shell.quoting;
        }
        return result;
    }
    ShellExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {
            cwd: value.cwd,
            env: value.env,
        };
        if (value.executable) {
            result.shell = {
                executable: value.executable,
            };
            if (value.shellArgs) {
                result.shell.args = value.shellArgs;
            }
            if (value.shellQuoting) {
                result.shell.quoting = value.shellQuoting;
            }
        }
        return result;
    }
    ShellExecutionOptionsDTO.to = to;
})(ShellExecutionOptionsDTO || (ShellExecutionOptionsDTO = {}));
var ShellExecutionDTO;
(function (ShellExecutionDTO) {
    function is(value) {
        const candidate = value;
        return candidate && (!!candidate.commandLine || !!candidate.command);
    }
    ShellExecutionDTO.is = is;
    function from(value) {
        const result = {};
        if (value.name &&
            Types.isString(value.name) &&
            (value.args === undefined || value.args === null || value.args.length === 0)) {
            result.commandLine = value.name;
        }
        else {
            result.command = value.name;
            result.args = value.args;
        }
        if (value.options) {
            result.options = ShellExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ShellExecutionDTO.from = from;
    function to(value) {
        const result = {
            runtime: RuntimeType.Shell,
            name: value.commandLine ? value.commandLine : value.command,
            args: value.args,
            presentation: undefined,
        };
        if (value.options) {
            result.options = ShellExecutionOptionsDTO.to(value.options);
        }
        return result;
    }
    ShellExecutionDTO.to = to;
})(ShellExecutionDTO || (ShellExecutionDTO = {}));
var CustomExecutionDTO;
(function (CustomExecutionDTO) {
    function is(value) {
        const candidate = value;
        return candidate && candidate.customExecution === 'customExecution';
    }
    CustomExecutionDTO.is = is;
    function from(value) {
        return {
            customExecution: 'customExecution',
        };
    }
    CustomExecutionDTO.from = from;
    function to(value) {
        return {
            runtime: RuntimeType.CustomExecution,
            presentation: undefined,
        };
    }
    CustomExecutionDTO.to = to;
})(CustomExecutionDTO || (CustomExecutionDTO = {}));
var TaskSourceDTO;
(function (TaskSourceDTO) {
    function from(value) {
        const result = {
            label: value.label,
        };
        if (value.kind === TaskSourceKind.Extension) {
            result.extensionId = value.extension;
            if (value.workspaceFolder) {
                result.scope = value.workspaceFolder.uri;
            }
            else {
                result.scope = value.scope;
            }
        }
        else if (value.kind === TaskSourceKind.Workspace) {
            result.extensionId = '$core';
            result.scope = value.config.workspaceFolder
                ? value.config.workspaceFolder.uri
                : 1 /* TaskScope.Global */;
        }
        return result;
    }
    TaskSourceDTO.from = from;
    function to(value, workspace) {
        let scope;
        let workspaceFolder;
        if (value.scope === undefined ||
            (typeof value.scope === 'number' && value.scope !== 1 /* TaskScope.Global */)) {
            if (workspace.getWorkspace().folders.length === 0) {
                scope = 1 /* TaskScope.Global */;
                workspaceFolder = undefined;
            }
            else {
                scope = 3 /* TaskScope.Folder */;
                workspaceFolder = workspace.getWorkspace().folders[0];
            }
        }
        else if (typeof value.scope === 'number') {
            scope = value.scope;
        }
        else {
            scope = 3 /* TaskScope.Folder */;
            workspaceFolder = workspace.getWorkspaceFolder(URI.revive(value.scope)) ?? undefined;
        }
        const result = {
            kind: TaskSourceKind.Extension,
            label: value.label,
            extension: value.extensionId,
            scope,
            workspaceFolder,
        };
        return result;
    }
    TaskSourceDTO.to = to;
})(TaskSourceDTO || (TaskSourceDTO = {}));
var TaskHandleDTO;
(function (TaskHandleDTO) {
    function is(value) {
        const candidate = value;
        return candidate && Types.isString(candidate.id) && !!candidate.workspaceFolder;
    }
    TaskHandleDTO.is = is;
})(TaskHandleDTO || (TaskHandleDTO = {}));
var TaskDTO;
(function (TaskDTO) {
    function from(task) {
        if (task === undefined ||
            task === null ||
            (!CustomTask.is(task) && !ContributedTask.is(task) && !ConfiguringTask.is(task))) {
            return undefined;
        }
        const result = {
            _id: task._id,
            name: task.configurationProperties.name,
            definition: TaskDefinitionDTO.from(task.getDefinition(true)),
            source: TaskSourceDTO.from(task._source),
            execution: undefined,
            presentationOptions: !ConfiguringTask.is(task) && task.command
                ? TaskPresentationOptionsDTO.from(task.command.presentation)
                : undefined,
            isBackground: task.configurationProperties.isBackground,
            problemMatchers: [],
            hasDefinedMatchers: ContributedTask.is(task) ? task.hasDefinedMatchers : false,
            runOptions: RunOptionsDTO.from(task.runOptions),
        };
        result.group = TaskGroupDTO.from(task.configurationProperties.group);
        if (task.configurationProperties.detail) {
            result.detail = task.configurationProperties.detail;
        }
        if (!ConfiguringTask.is(task) && task.command) {
            switch (task.command.runtime) {
                case RuntimeType.Process:
                    result.execution = ProcessExecutionDTO.from(task.command);
                    break;
                case RuntimeType.Shell:
                    result.execution = ShellExecutionDTO.from(task.command);
                    break;
                case RuntimeType.CustomExecution:
                    result.execution = CustomExecutionDTO.from(task.command);
                    break;
            }
        }
        if (task.configurationProperties.problemMatchers) {
            for (const matcher of task.configurationProperties.problemMatchers) {
                if (Types.isString(matcher)) {
                    result.problemMatchers.push(matcher);
                }
            }
        }
        return result;
    }
    TaskDTO.from = from;
    function to(task, workspace, executeOnly, icon, hide) {
        if (!task || typeof task.name !== 'string') {
            return undefined;
        }
        let command;
        if (task.execution) {
            if (ShellExecutionDTO.is(task.execution)) {
                command = ShellExecutionDTO.to(task.execution);
            }
            else if (ProcessExecutionDTO.is(task.execution)) {
                command = ProcessExecutionDTO.to(task.execution);
            }
            else if (CustomExecutionDTO.is(task.execution)) {
                command = CustomExecutionDTO.to(task.execution);
            }
        }
        if (!command) {
            return undefined;
        }
        command.presentation = TaskPresentationOptionsDTO.to(task.presentationOptions);
        const source = TaskSourceDTO.to(task.source, workspace);
        const label = nls.localize('task.label', '{0}: {1}', source.label, task.name);
        const definition = TaskDefinitionDTO.to(task.definition, executeOnly);
        const id = CustomExecutionDTO.is(task.execution) && task._id
            ? task._id
            : `${task.source.extensionId}.${definition._key}`;
        const result = new ContributedTask(id, // uuidMap.getUUID(identifier)
        source, label, definition.type, definition, command, task.hasDefinedMatchers, RunOptionsDTO.to(task.runOptions), {
            name: task.name,
            identifier: label,
            group: task.group,
            isBackground: !!task.isBackground,
            problemMatchers: task.problemMatchers.slice(),
            detail: task.detail,
            icon,
            hide,
        });
        return result;
    }
    TaskDTO.to = to;
})(TaskDTO || (TaskDTO = {}));
var TaskGroupDTO;
(function (TaskGroupDTO) {
    function from(value) {
        if (value === undefined) {
            return undefined;
        }
        return {
            _id: typeof value === 'string' ? value : value._id,
            isDefault: typeof value === 'string'
                ? false
                : typeof value.isDefault === 'string'
                    ? false
                    : value.isDefault,
        };
    }
    TaskGroupDTO.from = from;
})(TaskGroupDTO || (TaskGroupDTO = {}));
var TaskFilterDTO;
(function (TaskFilterDTO) {
    function from(value) {
        return value;
    }
    TaskFilterDTO.from = from;
    function to(value) {
        return value;
    }
    TaskFilterDTO.to = to;
})(TaskFilterDTO || (TaskFilterDTO = {}));
let MainThreadTask = class MainThreadTask extends Disposable {
    constructor(extHostContext, _taskService, _workspaceContextServer, _configurationResolverService) {
        super();
        this._taskService = _taskService;
        this._workspaceContextServer = _workspaceContextServer;
        this._configurationResolverService = _configurationResolverService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTask);
        this._providers = new Map();
        this._register(this._taskService.onDidStateChange(async (event) => {
            if (event.kind === TaskEventKind.Changed) {
                return;
            }
            const task = event.__task;
            if (event.kind === TaskEventKind.Start) {
                const execution = TaskExecutionDTO.from(task.getTaskExecution());
                let resolvedDefinition = execution.task.definition;
                if (execution.task?.execution &&
                    CustomExecutionDTO.is(execution.task.execution) &&
                    event.resolvedVariables) {
                    const expr = ConfigurationResolverExpression.parse(execution.task.definition);
                    for (const replacement of expr.unresolved()) {
                        const value = event.resolvedVariables.get(replacement.inner);
                        if (value !== undefined) {
                            expr.resolve(replacement, value);
                        }
                    }
                    resolvedDefinition = await this._configurationResolverService.resolveAsync(task.getWorkspaceFolder(), expr);
                }
                this._proxy.$onDidStartTask(execution, event.terminalId, resolvedDefinition);
            }
            else if (event.kind === TaskEventKind.ProcessStarted) {
                this._proxy.$onDidStartTaskProcess(TaskProcessStartedDTO.from(task.getTaskExecution(), event.processId));
            }
            else if (event.kind === TaskEventKind.ProcessEnded) {
                this._proxy.$onDidEndTaskProcess(TaskProcessEndedDTO.from(task.getTaskExecution(), event.exitCode));
            }
            else if (event.kind === TaskEventKind.End) {
                this._proxy.$OnDidEndTask(TaskExecutionDTO.from(task.getTaskExecution()));
            }
            else if (event.kind === TaskEventKind.ProblemMatcherStarted) {
                this._proxy.$onDidStartTaskProblemMatchers(TaskProblemMatcherStartedDto.from({ execution: task.getTaskExecution() }));
            }
            else if (event.kind === TaskEventKind.ProblemMatcherEnded) {
                this._proxy.$onDidEndTaskProblemMatchers(TaskProblemMatcherEndedDto.from({
                    execution: task.getTaskExecution(),
                    hasErrors: false,
                }));
            }
            else if (event.kind === TaskEventKind.ProblemMatcherFoundErrors) {
                this._proxy.$onDidEndTaskProblemMatchers(TaskProblemMatcherEndedDto.from({
                    execution: task.getTaskExecution(),
                    hasErrors: true,
                }));
            }
        }));
    }
    dispose() {
        for (const value of this._providers.values()) {
            value.disposable.dispose();
        }
        this._providers.clear();
        super.dispose();
    }
    $createTaskId(taskDTO) {
        return new Promise((resolve, reject) => {
            const task = TaskDTO.to(taskDTO, this._workspaceContextServer, true);
            if (task) {
                resolve(task._id);
            }
            else {
                reject(new Error('Task could not be created from DTO'));
            }
        });
    }
    $registerTaskProvider(handle, type) {
        const provider = {
            provideTasks: (validTypes) => {
                return Promise.resolve(this._proxy.$provideTasks(handle, validTypes)).then((value) => {
                    const tasks = [];
                    for (const dto of value.tasks) {
                        const task = TaskDTO.to(dto, this._workspaceContextServer, true);
                        if (task) {
                            tasks.push(task);
                        }
                        else {
                            console.error(`Task System: can not convert task: ${JSON.stringify(dto.definition, undefined, 0)}. Task will be dropped`);
                        }
                    }
                    const processedExtension = {
                        ...value.extension,
                        extensionLocation: URI.revive(value.extension.extensionLocation),
                    };
                    return {
                        tasks,
                        extension: processedExtension,
                    };
                });
            },
            resolveTask: (task) => {
                const dto = TaskDTO.from(task);
                if (dto) {
                    dto.name = dto.name === undefined ? '' : dto.name; // Using an empty name causes the name to default to the one given by the provider.
                    return Promise.resolve(this._proxy.$resolveTask(handle, dto)).then((resolvedTask) => {
                        if (resolvedTask) {
                            return TaskDTO.to(resolvedTask, this._workspaceContextServer, true, task.configurationProperties.icon, task.configurationProperties.hide);
                        }
                        return undefined;
                    });
                }
                return Promise.resolve(undefined);
            },
        };
        const disposable = this._taskService.registerTaskProvider(provider, type);
        this._providers.set(handle, { disposable, provider });
        return Promise.resolve(undefined);
    }
    $unregisterTaskProvider(handle) {
        const provider = this._providers.get(handle);
        if (provider) {
            provider.disposable.dispose();
            this._providers.delete(handle);
        }
        return Promise.resolve(undefined);
    }
    $fetchTasks(filter) {
        return this._taskService.tasks(TaskFilterDTO.to(filter)).then((tasks) => {
            const result = [];
            for (const task of tasks) {
                const item = TaskDTO.from(task);
                if (item) {
                    result.push(item);
                }
            }
            return result;
        });
    }
    getWorkspace(value) {
        let workspace;
        if (typeof value === 'string') {
            workspace = value;
        }
        else {
            const workspaceObject = this._workspaceContextServer.getWorkspace();
            const uri = URI.revive(value);
            if (workspaceObject.configuration?.toString() === uri.toString()) {
                workspace = workspaceObject;
            }
            else {
                workspace = this._workspaceContextServer.getWorkspaceFolder(uri);
            }
        }
        return workspace;
    }
    async $getTaskExecution(value) {
        if (TaskHandleDTO.is(value)) {
            const workspace = this.getWorkspace(value.workspaceFolder);
            if (workspace) {
                const task = await this._taskService.getTask(workspace, value.id, true);
                if (task) {
                    return {
                        id: task._id,
                        task: TaskDTO.from(task),
                    };
                }
                throw new Error('Task not found');
            }
            else {
                throw new Error('No workspace folder');
            }
        }
        else {
            const task = TaskDTO.to(value, this._workspaceContextServer, true);
            return {
                id: task._id,
                task: TaskDTO.from(task),
            };
        }
    }
    // Passing in a TaskHandleDTO will cause the task to get re-resolved, which is important for tasks are coming from the core,
    // such as those gotten from a fetchTasks, since they can have missing configuration properties.
    $executeTask(value) {
        return new Promise((resolve, reject) => {
            if (TaskHandleDTO.is(value)) {
                const workspace = this.getWorkspace(value.workspaceFolder);
                if (workspace) {
                    this._taskService.getTask(workspace, value.id, true).then((task) => {
                        if (!task) {
                            reject(new Error('Task not found'));
                        }
                        else {
                            const result = {
                                id: value.id,
                                task: TaskDTO.from(task),
                            };
                            this._taskService.run(task).then((summary) => {
                                // Ensure that the task execution gets cleaned up if the exit code is undefined
                                // This can happen when the task has dependent tasks and one of them failed
                                if (summary?.exitCode === undefined || summary.exitCode !== 0) {
                                    this._proxy.$OnDidEndTask(result);
                                }
                            }, (reason) => {
                                // eat the error, it has already been surfaced to the user and we don't care about it here
                            });
                            resolve(result);
                        }
                    }, (_error) => {
                        reject(new Error('Task not found'));
                    });
                }
                else {
                    reject(new Error('No workspace folder'));
                }
            }
            else {
                const task = TaskDTO.to(value, this._workspaceContextServer, true);
                this._taskService.run(task).then(undefined, (reason) => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
                const result = {
                    id: task._id,
                    task: TaskDTO.from(task),
                };
                resolve(result);
            }
        });
    }
    $customExecutionComplete(id, result) {
        return new Promise((resolve, reject) => {
            this._taskService.getActiveTasks().then((tasks) => {
                for (const task of tasks) {
                    if (id === task._id) {
                        this._taskService.extensionCallbackTaskComplete(task, result).then((value) => {
                            resolve(undefined);
                        }, (error) => {
                            reject(error);
                        });
                        return;
                    }
                }
                reject(new Error('Task to mark as complete not found'));
            });
        });
    }
    $terminateTask(id) {
        return new Promise((resolve, reject) => {
            this._taskService.getActiveTasks().then((tasks) => {
                for (const task of tasks) {
                    if (id === task._id) {
                        this._taskService.terminate(task).then((value) => {
                            resolve(undefined);
                        }, (error) => {
                            reject(undefined);
                        });
                        return;
                    }
                }
                reject(new ErrorNoTelemetry('Task to terminate not found'));
            });
        });
    }
    $registerTaskSystem(key, info) {
        let platform;
        switch (info.platform) {
            case 'Web':
                platform = 0 /* Platform.Platform.Web */;
                break;
            case 'win32':
                platform = 3 /* Platform.Platform.Windows */;
                break;
            case 'darwin':
                platform = 1 /* Platform.Platform.Mac */;
                break;
            case 'linux':
                platform = 2 /* Platform.Platform.Linux */;
                break;
            default:
                platform = Platform.platform;
        }
        this._taskService.registerTaskSystem(key, {
            platform: platform,
            uriProvider: (path) => {
                return URI.from({ scheme: info.scheme, authority: info.authority, path });
            },
            context: this._extHostContext,
            resolveVariables: (workspaceFolder, toResolve, target) => {
                const vars = [];
                toResolve.variables.forEach((item) => vars.push(item));
                return Promise.resolve(this._proxy.$resolveVariables(workspaceFolder.uri, {
                    process: toResolve.process,
                    variables: vars,
                })).then((values) => {
                    const partiallyResolvedVars = Array.from(Object.values(values.variables));
                    return new Promise((resolve, reject) => {
                        this._configurationResolverService
                            .resolveWithInteraction(workspaceFolder, partiallyResolvedVars, 'tasks', undefined, target)
                            .then((resolvedVars) => {
                            if (!resolvedVars) {
                                resolve(undefined);
                            }
                            const result = {
                                process: undefined,
                                variables: new Map(),
                            };
                            for (let i = 0; i < partiallyResolvedVars.length; i++) {
                                const variableName = vars[i].substring(2, vars[i].length - 1);
                                if (resolvedVars && values.variables[vars[i]] === vars[i]) {
                                    const resolved = resolvedVars.get(variableName);
                                    if (typeof resolved === 'string') {
                                        result.variables.set(variableName, resolved);
                                    }
                                }
                                else {
                                    result.variables.set(variableName, partiallyResolvedVars[i]);
                                }
                            }
                            if (Types.isString(values.process)) {
                                result.process = values.process;
                            }
                            resolve(result);
                        }, (reason) => {
                            reject(reason);
                        });
                    });
                });
            },
            findExecutable: (command, cwd, paths) => {
                return this._proxy.$findExecutable(command, cwd, paths);
            },
        });
    }
    async $registerSupportedExecutions(custom, shell, process) {
        return this._taskService.registerSupportedExecutions(custom, shell, process);
    }
};
MainThreadTask = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTask),
    __param(1, ITaskService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationResolverService)
], MainThreadTask);
export { MainThreadTask };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFRhc2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEtBQUssS0FBSyxNQUFNLCtCQUErQixDQUFBO0FBQ3RELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBRTNFLE9BQU8sRUFFTix3QkFBd0IsR0FFeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBQ04sZUFBZSxFQUNmLGVBQWUsRUFNZixjQUFjLEVBRWQsV0FBVyxFQUNYLFVBQVUsRUFHVixjQUFjLEVBS2QsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixVQUFVLEdBQ1YsTUFBTSxxQ0FBcUMsQ0FBQTtBQUc1QyxPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLDJDQUEyQyxDQUFBO0FBRXBHLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sY0FBYyxFQUdkLFdBQVcsR0FDWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFvQk4sYUFBYSxHQUNiLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFFcEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFF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