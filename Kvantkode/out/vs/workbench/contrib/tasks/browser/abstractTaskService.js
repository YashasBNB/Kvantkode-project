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
var AbstractTaskService_1;
import { Action } from '../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as glob from '../../../../base/common/glob.js';
import * as json from '../../../../base/common/json.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import * as Objects from '../../../../base/common/objects.js';
import { ValidationStatus } from '../../../../base/common/parsers.js';
import * as Platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import * as Types from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import * as UUID from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService, WorkspaceFolder, } from '../../../../platform/workspace/common/workspace.js';
import { Markers } from '../../markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../terminal/common/terminal.js';
import { ConfiguringTask, ContributedTask, CustomTask, ExecutionEngine, InMemoryTask, KeyedTaskIdentifier, RuntimeType, TASK_RUNNING_STATE, TaskDefinition, TaskGroup, TaskSorter, TaskSourceKind, USER_TASKS_GROUP_KEY, TaskEventKind, } from '../common/tasks.js';
import { CustomExecutionSupportedContext, ProcessExecutionSupportedContext, ServerlessWebContext, ShellExecutionSupportedContext, TaskCommandsRegistered, TaskExecutionSupportedContext, } from '../common/taskService.js';
import { TaskError, } from '../common/taskSystem.js';
import { getTemplates as getTaskTemplates } from '../common/taskTemplates.js';
import * as TaskConfig from '../common/taskConfiguration.js';
import { TerminalTaskSystem } from './terminalTaskSystem.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { Schemas } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TerminalExitReason } from '../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { configureTaskIcon, isWorkspaceFolder, QUICKOPEN_DETAIL_CONFIG, QUICKOPEN_SKIP_CONFIG, TaskQuickPick, } from './taskQuickPick.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isCancellationError } from '../../../../base/common/errors.js';
const QUICKOPEN_HISTORY_LIMIT_CONFIG = 'task.quickOpen.history';
const PROBLEM_MATCHER_NEVER_CONFIG = 'task.problemMatchers.neverPrompt';
const USE_SLOW_PICKER = 'task.quickOpen.showAll';
export var ConfigureTaskAction;
(function (ConfigureTaskAction) {
    ConfigureTaskAction.ID = 'workbench.action.tasks.configureTaskRunner';
    ConfigureTaskAction.TEXT = nls.localize2('ConfigureTaskRunnerAction.label', 'Configure Task');
})(ConfigureTaskAction || (ConfigureTaskAction = {}));
class ProblemReporter {
    constructor(_outputChannel) {
        this._outputChannel = _outputChannel;
        this._validationStatus = new ValidationStatus();
    }
    info(message) {
        this._validationStatus.state = 1 /* ValidationState.Info */;
        this._outputChannel.append(message + '\n');
    }
    warn(message) {
        this._validationStatus.state = 2 /* ValidationState.Warning */;
        this._outputChannel.append(message + '\n');
    }
    error(message) {
        this._validationStatus.state = 3 /* ValidationState.Error */;
        this._outputChannel.append(message + '\n');
    }
    fatal(message) {
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
        this._outputChannel.append(message + '\n');
    }
    get status() {
        return this._validationStatus;
    }
}
class TaskMap {
    constructor() {
        this._store = new Map();
    }
    forEach(callback) {
        this._store.forEach(callback);
    }
    static getKey(workspaceFolder) {
        let key;
        if (Types.isString(workspaceFolder)) {
            key = workspaceFolder;
        }
        else {
            const uri = isWorkspaceFolder(workspaceFolder)
                ? workspaceFolder.uri
                : workspaceFolder.configuration;
            key = uri ? uri.toString() : '';
        }
        return key;
    }
    get(workspaceFolder) {
        const key = TaskMap.getKey(workspaceFolder);
        let result = this._store.get(key);
        if (!result) {
            result = [];
            this._store.set(key, result);
        }
        return result;
    }
    add(workspaceFolder, ...task) {
        const key = TaskMap.getKey(workspaceFolder);
        let values = this._store.get(key);
        if (!values) {
            values = [];
            this._store.set(key, values);
        }
        values.push(...task);
    }
    all() {
        const result = [];
        this._store.forEach((values) => result.push(...values));
        return result;
    }
}
let AbstractTaskService = class AbstractTaskService extends Disposable {
    static { AbstractTaskService_1 = this; }
    // private static autoDetectTelemetryName: string = 'taskServer.autoDetect';
    static { this.RecentlyUsedTasks_Key = 'workbench.tasks.recentlyUsedTasks'; }
    static { this.RecentlyUsedTasks_KeyV2 = 'workbench.tasks.recentlyUsedTasks2'; }
    static { this.PersistentTasks_Key = 'workbench.tasks.persistentTasks'; }
    static { this.IgnoreTask010DonotShowAgain_key = 'workbench.tasks.ignoreTask010Shown'; }
    static { this.OutputChannelId = 'tasks'; }
    static { this.OutputChannelLabel = nls.localize('tasks', 'Tasks'); }
    static { this._nextHandle = 0; }
    get isReconnected() {
        return this._tasksReconnected;
    }
    constructor(_configurationService, _markerService, _outputService, _paneCompositeService, _viewsService, _commandService, _editorService, _fileService, _contextService, _telemetryService, _textFileService, _modelService, _extensionService, _quickInputService, _configurationResolverService, _terminalService, _terminalGroupService, _storageService, _progressService, _openerService, _dialogService, _notificationService, _contextKeyService, _environmentService, _terminalProfileResolverService, _pathService, _textModelResolverService, _preferencesService, _viewDescriptorService, _workspaceTrustRequestService, _workspaceTrustManagementService, _logService, _themeService, _lifecycleService, remoteAgentService, _instantiationService) {
        super();
        this._configurationService = _configurationService;
        this._markerService = _markerService;
        this._outputService = _outputService;
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._commandService = _commandService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._contextService = _contextService;
        this._telemetryService = _telemetryService;
        this._textFileService = _textFileService;
        this._modelService = _modelService;
        this._extensionService = _extensionService;
        this._quickInputService = _quickInputService;
        this._configurationResolverService = _configurationResolverService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._storageService = _storageService;
        this._progressService = _progressService;
        this._openerService = _openerService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._contextKeyService = _contextKeyService;
        this._environmentService = _environmentService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._textModelResolverService = _textModelResolverService;
        this._preferencesService = _preferencesService;
        this._viewDescriptorService = _viewDescriptorService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._logService = _logService;
        this._themeService = _themeService;
        this._lifecycleService = _lifecycleService;
        this._instantiationService = _instantiationService;
        this._tasksReconnected = false;
        this._taskSystemListeners = [];
        this._onDidRegisterSupportedExecutions = new Emitter();
        this._onDidRegisterAllSupportedExecutions = new Emitter();
        this._onDidChangeTaskSystemInfo = new Emitter();
        this._willRestart = false;
        this.onDidChangeTaskSystemInfo = this._onDidChangeTaskSystemInfo.event;
        this._onDidReconnectToTasks = new Emitter();
        this.onDidReconnectToTasks = this._onDidReconnectToTasks.event;
        this._onDidChangeTaskConfig = new Emitter();
        this.onDidChangeTaskConfig = this._onDidChangeTaskConfig.event;
        this._onDidChangeTaskProviders = this._register(new Emitter());
        this.onDidChangeTaskProviders = this._onDidChangeTaskProviders.event;
        this._activatedTaskProviders = new Set();
        this._whenTaskSystemReady = Event.toPromise(this.onDidChangeTaskSystemInfo);
        this._workspaceTasksPromise = undefined;
        this._taskSystem = undefined;
        this._taskSystemListeners = undefined;
        this._outputChannel = this._outputService.getChannel(AbstractTaskService_1.OutputChannelId);
        this._providers = new Map();
        this._providerTypes = new Map();
        this._taskSystemInfos = new Map();
        this._register(this._contextService.onDidChangeWorkspaceFolders(() => {
            const folderSetup = this._computeWorkspaceFolderSetup();
            if (this.executionEngine !== folderSetup[2]) {
                this._disposeTaskSystemListeners();
                this._taskSystem = undefined;
            }
            this._updateSetup(folderSetup);
            return this._updateWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
        }));
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (!e.affectsConfiguration('tasks') ||
                (!this._taskSystem && !this._workspaceTasksPromise)) {
                return;
            }
            if (!this._taskSystem || this._taskSystem instanceof TerminalTaskSystem) {
                this._outputChannel.clear();
            }
            if (e.affectsConfiguration("task.reconnection" /* TaskSettingId.Reconnection */)) {
                if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
                    this._persistentTasks?.clear();
                    this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
                }
            }
            this._setTaskLRUCacheLimit();
            await this._updateWorkspaceTasks(3 /* TaskRunSource.ConfigurationChange */);
            this._onDidChangeTaskConfig.fire();
        }));
        this._taskRunningState = TASK_RUNNING_STATE.bindTo(_contextKeyService);
        this._onDidStateChange = this._register(new Emitter());
        this._registerCommands().then(() => TaskCommandsRegistered.bindTo(this._contextKeyService).set(true));
        ServerlessWebContext.bindTo(this._contextKeyService).set(Platform.isWeb && !remoteAgentService.getConnection()?.remoteAuthority);
        this._configurationResolverService.contributeVariable('defaultBuildTask', async () => {
            // delay provider activation, we might find a single default build task in the tasks.json file
            let tasks = await this._getTasksForGroup(TaskGroup.Build, true);
            if (tasks.length > 0) {
                const defaults = this._getDefaultTasks(tasks);
                if (defaults.length === 1) {
                    return defaults[0]._label;
                }
            }
            // activate all providers, we haven't found the default build task in the tasks.json file
            tasks = await this._getTasksForGroup(TaskGroup.Build);
            const defaults = this._getDefaultTasks(tasks);
            if (defaults.length === 1) {
                return defaults[0]._label;
            }
            else if (defaults.length) {
                tasks = defaults;
            }
            let entry;
            if (tasks && tasks.length > 0) {
                entry = await this._showQuickPick(tasks, nls.localize('TaskService.pickBuildTaskForLabel', 'Select the build task (there is no default build task defined)'));
            }
            const task = entry ? entry.task : undefined;
            if (!task) {
                return undefined;
            }
            return task._label;
        });
        this._register(this._lifecycleService.onBeforeShutdown((e) => {
            this._willRestart = e.reason !== 3 /* ShutdownReason.RELOAD */;
        }));
        this._register(this.onDidStateChange((e) => {
            this._log(nls.localize('taskEvent', 'Task Event kind: {0}', e.kind), true);
            if (e.kind === TaskEventKind.Changed) {
                // no-op
            }
            else if ((this._willRestart ||
                (e.kind === TaskEventKind.Terminated && e.exitReason === TerminalExitReason.User)) &&
                e.taskId) {
                const key = e.__task.getKey();
                if (key) {
                    this.removePersistentTask(key);
                }
            }
            else if (e.kind === TaskEventKind.Start && e.__task && e.__task.getWorkspaceFolder()) {
                this._setPersistentTask(e.__task);
            }
        }));
        this._waitForAllSupportedExecutions = new Promise((resolve) => {
            Event.once(this._onDidRegisterAllSupportedExecutions.event)(() => resolve());
        });
        if (this._terminalService.getReconnectedTerminals('Task')?.length) {
            this._attemptTaskReconnection();
        }
        else {
            this._terminalService.whenConnected.then(() => {
                if (this._terminalService.getReconnectedTerminals('Task')?.length) {
                    this._attemptTaskReconnection();
                }
                else {
                    this._tasksReconnected = true;
                    this._onDidReconnectToTasks.fire();
                }
            });
        }
        this._upgrade();
    }
    registerSupportedExecutions(custom, shell, process) {
        if (custom !== undefined) {
            const customContext = CustomExecutionSupportedContext.bindTo(this._contextKeyService);
            customContext.set(custom);
        }
        const isVirtual = !!VirtualWorkspaceContext.getValue(this._contextKeyService);
        if (shell !== undefined) {
            const shellContext = ShellExecutionSupportedContext.bindTo(this._contextKeyService);
            shellContext.set(shell && !isVirtual);
        }
        if (process !== undefined) {
            const processContext = ProcessExecutionSupportedContext.bindTo(this._contextKeyService);
            processContext.set(process && !isVirtual);
        }
        // update tasks so an incomplete list isn't returned when getWorkspaceTasks is called
        this._workspaceTasksPromise = undefined;
        this._onDidRegisterSupportedExecutions.fire();
        if (Platform.isWeb || (custom && shell && process)) {
            this._onDidRegisterAllSupportedExecutions.fire();
        }
    }
    _attemptTaskReconnection() {
        if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            this._log(nls.localize('TaskService.skippingReconnection', 'Startup kind not window reload, setting connected and removing persistent tasks'), true);
            this._tasksReconnected = true;
            this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        }
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) ||
            this._tasksReconnected) {
            this._log(nls.localize('TaskService.notConnecting', 'Setting tasks connected configured value {0}, tasks were already reconnected {1}', this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */), this._tasksReconnected), true);
            this._tasksReconnected = true;
            return;
        }
        this._log(nls.localize('TaskService.reconnecting', 'Reconnecting to running tasks...'), true);
        this.getWorkspaceTasks(4 /* TaskRunSource.Reconnect */).then(async () => {
            this._tasksReconnected = await this._reconnectTasks();
            this._log(nls.localize('TaskService.reconnected', 'Reconnected to running tasks.'), true);
            this._onDidReconnectToTasks.fire();
        });
    }
    async _reconnectTasks() {
        const tasks = await this.getSavedTasks('persistent');
        if (!tasks.length) {
            this._log(nls.localize('TaskService.noTasks', 'No persistent tasks to reconnect.'), true);
            return true;
        }
        const taskLabels = tasks.map((task) => task._label).join(', ');
        this._log(nls.localize('TaskService.reconnectingTasks', 'Reconnecting to {0} tasks...', taskLabels), true);
        for (const task of tasks) {
            if (ConfiguringTask.is(task)) {
                const resolved = await this.tryResolveTask(task);
                if (resolved) {
                    this.run(resolved, undefined, 4 /* TaskRunSource.Reconnect */);
                }
            }
            else {
                this.run(task, undefined, 4 /* TaskRunSource.Reconnect */);
            }
        }
        return true;
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    get supportsMultipleTaskExecutions() {
        return this.inTerminal();
    }
    async _registerCommands() {
        CommandsRegistry.registerCommand({
            id: 'workbench.action.tasks.runTask',
            handler: async (accessor, arg) => {
                if (await this._trust()) {
                    await this._runTaskCommand(arg);
                }
            },
            metadata: {
                description: 'Run Task',
                args: [
                    {
                        name: 'args',
                        isOptional: true,
                        description: nls.localize('runTask.arg', 'Filters the tasks shown in the quickpick'),
                        schema: {
                            anyOf: [
                                {
                                    type: 'string',
                                    description: nls.localize('runTask.label', "The task's label or a term to filter by"),
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            description: nls.localize('runTask.type', 'The contributed task type'),
                                        },
                                        task: {
                                            type: 'string',
                                            description: nls.localize('runTask.task', "The task's label or a term to filter by"),
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.reRunTask', async (accessor, arg) => {
            if (await this._trust()) {
                this._reRunTaskCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.restartTask', async (accessor, arg) => {
            if (await this._trust()) {
                this._runRestartTaskCommand(arg);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.terminate', async (accessor, arg) => {
            if (await this._trust()) {
                this._runTerminateCommand(arg);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showLog', () => {
            this._showOutput(undefined, true);
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.build', async () => {
            if (await this._trust()) {
                this._runBuildCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.test', async () => {
            if (await this._trust()) {
                this._runTestCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureTaskRunner', async () => {
            if (await this._trust()) {
                this._runConfigureTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultBuildTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultBuildTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultTestTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultTestTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showTasks', async () => {
            if (await this._trust()) {
                return this.runShowTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.toggleProblems', () => this._commandService.executeCommand(Markers.TOGGLE_MARKERS_VIEW_ACTION_ID));
        CommandsRegistry.registerCommand('workbench.action.tasks.openUserTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.openWorkspaceFileTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.WorkspaceFile);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.WorkspaceFile);
            }
        });
    }
    get workspaceFolders() {
        if (!this._workspaceFolders) {
            this._updateSetup();
        }
        return this._workspaceFolders;
    }
    get ignoredWorkspaceFolders() {
        if (!this._ignoredWorkspaceFolders) {
            this._updateSetup();
        }
        return this._ignoredWorkspaceFolders;
    }
    get executionEngine() {
        if (this._executionEngine === undefined) {
            this._updateSetup();
        }
        return this._executionEngine;
    }
    get schemaVersion() {
        if (this._schemaVersion === undefined) {
            this._updateSetup();
        }
        return this._schemaVersion;
    }
    get showIgnoreMessage() {
        if (this._showIgnoreMessage === undefined) {
            this._showIgnoreMessage = !this._storageService.getBoolean(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, 1 /* StorageScope.WORKSPACE */, false);
        }
        return this._showIgnoreMessage;
    }
    _getActivationEvents(type) {
        const result = [];
        result.push('onCommand:workbench.action.tasks.runTask');
        if (type) {
            // send a specific activation event for this task type
            result.push(`onTaskType:${type}`);
        }
        else {
            // send activation events for all task types
            for (const definition of TaskDefinitionRegistry.all()) {
                result.push(`onTaskType:${definition.taskType}`);
            }
        }
        return result;
    }
    async _activateTaskProviders(type) {
        // We need to first wait for extensions to be registered because we might read
        // the `TaskDefinitionRegistry` in case `type` is `undefined`
        await this._extensionService.whenInstalledExtensionsRegistered();
        const hasLoggedActivation = this._activatedTaskProviders.has(type ?? 'all');
        if (!hasLoggedActivation) {
            this._log('Activating task providers ' + (type ?? 'all'));
        }
        const result = await raceTimeout(Promise.all(this._getActivationEvents(type).map((activationEvent) => this._extensionService.activateByEvent(activationEvent))), 5000, () => console.warn('Timed out activating extensions for task providers'));
        if (result) {
            this._activatedTaskProviders.add(type ?? 'all');
        }
    }
    _updateSetup(setup) {
        if (!setup) {
            setup = this._computeWorkspaceFolderSetup();
        }
        this._workspaceFolders = setup[0];
        if (this._ignoredWorkspaceFolders) {
            if (this._ignoredWorkspaceFolders.length !== setup[1].length) {
                this._showIgnoreMessage = undefined;
            }
            else {
                const set = new Set();
                this._ignoredWorkspaceFolders.forEach((folder) => set.add(folder.uri.toString()));
                for (const folder of setup[1]) {
                    if (!set.has(folder.uri.toString())) {
                        this._showIgnoreMessage = undefined;
                        break;
                    }
                }
            }
        }
        this._ignoredWorkspaceFolders = setup[1];
        this._executionEngine = setup[2];
        this._schemaVersion = setup[3];
        this._workspace = setup[4];
    }
    _showOutput(runSource = 1 /* TaskRunSource.User */, userRequested) {
        if (!VirtualWorkspaceContext.getValue(this._contextKeyService) &&
            (runSource === 1 /* TaskRunSource.User */ || runSource === 3 /* TaskRunSource.ConfigurationChange */)) {
            if (userRequested) {
                this._outputService.showChannel(this._outputChannel.id, true);
            }
            else {
                this._notificationService.prompt(Severity.Warning, nls.localize('taskServiceOutputPrompt', 'There are task errors. See the output for details.'), [
                    {
                        label: nls.localize('showOutput', 'Show output'),
                        run: () => {
                            this._outputService.showChannel(this._outputChannel.id, true);
                        },
                    },
                ]);
            }
        }
    }
    _disposeTaskSystemListeners() {
        if (this._taskSystemListeners) {
            dispose(this._taskSystemListeners);
            this._taskSystemListeners = undefined;
        }
    }
    registerTaskProvider(provider, type) {
        if (!provider) {
            return {
                dispose: () => { },
            };
        }
        const handle = AbstractTaskService_1._nextHandle++;
        this._providers.set(handle, provider);
        this._providerTypes.set(handle, type);
        this._onDidChangeTaskProviders.fire();
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._providerTypes.delete(handle);
                this._onDidChangeTaskProviders.fire();
            },
        };
    }
    get hasTaskSystemInfo() {
        const infosCount = Array.from(this._taskSystemInfos.values()).flat().length;
        // If there's a remoteAuthority, then we end up with 2 taskSystemInfos,
        // one for each extension host.
        if (this._environmentService.remoteAuthority) {
            return infosCount > 1;
        }
        return infosCount > 0;
    }
    registerTaskSystem(key, info) {
        // Ideally the Web caller of registerRegisterTaskSystem would use the correct key.
        // However, the caller doesn't know about the workspace folders at the time of the call, even though we know about them here.
        if (info.platform === 0 /* Platform.Platform.Web */) {
            key = this.workspaceFolders.length ? this.workspaceFolders[0].uri.scheme : key;
        }
        if (!this._taskSystemInfos.has(key)) {
            this._taskSystemInfos.set(key, [info]);
        }
        else {
            const infos = this._taskSystemInfos.get(key);
            if (info.platform === 0 /* Platform.Platform.Web */) {
                // Web infos should be pushed last.
                infos.push(info);
            }
            else {
                infos.unshift(info);
            }
        }
        if (this.hasTaskSystemInfo) {
            this._onDidChangeTaskSystemInfo.fire();
        }
    }
    _getTaskSystemInfo(key) {
        const infos = this._taskSystemInfos.get(key);
        return infos && infos.length ? infos[0] : undefined;
    }
    extensionCallbackTaskComplete(task, result) {
        if (!this._taskSystem) {
            return Promise.resolve();
        }
        return this._taskSystem.customExecutionComplete(task, result);
    }
    /**
     * Get a subset of workspace tasks that match a certain predicate.
     */
    async _findWorkspaceTasks(predicate) {
        const result = [];
        const tasks = await this.getWorkspaceTasks();
        for (const [, workspaceTasks] of tasks) {
            if (workspaceTasks.configurations) {
                for (const taskName in workspaceTasks.configurations.byIdentifier) {
                    const task = workspaceTasks.configurations.byIdentifier[taskName];
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
            if (workspaceTasks.set) {
                for (const task of workspaceTasks.set.tasks) {
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
        }
        return result;
    }
    async _findWorkspaceTasksInGroup(group, isDefault) {
        return this._findWorkspaceTasks((task) => {
            const taskGroup = task.configurationProperties.group;
            if (taskGroup && typeof taskGroup !== 'string') {
                return taskGroup._id === group._id && (!isDefault || !!taskGroup.isDefault);
            }
            return false;
        });
    }
    async getTask(folder, identifier, compareId = false, type = undefined) {
        if (!(await this._trust())) {
            return;
        }
        const name = Types.isString(folder)
            ? folder
            : isWorkspaceFolder(folder)
                ? folder.name
                : folder.configuration
                    ? resources.basename(folder.configuration)
                    : undefined;
        if (this.ignoredWorkspaceFolders.some((ignored) => ignored.name === name)) {
            return Promise.reject(new Error(nls.localize('TaskServer.folderIgnored', 'The folder {0} is ignored since it uses task version 0.1.0', name)));
        }
        const key = !Types.isString(identifier)
            ? TaskDefinition.createTaskIdentifier(identifier, console)
            : identifier;
        if (key === undefined) {
            return Promise.resolve(undefined);
        }
        // Try to find the task in the workspace
        const requestedFolder = TaskMap.getKey(folder);
        const matchedTasks = await this._findWorkspaceTasks((task, workspaceFolder) => {
            const taskFolder = TaskMap.getKey(workspaceFolder);
            if (taskFolder !== requestedFolder && taskFolder !== USER_TASKS_GROUP_KEY) {
                return false;
            }
            return task.matches(key, compareId);
        });
        matchedTasks.sort((task) => (task._source.kind === TaskSourceKind.Extension ? 1 : -1));
        if (matchedTasks.length > 0) {
            // Nice, we found a configured task!
            const task = matchedTasks[0];
            if (ConfiguringTask.is(task)) {
                return this.tryResolveTask(task);
            }
            else {
                return task;
            }
        }
        // We didn't find the task, so we need to ask all resolvers about it
        const map = await this._getGroupedTasks({ type });
        let values = map.get(folder);
        values = values.concat(map.get(USER_TASKS_GROUP_KEY));
        if (!values) {
            return undefined;
        }
        values = values
            .filter((task) => task.matches(key, compareId))
            .sort((task) => (task._source.kind === TaskSourceKind.Extension ? 1 : -1));
        return values.length > 0 ? values[0] : undefined;
    }
    async tryResolveTask(configuringTask) {
        if (!(await this._trust())) {
            return;
        }
        await this._activateTaskProviders(configuringTask.type);
        let matchingProvider;
        let matchingProviderUnavailable = false;
        for (const [handle, provider] of this._providers) {
            const providerType = this._providerTypes.get(handle);
            if (configuringTask.type === providerType) {
                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                    matchingProviderUnavailable = true;
                    continue;
                }
                matchingProvider = provider;
                break;
            }
        }
        if (!matchingProvider) {
            if (matchingProviderUnavailable) {
                this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
            }
            return;
        }
        // Try to resolve the task first
        try {
            const resolvedTask = await matchingProvider.resolveTask(configuringTask);
            if (resolvedTask && resolvedTask._id === configuringTask._id) {
                return TaskConfig.createCustomTask(resolvedTask, configuringTask);
            }
        }
        catch (error) {
            // Ignore errors. The task could not be provided by any of the providers.
        }
        // The task couldn't be resolved. Instead, use the less efficient provideTask.
        const tasks = await this.tasks({ type: configuringTask.type });
        for (const task of tasks) {
            if (task._id === configuringTask._id) {
                return TaskConfig.createCustomTask(task, configuringTask);
            }
        }
        return;
    }
    async tasks(filter) {
        if (!(await this._trust())) {
            return [];
        }
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    async getKnownTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter, true, true).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    taskTypes() {
        const types = [];
        if (this._isProvideTasksEnabled()) {
            for (const definition of TaskDefinitionRegistry.all()) {
                if (this._isTaskProviderEnabled(definition.taskType)) {
                    types.push(definition.taskType);
                }
            }
        }
        return types;
    }
    createSorter() {
        return new TaskSorter(this._contextService.getWorkspace() ? this._contextService.getWorkspace().folders : []);
    }
    _isActive() {
        if (!this._taskSystem) {
            return Promise.resolve(false);
        }
        return this._taskSystem.isActive();
    }
    async getActiveTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getActiveTasks();
    }
    async getBusyTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getBusyTasks();
    }
    getRecentlyUsedTasksV1() {
        if (this._recentlyUsedTasksV1) {
            return this._recentlyUsedTasksV1;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasksV1 = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasksV1.set(value, value);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasksV1;
    }
    applyFilterToTaskMap(filter, map) {
        if (!filter || !filter.type) {
            return map.all();
        }
        const result = [];
        map.forEach((tasks) => {
            for (const task of tasks) {
                if (ContributedTask.is(task) &&
                    (task.defines.type === filter.type || task._source.label === filter.type)) {
                    result.push(task);
                }
                else if (CustomTask.is(task)) {
                    if (task.type === filter.type) {
                        result.push(task);
                    }
                    else {
                        const customizes = task.customizes();
                        if (customizes && customizes.type === filter.type) {
                            result.push(task);
                        }
                    }
                }
            }
        });
        return result;
    }
    _getTasksFromStorage(type) {
        return type === 'persistent' ? this._getPersistentTasks() : this._getRecentTasks();
    }
    _getRecentTasks() {
        if (this._recentlyUsedTasks) {
            return this._recentlyUsedTasks;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasks = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasks;
    }
    _getPersistentTasks() {
        if (this._persistentTasks) {
            this._log(nls.localize('taskService.gettingCachedTasks', 'Returning cached tasks {0}', this._persistentTasks.size), true);
            return this._persistentTasks;
        }
        //TODO: should this # be configurable?
        this._persistentTasks = new LRUCache(10);
        const storageValue = this._storageService.get(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._persistentTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._persistentTasks;
    }
    _getFolderFromTaskKey(key) {
        const keyValue = JSON.parse(key);
        return {
            folder: keyValue.folder,
            isWorkspaceFile: keyValue.id?.endsWith(TaskSourceKind.WorkspaceFile),
        };
    }
    async getSavedTasks(type) {
        const folderMap = Object.create(null);
        this.workspaceFolders.forEach((folder) => {
            folderMap[folder.uri.toString()] = folder;
        });
        const folderToTasksMap = new Map();
        const workspaceToTaskMap = new Map();
        const storedTasks = this._getTasksFromStorage(type);
        const tasks = [];
        this._log(nls.localize('taskService.getSavedTasks', 'Fetching tasks from task storage.'), true);
        function addTaskToMap(map, folder, task) {
            if (folder && !map.has(folder)) {
                map.set(folder, []);
            }
            if (folder && (folderMap[folder] || folder === USER_TASKS_GROUP_KEY) && task) {
                map.get(folder).push(task);
            }
        }
        for (const entry of storedTasks.entries()) {
            try {
                const key = entry[0];
                const task = JSON.parse(entry[1]);
                const folderInfo = this._getFolderFromTaskKey(key);
                this._log(nls.localize('taskService.getSavedTasks.reading', 'Reading tasks from task storage, {0}, {1}, {2}', key, task, folderInfo.folder), true);
                addTaskToMap(folderInfo.isWorkspaceFile ? workspaceToTaskMap : folderToTasksMap, folderInfo.folder, task);
            }
            catch (error) {
                this._log(nls.localize('taskService.getSavedTasks.error', 'Fetching a task from task storage failed: {0}.', error), true);
            }
        }
        const readTasksMap = new Map();
        async function readTasks(that, map, isWorkspaceFile) {
            for (const key of map.keys()) {
                const custom = [];
                const customized = Object.create(null);
                const taskConfigSource = folderMap[key]
                    ? isWorkspaceFile
                        ? TaskConfig.TaskConfigSource.WorkspaceFile
                        : TaskConfig.TaskConfigSource.TasksJson
                    : TaskConfig.TaskConfigSource.User;
                await that._computeTasksForSingleConfig(folderMap[key] ?? (await that._getAFolder()), {
                    version: '2.0.0',
                    tasks: map.get(key),
                }, 0 /* TaskRunSource.System */, custom, customized, taskConfigSource, true);
                custom.forEach((task) => {
                    const taskKey = task.getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, task);
                    }
                });
                for (const configuration in customized) {
                    const taskKey = customized[configuration].getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, customized[configuration]);
                    }
                }
            }
        }
        await readTasks(this, folderToTasksMap, false);
        await readTasks(this, workspaceToTaskMap, true);
        for (const key of storedTasks.keys()) {
            if (readTasksMap.has(key)) {
                tasks.push(readTasksMap.get(key));
                this._log(nls.localize('taskService.getSavedTasks.resolved', 'Resolved task {0}', key), true);
            }
            else {
                this._log(nls.localize('taskService.getSavedTasks.unresolved', 'Unable to resolve task {0} ', key), true);
            }
        }
        return tasks;
    }
    removeRecentlyUsedTask(taskRecentlyUsedKey) {
        if (this._getTasksFromStorage('historical').has(taskRecentlyUsedKey)) {
            this._getTasksFromStorage('historical').delete(taskRecentlyUsedKey);
            this._saveRecentlyUsedTasks();
        }
    }
    removePersistentTask(key) {
        this._log(nls.localize('taskService.removePersistentTask', 'Removing persistent task {0}', key), true);
        if (this._getTasksFromStorage('persistent').has(key)) {
            this._getTasksFromStorage('persistent').delete(key);
            this._savePersistentTasks();
        }
    }
    _setTaskLRUCacheLimit() {
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        if (this._recentlyUsedTasks) {
            this._recentlyUsedTasks.limit = quickOpenHistoryLimit;
        }
    }
    async _setRecentlyUsedTask(task) {
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations],
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            this._getTasksFromStorage('historical').set(key, JSON.stringify(customizations));
            this._saveRecentlyUsedTasks();
        }
    }
    _saveRecentlyUsedTasks() {
        if (!this._recentlyUsedTasks) {
            return;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        // setting history limit to 0 means no LRU sorting
        if (quickOpenHistoryLimit === 0) {
            return;
        }
        let keys = [...this._recentlyUsedTasks.keys()];
        if (keys.length > quickOpenHistoryLimit) {
            keys = keys.slice(0, quickOpenHistoryLimit);
        }
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._recentlyUsedTasks.get(key, 0 /* Touch.None */)]);
        }
        this._storageService.store(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async _setPersistentTask(task) {
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
            return;
        }
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations],
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            if (!task.configurationProperties.isBackground) {
                return;
            }
            this._log(nls.localize('taskService.setPersistentTask', 'Setting persistent task {0}', key), true);
            this._getTasksFromStorage('persistent').set(key, JSON.stringify(customizations));
            this._savePersistentTasks();
        }
    }
    _savePersistentTasks() {
        this._persistentTasks = this._getTasksFromStorage('persistent');
        const keys = [...this._persistentTasks.keys()];
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._persistentTasks.get(key, 0 /* Touch.None */)]);
        }
        this._log(nls.localize('savePersistentTask', 'Saving persistent tasks: {0}', keys.join(', ')), true);
        this._storageService.store(AbstractTaskService_1.PersistentTasks_Key, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    _openDocumentation() {
        this._openerService.open(URI.parse('https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher'));
    }
    async _findSingleWorkspaceTaskOfGroup(group) {
        const tasksOfGroup = await this._findWorkspaceTasksInGroup(group, true);
        if (tasksOfGroup.length === 1 &&
            typeof tasksOfGroup[0].configurationProperties.group !== 'string' &&
            tasksOfGroup[0].configurationProperties.group?.isDefault) {
            let resolvedTask;
            if (ConfiguringTask.is(tasksOfGroup[0])) {
                resolvedTask = await this.tryResolveTask(tasksOfGroup[0]);
            }
            else {
                resolvedTask = tasksOfGroup[0];
            }
            if (resolvedTask) {
                return this.run(resolvedTask, undefined, 1 /* TaskRunSource.User */);
            }
        }
        return undefined;
    }
    async _build() {
        const tryBuildShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Build);
        if (tryBuildShortcut) {
            return tryBuildShortcut;
        }
        return this._getGroupedTasksAndExecute();
    }
    async _runTest() {
        const tryTestShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Test);
        if (tryTestShortcut) {
            return tryTestShortcut;
        }
        return this._getGroupedTasksAndExecute(true);
    }
    async _getGroupedTasksAndExecute(test) {
        const tasks = await this._getGroupedTasks();
        const runnable = this._createRunnableTask(tasks, test ? TaskGroup.Test : TaskGroup.Build);
        if (!runnable || !runnable.task) {
            if (test) {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask1', "No test task defined. Mark a task with 'isTestCommand' in the tasks.json file."), 3 /* TaskErrors.NoTestTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask2', "No test task defined. Mark a task with as a 'test' group in the tasks.json file."), 3 /* TaskErrors.NoTestTask */);
                }
            }
            else {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask1', "No build task defined. Mark a task with 'isBuildCommand' in the tasks.json file."), 2 /* TaskErrors.NoBuildTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask2', "No build task defined. Mark a task with as a 'build' group in the tasks.json file."), 2 /* TaskErrors.NoBuildTask */);
                }
            }
        }
        let executeTaskResult;
        try {
            executeTaskResult = await this._executeTask(runnable.task, runnable.resolver, 1 /* TaskRunSource.User */);
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
        return executeTaskResult;
    }
    async run(task, options, runSource = 0 /* TaskRunSource.System */) {
        if (!(await this._trust())) {
            return;
        }
        if (!task) {
            throw new TaskError(Severity.Info, nls.localize('TaskServer.noTask', 'Task to execute is undefined'), 5 /* TaskErrors.TaskNotFound */);
        }
        const resolver = this._createResolver();
        let executeTaskResult;
        try {
            if (options &&
                options.attachProblemMatcher &&
                this._shouldAttachProblemMatcher(task) &&
                !InMemoryTask.is(task)) {
                const taskToExecute = await this._attachProblemMatcher(task);
                if (taskToExecute) {
                    executeTaskResult = await this._executeTask(taskToExecute, resolver, runSource);
                }
            }
            else {
                executeTaskResult = await this._executeTask(task, resolver, runSource);
            }
            return executeTaskResult;
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
    }
    _isProvideTasksEnabled() {
        const settingValue = this._configurationService.getValue("task.autoDetect" /* TaskSettingId.AutoDetect */);
        return settingValue === 'on';
    }
    _isProblemMatcherPromptEnabled(type) {
        const settingValue = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (Types.isBoolean(settingValue)) {
            return !settingValue;
        }
        if (type === undefined) {
            return true;
        }
        const settingValueMap = settingValue;
        return !settingValueMap[type];
    }
    _getTypeForTask(task) {
        let type;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            type = configProperties.type;
        }
        else {
            type = task.getDefinition().type;
        }
        return type;
    }
    _shouldAttachProblemMatcher(task) {
        const enabled = this._isProblemMatcherPromptEnabled(this._getTypeForTask(task));
        if (enabled === false) {
            return false;
        }
        if (!this._canCustomize(task)) {
            return false;
        }
        if (task.configurationProperties.group !== undefined &&
            task.configurationProperties.group !== TaskGroup.Build) {
            return false;
        }
        if (task.configurationProperties.problemMatchers !== undefined &&
            task.configurationProperties.problemMatchers.length > 0) {
            return false;
        }
        if (ContributedTask.is(task)) {
            return (!task.hasDefinedMatchers &&
                !!task.configurationProperties.problemMatchers &&
                task.configurationProperties.problemMatchers.length === 0);
        }
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            return configProperties.problemMatcher === undefined && !task.hasDefinedMatchers;
        }
        return false;
    }
    async _updateNeverProblemMatcherSetting(type) {
        const current = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (current === true) {
            return;
        }
        let newValue;
        if (current !== false) {
            newValue = current;
        }
        else {
            newValue = Object.create(null);
        }
        newValue[type] = true;
        return this._configurationService.updateValue(PROBLEM_MATCHER_NEVER_CONFIG, newValue);
    }
    async _attachProblemMatcher(task) {
        let entries = [];
        for (const key of ProblemMatcherRegistry.keys()) {
            const matcher = ProblemMatcherRegistry.get(key);
            if (matcher.deprecated) {
                continue;
            }
            if (matcher.name === matcher.label) {
                entries.push({ label: matcher.name, matcher: matcher });
            }
            else {
                entries.push({
                    label: matcher.label,
                    description: `$${matcher.name}`,
                    matcher: matcher,
                });
            }
        }
        if (entries.length === 0) {
            return;
        }
        entries = entries.sort((a, b) => {
            if (a.label && b.label) {
                return a.label.localeCompare(b.label);
            }
            else {
                return 0;
            }
        });
        entries.unshift({
            type: 'separator',
            label: nls.localize('TaskService.associate', 'associate'),
        });
        let taskType;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            taskType = configProperties.type;
        }
        else {
            taskType = task.getDefinition().type;
        }
        entries.unshift({
            label: nls.localize('TaskService.attachProblemMatcher.continueWithout', 'Continue without scanning the task output'),
            matcher: undefined,
        }, {
            label: nls.localize('TaskService.attachProblemMatcher.never', 'Never scan the task output for this task'),
            matcher: undefined,
            never: true,
        }, {
            label: nls.localize('TaskService.attachProblemMatcher.neverType', 'Never scan the task output for {0} tasks', taskType),
            matcher: undefined,
            setting: taskType,
        }, {
            label: nls.localize('TaskService.attachProblemMatcher.learnMoreAbout', 'Learn more about scanning the task output'),
            matcher: undefined,
            learnMore: true,
        });
        const problemMatcher = await this._quickInputService.pick(entries, {
            placeHolder: nls.localize('selectProblemMatcher', 'Select for which kind of errors and warnings to scan the task output'),
        });
        if (!problemMatcher) {
            return task;
        }
        if (problemMatcher.learnMore) {
            this._openDocumentation();
            return undefined;
        }
        if (problemMatcher.never) {
            this.customize(task, { problemMatcher: [] }, true);
            return task;
        }
        if (problemMatcher.matcher) {
            const newTask = task.clone();
            const matcherReference = `$${problemMatcher.matcher.name}`;
            const properties = { problemMatcher: [matcherReference] };
            newTask.configurationProperties.problemMatchers = [matcherReference];
            const matcher = ProblemMatcherRegistry.get(problemMatcher.matcher.name);
            if (matcher && matcher.watching !== undefined) {
                properties.isBackground = true;
                newTask.configurationProperties.isBackground = true;
            }
            this.customize(task, properties, true);
            return newTask;
        }
        if (problemMatcher.setting) {
            await this._updateNeverProblemMatcherSetting(problemMatcher.setting);
        }
        return task;
    }
    async _getTasksForGroup(group, waitToActivate) {
        const groups = await this._getGroupedTasks(undefined, waitToActivate);
        const result = [];
        groups.forEach((tasks) => {
            for (const task of tasks) {
                const configTaskGroup = TaskGroup.from(task.configurationProperties.group);
                if (configTaskGroup?._id === group._id) {
                    result.push(task);
                }
            }
        });
        return result;
    }
    needsFolderQualification() {
        return this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
    }
    _canCustomize(task) {
        if (this.schemaVersion !== 2 /* JsonSchemaVersion.V2_0_0 */) {
            return false;
        }
        if (CustomTask.is(task)) {
            return true;
        }
        if (ContributedTask.is(task)) {
            return !!task.getWorkspaceFolder();
        }
        return false;
    }
    async _formatTaskForJson(resource, task) {
        let reference;
        let stringValue = '';
        try {
            reference = await this._textModelResolverService.createModelReference(resource);
            const model = reference.object.textEditorModel;
            const { tabSize, insertSpaces } = model.getOptions();
            const eol = model.getEOL();
            let stringified = toFormattedString(task, { eol, tabSize, insertSpaces });
            const regex = new RegExp(eol + (insertSpaces ? ' '.repeat(tabSize) : '\\t'), 'g');
            stringified = stringified.replace(regex, eol + (insertSpaces ? ' '.repeat(tabSize * 3) : '\t\t\t'));
            const twoTabs = insertSpaces ? ' '.repeat(tabSize * 2) : '\t\t';
            stringValue =
                twoTabs +
                    stringified.slice(0, stringified.length - 1) +
                    twoTabs +
                    stringified.slice(stringified.length - 1);
        }
        finally {
            reference?.dispose();
        }
        return stringValue;
    }
    async _openEditorAtTask(resource, task, configIndex = -1) {
        if (resource === undefined) {
            return Promise.resolve(false);
        }
        const fileContent = await this._fileService.readFile(resource);
        const content = fileContent.value;
        if (!content || !task) {
            return false;
        }
        const contentValue = content.toString();
        let stringValue;
        if (configIndex !== -1) {
            const json = this._configurationService.getValue('tasks', {
                resource,
            });
            if (json.tasks && json.tasks.length > configIndex) {
                stringValue = await this._formatTaskForJson(resource, json.tasks[configIndex]);
            }
        }
        if (!stringValue) {
            if (typeof task === 'string') {
                stringValue = task;
            }
            else {
                stringValue = await this._formatTaskForJson(resource, task);
            }
        }
        const index = contentValue.indexOf(stringValue);
        let startLineNumber = 1;
        for (let i = 0; i < index; i++) {
            if (contentValue.charAt(i) === '\n') {
                startLineNumber++;
            }
        }
        let endLineNumber = startLineNumber;
        for (let i = 0; i < stringValue.length; i++) {
            if (stringValue.charAt(i) === '\n') {
                endLineNumber++;
            }
        }
        const selection = startLineNumber > 1
            ? {
                startLineNumber,
                startColumn: startLineNumber === endLineNumber ? 4 : 3,
                endLineNumber,
                endColumn: startLineNumber === endLineNumber ? undefined : 4,
            }
            : undefined;
        await this._editorService.openEditor({
            resource,
            options: {
                pinned: false,
                forceReload: true, // because content might have changed
                selection,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
        return !!selection;
    }
    _createCustomizableTask(task) {
        let toCustomize;
        const taskConfig = CustomTask.is(task) || ConfiguringTask.is(task) ? task._source.config : undefined;
        if (taskConfig && taskConfig.element) {
            toCustomize = { ...taskConfig.element };
        }
        else if (ContributedTask.is(task)) {
            toCustomize = {};
            const identifier = Object.assign(Object.create(null), task.defines);
            delete identifier['_key'];
            Object.keys(identifier).forEach((key) => (toCustomize[key] = identifier[key]));
            if (task.configurationProperties.problemMatchers &&
                task.configurationProperties.problemMatchers.length > 0 &&
                Types.isStringArray(task.configurationProperties.problemMatchers)) {
                toCustomize.problemMatcher = task.configurationProperties.problemMatchers;
            }
            if (task.configurationProperties.group) {
                toCustomize.group = TaskConfig.GroupKind.to(task.configurationProperties.group);
            }
        }
        if (!toCustomize) {
            return undefined;
        }
        if ((toCustomize.problemMatcher === undefined &&
            task.configurationProperties.problemMatchers === undefined) ||
            (task.configurationProperties.problemMatchers &&
                task.configurationProperties.problemMatchers.length === 0)) {
            toCustomize.problemMatcher = [];
        }
        if (task._source.label !== 'Workspace') {
            toCustomize.label = task.configurationProperties.identifier;
        }
        else {
            toCustomize.label = task._label;
        }
        toCustomize.detail = task.configurationProperties.detail;
        return toCustomize;
    }
    async customize(task, properties, openConfig) {
        if (!(await this._trust())) {
            return;
        }
        const workspaceFolder = task.getWorkspaceFolder();
        if (!workspaceFolder) {
            return Promise.resolve(undefined);
        }
        const configuration = this._getConfiguration(workspaceFolder, task._source.kind);
        if (configuration.hasParseErrors) {
            this._notificationService.warn(nls.localize('customizeParseErrors', 'The current task configuration has errors. Please fix the errors first before customizing a task.'));
            return Promise.resolve(undefined);
        }
        const fileConfig = configuration.config;
        const toCustomize = this._createCustomizableTask(task);
        if (!toCustomize) {
            return Promise.resolve(undefined);
        }
        const index = CustomTask.is(task) ? task._source.config.index : undefined;
        if (properties) {
            for (const property of Object.getOwnPropertyNames(properties)) {
                const value = properties[property];
                if (value !== undefined && value !== null) {
                    ;
                    toCustomize[property] = value;
                }
            }
        }
        if (!fileConfig) {
            const value = {
                version: '2.0.0',
                tasks: [toCustomize],
            };
            let content = [
                '{',
                nls.localize('tasksJsonComment', '\t// See https://go.microsoft.com/fwlink/?LinkId=733558 \n\t// for the documentation about the tasks.json format'),
            ].join('\n') + JSON.stringify(value, null, '\t').substr(1);
            const editorConfig = this._configurationService.getValue();
            if (editorConfig.editor.insertSpaces) {
                content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
            }
            await this._textFileService.create([
                { resource: workspaceFolder.toResource('.vscode/tasks.json'), value: content },
            ]);
        }
        else {
            // We have a global task configuration
            if (index === -1 && properties) {
                if (properties.problemMatcher !== undefined) {
                    fileConfig.problemMatcher = properties.problemMatcher;
                    await this._writeConfiguration(workspaceFolder, 'tasks.problemMatchers', fileConfig.problemMatcher, task._source.kind);
                }
                else if (properties.group !== undefined) {
                    fileConfig.group = properties.group;
                    await this._writeConfiguration(workspaceFolder, 'tasks.group', fileConfig.group, task._source.kind);
                }
            }
            else {
                if (!Array.isArray(fileConfig.tasks)) {
                    fileConfig.tasks = [];
                }
                if (index === undefined) {
                    fileConfig.tasks.push(toCustomize);
                }
                else {
                    fileConfig.tasks[index] = toCustomize;
                }
                await this._writeConfiguration(workspaceFolder, 'tasks.tasks', fileConfig.tasks, task._source.kind);
            }
        }
        if (openConfig) {
            this._openEditorAtTask(this._getResourceForTask(task), toCustomize);
        }
    }
    _writeConfiguration(workspaceFolder, key, value, source) {
        let target = undefined;
        switch (source) {
            case TaskSourceKind.User:
                target = 2 /* ConfigurationTarget.USER */;
                break;
            case TaskSourceKind.WorkspaceFile:
                target = 5 /* ConfigurationTarget.WORKSPACE */;
                break;
            default:
                if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                }
                else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
                    target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
                }
        }
        if (target) {
            return this._configurationService.updateValue(key, value, { resource: workspaceFolder.uri }, target);
        }
        else {
            return undefined;
        }
    }
    _getResourceForKind(kind) {
        this._updateSetup();
        switch (kind) {
            case TaskSourceKind.User: {
                return resources.joinPath(resources.dirname(this._preferencesService.userSettingsResource), 'tasks.json');
            }
            case TaskSourceKind.WorkspaceFile: {
                if (this._workspace && this._workspace.configuration) {
                    return this._workspace.configuration;
                }
            }
            default: {
                return undefined;
            }
        }
    }
    _getResourceForTask(task) {
        if (CustomTask.is(task)) {
            let uri = this._getResourceForKind(task._source.kind);
            if (!uri) {
                const taskFolder = task.getWorkspaceFolder();
                if (taskFolder) {
                    uri = taskFolder.toResource(task._source.config.file);
                }
                else {
                    uri = this.workspaceFolders[0].uri;
                }
            }
            return uri;
        }
        else {
            return task.getWorkspaceFolder().toResource('.vscode/tasks.json');
        }
    }
    async openConfig(task) {
        let resource;
        if (task) {
            resource = this._getResourceForTask(task);
        }
        else {
            resource =
                this._workspaceFolders && this._workspaceFolders.length > 0
                    ? this._workspaceFolders[0].toResource('.vscode/tasks.json')
                    : undefined;
        }
        return this._openEditorAtTask(resource, task ? task._label : undefined, task ? task._source.config.index : -1);
    }
    _createRunnableTask(tasks, group) {
        const resolverData = new Map();
        const workspaceTasks = [];
        const extensionTasks = [];
        tasks.forEach((tasks, folder) => {
            let data = resolverData.get(folder);
            if (!data) {
                data = {
                    id: new Map(),
                    label: new Map(),
                    identifier: new Map(),
                };
                resolverData.set(folder, data);
            }
            for (const task of tasks) {
                data.id.set(task._id, task);
                data.label.set(task._label, task);
                if (task.configurationProperties.identifier) {
                    data.identifier.set(task.configurationProperties.identifier, task);
                }
                if (group && task.configurationProperties.group === group) {
                    if (task._source.kind === TaskSourceKind.Workspace) {
                        workspaceTasks.push(task);
                    }
                    else {
                        extensionTasks.push(task);
                    }
                }
            }
        });
        const resolver = {
            resolve: async (uri, alias) => {
                const data = resolverData.get(typeof uri === 'string' ? uri : uri.toString());
                if (!data) {
                    return undefined;
                }
                return data.id.get(alias) || data.label.get(alias) || data.identifier.get(alias);
            },
        };
        if (workspaceTasks.length > 0) {
            if (workspaceTasks.length > 1) {
                this._log(nls.localize('moreThanOneBuildTask', 'There are many build tasks defined in the tasks.json. Executing the first one.'));
            }
            return { task: workspaceTasks[0], resolver };
        }
        if (extensionTasks.length === 0) {
            return undefined;
        }
        // We can only have extension tasks if we are in version 2.0.0. Then we can even run
        // multiple build tasks.
        if (extensionTasks.length === 1) {
            return { task: extensionTasks[0], resolver };
        }
        else {
            const id = UUID.generateUuid();
            const task = new InMemoryTask(id, { kind: TaskSourceKind.InMemory, label: 'inMemory' }, id, 'inMemory', { reevaluateOnRerun: true }, {
                identifier: id,
                dependsOn: extensionTasks.map((extensionTask) => {
                    return { uri: extensionTask.getWorkspaceFolder().uri, task: extensionTask._id };
                }),
                name: id,
            });
            return { task, resolver };
        }
    }
    _createResolver(grouped) {
        let resolverData;
        async function quickResolve(that, uri, identifier) {
            const foundTasks = await that._findWorkspaceTasks((task) => {
                const taskUri = ConfiguringTask.is(task) || CustomTask.is(task)
                    ? task._source.config.workspaceFolder?.uri
                    : undefined;
                const originalUri = typeof uri === 'string' ? uri : uri.toString();
                if (taskUri?.toString() !== originalUri) {
                    return false;
                }
                if (Types.isString(identifier)) {
                    return (task._label === identifier || task.configurationProperties.identifier === identifier);
                }
                else {
                    const keyedIdentifier = task.getDefinition(true);
                    const searchIdentifier = TaskDefinition.createTaskIdentifier(identifier, console);
                    return searchIdentifier && keyedIdentifier
                        ? searchIdentifier._key === keyedIdentifier._key
                        : false;
                }
            });
            if (foundTasks.length === 0) {
                return undefined;
            }
            const task = foundTasks[0];
            if (ConfiguringTask.is(task)) {
                return that.tryResolveTask(task);
            }
            return task;
        }
        async function getResolverData(that) {
            if (resolverData === undefined) {
                resolverData = new Map();
                (grouped || (await that._getGroupedTasks())).forEach((tasks, folder) => {
                    let data = resolverData.get(folder);
                    if (!data) {
                        data = {
                            label: new Map(),
                            identifier: new Map(),
                            taskIdentifier: new Map(),
                        };
                        resolverData.set(folder, data);
                    }
                    for (const task of tasks) {
                        data.label.set(task._label, task);
                        if (task.configurationProperties.identifier) {
                            data.identifier.set(task.configurationProperties.identifier, task);
                        }
                        const keyedIdentifier = task.getDefinition(true);
                        if (keyedIdentifier !== undefined) {
                            data.taskIdentifier.set(keyedIdentifier._key, task);
                        }
                    }
                });
            }
            return resolverData;
        }
        async function fullResolve(that, uri, identifier) {
            const allResolverData = await getResolverData(that);
            const data = allResolverData.get(typeof uri === 'string' ? uri : uri.toString());
            if (!data) {
                return undefined;
            }
            if (Types.isString(identifier)) {
                return data.label.get(identifier) || data.identifier.get(identifier);
            }
            else {
                const key = TaskDefinition.createTaskIdentifier(identifier, console);
                return key !== undefined ? data.taskIdentifier.get(key._key) : undefined;
            }
        }
        return {
            resolve: async (uri, identifier) => {
                if (!identifier) {
                    return undefined;
                }
                if (resolverData === undefined && grouped === undefined) {
                    return (await quickResolve(this, uri, identifier)) ?? fullResolve(this, uri, identifier);
                }
                else {
                    return fullResolve(this, uri, identifier);
                }
            },
        };
    }
    async _saveBeforeRun() {
        let SaveBeforeRunConfigOptions;
        (function (SaveBeforeRunConfigOptions) {
            SaveBeforeRunConfigOptions["Always"] = "always";
            SaveBeforeRunConfigOptions["Never"] = "never";
            SaveBeforeRunConfigOptions["Prompt"] = "prompt";
        })(SaveBeforeRunConfigOptions || (SaveBeforeRunConfigOptions = {}));
        const saveBeforeRunTaskConfig = this._configurationService.getValue("task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */);
        if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Never) {
            return false;
        }
        else if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Prompt &&
            this._editorService.editors.some((e) => e.isDirty())) {
            const { confirmed } = await this._dialogService.confirm({
                message: nls.localize('TaskSystem.saveBeforeRun.prompt.title', 'Save all editors?'),
                detail: nls.localize('detail', 'Do you want to save all editors before running the task?'),
                primaryButton: nls.localize({ key: 'saveBeforeRun.save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                cancelButton: nls.localize({ key: 'saveBeforeRun.dontSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
            });
            if (!confirmed) {
                return false;
            }
        }
        await this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ });
        return true;
    }
    async _executeTask(task, resolver, runSource) {
        let taskToRun = task;
        if (await this._saveBeforeRun()) {
            await this._configurationService.reloadConfiguration();
            await this._updateWorkspaceTasks();
            const taskFolder = task.getWorkspaceFolder();
            const taskIdentifier = task.configurationProperties.identifier;
            const taskType = CustomTask.is(task)
                ? task.customizes()?.type
                : ContributedTask.is(task)
                    ? task.type
                    : undefined;
            // Since we save before running tasks, the task may have changed as part of the save.
            // However, if the TaskRunSource is not User, then we shouldn't try to fetch the task again
            // since this can cause a new'd task to get overwritten with a provided task.
            taskToRun =
                (taskFolder && taskIdentifier && runSource === 1 /* TaskRunSource.User */
                    ? await this.getTask(taskFolder, taskIdentifier, false, taskType)
                    : task) ?? task;
        }
        await ProblemMatcherRegistry.onReady();
        const executeResult = runSource === 4 /* TaskRunSource.Reconnect */
            ? this._getTaskSystem().reconnect(taskToRun, resolver)
            : this._getTaskSystem().run(taskToRun, resolver);
        if (executeResult) {
            return this._handleExecuteResult(executeResult, runSource);
        }
        return { exitCode: 0 };
    }
    async _handleExecuteResult(executeResult, runSource) {
        if (runSource === 1 /* TaskRunSource.User */) {
            await this._setRecentlyUsedTask(executeResult.task);
        }
        if (executeResult.kind === 2 /* TaskExecuteKind.Active */) {
            const active = executeResult.active;
            if ((active && active.same && runSource === 2 /* TaskRunSource.FolderOpen */) ||
                runSource === 4 /* TaskRunSource.Reconnect */) {
                // ignore, the task is already active, likely from being reconnected or from folder open.
                this._logService.debug('Ignoring task that is already active', executeResult.task);
                return executeResult.promise;
            }
            if (active && active.same) {
                if (this._taskSystem?.isTaskVisible(executeResult.task)) {
                    const message = nls.localize('TaskSystem.activeSame.noBackground', "The task '{0}' is already active.", executeResult.task.getQualifiedLabel());
                    const lastInstance = this._getTaskSystem().getLastInstance(executeResult.task) ?? executeResult.task;
                    this._notificationService.prompt(Severity.Warning, message, [
                        {
                            label: nls.localize('terminateTask', 'Terminate Task'),
                            run: () => this.terminate(lastInstance),
                        },
                        {
                            label: nls.localize('restartTask', 'Restart Task'),
                            run: () => this._restart(lastInstance),
                        },
                    ], { sticky: true });
                }
                else {
                    this._taskSystem?.revealTask(executeResult.task);
                }
            }
            else {
                throw new TaskError(Severity.Warning, nls.localize('TaskSystem.active', 'There is already a task running. Terminate it first before executing another task.'), 1 /* TaskErrors.RunningTask */);
            }
        }
        this._setRecentlyUsedTask(executeResult.task);
        return executeResult.promise;
    }
    async _restart(task) {
        if (!this._taskSystem) {
            return;
        }
        const response = await this._taskSystem.terminate(task);
        if (response.success) {
            try {
                await this.run(task);
            }
            catch {
                // eat the error, we don't care about it here
            }
        }
        else {
            this._notificationService.warn(nls.localize('TaskSystem.restartFailed', 'Failed to terminate and restart task {0}', Types.isString(task) ? task : task.configurationProperties.name));
        }
    }
    async terminate(task) {
        if (!(await this._trust())) {
            return { success: true, task: undefined };
        }
        if (!this._taskSystem) {
            return { success: true, task: undefined };
        }
        return this._taskSystem.terminate(task);
    }
    _terminateAll() {
        if (!this._taskSystem) {
            return Promise.resolve([]);
        }
        return this._taskSystem.terminateAll();
    }
    _createTerminalTaskSystem() {
        return new TerminalTaskSystem(this._terminalService, this._terminalGroupService, this._outputService, this._paneCompositeService, this._viewsService, this._markerService, this._modelService, this._configurationResolverService, this._contextService, this._environmentService, AbstractTaskService_1.OutputChannelId, this._fileService, this._terminalProfileResolverService, this._pathService, this._viewDescriptorService, this._logService, this._notificationService, this._contextKeyService, this._instantiationService, (workspaceFolder) => {
            if (workspaceFolder) {
                return this._getTaskSystemInfo(workspaceFolder.uri.scheme);
            }
            else if (this._taskSystemInfos.size > 0) {
                const infos = Array.from(this._taskSystemInfos.entries());
                const notFile = infos.filter((info) => info[0] !== Schemas.file);
                if (notFile.length > 0) {
                    return notFile[0][1][0];
                }
                return infos[0][1][0];
            }
            else {
                return undefined;
            }
        });
    }
    _isTaskProviderEnabled(type) {
        const definition = TaskDefinitionRegistry.get(type);
        return (!definition ||
            !definition.when ||
            this._contextKeyService.contextMatchesRules(definition.when));
    }
    async _getGroupedTasks(filter, waitToActivate, knownOnlyOrTrusted) {
        await this._waitForAllSupportedExecutions;
        const type = filter?.type;
        const needsRecentTasksMigration = this._needsRecentTasksMigration();
        if (!waitToActivate) {
            await this._activateTaskProviders(filter?.type);
        }
        const validTypes = Object.create(null);
        TaskDefinitionRegistry.all().forEach((definition) => (validTypes[definition.taskType] = true));
        validTypes['shell'] = true;
        validTypes['process'] = true;
        const contributedTaskSets = await new Promise((resolve) => {
            const result = [];
            let counter = 0;
            const done = (value) => {
                if (value) {
                    result.push(value);
                }
                if (--counter === 0) {
                    resolve(result);
                }
            };
            const error = (error) => {
                try {
                    if (!isCancellationError(error)) {
                        if (error && Types.isString(error.message)) {
                            this._log(`Error: ${error.message}\n`);
                            this._showOutput();
                        }
                        else {
                            this._log('Unknown error received while collecting tasks from providers.');
                            this._showOutput();
                        }
                    }
                }
                finally {
                    if (--counter === 0) {
                        resolve(result);
                    }
                }
            };
            if (this._isProvideTasksEnabled() &&
                this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */ &&
                this._providers.size > 0) {
                let foundAnyProviders = false;
                for (const [handle, provider] of this._providers) {
                    const providerType = this._providerTypes.get(handle);
                    if (type === undefined || type === providerType) {
                        if (providerType && !this._isTaskProviderEnabled(providerType)) {
                            continue;
                        }
                        foundAnyProviders = true;
                        counter++;
                        raceTimeout(provider.provideTasks(validTypes).then((taskSet) => {
                            // Check that the tasks provided are of the correct type
                            for (const task of taskSet.tasks) {
                                if (task.type !== this._providerTypes.get(handle)) {
                                    this._log(nls.localize('unexpectedTaskType', 'The task provider for "{0}" tasks unexpectedly provided a task of type "{1}".\n', this._providerTypes.get(handle), task.type));
                                    if (task.type !== 'shell' && task.type !== 'process') {
                                        this._showOutput();
                                    }
                                    break;
                                }
                            }
                            return done(taskSet);
                        }, error), 5000, () => {
                            // onTimeout
                            console.error('Timed out getting tasks from ', providerType);
                            done(undefined);
                        });
                    }
                }
                if (!foundAnyProviders) {
                    resolve(result);
                }
            }
            else {
                resolve(result);
            }
        });
        const result = new TaskMap();
        const contributedTasks = new TaskMap();
        for (const set of contributedTaskSets) {
            for (const task of set.tasks) {
                const workspaceFolder = task.getWorkspaceFolder();
                if (workspaceFolder) {
                    contributedTasks.add(workspaceFolder, task);
                }
            }
        }
        try {
            let tasks = [];
            // prevent workspace trust dialog from being shown in unexpected cases #224881
            if (!knownOnlyOrTrusted || this._workspaceTrustManagementService.isWorkspaceTrusted()) {
                tasks = Array.from(await this.getWorkspaceTasks());
            }
            await Promise.all(this._getCustomTaskPromises(tasks, filter, result, contributedTasks, waitToActivate));
            if (needsRecentTasksMigration) {
                // At this point we have all the tasks and can migrate the recently used tasks.
                await this._migrateRecentTasks(result.all());
            }
            return result;
        }
        catch {
            // If we can't read the tasks.json file provide at least the contributed tasks
            const result = new TaskMap();
            for (const set of contributedTaskSets) {
                for (const task of set.tasks) {
                    const folder = task.getWorkspaceFolder();
                    if (folder) {
                        result.add(folder, task);
                    }
                }
            }
            return result;
        }
    }
    _getCustomTaskPromises(customTasksKeyValuePairs, filter, result, contributedTasks, waitToActivate) {
        return customTasksKeyValuePairs.map(async ([key, folderTasks]) => {
            const contributed = contributedTasks.get(key);
            if (!folderTasks.set) {
                if (contributed) {
                    result.add(key, ...contributed);
                }
                return;
            }
            if (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                result.add(key, ...folderTasks.set.tasks);
            }
            else {
                const configurations = folderTasks.configurations;
                const legacyTaskConfigurations = folderTasks.set
                    ? this._getLegacyTaskConfigurations(folderTasks.set)
                    : undefined;
                const customTasksToDelete = [];
                if (configurations || legacyTaskConfigurations) {
                    const unUsedConfigurations = new Set();
                    if (configurations) {
                        Object.keys(configurations.byIdentifier).forEach((key) => unUsedConfigurations.add(key));
                    }
                    for (const task of contributed) {
                        if (!ContributedTask.is(task)) {
                            continue;
                        }
                        if (configurations) {
                            const configuringTask = configurations.byIdentifier[task.defines._key];
                            if (configuringTask) {
                                unUsedConfigurations.delete(task.defines._key);
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else if (legacyTaskConfigurations) {
                            const configuringTask = legacyTaskConfigurations[task.defines._key];
                            if (configuringTask) {
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                                customTasksToDelete.push(configuringTask);
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else {
                            result.add(key, task);
                        }
                    }
                    if (customTasksToDelete.length > 0) {
                        const toDelete = customTasksToDelete.reduce((map, task) => {
                            map[task._id] = true;
                            return map;
                        }, Object.create(null));
                        for (const task of folderTasks.set.tasks) {
                            if (toDelete[task._id]) {
                                continue;
                            }
                            result.add(key, task);
                        }
                    }
                    else {
                        result.add(key, ...folderTasks.set.tasks);
                    }
                    const unUsedConfigurationsAsArray = Array.from(unUsedConfigurations);
                    const unUsedConfigurationPromises = unUsedConfigurationsAsArray.map(async (value) => {
                        const configuringTask = configurations.byIdentifier[value];
                        if (filter?.type && filter.type !== configuringTask.configures.type) {
                            return;
                        }
                        let requiredTaskProviderUnavailable = false;
                        for (const [handle, provider] of this._providers) {
                            const providerType = this._providerTypes.get(handle);
                            if (configuringTask.type === providerType) {
                                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                                    requiredTaskProviderUnavailable = true;
                                    continue;
                                }
                                try {
                                    const resolvedTask = await provider.resolveTask(configuringTask);
                                    if (resolvedTask && resolvedTask._id === configuringTask._id) {
                                        result.add(key, TaskConfig.createCustomTask(resolvedTask, configuringTask));
                                        return;
                                    }
                                }
                                catch (error) {
                                    // Ignore errors. The task could not be provided by any of the providers.
                                }
                            }
                        }
                        if (requiredTaskProviderUnavailable) {
                            this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
                        }
                        else if (!waitToActivate) {
                            this._log(nls.localize('TaskService.noConfiguration', "Error: The {0} task detection didn't contribute a task for the following configuration:\n{1}\nThe task will be ignored.", configuringTask.configures.type, JSON.stringify(configuringTask._source.config.element, undefined, 4)));
                            this._showOutput();
                        }
                    });
                    await Promise.all(unUsedConfigurationPromises);
                }
                else {
                    result.add(key, ...folderTasks.set.tasks);
                    result.add(key, ...contributed);
                }
            }
        });
    }
    _getLegacyTaskConfigurations(workspaceTasks) {
        let result;
        function getResult() {
            if (result) {
                return result;
            }
            result = Object.create(null);
            return result;
        }
        for (const task of workspaceTasks.tasks) {
            if (CustomTask.is(task)) {
                const commandName = task.command && task.command.name;
                // This is for backwards compatibility with the 0.1.0 task annotation code
                // if we had a gulp, jake or grunt command a task specification was a annotation
                if (commandName === 'gulp' || commandName === 'grunt' || commandName === 'jake') {
                    const identifier = KeyedTaskIdentifier.create({
                        type: commandName,
                        task: task.configurationProperties.name,
                    });
                    getResult()[identifier._key] = task;
                }
            }
        }
        return result;
    }
    async getWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        if (!(await this._trust())) {
            return new Map();
        }
        await raceTimeout(this._waitForAllSupportedExecutions, 2000, () => {
            this._logService.warn('Timed out waiting for all supported executions');
        });
        await this._whenTaskSystemReady;
        if (this._workspaceTasksPromise) {
            return this._workspaceTasksPromise;
        }
        return this._updateWorkspaceTasks(runSource);
    }
    _updateWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        this._workspaceTasksPromise = this._computeWorkspaceTasks(runSource);
        return this._workspaceTasksPromise;
    }
    async _getAFolder() {
        let folder = this.workspaceFolders.length > 0 ? this.workspaceFolders[0] : undefined;
        if (!folder) {
            const userhome = await this._pathService.userHome();
            folder = new WorkspaceFolder({ uri: userhome, name: resources.basename(userhome), index: 0 });
        }
        return folder;
    }
    async _computeWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        const promises = [];
        for (const folder of this.workspaceFolders) {
            promises.push(this._computeWorkspaceFolderTasks(folder, runSource));
        }
        const values = await Promise.all(promises);
        const result = new Map();
        for (const value of values) {
            if (value) {
                result.set(value.workspaceFolder.uri.toString(), value);
            }
        }
        const folder = await this._getAFolder();
        if (this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
            const workspaceFileTasks = await this._computeWorkspaceFileTasks(folder, runSource);
            if (workspaceFileTasks && this._workspace && this._workspace.configuration) {
                result.set(this._workspace.configuration.toString(), workspaceFileTasks);
            }
        }
        const userTasks = await this._computeUserTasks(folder, runSource);
        if (userTasks) {
            result.set(USER_TASKS_GROUP_KEY, userTasks);
        }
        return result;
    }
    get _jsonTasksSupported() {
        return (ShellExecutionSupportedContext.getValue(this._contextKeyService) === true &&
            ProcessExecutionSupportedContext.getValue(this._contextKeyService) === true);
    }
    async _computeWorkspaceFolderTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        const workspaceFolderConfiguration = this._executionEngine === ExecutionEngine.Process
            ? await this._computeLegacyConfiguration(workspaceFolder)
            : await this._computeConfiguration(workspaceFolder);
        if (!workspaceFolderConfiguration ||
            !workspaceFolderConfiguration.config ||
            workspaceFolderConfiguration.hasErrors) {
            return Promise.resolve({
                workspaceFolder,
                set: undefined,
                configurations: undefined,
                hasErrors: workspaceFolderConfiguration ? workspaceFolderConfiguration.hasErrors : false,
            });
        }
        await ProblemMatcherRegistry.onReady();
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        const parseResult = TaskConfig.parse(workspaceFolder, undefined, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, workspaceFolderConfiguration.config, problemReporter, TaskConfig.TaskConfigSource.TasksJson, this._contextKeyService);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() &&
            parseResult.validationStatus.state !== 1 /* ValidationState.Info */) {
            hasErrors = true;
            this._showOutput(runSource);
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', "Error: the provided task configuration has validation errors and can't not be used. Please correct the errors first."));
            return { workspaceFolder, set: undefined, configurations: undefined, hasErrors };
        }
        let customizedTasks;
        if (parseResult.configured && parseResult.configured.length > 0) {
            customizedTasks = {
                byIdentifier: Object.create(null),
            };
            for (const task of parseResult.configured) {
                customizedTasks.byIdentifier[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && parseResult.custom.length > 0) {
            console.warn('Custom workspace tasks are not supported.');
        }
        return {
            workspaceFolder,
            set: { tasks: this._jsonTasksSupported ? parseResult.custom : [] },
            configurations: customizedTasks,
            hasErrors,
        };
    }
    _testParseExternalConfig(config, location) {
        if (!config) {
            return { config: undefined, hasParseErrors: false };
        }
        const parseErrors = config.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize({
                    key: 'TaskSystem.invalidTaskJsonOther',
                    comment: [
                        'Message notifies of an error in one of several places there is tasks related json, not necessarily in a file named tasks.json',
                    ],
                }, 'Error: The content of the tasks json in {0} has syntax errors. Please correct them before executing a task.', location));
                this._showOutput();
                return { config, hasParseErrors: true };
            }
        }
        return { config, hasParseErrors: false };
    }
    _log(value, verbose) {
        if (!verbose || this._configurationService.getValue("task.verboseLogging" /* TaskSettingId.VerboseLogging */)) {
            this._outputChannel.append(value + '\n');
        }
    }
    async _computeWorkspaceFileTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const workspaceFileConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.WorkspaceFile);
        const configuration = this._testParseExternalConfig(workspaceFileConfig.config, nls.localize('TasksSystem.locationWorkspaceConfig', 'workspace file'));
        const customizedTasks = {
            byIdentifier: Object.create(null),
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.WorkspaceFile);
        const engine = configuration.config
            ? TaskConfig.ExecutionEngine.from(configuration.config)
            : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionWorkspaceFile', 'Only tasks version 2.0.0 permitted in workspace configuration files.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return {
            workspaceFolder,
            set: { tasks: custom },
            configurations: customizedTasks,
            hasErrors: configuration.hasParseErrors,
        };
    }
    async _computeUserTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const userTasksConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.User);
        const configuration = this._testParseExternalConfig(userTasksConfig.config, nls.localize('TasksSystem.locationUserConfig', 'user settings'));
        const customizedTasks = {
            byIdentifier: Object.create(null),
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.User);
        const engine = configuration.config
            ? TaskConfig.ExecutionEngine.from(configuration.config)
            : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionSettings', 'Only tasks version 2.0.0 permitted in user settings.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return {
            workspaceFolder,
            set: { tasks: custom },
            configurations: customizedTasks,
            hasErrors: configuration.hasParseErrors,
        };
    }
    _emptyWorkspaceTaskResults(workspaceFolder) {
        return { workspaceFolder, set: undefined, configurations: undefined, hasErrors: false };
    }
    async _computeTasksForSingleConfig(workspaceFolder, config, runSource, custom, customized, source, isRecentTask = false) {
        if (!config) {
            return false;
        }
        else if (!workspaceFolder) {
            this._logService.trace('TaskService.computeTasksForSingleConfig: no workspace folder for worskspace', this._workspace?.id);
            return false;
        }
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        const parseResult = TaskConfig.parse(workspaceFolder, this._workspace, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, config, problemReporter, source, this._contextKeyService, isRecentTask);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() &&
            parseResult.validationStatus.state !== 1 /* ValidationState.Info */) {
            this._showOutput(runSource);
            hasErrors = true;
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', "Error: the provided task configuration has validation errors and can't not be used. Please correct the errors first."));
            return hasErrors;
        }
        if (parseResult.configured && parseResult.configured.length > 0) {
            for (const task of parseResult.configured) {
                customized[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && parseResult.custom.length > 0) {
            console.warn('Custom workspace tasks are not supported.');
        }
        else {
            for (const task of parseResult.custom) {
                custom.push(task);
            }
        }
        return hasErrors;
    }
    _computeConfiguration(workspaceFolder) {
        const { config, hasParseErrors } = this._getConfiguration(workspaceFolder);
        return Promise.resolve({
            workspaceFolder,
            config,
            hasErrors: hasParseErrors,
        });
    }
    _computeWorkspaceFolderSetup() {
        const workspaceFolders = [];
        const ignoredWorkspaceFolders = [];
        let executionEngine = ExecutionEngine.Terminal;
        let schemaVersion = 2 /* JsonSchemaVersion.V2_0_0 */;
        let workspace;
        if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceFolder = this._contextService.getWorkspace().folders[0];
            workspaceFolders.push(workspaceFolder);
            executionEngine = this._computeExecutionEngine(workspaceFolder);
            schemaVersion = this._computeJsonSchemaVersion(workspaceFolder);
        }
        else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            workspace = this._contextService.getWorkspace();
            for (const workspaceFolder of this._contextService.getWorkspace().folders) {
                if (schemaVersion === this._computeJsonSchemaVersion(workspaceFolder)) {
                    workspaceFolders.push(workspaceFolder);
                }
                else {
                    ignoredWorkspaceFolders.push(workspaceFolder);
                    this._log(nls.localize('taskService.ignoringFolder', 'Ignoring task configurations for workspace folder {0}. Multi folder workspace task support requires that all folders use task version 2.0.0', workspaceFolder.uri.fsPath));
                }
            }
        }
        return [workspaceFolders, ignoredWorkspaceFolders, executionEngine, schemaVersion, workspace];
    }
    _computeExecutionEngine(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return ExecutionEngine._default;
        }
        return TaskConfig.ExecutionEngine.from(config);
    }
    _computeJsonSchemaVersion(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return 2 /* JsonSchemaVersion.V2_0_0 */;
        }
        return TaskConfig.JsonSchemaVersion.from(config);
    }
    _getConfiguration(workspaceFolder, source) {
        let result;
        if (source !== TaskSourceKind.User &&
            this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            result = undefined;
        }
        else {
            const wholeConfig = this._configurationService.inspect('tasks', {
                resource: workspaceFolder.uri,
            });
            switch (source) {
                case TaskSourceKind.User: {
                    if (wholeConfig.userValue !== wholeConfig.workspaceFolderValue) {
                        result = Objects.deepClone(wholeConfig.userValue);
                    }
                    break;
                }
                case TaskSourceKind.Workspace:
                    result = Objects.deepClone(wholeConfig.workspaceFolderValue);
                    break;
                case TaskSourceKind.WorkspaceFile: {
                    if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ &&
                        wholeConfig.workspaceFolderValue !== wholeConfig.workspaceValue) {
                        result = Objects.deepClone(wholeConfig.workspaceValue);
                    }
                    break;
                }
                default:
                    result = Objects.deepClone(wholeConfig.workspaceFolderValue);
            }
        }
        if (!result) {
            return { config: undefined, hasParseErrors: false };
        }
        const parseErrors = result.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize('TaskSystem.invalidTaskJson', 'Error: The content of the tasks.json file has syntax errors. Please correct them before executing a task.'));
                this._showOutput();
                return { config: undefined, hasParseErrors: true };
            }
        }
        return { config: result, hasParseErrors: false };
    }
    inTerminal() {
        if (this._taskSystem) {
            return this._taskSystem instanceof TerminalTaskSystem;
        }
        return this._executionEngine === ExecutionEngine.Terminal;
    }
    configureAction() {
        const thisCapture = this;
        return new (class extends Action {
            constructor() {
                super(ConfigureTaskAction.ID, ConfigureTaskAction.TEXT.value, undefined, true, () => {
                    thisCapture._runConfigureTasks();
                    return Promise.resolve(undefined);
                });
            }
        })();
    }
    _handleError(err) {
        let showOutput = true;
        if (err instanceof TaskError) {
            const buildError = err;
            const needsConfig = buildError.code === 0 /* TaskErrors.NotConfigured */ ||
                buildError.code === 2 /* TaskErrors.NoBuildTask */ ||
                buildError.code === 3 /* TaskErrors.NoTestTask */;
            const needsTerminate = buildError.code === 1 /* TaskErrors.RunningTask */;
            if (needsConfig || needsTerminate) {
                this._notificationService.prompt(buildError.severity, buildError.message, [
                    {
                        label: needsConfig
                            ? ConfigureTaskAction.TEXT.value
                            : nls.localize('TerminateAction.label', 'Terminate Task'),
                        run: () => {
                            if (needsConfig) {
                                this._runConfigureTasks();
                            }
                            else {
                                this._runTerminateCommand();
                            }
                        },
                    },
                ]);
            }
            else {
                this._notificationService.notify({
                    severity: buildError.severity,
                    message: buildError.message,
                });
            }
        }
        else if (err instanceof Error) {
            const error = err;
            this._notificationService.error(error.message);
            showOutput = false;
        }
        else if (Types.isString(err)) {
            this._notificationService.error(err);
        }
        else {
            this._notificationService.error(nls.localize('TaskSystem.unknownError', 'An error has occurred while running a task. See task log for details.'));
        }
        if (showOutput) {
            this._showOutput();
        }
    }
    _showDetail() {
        return this._configurationService.getValue(QUICKOPEN_DETAIL_CONFIG);
    }
    async _createTaskQuickPickEntries(tasks, group = false, sort = false, selectedEntry, includeRecents = true) {
        let encounteredTasks = {};
        if (tasks === undefined || tasks === null || tasks.length === 0) {
            return [];
        }
        const TaskQuickPickEntry = (task) => {
            const newEntry = {
                label: task._label,
                description: this.getTaskDescription(task),
                task,
                detail: this._showDetail() ? task.configurationProperties.detail : undefined,
            };
            if (encounteredTasks[task._id]) {
                if (encounteredTasks[task._id].length === 1) {
                    encounteredTasks[task._id][0].label += ' (1)';
                }
                newEntry.label =
                    newEntry.label + ' (' + (encounteredTasks[task._id].length + 1).toString() + ')';
            }
            else {
                encounteredTasks[task._id] = [];
            }
            encounteredTasks[task._id].push(newEntry);
            return newEntry;
        };
        function fillEntries(entries, tasks, groupLabel) {
            if (tasks.length) {
                entries.push({ type: 'separator', label: groupLabel });
            }
            for (const task of tasks) {
                const entry = TaskQuickPickEntry(task);
                entry.buttons = [
                    {
                        iconClass: ThemeIcon.asClassName(configureTaskIcon),
                        tooltip: nls.localize('configureTask', 'Configure Task'),
                    },
                ];
                if (selectedEntry && task === selectedEntry.task) {
                    entries.unshift(selectedEntry);
                }
                else {
                    entries.push(entry);
                }
            }
        }
        let entries;
        if (group) {
            entries = [];
            if (tasks.length === 1) {
                entries.push(TaskQuickPickEntry(tasks[0]));
            }
            else {
                const recentlyUsedTasks = await this.getSavedTasks('historical');
                const recent = [];
                const recentSet = new Set();
                let configured = [];
                let detected = [];
                const taskMap = Object.create(null);
                tasks.forEach((task) => {
                    const key = task.getCommonTaskId();
                    if (key) {
                        taskMap[key] = task;
                    }
                });
                recentlyUsedTasks.reverse().forEach((recentTask) => {
                    const key = recentTask.getCommonTaskId();
                    if (key) {
                        recentSet.add(key);
                        const task = taskMap[key];
                        if (task) {
                            recent.push(task);
                        }
                    }
                });
                for (const task of tasks) {
                    const key = task.getCommonTaskId();
                    if (!key || !recentSet.has(key)) {
                        if (task._source.kind === TaskSourceKind.Workspace ||
                            task._source.kind === TaskSourceKind.User) {
                            configured.push(task);
                        }
                        else {
                            detected.push(task);
                        }
                    }
                }
                const sorter = this.createSorter();
                if (includeRecents) {
                    fillEntries(entries, recent, nls.localize('recentlyUsed', 'recently used tasks'));
                }
                configured = configured.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, configured, nls.localize('configured', 'configured tasks'));
                detected = detected.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, detected, nls.localize('detected', 'detected tasks'));
            }
        }
        else {
            if (sort) {
                const sorter = this.createSorter();
                tasks = tasks.sort((a, b) => sorter.compare(a, b));
            }
            entries = tasks.map((task) => TaskQuickPickEntry(task));
        }
        encounteredTasks = {};
        return entries;
    }
    async _showTwoLevelQuickPick(placeHolder, defaultEntry, type, name) {
        return this._instantiationService
            .createInstance(TaskQuickPick)
            .show(placeHolder, defaultEntry, type, name);
    }
    async _showQuickPick(tasks, placeHolder, defaultEntry, group = false, sort = false, selectedEntry, additionalEntries, name) {
        const resolvedTasks = await tasks;
        const entries = await raceTimeout(this._createTaskQuickPickEntries(resolvedTasks, group, sort, selectedEntry), 200, () => undefined);
        if (!entries) {
            return undefined;
        }
        if (entries.length === 1 &&
            this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            return entries[0];
        }
        else if (entries.length === 0 && defaultEntry) {
            entries.push(defaultEntry);
        }
        else if (entries.length > 1 && additionalEntries && additionalEntries.length > 0) {
            entries.push({ type: 'separator', label: '' });
            entries.push(additionalEntries[0]);
        }
        return this._quickInputService.pick(entries, {
            value: name,
            placeHolder,
            matchOnDescription: true,
            onDidTriggerItemButton: (context) => {
                const task = context.item.task;
                this._quickInputService.cancel();
                if (ContributedTask.is(task)) {
                    this.customize(task, undefined, true);
                }
                else if (CustomTask.is(task)) {
                    this.openConfig(task);
                }
            },
        });
    }
    _needsRecentTasksMigration() {
        return (this.getRecentlyUsedTasksV1().size > 0 && this._getTasksFromStorage('historical').size === 0);
    }
    async _migrateRecentTasks(tasks) {
        if (!this._needsRecentTasksMigration()) {
            return;
        }
        const recentlyUsedTasks = this.getRecentlyUsedTasksV1();
        const taskMap = Object.create(null);
        tasks.forEach((task) => {
            const key = task.getKey();
            if (key) {
                taskMap[key] = task;
            }
        });
        const reversed = [...recentlyUsedTasks.keys()].reverse();
        for (const key in reversed) {
            const task = taskMap[key];
            if (task) {
                await this._setRecentlyUsedTask(task);
            }
        }
        this._storageService.remove(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
    }
    _showIgnoredFoldersMessage() {
        if (this.ignoredWorkspaceFolders.length === 0 || !this.showIgnoreMessage) {
            return Promise.resolve(undefined);
        }
        this._notificationService.prompt(Severity.Info, nls.localize('TaskService.ignoredFolder', 'The following workspace folders are ignored since they use task version 0.1.0: {0}', this.ignoredWorkspaceFolders.map((f) => f.name).join(', ')), [
            {
                label: nls.localize('TaskService.notAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    this._storageService.store(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    this._showIgnoreMessage = false;
                },
            },
        ]);
        return Promise.resolve(undefined);
    }
    async _trust() {
        if (ServerlessWebContext && !TaskExecutionSupportedContext) {
            return false;
        }
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            return ((await this._workspaceTrustRequestService.requestWorkspaceTrust({
                message: nls.localize('TaskService.requestTrust', 'Listing and running tasks requires that some of the files in this workspace be executed as code.'),
            })) === true);
        }
        return true;
    }
    async _runTaskCommand(filter) {
        if (!this._tasksReconnected) {
            return;
        }
        if (!filter) {
            return this._doRunTaskCommand();
        }
        const type = typeof filter === 'string' ? undefined : filter.type;
        const taskName = typeof filter === 'string' ? filter : filter.task;
        const grouped = await this._getGroupedTasks({ type });
        const identifier = this._getTaskIdentifier(filter);
        const tasks = grouped.all();
        const resolver = this._createResolver(grouped);
        const folderURIs = this._contextService
            .getWorkspace()
            .folders.map((folder) => folder.uri);
        if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            folderURIs.push(this._contextService.getWorkspace().configuration);
        }
        folderURIs.push(USER_TASKS_GROUP_KEY);
        if (identifier) {
            for (const uri of folderURIs) {
                const task = await resolver.resolve(uri, identifier);
                if (task) {
                    this.run(task);
                    return;
                }
            }
        }
        const exactMatchTask = !taskName
            ? undefined
            : tasks.find((t) => t.configurationProperties.identifier === taskName ||
                t.getDefinition(true)?.configurationProperties?.identifier === taskName);
        if (!exactMatchTask) {
            return this._doRunTaskCommand(tasks, type, taskName);
        }
        for (const uri of folderURIs) {
            const task = await resolver.resolve(uri, taskName);
            if (task) {
                await this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */);
                return;
            }
        }
    }
    _tasksAndGroupedTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return { tasks: Promise.resolve([]), grouped: Promise.resolve(new TaskMap()) };
        }
        const grouped = this._getGroupedTasks(filter);
        const tasks = grouped.then((map) => {
            if (!filter || !filter.type) {
                return map.all();
            }
            const result = [];
            map.forEach((tasks) => {
                for (const task of tasks) {
                    if (ContributedTask.is(task) && task.defines.type === filter.type) {
                        result.push(task);
                    }
                    else if (CustomTask.is(task)) {
                        if (task.type === filter.type) {
                            result.push(task);
                        }
                        else {
                            const customizes = task.customizes();
                            if (customizes && customizes.type === filter.type) {
                                result.push(task);
                            }
                        }
                    }
                }
            });
            return result;
        });
        return { tasks, grouped };
    }
    _doRunTaskCommand(tasks, type, name) {
        const pickThen = (task) => {
            if (task === undefined) {
                return;
            }
            if (task === null) {
                this._runConfigureTasks();
            }
            else {
                this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */).then(undefined, (reason) => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
        };
        const placeholder = nls.localize('TaskService.pickRunTask', 'Select the task to run');
        this._showIgnoredFoldersMessage().then(() => {
            if (this._configurationService.getValue(USE_SLOW_PICKER)) {
                let taskResult = undefined;
                if (!tasks) {
                    taskResult = this._tasksAndGroupedTasks();
                }
                this._showQuickPick(tasks ? tasks : taskResult.tasks, placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null,
                }, true, undefined, undefined, undefined, name).then((entry) => {
                    return pickThen(entry ? entry.task : undefined);
                });
            }
            else {
                this._showTwoLevelQuickPick(placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null,
                }, type, name).then(pickThen);
            }
        });
    }
    rerun(terminalInstanceId) {
        const task = this._taskSystem?.getTaskForTerminal(terminalInstanceId);
        if (task) {
            this._restart(task);
        }
        else {
            this._reRunTaskCommand(true);
        }
    }
    _reRunTaskCommand(onlyRerun) {
        ProblemMatcherRegistry.onReady().then(() => {
            return this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ }).then(() => {
                // make sure all dirty editors are saved
                const executeResult = this._getTaskSystem().rerun();
                if (executeResult) {
                    return this._handleExecuteResult(executeResult);
                }
                else {
                    if (!onlyRerun && !this._taskRunningState.get()) {
                        // No task running, prompt to ask which to run
                        this._doRunTaskCommand();
                    }
                    return Promise.resolve(undefined);
                }
            });
        });
    }
    /**
     *
     * @param tasks - The tasks which need to be filtered
     * @param tasksInList - This tells splitPerGroupType to filter out globbed tasks (into defaults)
     * @returns
     */
    _getDefaultTasks(tasks, taskGlobsInList = false) {
        const defaults = [];
        for (const task of tasks.filter((t) => !!t.configurationProperties.group)) {
            // At this point (assuming taskGlobsInList is true) there are tasks with matching globs, so only put those in defaults
            if (taskGlobsInList &&
                typeof task.configurationProperties.group.isDefault === 'string') {
                defaults.push(task);
            }
            else if (!taskGlobsInList &&
                task.configurationProperties.group.isDefault === true) {
                defaults.push(task);
            }
        }
        return defaults;
    }
    _runTaskGroupCommand(taskGroup, strings, configure, legacyCommand) {
        if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
            legacyCommand();
            return;
        }
        const options = {
            location: 10 /* ProgressLocation.Window */,
            title: strings.fetching,
        };
        const promise = (async () => {
            async function runSingleTask(task, problemMatcherOptions, that) {
                that.run(task, problemMatcherOptions, 1 /* TaskRunSource.User */).then(undefined, (reason) => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
            const chooseAndRunTask = (tasks) => {
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, strings.select, {
                        label: strings.notFoundConfigure,
                        task: null,
                    }, true).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (task === undefined) {
                            return;
                        }
                        if (task === null) {
                            configure.apply(this);
                            return;
                        }
                        runSingleTask(task, { attachProblemMatcher: true }, this);
                    });
                });
            };
            let groupTasks = [];
            const { globGroupTasks, globTasksDetected } = await this._getGlobTasks(taskGroup._id);
            groupTasks = [...globGroupTasks];
            if (!globTasksDetected && groupTasks.length === 0) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            const handleMultipleTasks = (areGlobTasks) => {
                return this._getTasksForGroup(taskGroup).then((tasks) => {
                    if (tasks.length > 0) {
                        // If we're dealing with tasks that were chosen because of a glob match,
                        // then put globs in the defaults and everything else in none
                        const defaults = this._getDefaultTasks(tasks, areGlobTasks);
                        if (defaults.length === 1) {
                            runSingleTask(defaults[0], undefined, this);
                            return;
                        }
                        else if (defaults.length > 0) {
                            tasks = defaults;
                        }
                    }
                    // At this this point there are multiple tasks.
                    chooseAndRunTask(tasks);
                });
            };
            const resolveTaskAndRun = (taskGroupTask) => {
                if (ConfiguringTask.is(taskGroupTask)) {
                    this.tryResolveTask(taskGroupTask).then((resolvedTask) => {
                        runSingleTask(resolvedTask, undefined, this);
                    });
                }
                else {
                    runSingleTask(taskGroupTask, undefined, this);
                }
            };
            // A single default glob task was returned, just run it directly
            if (groupTasks.length === 1) {
                return resolveTaskAndRun(groupTasks[0]);
            }
            // If there's multiple globs that match we want to show the quick picker for those tasks
            // We will need to call splitPerGroupType putting globs in defaults and the remaining tasks in none.
            // We don't need to carry on after here
            if (globTasksDetected && groupTasks.length > 1) {
                return handleMultipleTasks(true);
            }
            // If no globs are found or matched fallback to checking for default tasks of the task group
            if (!groupTasks.length) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            if (groupTasks.length === 1) {
                // A single default task was returned, just run it directly
                return resolveTaskAndRun(groupTasks[0]);
            }
            // Multiple default tasks returned, show the quickPicker
            return handleMultipleTasks(false);
        })();
        this._progressService.withProgress(options, () => promise);
    }
    async _getGlobTasks(taskGroupId) {
        let globTasksDetected = false;
        // First check for globs before checking for the default tasks of the task group
        const absoluteURI = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor);
        if (absoluteURI) {
            const workspaceFolder = this._contextService.getWorkspaceFolder(absoluteURI);
            if (workspaceFolder) {
                const configuredTasks = this._getConfiguration(workspaceFolder)?.config?.tasks;
                if (configuredTasks) {
                    globTasksDetected =
                        configuredTasks.filter((task) => task.group &&
                            typeof task.group !== 'string' &&
                            typeof task.group.isDefault === 'string').length > 0;
                    // This will activate extensions, so only do so if necessary #185960
                    if (globTasksDetected) {
                        // Fallback to absolute path of the file if it is not in a workspace or relative path cannot be found
                        const relativePath = workspaceFolder?.uri
                            ? (resources.relativePath(workspaceFolder.uri, absoluteURI) ?? absoluteURI.path)
                            : absoluteURI.path;
                        const globGroupTasks = await this._findWorkspaceTasks((task) => {
                            const currentTaskGroup = task.configurationProperties.group;
                            if (currentTaskGroup &&
                                typeof currentTaskGroup !== 'string' &&
                                typeof currentTaskGroup.isDefault === 'string') {
                                return (currentTaskGroup._id === taskGroupId &&
                                    glob.match(currentTaskGroup.isDefault, relativePath));
                            }
                            globTasksDetected = false;
                            return false;
                        });
                        return { globGroupTasks, globTasksDetected };
                    }
                }
            }
        }
        return { globGroupTasks: [], globTasksDetected };
    }
    _runBuildCommand() {
        if (!this._tasksReconnected) {
            return;
        }
        return this._runTaskGroupCommand(TaskGroup.Build, {
            fetching: nls.localize('TaskService.fetchingBuildTasks', 'Fetching build tasks...'),
            select: nls.localize('TaskService.pickBuildTask', 'Select the build task to run'),
            notFoundConfigure: nls.localize('TaskService.noBuildTask', 'No build task to run found. Configure Build Task...'),
        }, this._runConfigureDefaultBuildTask, this._build);
    }
    _runTestCommand() {
        return this._runTaskGroupCommand(TaskGroup.Test, {
            fetching: nls.localize('TaskService.fetchingTestTasks', 'Fetching test tasks...'),
            select: nls.localize('TaskService.pickTestTask', 'Select the test task to run'),
            notFoundConfigure: nls.localize('TaskService.noTestTaskTerminal', 'No test task to run found. Configure Tasks...'),
        }, this._runConfigureDefaultTestTask, this._runTest);
    }
    _runTerminateCommand(arg) {
        if (arg === 'terminateAll') {
            this._terminateAll();
            return;
        }
        const runQuickPick = (promise) => {
            this._showQuickPick(promise || this.getActiveTasks(), nls.localize('TaskService.taskToTerminate', 'Select a task to terminate'), {
                label: nls.localize('TaskService.noTaskRunning', 'No task is currently running'),
                task: undefined,
            }, false, true, undefined, [
                {
                    label: nls.localize('TaskService.terminateAllRunningTasks', 'All Running Tasks'),
                    id: 'terminateAll',
                    task: undefined,
                },
            ]).then((entry) => {
                if (entry && entry.id === 'terminateAll') {
                    this._terminateAll();
                }
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this.terminate(task);
            });
        };
        if (this.inTerminal()) {
            const identifier = this._getTaskIdentifier(arg);
            let promise;
            if (identifier !== undefined) {
                promise = this.getActiveTasks();
                promise.then((tasks) => {
                    for (const task of tasks) {
                        if (task.matches(identifier)) {
                            this.terminate(task);
                            return;
                        }
                    }
                    runQuickPick(promise);
                });
            }
            else {
                runQuickPick();
            }
        }
        else {
            this._isActive().then((active) => {
                if (active) {
                    this._terminateAll().then((responses) => {
                        // the output runner has only one task
                        const response = responses[0];
                        if (response.success) {
                            return;
                        }
                        if (response.code && response.code === 3 /* TerminateResponseCode.ProcessNotFound */) {
                            this._notificationService.error(nls.localize('TerminateAction.noProcess', "The launched process doesn't exist anymore. If the task spawned background tasks exiting VS Code might result in orphaned processes."));
                        }
                        else {
                            this._notificationService.error(nls.localize('TerminateAction.failed', 'Failed to terminate running task'));
                        }
                    });
                }
            });
        }
    }
    async _runRestartTaskCommand(arg) {
        const activeTasks = await this.getActiveTasks();
        if (activeTasks.length === 1) {
            this._restart(activeTasks[0]);
            return;
        }
        if (this.inTerminal()) {
            // try dispatching using task identifier
            const identifier = this._getTaskIdentifier(arg);
            if (identifier !== undefined) {
                for (const task of activeTasks) {
                    if (task.matches(identifier)) {
                        this._restart(task);
                        return;
                    }
                }
            }
            // show quick pick with active tasks
            const entry = await this._showQuickPick(activeTasks, nls.localize('TaskService.taskToRestart', 'Select the task to restart'), {
                label: nls.localize('TaskService.noTaskToRestart', 'No task to restart'),
                task: null,
            }, false, true);
            if (entry && entry.task) {
                this._restart(entry.task);
            }
        }
        else {
            if (activeTasks.length > 0) {
                this._restart(activeTasks[0]);
            }
        }
    }
    _getTaskIdentifier(filter) {
        let result = undefined;
        if (Types.isString(filter)) {
            result = filter;
        }
        else if (filter && Types.isString(filter.type)) {
            result = TaskDefinition.createTaskIdentifier(filter, console);
        }
        return result;
    }
    _configHasTasks(taskConfig) {
        return !!taskConfig && !!taskConfig.tasks && taskConfig.tasks.length > 0;
    }
    _openTaskFile(resource, taskSource) {
        let configFileCreated = false;
        this._fileService
            .stat(resource)
            .then((stat) => stat, () => undefined)
            .then(async (stat) => {
            const fileExists = !!stat;
            const configValue = this._configurationService.inspect('tasks', {
                resource,
            });
            let tasksExistInFile;
            let target;
            switch (taskSource) {
                case TaskSourceKind.User:
                    tasksExistInFile = this._configHasTasks(configValue.userValue);
                    target = 2 /* ConfigurationTarget.USER */;
                    break;
                case TaskSourceKind.WorkspaceFile:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceValue);
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                    break;
                default:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceFolderValue);
                    target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
            let content;
            if (!tasksExistInFile) {
                const pickTemplateResult = await this._quickInputService.pick(getTaskTemplates(), {
                    placeHolder: nls.localize('TaskService.template', 'Select a Task Template'),
                });
                if (!pickTemplateResult) {
                    return Promise.resolve(undefined);
                }
                content = pickTemplateResult.content;
                const editorConfig = this._configurationService.getValue();
                if (editorConfig.editor.insertSpaces) {
                    content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
                }
                configFileCreated = true;
            }
            if (!fileExists && content) {
                return this._textFileService.create([{ resource, value: content }]).then((result) => {
                    return result[0].resource;
                });
            }
            else if (fileExists && (tasksExistInFile || content)) {
                const statResource = stat?.resource;
                if (content && statResource) {
                    this._configurationService.updateValue('tasks', json.parse(content), { resource: statResource }, target);
                }
                return statResource;
            }
            return undefined;
        })
            .then((resource) => {
            if (!resource) {
                return;
            }
            this._editorService.openEditor({
                resource,
                options: {
                    pinned: configFileCreated, // pin only if config file is created #8727
                },
            });
        });
    }
    _isTaskEntry(value) {
        const candidate = value;
        return candidate && !!candidate.task;
    }
    _isSettingEntry(value) {
        const candidate = value;
        return candidate && !!candidate.settingType;
    }
    _configureTask(task) {
        if (ContributedTask.is(task)) {
            this.customize(task, undefined, true);
        }
        else if (CustomTask.is(task)) {
            this.openConfig(task);
        }
        else if (ConfiguringTask.is(task)) {
            // Do nothing.
        }
    }
    _handleSelection(selection) {
        if (!selection) {
            return;
        }
        if (this._isTaskEntry(selection)) {
            this._configureTask(selection.task);
        }
        else if (this._isSettingEntry(selection)) {
            const taskQuickPick = this._instantiationService.createInstance(TaskQuickPick);
            taskQuickPick.handleSettingOption(selection.settingType);
        }
        else if (selection.folder &&
            this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
            this._openTaskFile(selection.folder.toResource('.vscode/tasks.json'), TaskSourceKind.Workspace);
        }
        else {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        }
    }
    getTaskDescription(task) {
        let description;
        if (task._source.kind === TaskSourceKind.User) {
            description = nls.localize('taskQuickPick.userSettings', 'User');
        }
        else if (task._source.kind === TaskSourceKind.WorkspaceFile) {
            description = task.getWorkspaceFileName();
        }
        else if (this.needsFolderQualification()) {
            const workspaceFolder = task.getWorkspaceFolder();
            if (workspaceFolder) {
                description = workspaceFolder.name;
            }
        }
        return description;
    }
    async _runConfigureTasks() {
        if (!(await this._trust())) {
            return;
        }
        let taskPromise;
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            taskPromise = this._getGroupedTasks();
        }
        else {
            taskPromise = Promise.resolve(new TaskMap());
        }
        const stats = this._contextService
            .getWorkspace()
            .folders.map((folder) => {
            return this._fileService.stat(folder.toResource('.vscode/tasks.json')).then((stat) => stat, () => undefined);
        });
        const createLabel = nls.localize('TaskService.createJsonFile', 'Create tasks.json file from template');
        const openLabel = nls.localize('TaskService.openJsonFile', 'Open tasks.json file');
        const tokenSource = new CancellationTokenSource();
        const cancellationToken = tokenSource.token;
        const entries = Promise.all(stats).then((stats) => {
            return taskPromise.then((taskMap) => {
                const entries = [];
                let configuredCount = 0;
                let tasks = taskMap.all();
                if (tasks.length > 0) {
                    tasks = tasks.sort((a, b) => a._label.localeCompare(b._label));
                    for (const task of tasks) {
                        const entry = {
                            label: TaskQuickPick.getTaskLabelWithIcon(task),
                            task,
                            description: this.getTaskDescription(task),
                            detail: this._showDetail() ? task.configurationProperties.detail : undefined,
                        };
                        TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                        entries.push(entry);
                        if (!ContributedTask.is(task)) {
                            configuredCount++;
                        }
                    }
                }
                const needsCreateOrOpen = configuredCount === 0;
                // If the only configured tasks are user tasks, then we should also show the option to create from a template.
                if (needsCreateOrOpen || taskMap.get(USER_TASKS_GROUP_KEY).length === configuredCount) {
                    const label = stats[0] !== undefined ? openLabel : createLabel;
                    if (entries.length) {
                        entries.push({ type: 'separator' });
                    }
                    entries.push({ label, folder: this._contextService.getWorkspace().folders[0] });
                }
                if (entries.length === 1 && !needsCreateOrOpen) {
                    tokenSource.cancel();
                }
                return entries;
            });
        });
        const timeout = await Promise.race([
            new Promise((resolve) => {
                entries.then(() => resolve(false));
            }),
            new Promise((resolve) => {
                const timer = setTimeout(() => {
                    clearTimeout(timer);
                    resolve(true);
                }, 200);
            }),
        ]);
        if (!timeout &&
            (await entries).length === 1 &&
            this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            const entry = (await entries)[0];
            if (entry.task) {
                this._handleSelection(entry);
                return;
            }
        }
        const entriesWithSettings = entries.then((resolvedEntries) => {
            resolvedEntries.push(...TaskQuickPick.allSettingEntries(this._configurationService));
            return resolvedEntries;
        });
        this._quickInputService
            .pick(entriesWithSettings, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken)
            .then(async (selection) => {
            if (cancellationToken.isCancellationRequested) {
                // canceled when there's only one task
                const task = (await entries)[0];
                if (task.task) {
                    selection = task;
                }
            }
            this._handleSelection(selection);
        });
    }
    _runConfigureDefaultBuildTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks) => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                const entries = [];
                let selectedTask;
                let selectedEntry;
                this._showIgnoredFoldersMessage().then(async () => {
                    const { globGroupTasks } = await this._getGlobTasks(TaskGroup.Build._id);
                    let defaultTasks = globGroupTasks;
                    if (!defaultTasks?.length) {
                        defaultTasks = this._getDefaultTasks(tasks, false);
                    }
                    let defaultBuildTask;
                    if (defaultTasks.length === 1) {
                        const group = defaultTasks[0].configurationProperties.group;
                        if (group) {
                            if (typeof group === 'string' && group === TaskGroup.Build._id) {
                                defaultBuildTask = defaultTasks[0];
                            }
                            else {
                                defaultBuildTask = defaultTasks[0];
                            }
                        }
                    }
                    for (const task of tasks) {
                        if (task === defaultBuildTask) {
                            const label = nls.localize('TaskService.defaultBuildTaskExists', '{0} is already marked as the default build task', TaskQuickPick.getTaskLabelWithIcon(task, task.getQualifiedLabel()));
                            selectedTask = task;
                            selectedEntry = {
                                label,
                                task,
                                description: this.getTaskDescription(task),
                                detail: this._showDetail() ? task.configurationProperties.detail : undefined,
                            };
                            TaskQuickPick.applyColorStyles(task, selectedEntry, this._themeService);
                        }
                        else {
                            const entry = {
                                label: TaskQuickPick.getTaskLabelWithIcon(task),
                                task,
                                description: this.getTaskDescription(task),
                                detail: this._showDetail() ? task.configurationProperties.detail : undefined,
                            };
                            TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                            entries.push(entry);
                        }
                    }
                    if (selectedEntry) {
                        entries.unshift(selectedEntry);
                    }
                    const tokenSource = new CancellationTokenSource();
                    const cancellationToken = tokenSource.token;
                    this._quickInputService
                        .pick(entries, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken)
                        .then(async (entry) => {
                        if (cancellationToken.isCancellationRequested) {
                            // canceled when there's only one task
                            const task = (await entries)[0];
                            if (task.task) {
                                entry = task;
                            }
                        }
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if (task === undefined || task === null) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && task !== selectedTask && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                    this._quickInputService
                        .pick(entries, {
                        placeHolder: nls.localize('TaskService.pickDefaultBuildTask', 'Select the task to be used as the default build task'),
                    })
                        .then((entry) => {
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if (task === undefined || task === null) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && task !== selectedTask && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                });
            });
        }
        else {
            this._runConfigureTasks();
        }
    }
    _runConfigureDefaultTestTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks) => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                let selectedTask;
                let selectedEntry;
                for (const task of tasks) {
                    const taskGroup = TaskGroup.from(task.configurationProperties.group);
                    if (taskGroup && taskGroup.isDefault && taskGroup._id === TaskGroup.Test._id) {
                        selectedTask = task;
                        break;
                    }
                }
                if (selectedTask) {
                    selectedEntry = {
                        label: nls.localize('TaskService.defaultTestTaskExists', '{0} is already marked as the default test task.', selectedTask.getQualifiedLabel()),
                        task: selectedTask,
                        detail: this._showDetail() ? selectedTask.configurationProperties.detail : undefined,
                    };
                }
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, nls.localize('TaskService.pickDefaultTestTask', 'Select the task to be used as the default test task'), undefined, true, false, selectedEntry).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (!task) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'test', isDefault: true } }, true).then(() => {
                                if (selectedTask && task !== selectedTask && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'test' }, false);
                                }
                            });
                        }
                    });
                });
            });
        }
        else {
            this._runConfigureTasks();
        }
    }
    async runShowTasks() {
        const activeTasksPromise = this.getActiveTasks();
        const activeTasks = await activeTasksPromise;
        let group;
        if (activeTasks.length === 1) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else if (activeTasks.length &&
            activeTasks.every((task) => {
                if (InMemoryTask.is(task)) {
                    return false;
                }
                if (!group) {
                    group = task.command.presentation?.group;
                }
                return task.command.presentation?.group && task.command.presentation.group === group;
            })) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else {
            this._showQuickPick(activeTasksPromise, nls.localize('TaskService.pickShowTask', 'Select the task to show its output'), {
                label: nls.localize('TaskService.noTaskIsRunning', 'No task is running'),
                task: null,
            }, false, true).then((entry) => {
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this._taskSystem.revealTask(task);
            });
        }
    }
    async _createTasksDotOld(folder) {
        const tasksFile = folder.toResource('.vscode/tasks.json');
        if (await this._fileService.exists(tasksFile)) {
            const oldFile = tasksFile.with({ path: `${tasksFile.path}.old` });
            await this._fileService.copy(tasksFile, oldFile, true);
            return [oldFile, tasksFile];
        }
        return undefined;
    }
    _upgradeTask(task, suppressTaskName, globalConfig) {
        if (!CustomTask.is(task)) {
            return;
        }
        const configElement = {
            label: task._label,
        };
        const oldTaskTypes = new Set(['gulp', 'jake', 'grunt']);
        if (Types.isString(task.command.name) && oldTaskTypes.has(task.command.name)) {
            configElement.type = task.command.name;
            configElement.task = task.command.args[0];
        }
        else {
            if (task.command.runtime === RuntimeType.Shell) {
                configElement.type = RuntimeType.toString(RuntimeType.Shell);
            }
            if (task.command.name &&
                !suppressTaskName &&
                !globalConfig.windows?.command &&
                !globalConfig.osx?.command &&
                !globalConfig.linux?.command) {
                configElement.command = task.command.name;
            }
            else if (suppressTaskName) {
                configElement.command = task._source.config.element.command;
            }
            if (task.command.args &&
                (!Array.isArray(task.command.args) || task.command.args.length > 0)) {
                if (!globalConfig.windows?.args && !globalConfig.osx?.args && !globalConfig.linux?.args) {
                    configElement.args = task.command.args;
                }
                else {
                    configElement.args = task._source.config.element.args;
                }
            }
        }
        if (task.configurationProperties.presentation) {
            configElement.presentation = task.configurationProperties.presentation;
        }
        if (task.configurationProperties.isBackground) {
            configElement.isBackground = task.configurationProperties.isBackground;
        }
        if (task.configurationProperties.problemMatchers) {
            configElement.problemMatcher = task._source.config.element.problemMatcher;
        }
        if (task.configurationProperties.group) {
            configElement.group = task.configurationProperties.group;
        }
        task._source.config.element = configElement;
        const tempTask = new CustomTask(task._id, task._source, task._label, task.type, task.command, task.hasDefinedMatchers, task.runOptions, task.configurationProperties);
        const configTask = this._createCustomizableTask(tempTask);
        if (configTask) {
            return configTask;
        }
        return;
    }
    async _upgrade() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            return;
        }
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            this._register(Event.once(this._workspaceTrustManagementService.onDidChangeTrust)((isTrusted) => {
                if (isTrusted) {
                    this._upgrade();
                }
            }));
            return;
        }
        const tasks = await this._getGroupedTasks();
        const fileDiffs = [];
        for (const folder of this.workspaceFolders) {
            const diff = await this._createTasksDotOld(folder);
            if (diff) {
                fileDiffs.push(diff);
            }
            if (!diff) {
                continue;
            }
            const configTasks = [];
            const suppressTaskName = !!this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, { resource: folder.uri });
            const globalConfig = {
                windows: (this._configurationService.getValue("tasks.windows" /* TasksSchemaProperties.Windows */, {
                    resource: folder.uri,
                })),
                osx: (this._configurationService.getValue("tasks.osx" /* TasksSchemaProperties.Osx */, { resource: folder.uri })),
                linux: (this._configurationService.getValue("tasks.linux" /* TasksSchemaProperties.Linux */, { resource: folder.uri })),
            };
            tasks.get(folder).forEach((task) => {
                const configTask = this._upgradeTask(task, suppressTaskName, globalConfig);
                if (configTask) {
                    configTasks.push(configTask);
                }
            });
            this._taskSystem = undefined;
            this._workspaceTasksPromise = undefined;
            await this._writeConfiguration(folder, 'tasks.tasks', configTasks);
            await this._writeConfiguration(folder, 'tasks.version', '2.0.0');
            if (this._configurationService.getValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, {
                resource: folder.uri,
            })) {
                await this._configurationService.updateValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, undefined, {
                    resource: folder.uri,
                });
            }
            if (this._configurationService.getValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, {
                resource: folder.uri,
            })) {
                await this._configurationService.updateValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, undefined, { resource: folder.uri });
            }
            if (this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, {
                resource: folder.uri,
            })) {
                await this._configurationService.updateValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, undefined, { resource: folder.uri });
            }
        }
        this._updateSetup();
        this._notificationService.prompt(Severity.Warning, fileDiffs.length === 1
            ? nls.localize('taskService.upgradeVersion', 'The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diff to review the upgrade.')
            : nls.localize('taskService.upgradeVersionPlural', 'The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diffs to review the upgrade.'), [
            {
                label: fileDiffs.length === 1
                    ? nls.localize('taskService.openDiff', 'Open diff')
                    : nls.localize('taskService.openDiffs', 'Open diffs'),
                run: async () => {
                    for (const upgrade of fileDiffs) {
                        await this._editorService.openEditor({
                            original: { resource: upgrade[0] },
                            modified: { resource: upgrade[1] },
                        });
                    }
                },
            },
        ]);
    }
};
AbstractTaskService = AbstractTaskService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMarkerService),
    __param(2, IOutputService),
    __param(3, IPaneCompositePartService),
    __param(4, IViewsService),
    __param(5, ICommandService),
    __param(6, IEditorService),
    __param(7, IFileService),
    __param(8, IWorkspaceContextService),
    __param(9, ITelemetryService),
    __param(10, ITextFileService),
    __param(11, IModelService),
    __param(12, IExtensionService),
    __param(13, IQuickInputService),
    __param(14, IConfigurationResolverService),
    __param(15, ITerminalService),
    __param(16, ITerminalGroupService),
    __param(17, IStorageService),
    __param(18, IProgressService),
    __param(19, IOpenerService),
    __param(20, IDialogService),
    __param(21, INotificationService),
    __param(22, IContextKeyService),
    __param(23, IWorkbenchEnvironmentService),
    __param(24, ITerminalProfileResolverService),
    __param(25, IPathService),
    __param(26, ITextModelService),
    __param(27, IPreferencesService),
    __param(28, IViewDescriptorService),
    __param(29, IWorkspaceTrustRequestService),
    __param(30, IWorkspaceTrustManagementService),
    __param(31, ILogService),
    __param(32, IThemeService),
    __param(33, ILifecycleService),
    __param(34, IRemoteAgentService),
    __param(35, IInstantiationService)
], AbstractTaskService);
export { AbstractTaskService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUYXNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci9hYnN0cmFjdFRhc2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQTJCLE1BQU0sc0NBQXNDLENBQUE7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBUyxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RGLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxD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