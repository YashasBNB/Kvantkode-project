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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUYXNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvYWJzdHJhY3RUYXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUEyQixNQUFNLHNDQUFzQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQVMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtB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