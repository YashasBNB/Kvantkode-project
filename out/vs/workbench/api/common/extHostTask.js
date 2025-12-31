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
/* eslint-disable local/code-no-native-private */
import { URI } from '../../../base/common/uri.js';
import { asPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import * as types from './extHostTypes.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
import * as Platform from '../../../base/common/platform.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { USER_TASKS_GROUP_KEY } from '../../contrib/tasks/common/tasks.js';
import { ErrorNoTelemetry, NotSupportedError } from '../../../base/common/errors.js';
import { asArray } from '../../../base/common/arrays.js';
var TaskDefinitionDTO;
(function (TaskDefinitionDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.to = to;
})(TaskDefinitionDTO || (TaskDefinitionDTO = {}));
var TaskPresentationOptionsDTO;
(function (TaskPresentationOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.to = to;
})(TaskPresentationOptionsDTO || (TaskPresentationOptionsDTO = {}));
var ProcessExecutionOptionsDTO;
(function (ProcessExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.to = to;
})(ProcessExecutionOptionsDTO || (ProcessExecutionOptionsDTO = {}));
var ProcessExecutionDTO;
(function (ProcessExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && !!candidate.process;
        }
        else {
            return false;
        }
    }
    ProcessExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {
            process: value.process,
            args: value.args,
        };
        if (value.options) {
            result.options = ProcessExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ProcessExecutionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return new types.ProcessExecution(value.process, value.args, value.options);
    }
    ProcessExecutionDTO.to = to;
})(ProcessExecutionDTO || (ProcessExecutionDTO = {}));
var ShellExecutionOptionsDTO;
(function (ShellExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.to = to;
})(ShellExecutionOptionsDTO || (ShellExecutionOptionsDTO = {}));
var ShellExecutionDTO;
(function (ShellExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && (!!candidate.commandLine || !!candidate.command);
        }
        else {
            return false;
        }
    }
    ShellExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {};
        if (value.commandLine !== undefined) {
            result.commandLine = value.commandLine;
        }
        else {
            result.command = value.command;
            result.args = value.args;
        }
        if (value.options) {
            result.options = ShellExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ShellExecutionDTO.from = from;
    function to(value) {
        if (value === undefined ||
            value === null ||
            (value.command === undefined && value.commandLine === undefined)) {
            return undefined;
        }
        if (value.commandLine) {
            return new types.ShellExecution(value.commandLine, value.options);
        }
        else {
            return new types.ShellExecution(value.command, value.args ? value.args : [], value.options);
        }
    }
    ShellExecutionDTO.to = to;
})(ShellExecutionDTO || (ShellExecutionDTO = {}));
export var CustomExecutionDTO;
(function (CustomExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && candidate.customExecution === 'customExecution';
        }
        else {
            return false;
        }
    }
    CustomExecutionDTO.is = is;
    function from(value) {
        return {
            customExecution: 'customExecution',
        };
    }
    CustomExecutionDTO.from = from;
    function to(taskId, providedCustomExeutions) {
        return providedCustomExeutions.get(taskId);
    }
    CustomExecutionDTO.to = to;
})(CustomExecutionDTO || (CustomExecutionDTO = {}));
export var TaskHandleDTO;
(function (TaskHandleDTO) {
    function from(value, workspaceService) {
        let folder;
        if (value.scope !== undefined && typeof value.scope !== 'number') {
            folder = value.scope.uri;
        }
        else if (value.scope !== undefined && typeof value.scope === 'number') {
            if (value.scope === types.TaskScope.Workspace &&
                workspaceService &&
                workspaceService.workspaceFile) {
                folder = workspaceService.workspaceFile;
            }
            else {
                folder = USER_TASKS_GROUP_KEY;
            }
        }
        return {
            id: value._id,
            workspaceFolder: folder,
        };
    }
    TaskHandleDTO.from = from;
})(TaskHandleDTO || (TaskHandleDTO = {}));
var TaskGroupDTO;
(function (TaskGroupDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return { _id: value.id, isDefault: value.isDefault };
    }
    TaskGroupDTO.from = from;
})(TaskGroupDTO || (TaskGroupDTO = {}));
export var TaskDTO;
(function (TaskDTO) {
    function fromMany(tasks, extension) {
        if (tasks === undefined || tasks === null) {
            return [];
        }
        const result = [];
        for (const task of tasks) {
            const converted = from(task, extension);
            if (converted) {
                result.push(converted);
            }
        }
        return result;
    }
    TaskDTO.fromMany = fromMany;
    function from(value, extension) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (value.execution instanceof types.ProcessExecution) {
            execution = ProcessExecutionDTO.from(value.execution);
        }
        else if (value.execution instanceof types.ShellExecution) {
            execution = ShellExecutionDTO.from(value.execution);
        }
        else if (value.execution && value.execution instanceof types.CustomExecution) {
            execution = CustomExecutionDTO.from(value.execution);
        }
        const definition = TaskDefinitionDTO.from(value.definition);
        let scope;
        if (value.scope) {
            if (typeof value.scope === 'number') {
                scope = value.scope;
            }
            else {
                scope = value.scope.uri;
            }
        }
        else {
            // To continue to support the deprecated task constructor that doesn't take a scope, we must add a scope here:
            scope = types.TaskScope.Workspace;
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = {
            _id: value._id,
            definition,
            name: value.name,
            source: {
                extensionId: extension.identifier.value,
                label: value.source,
                scope: scope,
            },
            execution: execution,
            isBackground: value.isBackground,
            group: TaskGroupDTO.from(value.group),
            presentationOptions: TaskPresentationOptionsDTO.from(value.presentationOptions),
            problemMatchers: asArray(value.problemMatchers),
            hasDefinedMatchers: value.hasDefinedMatchers,
            runOptions: value.runOptions ? value.runOptions : { reevaluateOnRerun: true },
            detail: value.detail,
        };
        return result;
    }
    TaskDTO.from = from;
    async function to(value, workspace, providedCustomExeutions) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (ProcessExecutionDTO.is(value.execution)) {
            execution = ProcessExecutionDTO.to(value.execution);
        }
        else if (ShellExecutionDTO.is(value.execution)) {
            execution = ShellExecutionDTO.to(value.execution);
        }
        else if (CustomExecutionDTO.is(value.execution)) {
            execution = CustomExecutionDTO.to(value._id, providedCustomExeutions);
        }
        const definition = TaskDefinitionDTO.to(value.definition);
        let scope;
        if (value.source) {
            if (value.source.scope !== undefined) {
                if (typeof value.source.scope === 'number') {
                    scope = value.source.scope;
                }
                else {
                    scope = await workspace.resolveWorkspaceFolder(URI.revive(value.source.scope));
                }
            }
            else {
                scope = types.TaskScope.Workspace;
            }
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = new types.Task(definition, scope, value.name, value.source.label, execution, value.problemMatchers);
        if (value.isBackground !== undefined) {
            result.isBackground = value.isBackground;
        }
        if (value.group !== undefined) {
            result.group = types.TaskGroup.from(value.group._id);
            if (result.group && value.group.isDefault) {
                result.group = new types.TaskGroup(result.group.id, result.group.label);
                if (value.group.isDefault === true) {
                    result.group.isDefault = value.group.isDefault;
                }
            }
        }
        if (value.presentationOptions) {
            result.presentationOptions = TaskPresentationOptionsDTO.to(value.presentationOptions);
        }
        if (value._id) {
            result._id = value._id;
        }
        if (value.detail) {
            result.detail = value.detail;
        }
        return result;
    }
    TaskDTO.to = to;
})(TaskDTO || (TaskDTO = {}));
var TaskFilterDTO;
(function (TaskFilterDTO) {
    function from(value) {
        return value;
    }
    TaskFilterDTO.from = from;
    function to(value) {
        if (!value) {
            return undefined;
        }
        return Object.assign(Object.create(null), value);
    }
    TaskFilterDTO.to = to;
})(TaskFilterDTO || (TaskFilterDTO = {}));
class TaskExecutionImpl {
    #tasks;
    constructor(tasks, _id, _task) {
        this._id = _id;
        this._task = _task;
        this.#tasks = tasks;
    }
    get task() {
        return this._task;
    }
    terminate() {
        this.#tasks.terminateTask(this);
    }
    fireDidStartProcess(value) { }
    fireDidEndProcess(value) { }
}
let ExtHostTaskBase = class ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        this._onDidExecuteTask = new Emitter();
        this._onDidTerminateTask = new Emitter();
        this._onDidTaskProcessStarted = new Emitter();
        this._onDidTaskProcessEnded = new Emitter();
        this._onDidStartTaskProblemMatchers = new Emitter();
        this._onDidEndTaskProblemMatchers = new Emitter();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTask);
        this._workspaceProvider = workspaceService;
        this._editorService = editorService;
        this._configurationService = configurationService;
        this._terminalService = extHostTerminalService;
        this._handleCounter = 0;
        this._handlers = new Map();
        this._taskExecutions = new Map();
        this._taskExecutionPromises = new Map();
        this._providedCustomExecutions2 = new Map();
        this._notProvidedCustomExecutions = new Set();
        this._activeCustomExecutions2 = new Map();
        this._logService = logService;
        this._deprecationService = deprecationService;
        this._proxy.$registerSupportedExecutions(true);
    }
    registerTaskProvider(extension, type, provider) {
        if (!provider) {
            return new types.Disposable(() => { });
        }
        const handle = this.nextHandle();
        this._handlers.set(handle, { type, provider, extension });
        this._proxy.$registerTaskProvider(handle, type);
        return new types.Disposable(() => {
            this._handlers.delete(handle);
            this._proxy.$unregisterTaskProvider(handle);
        });
    }
    registerTaskSystem(scheme, info) {
        this._proxy.$registerTaskSystem(scheme, info);
    }
    fetchTasks(filter) {
        return this._proxy.$fetchTasks(TaskFilterDTO.from(filter)).then(async (values) => {
            const result = [];
            for (const value of values) {
                const task = await TaskDTO.to(value, this._workspaceProvider, this._providedCustomExecutions2);
                if (task) {
                    result.push(task);
                }
            }
            return result;
        });
    }
    get taskExecutions() {
        const result = [];
        this._taskExecutions.forEach((value) => result.push(value));
        return result;
    }
    terminateTask(execution) {
        if (!(execution instanceof TaskExecutionImpl)) {
            throw new Error('No valid task execution provided');
        }
        return this._proxy.$terminateTask(execution._id);
    }
    get onDidStartTask() {
        return this._onDidExecuteTask.event;
    }
    async $onDidStartTask(execution, terminalId, resolvedDefinition) {
        const customExecution = this._providedCustomExecutions2.get(execution.id);
        if (customExecution) {
            // Clone the custom execution to keep the original untouched. This is important for multiple runs of the same task.
            this._activeCustomExecutions2.set(execution.id, customExecution);
            this._terminalService.attachPtyToTerminal(terminalId, await customExecution.callback(resolvedDefinition));
        }
        this._lastStartedTask = execution.id;
        this._onDidExecuteTask.fire({
            execution: await this.getTaskExecution(execution),
        });
    }
    get onDidEndTask() {
        return this._onDidTerminateTask.event;
    }
    async $OnDidEndTask(execution) {
        if (!this._taskExecutionPromises.has(execution.id)) {
            // Event already fired by the main thread
            // See https://github.com/microsoft/vscode/commit/aaf73920aeae171096d205efb2c58804a32b6846
            return;
        }
        const _execution = await this.getTaskExecution(execution);
        this._taskExecutionPromises.delete(execution.id);
        this._taskExecutions.delete(execution.id);
        this.customExecutionComplete(execution);
        this._onDidTerminateTask.fire({
            execution: _execution,
        });
    }
    get onDidStartTaskProcess() {
        return this._onDidTaskProcessStarted.event;
    }
    async $onDidStartTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessStarted.fire({
            execution: execution,
            processId: value.processId,
        });
    }
    get onDidEndTaskProcess() {
        return this._onDidTaskProcessEnded.event;
    }
    async $onDidEndTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessEnded.fire({
            execution: execution,
            exitCode: value.exitCode,
        });
    }
    get onDidStartTaskProblemMatchers() {
        return this._onDidStartTaskProblemMatchers.event;
    }
    async $onDidStartTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidStartTaskProblemMatchers.fire({ execution });
    }
    get onDidEndTaskProblemMatchers() {
        return this._onDidEndTaskProblemMatchers.event;
    }
    async $onDidEndTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidEndTaskProblemMatchers.fire({ execution, hasErrors: value.hasErrors });
    }
    $provideTasks(handle, validTypes) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        // Set up a list of task ID promises that we can wait on
        // before returning the provided tasks. The ensures that
        // our task IDs are calculated for any custom execution tasks.
        // Knowing this ID ahead of time is needed because when a task
        // start event is fired this is when the custom execution is called.
        // The task start event is also the first time we see the ID from the main
        // thread, which is too late for us because we need to save an map
        // from an ID to the custom execution function. (Kind of a cart before the horse problem).
        const taskIdPromises = [];
        const fetchPromise = asPromise(() => handler.provider.provideTasks(CancellationToken.None)).then((value) => {
            return this.provideTasksInternal(validTypes, taskIdPromises, handler, value);
        });
        return new Promise((resolve) => {
            fetchPromise.then((result) => {
                Promise.all(taskIdPromises).then(() => {
                    resolve(result);
                });
            });
        });
    }
    async $resolveTask(handle, taskDTO) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        if (taskDTO.definition.type !== handler.type) {
            throw new Error(`Unexpected: Task of type [${taskDTO.definition.type}] cannot be resolved by provider of type [${handler.type}].`);
        }
        const task = await TaskDTO.to(taskDTO, this._workspaceProvider, this._providedCustomExecutions2);
        if (!task) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        const resolvedTask = await handler.provider.resolveTask(task, CancellationToken.None);
        if (!resolvedTask) {
            return;
        }
        this.checkDeprecation(resolvedTask, handler);
        const resolvedTaskDTO = TaskDTO.from(resolvedTask, handler.extension);
        if (!resolvedTaskDTO) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        if (resolvedTask.definition !== task.definition) {
            throw new Error('Unexpected: The resolved task definition must be the same object as the original task definition. The task definition cannot be changed.');
        }
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            await this.addCustomExecution(resolvedTaskDTO, resolvedTask, true);
        }
        return await this.resolveTaskInternal(resolvedTaskDTO);
    }
    nextHandle() {
        return this._handleCounter++;
    }
    async addCustomExecution(taskDTO, task, isProvided) {
        const taskId = await this._proxy.$createTaskId(taskDTO);
        if (!isProvided && !this._providedCustomExecutions2.has(taskId)) {
            this._notProvidedCustomExecutions.add(taskId);
            // Also add to active executions when not coming from a provider to prevent timing issue.
            this._activeCustomExecutions2.set(taskId, task.execution);
        }
        this._providedCustomExecutions2.set(taskId, task.execution);
    }
    async getTaskExecution(execution, task) {
        if (typeof execution === 'string') {
            const taskExecution = this._taskExecutionPromises.get(execution);
            if (!taskExecution) {
                throw new ErrorNoTelemetry('Unexpected: The specified task is missing an execution');
            }
            return taskExecution;
        }
        const result = this._taskExecutionPromises.get(execution.id);
        if (result) {
            return result;
        }
        let executionPromise;
        if (!task) {
            executionPromise = TaskDTO.to(execution.task, this._workspaceProvider, this._providedCustomExecutions2).then((t) => {
                if (!t) {
                    throw new ErrorNoTelemetry('Unexpected: Task does not exist.');
                }
                return new TaskExecutionImpl(this, execution.id, t);
            });
        }
        else {
            executionPromise = Promise.resolve(new TaskExecutionImpl(this, execution.id, task));
        }
        this._taskExecutionPromises.set(execution.id, executionPromise);
        return executionPromise.then((taskExecution) => {
            this._taskExecutions.set(execution.id, taskExecution);
            return taskExecution;
        });
    }
    checkDeprecation(task, handler) {
        const tTask = task;
        if (tTask._deprecated) {
            this._deprecationService.report('Task.constructor', handler.extension, 'Use the Task constructor that takes a `scope` instead.');
        }
    }
    customExecutionComplete(execution) {
        const extensionCallback2 = this._activeCustomExecutions2.get(execution.id);
        if (extensionCallback2) {
            this._activeCustomExecutions2.delete(execution.id);
        }
        // Technically we don't really need to do this, however, if an extension
        // is executing a task through "executeTask" over and over again
        // with different properties in the task definition, then the map of executions
        // could grow indefinitely, something we don't want.
        if (this._notProvidedCustomExecutions.has(execution.id) &&
            this._lastStartedTask !== execution.id) {
            this._providedCustomExecutions2.delete(execution.id);
            this._notProvidedCustomExecutions.delete(execution.id);
        }
        const iterator = this._notProvidedCustomExecutions.values();
        let iteratorResult = iterator.next();
        while (!iteratorResult.done) {
            if (!this._activeCustomExecutions2.has(iteratorResult.value) &&
                this._lastStartedTask !== iteratorResult.value) {
                this._providedCustomExecutions2.delete(iteratorResult.value);
                this._notProvidedCustomExecutions.delete(iteratorResult.value);
            }
            iteratorResult = iterator.next();
        }
    }
};
ExtHostTaskBase = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], ExtHostTaskBase);
export { ExtHostTaskBase };
let WorkerExtHostTask = class WorkerExtHostTask extends ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
        this.registerTaskSystem(Schemas.vscodeRemote, {
            scheme: Schemas.vscodeRemote,
            authority: '',
            platform: Platform.PlatformToString(0 /* Platform.Platform.Web */),
        });
    }
    async executeTask(extension, task) {
        if (!task.execution) {
            throw new Error('Tasks to execute must include an execution');
        }
        const dto = TaskDTO.from(task, extension);
        if (dto === undefined) {
            throw new Error('Task is not valid');
        }
        // If this task is a custom execution, then we need to save it away
        // in the provided custom execution map that is cleaned up after the
        // task is executed.
        if (CustomExecutionDTO.is(dto.execution)) {
            await this.addCustomExecution(dto, task, false);
        }
        else {
            throw new NotSupportedError();
        }
        // Always get the task execution first to prevent timing issues when retrieving it later
        const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
        this._proxy.$executeTask(dto).catch((error) => {
            throw new Error(error);
        });
        return execution;
    }
    provideTasksInternal(validTypes, taskIdPromises, handler, value) {
        const taskDTOs = [];
        if (value) {
            for (const task of value) {
                this.checkDeprecation(task, handler);
                if (!task.definition || !validTypes[task.definition.type]) {
                    const source = task.source ? task.source : 'No task source';
                    this._logService.warn(`The task [${source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
                }
                const taskDTO = TaskDTO.from(task, handler.extension);
                if (taskDTO && CustomExecutionDTO.is(taskDTO.execution)) {
                    taskDTOs.push(taskDTO);
                    // The ID is calculated on the main thread task side, so, let's call into it here.
                    // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                    // is invoked, we have to be able to map it back to our data.
                    taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
                }
                else {
                    this._logService.warn('Only custom execution tasks supported.');
                }
            }
        }
        return {
            tasks: taskDTOs,
            extension: handler.extension,
        };
    }
    async resolveTaskInternal(resolvedTaskDTO) {
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            return resolvedTaskDTO;
        }
        else {
            this._logService.warn('Only custom execution tasks supported.');
        }
        return undefined;
    }
    async $resolveVariables(uriComponents, toResolve) {
        const result = {
            process: undefined,
            variables: Object.create(null),
        };
        return result;
    }
    async $jsonTasksSupported() {
        return false;
    }
    async $findExecutable(command, cwd, paths) {
        return undefined;
    }
};
WorkerExtHostTask = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], WorkerExtHostTask);
export { WorkerExtHostTask };
export const IExtHostTask = createDecorator('IExtHostTask');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGFzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTlELE9BQU8sRUFBRSxXQUFXLEVBQXlDLE1BQU0sdUJBQXVCLENBQUE7QUFDMUYsT0FBTyxLQUFLLEtBQUssTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQyxPQUFPLEVBQTZCLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFHcEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMs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