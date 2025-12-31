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
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { findExecutable } from '../../../base/node/processes.js';
import { IExtHostWorkspace } from '../common/extHostWorkspace.js';
import { IExtHostDocumentsAndEditors } from '../common/extHostDocumentsAndEditors.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { WorkspaceFolder } from '../../../platform/workspace/common/workspace.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { ExtHostTaskBase, TaskHandleDTO, TaskDTO, CustomExecutionDTO, } from '../common/extHostTask.js';
import { Schemas } from '../../../base/common/network.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostApiDeprecationService } from '../common/extHostApiDeprecationService.js';
import * as resources from '../../../base/common/resources.js';
import { homedir } from 'os';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
let ExtHostTask = class ExtHostTask extends ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService, variableResolver) {
        super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
        this.workspaceService = workspaceService;
        this.variableResolver = variableResolver;
        if (initData.remote.isRemote && initData.remote.authority) {
            this.registerTaskSystem(Schemas.vscodeRemote, {
                scheme: Schemas.vscodeRemote,
                authority: initData.remote.authority,
                platform: process.platform,
            });
        }
        else {
            this.registerTaskSystem(Schemas.file, {
                scheme: Schemas.file,
                authority: '',
                platform: process.platform,
            });
        }
        this._proxy.$registerSupportedExecutions(true, true, true);
    }
    async executeTask(extension, task) {
        const tTask = task;
        if (!task.execution && tTask._id === undefined) {
            throw new Error('Tasks to execute must include an execution');
        }
        // We have a preserved ID. So the task didn't change.
        if (tTask._id !== undefined) {
            // Always get the task execution first to prevent timing issues when retrieving it later
            const handleDto = TaskHandleDTO.from(tTask, this.workspaceService);
            const executionDTO = await this._proxy.$getTaskExecution(handleDto);
            if (executionDTO.task === undefined) {
                throw new Error('Task from execution DTO is undefined');
            }
            const execution = await this.getTaskExecution(executionDTO, task);
            this._proxy.$executeTask(handleDto).catch(() => {
                /* The error here isn't actionable. */
            });
            return execution;
        }
        else {
            const dto = TaskDTO.from(task, extension);
            if (dto === undefined) {
                return Promise.reject(new Error('Task is not valid'));
            }
            // If this task is a custom execution, then we need to save it away
            // in the provided custom execution map that is cleaned up after the
            // task is executed.
            if (CustomExecutionDTO.is(dto.execution)) {
                await this.addCustomExecution(dto, task, false);
            }
            // Always get the task execution first to prevent timing issues when retrieving it later
            const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
            this._proxy.$executeTask(dto).catch(() => {
                /* The error here isn't actionable. */
            });
            return execution;
        }
    }
    provideTasksInternal(validTypes, taskIdPromises, handler, value) {
        const taskDTOs = [];
        if (value) {
            for (const task of value) {
                this.checkDeprecation(task, handler);
                if (!task.definition || !validTypes[task.definition.type]) {
                    this._logService.warn(`The task [${task.source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
                }
                const taskDTO = TaskDTO.from(task, handler.extension);
                if (taskDTO) {
                    taskDTOs.push(taskDTO);
                    if (CustomExecutionDTO.is(taskDTO.execution)) {
                        // The ID is calculated on the main thread task side, so, let's call into it here.
                        // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                        // is invoked, we have to be able to map it back to our data.
                        taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
                    }
                }
            }
        }
        return {
            tasks: taskDTOs,
            extension: handler.extension,
        };
    }
    async resolveTaskInternal(resolvedTaskDTO) {
        return resolvedTaskDTO;
    }
    async getAFolder(workspaceFolders) {
        let folder = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0] : undefined;
        if (!folder) {
            const userhome = URI.file(homedir());
            folder = new WorkspaceFolder({ uri: userhome, name: resources.basename(userhome), index: 0 });
        }
        return {
            uri: folder.uri,
            name: folder.name,
            index: folder.index,
            toResource: () => {
                throw new Error('Not implemented');
            },
        };
    }
    async $resolveVariables(uriComponents, toResolve) {
        const uri = URI.revive(uriComponents);
        const result = {
            process: undefined,
            variables: Object.create(null),
        };
        const workspaceFolder = await this._workspaceProvider.resolveWorkspaceFolder(uri);
        const workspaceFolders = (await this._workspaceProvider.getWorkspaceFolders2()) ?? [];
        const resolver = await this.variableResolver.getResolver();
        const ws = workspaceFolder
            ? {
                uri: workspaceFolder.uri,
                name: workspaceFolder.name,
                index: workspaceFolder.index,
                toResource: () => {
                    throw new Error('Not implemented');
                },
            }
            : await this.getAFolder(workspaceFolders);
        for (const variable of toResolve.variables) {
            result.variables[variable] = await resolver.resolveAsync(ws, variable);
        }
        if (toResolve.process !== undefined) {
            let paths = undefined;
            if (toResolve.process.path !== undefined) {
                paths = toResolve.process.path.split(path.delimiter);
                for (let i = 0; i < paths.length; i++) {
                    paths[i] = await resolver.resolveAsync(ws, paths[i]);
                }
            }
            const processName = await resolver.resolveAsync(ws, toResolve.process.name);
            const cwd = toResolve.process.cwd !== undefined
                ? await resolver.resolveAsync(ws, toResolve.process.cwd)
                : undefined;
            const foundExecutable = await findExecutable(processName, cwd, paths);
            if (foundExecutable) {
                result.process = foundExecutable;
            }
            else if (path.isAbsolute(processName)) {
                result.process = processName;
            }
            else {
                result.process = path.join(cwd ?? '', processName);
            }
        }
        return result;
    }
    async $jsonTasksSupported() {
        return true;
    }
    async $findExecutable(command, cwd, paths) {
        return findExecutable(command, cwd, paths);
    }
};
ExtHostTask = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService),
    __param(8, IExtHostVariableResolverProvider)
], ExtHostTask);
export { ExtHostTask };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdFRhc2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RSxPQUFPLEVBQW9CLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRW5HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFDTixlQUFlLEVBQ2YsYUFBYSxFQUNiLE9BQU8sRUFDUCxrQkFBa0IsR0FFbEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8s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