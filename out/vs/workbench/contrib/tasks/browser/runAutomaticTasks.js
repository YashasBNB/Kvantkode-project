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
import * as nls from '../../../../nls.js';
import * as resources from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITaskService } from '../common/taskService.js';
import { RunOnOptions, TaskSourceKind, TASKS_CATEGORY, } from '../common/tasks.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const ALLOW_AUTOMATIC_TASKS = 'task.allowAutomaticTasks';
let RunAutomaticTasks = class RunAutomaticTasks extends Disposable {
    constructor(_taskService, _configurationService, _workspaceTrustManagementService, _logService) {
        super();
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._logService = _logService;
        this._hasRunTasks = false;
        if (this._taskService.isReconnected) {
            this._tryRunTasks();
        }
        else {
            this._register(Event.once(this._taskService.onDidReconnectToTasks)(async () => await this._tryRunTasks()));
        }
        this._register(this._workspaceTrustManagementService.onDidChangeTrust(async () => await this._tryRunTasks()));
    }
    async _tryRunTasks() {
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            return;
        }
        if (this._hasRunTasks || this._configurationService.getValue(ALLOW_AUTOMATIC_TASKS) === 'off') {
            return;
        }
        this._hasRunTasks = true;
        this._logService.trace('RunAutomaticTasks: Trying to run tasks.');
        // Wait until we have task system info (the extension host and workspace folders are available).
        if (!this._taskService.hasTaskSystemInfo) {
            this._logService.trace('RunAutomaticTasks: Awaiting task system info.');
            await Event.toPromise(Event.once(this._taskService.onDidChangeTaskSystemInfo));
        }
        let workspaceTasks = await this._taskService.getWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
        this._logService.trace(`RunAutomaticTasks: Found ${workspaceTasks.size} automatic tasks`);
        let autoTasks = this._findAutoTasks(this._taskService, workspaceTasks);
        this._logService.trace(`RunAutomaticTasks: taskNames=${JSON.stringify(autoTasks.taskNames)}`);
        // As seen in some cases with the Remote SSH extension, the tasks configuration is loaded after we have come
        // to this point. Let's give it some extra time.
        if (autoTasks.taskNames.length === 0) {
            const updatedWithinTimeout = await Promise.race([
                new Promise((resolve) => {
                    Event.toPromise(Event.once(this._taskService.onDidChangeTaskConfig)).then(() => resolve(true));
                }),
                new Promise((resolve) => {
                    const timer = setTimeout(() => {
                        clearTimeout(timer);
                        resolve(false);
                    }, 10000);
                }),
            ]);
            if (!updatedWithinTimeout) {
                this._logService.trace(`RunAutomaticTasks: waited some extra time, but no update of tasks configuration`);
                return;
            }
            workspaceTasks = await this._taskService.getWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
            autoTasks = this._findAutoTasks(this._taskService, workspaceTasks);
            this._logService.trace(`RunAutomaticTasks: updated taskNames=${JSON.stringify(autoTasks.taskNames)}`);
        }
        this._runWithPermission(this._taskService, this._configurationService, autoTasks.tasks, autoTasks.taskNames);
    }
    _runTasks(taskService, tasks) {
        tasks.forEach((task) => {
            if (task instanceof Promise) {
                task.then((promiseResult) => {
                    if (promiseResult) {
                        taskService.run(promiseResult);
                    }
                });
            }
            else {
                taskService.run(task);
            }
        });
    }
    _getTaskSource(source) {
        const taskKind = TaskSourceKind.toConfigurationTarget(source.kind);
        switch (taskKind) {
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */: {
                return resources.joinPath(source.config.workspaceFolder.uri, source.config.file);
            }
            case 5 /* ConfigurationTarget.WORKSPACE */: {
                return source.config.workspace?.configuration ?? undefined;
            }
        }
        return undefined;
    }
    _findAutoTasks(taskService, workspaceTaskResult) {
        const tasks = new Array();
        const taskNames = new Array();
        const locations = new Map();
        if (workspaceTaskResult) {
            workspaceTaskResult.forEach((resultElement) => {
                if (resultElement.set) {
                    resultElement.set.tasks.forEach((task) => {
                        if (task.runOptions.runOn === RunOnOptions.folderOpen) {
                            tasks.push(task);
                            taskNames.push(task._label);
                            const location = this._getTaskSource(task._source);
                            if (location) {
                                locations.set(location.fsPath, location);
                            }
                        }
                    });
                }
                if (resultElement.configurations) {
                    for (const configuredTask of Object.values(resultElement.configurations.byIdentifier)) {
                        if (configuredTask.runOptions.runOn === RunOnOptions.folderOpen) {
                            tasks.push(new Promise((resolve) => {
                                taskService
                                    .getTask(resultElement.workspaceFolder, configuredTask._id, true)
                                    .then((task) => resolve(task));
                            }));
                            if (configuredTask._label) {
                                taskNames.push(configuredTask._label);
                            }
                            else {
                                taskNames.push(configuredTask.configures.task);
                            }
                            const location = this._getTaskSource(configuredTask._source);
                            if (location) {
                                locations.set(location.fsPath, location);
                            }
                        }
                    }
                }
            });
        }
        return { tasks, taskNames, locations };
    }
    async _runWithPermission(taskService, configurationService, tasks, taskNames) {
        if (taskNames.length === 0) {
            return;
        }
        if (configurationService.getValue(ALLOW_AUTOMATIC_TASKS) === 'off') {
            return;
        }
        this._runTasks(taskService, tasks);
    }
};
RunAutomaticTasks = __decorate([
    __param(0, ITaskService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, ILogService)
], RunAutomaticTasks);
export { RunAutomaticTasks };
export class ManageAutomaticTaskRunning extends Action2 {
    static { this.ID = 'workbench.action.tasks.manageAutomaticRunning'; }
    static { this.LABEL = nls.localize('workbench.action.tasks.manageAutomaticRunning', 'Manage Automatic Tasks'); }
    constructor() {
        super({
            id: ManageAutomaticTaskRunning.ID,
            title: ManageAutomaticTaskRunning.LABEL,
            category: TASKS_CATEGORY,
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const allowItem = {
            label: nls.localize('workbench.action.tasks.allowAutomaticTasks', 'Allow Automatic Tasks'),
        };
        const disallowItem = {
            label: nls.localize('workbench.action.tasks.disallowAutomaticTasks', 'Disallow Automatic Tasks'),
        };
        const value = await quickInputService.pick([allowItem, disallowItem], { canPickMany: false });
        if (!value) {
            return;
        }
        configurationService.updateValue(ALLOW_AUTOMATIC_TASKS, value === allowItem ? 'on' : 'off', 2 /* ConfigurationTarget.USER */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQXV0b21hdGljVGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3J1bkF1dG9tYXRpY1Rhc2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLFlBQVksRUFBOEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRixPQUFPLEVBQ04sWUFBWSxFQUlaLGNBQWMsRUFDZCxjQUFjLEdBR2QsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXhFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE1BQU0scUJBQXFCLEdBQUcsMEJBQTBCLENBQUE7QUFFakQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBRWhELFlBQ2UsWUFBMkMsRUFDbEMscUJBQTZELEVBRXBGLGdDQUFtRixFQUN0RSxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQTtRQU53QixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUNq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