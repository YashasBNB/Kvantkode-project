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
import { Action } from '../../../../base/common/actions.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import severity from '../../../../base/common/severity.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { Markers } from '../../markers/common/markers.js';
import { ConfiguringTask, CustomTask, TaskEventKind, } from '../../tasks/common/tasks.js';
import { ITaskService } from '../../tasks/common/taskService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const onceFilter = (event, filter) => Event.once(Event.filter(event, filter));
export var TaskRunResult;
(function (TaskRunResult) {
    TaskRunResult[TaskRunResult["Failure"] = 0] = "Failure";
    TaskRunResult[TaskRunResult["Success"] = 1] = "Success";
})(TaskRunResult || (TaskRunResult = {}));
const DEBUG_TASK_ERROR_CHOICE_KEY = 'debug.taskerrorchoice';
const ABORT_LABEL = nls.localize('abort', 'Abort');
const DEBUG_ANYWAY_LABEL = nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, '&&Debug Anyway');
const DEBUG_ANYWAY_LABEL_NO_MEMO = nls.localize('debugAnywayNoMemo', 'Debug Anyway');
let DebugTaskRunner = class DebugTaskRunner {
    constructor(taskService, markerService, configurationService, viewsService, dialogService, storageService, commandService, progressService) {
        this.taskService = taskService;
        this.markerService = markerService;
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this.dialogService = dialogService;
        this.storageService = storageService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.globalCancellation = new CancellationTokenSource();
    }
    cancel() {
        this.globalCancellation.dispose(true);
        this.globalCancellation = new CancellationTokenSource();
    }
    dispose() {
        this.globalCancellation.dispose(true);
    }
    async runTaskAndCheckErrors(root, taskId) {
        try {
            const taskSummary = await this.runTask(root, taskId, this.globalCancellation.token);
            if (taskSummary && (taskSummary.exitCode === undefined || taskSummary.cancelled)) {
                // User canceled, either debugging, or the prelaunch task
                return 0 /* TaskRunResult.Failure */;
            }
            const errorCount = taskId
                ? this.markerService.read({ severities: MarkerSeverity.Error, take: 2 }).length
                : 0;
            const successExitCode = taskSummary && taskSummary.exitCode === 0;
            const failureExitCode = taskSummary && taskSummary.exitCode !== 0;
            const onTaskErrors = this.configurationService.getValue('debug').onTaskErrors;
            if (successExitCode ||
                onTaskErrors === 'debugAnyway' ||
                (errorCount === 0 && !failureExitCode)) {
                return 1 /* TaskRunResult.Success */;
            }
            if (onTaskErrors === 'showErrors') {
                await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (onTaskErrors === 'abort') {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            const taskLabel = typeof taskId === 'string' ? taskId : taskId ? taskId.name : '';
            const message = errorCount > 1
                ? nls.localize('preLaunchTaskErrors', "Errors exist after running preLaunchTask '{0}'.", taskLabel)
                : errorCount === 1
                    ? nls.localize('preLaunchTaskError', "Error exists after running preLaunchTask '{0}'.", taskLabel)
                    : taskSummary && typeof taskSummary.exitCode === 'number'
                        ? nls.localize('preLaunchTaskExitCode', "The preLaunchTask '{0}' terminated with exit code {1}.", taskLabel, taskSummary.exitCode)
                        : nls.localize('preLaunchTaskTerminated', "The preLaunchTask '{0}' terminated.", taskLabel);
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 1] = "DebugAnyway";
                DebugChoice[DebugChoice["ShowErrors"] = 2] = "ShowErrors";
                DebugChoice[DebugChoice["Cancel"] = 0] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            const { result, checkboxChecked } = await this.dialogService.prompt({
                type: severity.Warning,
                message,
                buttons: [
                    {
                        label: DEBUG_ANYWAY_LABEL,
                        run: () => DebugChoice.DebugAnyway,
                    },
                    {
                        label: nls.localize({ key: 'showErrors', comment: ['&& denotes a mnemonic'] }, '&&Show Errors'),
                        run: () => DebugChoice.ShowErrors,
                    },
                ],
                cancelButton: {
                    label: ABORT_LABEL,
                    run: () => DebugChoice.Cancel,
                },
                checkbox: {
                    label: nls.localize('remember', 'Remember my choice in user settings'),
                },
            });
            const debugAnyway = result === DebugChoice.DebugAnyway;
            const abort = result === DebugChoice.Cancel;
            if (checkboxChecked) {
                this.configurationService.updateValue('debug.onTaskErrors', result === DebugChoice.DebugAnyway ? 'debugAnyway' : abort ? 'abort' : 'showErrors');
            }
            if (abort) {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (debugAnyway) {
                return 1 /* TaskRunResult.Success */;
            }
            await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
            return Promise.resolve(0 /* TaskRunResult.Failure */);
        }
        catch (err) {
            const taskConfigureAction = this.taskService.configureAction();
            const choiceMap = JSON.parse(this.storageService.get(DEBUG_TASK_ERROR_CHOICE_KEY, 1 /* StorageScope.WORKSPACE */, '{}'));
            let choice = -1;
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 0] = "DebugAnyway";
                DebugChoice[DebugChoice["ConfigureTask"] = 1] = "ConfigureTask";
                DebugChoice[DebugChoice["Cancel"] = 2] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            if (choiceMap[err.message] !== undefined) {
                choice = choiceMap[err.message];
            }
            else {
                const { result, checkboxChecked } = await this.dialogService.prompt({
                    type: severity.Error,
                    message: err.message,
                    buttons: [
                        {
                            label: nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, '&&Debug Anyway'),
                            run: () => DebugChoice.DebugAnyway,
                        },
                        {
                            label: taskConfigureAction.label,
                            run: () => DebugChoice.ConfigureTask,
                        },
                    ],
                    cancelButton: {
                        run: () => DebugChoice.Cancel,
                    },
                    checkbox: {
                        label: nls.localize('rememberTask', 'Remember my choice for this task'),
                    },
                });
                choice = result;
                if (checkboxChecked) {
                    choiceMap[err.message] = choice;
                    this.storageService.store(DEBUG_TASK_ERROR_CHOICE_KEY, JSON.stringify(choiceMap), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            if (choice === DebugChoice.ConfigureTask) {
                await taskConfigureAction.run();
            }
            return choice === DebugChoice.DebugAnyway ? 1 /* TaskRunResult.Success */ : 0 /* TaskRunResult.Failure */;
        }
    }
    async runTask(root, taskId, token = this.globalCancellation.token) {
        if (!taskId) {
            return Promise.resolve(null);
        }
        if (!root) {
            return Promise.reject(new Error(nls.localize('invalidTaskReference', "Task '{0}' can not be referenced from a launch configuration that is in a different workspace folder.", typeof taskId === 'string' ? taskId : taskId.type)));
        }
        // run a task before starting a debug session
        const task = await this.taskService.getTask(root, taskId);
        if (!task) {
            const errorMessage = typeof taskId === 'string'
                ? nls.localize('DebugTaskNotFoundWithTaskId', "Could not find the task '{0}'.", taskId)
                : nls.localize('DebugTaskNotFound', 'Could not find the specified task.');
            return Promise.reject(createErrorWithActions(errorMessage, [
                new Action(DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, undefined, true, () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID)),
            ]));
        }
        // If a task is missing the problem matcher the promise will never complete, so we need to have a workaround #35340
        let taskStarted = false;
        const store = new DisposableStore();
        const getTaskKey = (t) => t.getKey() ?? t.getMapKey();
        const taskKey = getTaskKey(task);
        const inactivePromise = new Promise((resolve) => store.add(onceFilter(this.taskService.onDidStateChange, (e) => {
            // When a task isBackground it will go inactive when it is safe to launch.
            // But when a background task is terminated by the user, it will also fire an inactive event.
            // This means that we will not get to see the real exit code from running the task (undefined when terminated by the user).
            // Catch the ProcessEnded event here, which occurs before inactive, and capture the exit code to prevent this.
            return ((e.kind === TaskEventKind.Inactive ||
                (e.kind === TaskEventKind.ProcessEnded && e.exitCode === undefined)) &&
                getTaskKey(e.__task) === taskKey);
        })((e) => {
            taskStarted = true;
            resolve(e.kind === TaskEventKind.ProcessEnded ? { exitCode: e.exitCode } : null);
        })));
        store.add(onceFilter(this.taskService.onDidStateChange, (e) => (e.kind === TaskEventKind.Active || e.kind === TaskEventKind.DependsOnStarted) &&
            getTaskKey(e.__task) === taskKey)(() => {
            // Task is active, so everything seems to be fine, no need to prompt after 10 seconds
            // Use case being a slow running task should not be prompted even though it takes more than 10 seconds
            taskStarted = true;
        }));
        const didAcquireInput = store.add(new Emitter());
        store.add(onceFilter(this.taskService.onDidStateChange, (e) => e.kind === TaskEventKind.AcquiredInput && getTaskKey(e.__task) === taskKey)(() => didAcquireInput.fire()));
        const taskDonePromise = this.taskService
            .getActiveTasks()
            .then(async (tasks) => {
            if (tasks.find((t) => getTaskKey(t) === taskKey)) {
                didAcquireInput.fire();
                // Check that the task isn't busy and if it is, wait for it
                const busyTasks = await this.taskService.getBusyTasks();
                if (busyTasks.find((t) => getTaskKey(t) === taskKey)) {
                    taskStarted = true;
                    return inactivePromise;
                }
                // task is already running and isn't busy - nothing to do.
                return Promise.resolve(null);
            }
            const taskPromise = this.taskService.run(task);
            if (task.configurationProperties.isBackground) {
                return inactivePromise;
            }
            return taskPromise.then((x) => x ?? null);
        });
        const result = new Promise((resolve, reject) => {
            taskDonePromise.then((result) => {
                taskStarted = true;
                resolve(result);
            }, (error) => reject(error));
            store.add(token.onCancellationRequested(() => {
                resolve({ exitCode: undefined, cancelled: true });
                this.taskService.terminate(task).catch(() => { });
            }));
            // Start the timeouts once a terminal has been acquired
            store.add(didAcquireInput.event(() => {
                const waitTime = task.configurationProperties.isBackground ? 5000 : 10000;
                // Error shown if there's a background task with no problem matcher that doesn't exit quickly
                store.add(disposableTimeout(() => {
                    if (!taskStarted) {
                        const errorMessage = nls.localize('taskNotTracked', "The task '{0}' has not exited and doesn't have a 'problemMatcher' defined. Make sure to define a problem matcher for watch tasks.", typeof taskId === 'string' ? taskId : JSON.stringify(taskId));
                        reject({ severity: severity.Error, message: errorMessage });
                    }
                }, waitTime));
                const hideSlowPreLaunchWarning = this.configurationService.getValue('debug').hideSlowPreLaunchWarning;
                if (!hideSlowPreLaunchWarning) {
                    // Notification shown on any task taking a while to resolve
                    store.add(disposableTimeout(() => {
                        const message = nls.localize('runningTask', "Waiting for preLaunchTask '{0}'...", task.configurationProperties.name);
                        const buttons = [DEBUG_ANYWAY_LABEL_NO_MEMO, ABORT_LABEL];
                        const canConfigure = task instanceof CustomTask || task instanceof ConfiguringTask;
                        if (canConfigure) {
                            buttons.splice(1, 0, nls.localize('configureTask', 'Configure Task'));
                        }
                        this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, title: message, buttons }, () => result.catch(() => { }), (choice) => {
                            if (choice === undefined) {
                                // no-op, keep waiting
                            }
                            else if (choice === 0) {
                                // debug anyway
                                resolve({ exitCode: 0 });
                            }
                            else {
                                // abort or configure
                                resolve({ exitCode: undefined, cancelled: true });
                                this.taskService.terminate(task).catch(() => { });
                                if (canConfigure && choice === 1) {
                                    // configure
                                    this.taskService.openConfig(task);
                                }
                            }
                        });
                    }, 10_000));
                }
            }));
        });
        return result.finally(() => store.dispose());
    }
};
DebugTaskRunner = __decorate([
    __param(0, ITaskService),
    __param(1, IMarkerService),
    __param(2, IConfigurationService),
    __param(3, IViewsService),
    __param(4, IDialogService),
    __param(5, IStorageService),
    __param(6, ICommandService),
    __param(7, IProgressService)
], DebugTaskRunner);
export { DebugTaskRunner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUYXNrUnVubmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Rhc2tSdW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9GLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFdEYsT0FB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