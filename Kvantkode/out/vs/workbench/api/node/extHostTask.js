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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0VGFzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBRXBELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR2pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFBb0IsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGVBQWUsRUFDZixhQUFhLEVBQ2IsT0FBTyxFQUNQLGtCQUFrQixHQUVsQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekYsT0FBTyxLQUFLLFNBQVMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUs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