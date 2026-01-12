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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUYXNrUnVubmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnVGFza1J1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0YsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV0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