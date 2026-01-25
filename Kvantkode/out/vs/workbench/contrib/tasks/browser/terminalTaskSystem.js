/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray } from '../../../../base/common/arrays.js';
import * as Async from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { isUNC } from '../../../../base/common/extpath.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { LinkedMap } from '../../../../base/common/map.js';
import * as Objects from '../../../../base/common/objects.js';
import * as path from '../../../../base/common/path.js';
import * as Platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import * as Types from '../../../../base/common/types.js';
import * as nls from '../../../../nls.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { Markers } from '../../markers/common/markers.js';
import { ProblemMatcherRegistry /*, ProblemPattern, getResource */, } from '../common/problemMatcher.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { TaskTerminalStatus } from './taskTerminalStatus.js';
import { StartStopProblemCollector, WatchingProblemCollector, } from '../common/problemCollectors.js';
import { GroupKind } from '../common/taskConfiguration.js';
import { TaskError, Triggers, } from '../common/taskSystem.js';
import { CommandString, ContributedTask, CustomTask, InMemoryTask, PanelKind, RevealKind, RevealProblemKind, RuntimeType, ShellQuoting, TASK_TERMINAL_ACTIVE, TaskEvent, TaskEventKind, TaskSourceKind, } from '../common/tasks.js';
import { VSCodeSequence, } from '../../terminal/browser/terminalEscapeSequences.js';
import { TerminalProcessExtHostProxy } from '../../terminal/browser/terminalProcessExtHostProxy.js';
import { TERMINAL_VIEW_ID, } from '../../terminal/common/terminal.js';
import { RerunForActiveTerminalCommandId, rerunTaskIcon } from './task.contribution.js';
const ReconnectionType = 'Task';
class VariableResolver {
    static { this._regex = /\$\{(.*?)\}/g; }
    constructor(workspaceFolder, taskSystemInfo, values, _service) {
        this.workspaceFolder = workspaceFolder;
        this.taskSystemInfo = taskSystemInfo;
        this.values = values;
        this._service = _service;
    }
    async resolve(value) {
        const replacers = [];
        value.replace(VariableResolver._regex, (match, ...args) => {
            replacers.push(this._replacer(match, args));
            return match;
        });
        const resolvedReplacers = await Promise.all(replacers);
        return value.replace(VariableResolver._regex, () => resolvedReplacers.shift());
    }
    async _replacer(match, args) {
        // Strip out the ${} because the map contains them variables without those characters.
        const result = this.values.get(match.substring(2, match.length - 1));
        if (result !== undefined && result !== null) {
            return result;
        }
        if (this._service) {
            return this._service.resolveAsync(this.workspaceFolder, match);
        }
        return match;
    }
}
class VerifiedTask {
    constructor(task, resolver, trigger) {
        this.task = task;
        this.resolver = resolver;
        this.trigger = trigger;
    }
    verify() {
        let verified = false;
        if (this.trigger &&
            this.resolvedVariables &&
            this.workspaceFolder &&
            this.shellLaunchConfig !== undefined) {
            verified = true;
        }
        return verified;
    }
    getVerifiedTask() {
        if (this.verify()) {
            return {
                task: this.task,
                resolver: this.resolver,
                trigger: this.trigger,
                resolvedVariables: this.resolvedVariables,
                systemInfo: this.systemInfo,
                workspaceFolder: this.workspaceFolder,
                shellLaunchConfig: this.shellLaunchConfig,
            };
        }
        else {
            throw new Error('VerifiedTask was not checked. verify must be checked before getVerifiedTask.');
        }
    }
}
export class TerminalTaskSystem extends Disposable {
    static { this.TelemetryEventName = 'taskService'; }
    static { this.ProcessVarName = '__process__'; }
    static { this._shellQuotes = {
        cmd: {
            strong: '"',
        },
        powershell: {
            escape: {
                escapeChar: '`',
                charsToEscape: ' "\'()',
            },
            strong: "'",
            weak: '"',
        },
        bash: {
            escape: {
                escapeChar: '\\',
                charsToEscape: ' "\'',
            },
            strong: "'",
            weak: '"',
        },
        zsh: {
            escape: {
                escapeChar: '\\',
                charsToEscape: ' "\'',
            },
            strong: "'",
            weak: '"',
        },
    }; }
    static { this._osShellQuotes = {
        Linux: TerminalTaskSystem._shellQuotes['bash'],
        Mac: TerminalTaskSystem._shellQuotes['bash'],
        Windows: TerminalTaskSystem._shellQuotes['powershell'],
    }; }
    taskShellIntegrationStartSequence(cwd) {
        return (VSCodeSequence("A" /* VSCodeOscPt.PromptStart */) +
            VSCodeSequence("P" /* VSCodeOscPt.Property */, `${"Task" /* VSCodeOscProperty.Task */}=True`) +
            (cwd
                ? VSCodeSequence("P" /* VSCodeOscPt.Property */, `${"Cwd" /* VSCodeOscProperty.Cwd */}=${typeof cwd === 'string' ? cwd : cwd.fsPath}`)
                : '') +
            VSCodeSequence("B" /* VSCodeOscPt.CommandStart */));
    }
    get taskShellIntegrationOutputSequence() {
        return VSCodeSequence("C" /* VSCodeOscPt.CommandExecuted */);
    }
    constructor(_terminalService, _terminalGroupService, _outputService, _paneCompositeService, _viewsService, _markerService, _modelService, _configurationResolverService, _contextService, _environmentService, _outputChannelId, _fileService, _terminalProfileResolverService, _pathService, _viewDescriptorService, _logService, _notificationService, contextKeyService, instantiationService, taskSystemInfoResolver) {
        super();
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._outputService = _outputService;
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._markerService = _markerService;
        this._modelService = _modelService;
        this._configurationResolverService = _configurationResolverService;
        this._contextService = _contextService;
        this._environmentService = _environmentService;
        this._outputChannelId = _outputChannelId;
        this._fileService = _fileService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._viewDescriptorService = _viewDescriptorService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._isRerun = false;
        this._terminalCreationQueue = Promise.resolve();
        this._hasReconnected = false;
        this._terminalTabActions = [
            {
                id: RerunForActiveTerminalCommandId,
                label: nls.localize('rerunTask', 'Rerun Task'),
                icon: rerunTaskIcon,
            },
        ];
        this._activeTasks = Object.create(null);
        this._busyTasks = Object.create(null);
        this._terminals = Object.create(null);
        this._idleTaskTerminals = new LinkedMap();
        this._sameTaskTerminals = Object.create(null);
        this._onDidStateChange = new Emitter();
        this._taskSystemInfoResolver = taskSystemInfoResolver;
        this._register((this._terminalStatusManager = instantiationService.createInstance(TaskTerminalStatus)));
        this._taskTerminalActive = TASK_TERMINAL_ACTIVE.bindTo(contextKeyService);
        this._register(this._terminalService.onDidChangeActiveInstance((e) => this._taskTerminalActive.set(e?.shellLaunchConfig.type === 'Task')));
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    _log(value) {
        this._appendOutput(value + '\n');
    }
    _showOutput() {
        this._outputService.showChannel(this._outputChannelId, true);
    }
    reconnect(task, resolver) {
        this._reconnectToTerminals();
        return this.run(task, resolver, Triggers.reconnect);
    }
    run(task, resolver, trigger = Triggers.command) {
        task = task.clone(); // A small amount of task state is stored in the task (instance) and tasks passed in to run may have that set already.
        const instances = InMemoryTask.is(task) || this._isTaskEmpty(task) ? [] : this._getInstances(task);
        const validInstance = instances.length < ((task.runOptions && task.runOptions.instanceLimit) ?? 1);
        const instance = instances[0]?.count?.count ?? 0;
        this._currentTask = new VerifiedTask(task, resolver, trigger);
        if (instance > 0) {
            task.instance = instance;
        }
        if (!validInstance) {
            const terminalData = instances[instances.length - 1];
            this._lastTask = this._currentTask;
            return {
                kind: 2 /* TaskExecuteKind.Active */,
                task: terminalData.task,
                active: { same: true, background: task.configurationProperties.isBackground },
                promise: terminalData.promise,
            };
        }
        try {
            const executeResult = {
                kind: 1 /* TaskExecuteKind.Started */,
                task,
                started: {},
                promise: this._executeTask(task, resolver, trigger, new Set(), new Map(), undefined),
            };
            executeResult.promise.then((summary) => {
                this._lastTask = this._currentTask;
            });
            return executeResult;
        }
        catch (error) {
            if (error instanceof TaskError) {
                throw error;
            }
            else if (error instanceof Error) {
                this._log(error.message);
                throw new TaskError(Severity.Error, error.message, 7 /* TaskErrors.UnknownError */);
            }
            else {
                this._log(error.toString());
                throw new TaskError(Severity.Error, nls.localize('TerminalTaskSystem.unknownError', 'A unknown error has occurred while executing a task. See task output log for details.'), 7 /* TaskErrors.UnknownError */);
            }
        }
    }
    rerun() {
        if (this._lastTask && this._lastTask.verify()) {
            if (this._lastTask.task.runOptions.reevaluateOnRerun !== undefined &&
                !this._lastTask.task.runOptions.reevaluateOnRerun) {
                this._isRerun = true;
            }
            const result = this.run(this._lastTask.task, this._lastTask.resolver);
            result.promise.then((summary) => {
                this._isRerun = false;
            });
            return result;
        }
        else {
            return undefined;
        }
    }
    _showTaskLoadErrors(task) {
        if (task.taskLoadMessages && task.taskLoadMessages.length > 0) {
            task.taskLoadMessages.forEach((loadMessage) => {
                this._log(loadMessage + '\n');
            });
            const openOutput = 'Show Output';
            this._notificationService.prompt(Severity.Warning, nls.localize('TerminalTaskSystem.taskLoadReporting', 'There are issues with task "{0}". See the output for more details.', task._label), [
                {
                    label: openOutput,
                    run: () => this._showOutput(),
                },
            ]);
        }
    }
    isTaskVisible(task) {
        const terminalData = this._activeTasks[task.getMapKey()];
        if (!terminalData?.terminal) {
            return false;
        }
        const activeTerminalInstance = this._terminalService.activeInstance;
        const isPanelShowingTerminal = !!this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        return (isPanelShowingTerminal &&
            activeTerminalInstance?.instanceId === terminalData.terminal.instanceId);
    }
    revealTask(task) {
        const terminalData = this._activeTasks[task.getMapKey()];
        if (!terminalData?.terminal) {
            return false;
        }
        const isTerminalInPanel = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID) ===
            1 /* ViewContainerLocation.Panel */;
        if (isTerminalInPanel && this.isTaskVisible(task)) {
            if (this._previousPanelId) {
                if (this._previousTerminalInstance) {
                    this._terminalService.setActiveInstance(this._previousTerminalInstance);
                }
                this._paneCompositeService.openPaneComposite(this._previousPanelId, 1 /* ViewContainerLocation.Panel */);
            }
            else {
                this._paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            }
            this._previousPanelId = undefined;
            this._previousTerminalInstance = undefined;
        }
        else {
            if (isTerminalInPanel) {
                this._previousPanelId = this._paneCompositeService
                    .getActivePaneComposite(1 /* ViewContainerLocation.Panel */)
                    ?.getId();
                if (this._previousPanelId === TERMINAL_VIEW_ID) {
                    this._previousTerminalInstance = this._terminalService.activeInstance ?? undefined;
                }
            }
            this._terminalService.setActiveInstance(terminalData.terminal);
            if (CustomTask.is(task) || ContributedTask.is(task)) {
                this._terminalGroupService.showPanel(task.command.presentation.focus);
            }
        }
        return true;
    }
    isActive() {
        return Promise.resolve(this.isActiveSync());
    }
    isActiveSync() {
        return Object.values(this._activeTasks).some((value) => !!value.terminal);
    }
    canAutoTerminate() {
        return Object.values(this._activeTasks).every((value) => !value.task.configurationProperties.promptOnClose);
    }
    getActiveTasks() {
        return Object.values(this._activeTasks).flatMap((value) => (value.terminal ? value.task : []));
    }
    getLastInstance(task) {
        const recentKey = task.getKey();
        return Object.values(this._activeTasks)
            .reverse()
            .find((value) => recentKey && recentKey === value.task.getKey())?.task;
    }
    getBusyTasks() {
        return Object.keys(this._busyTasks).map((key) => this._busyTasks[key]);
    }
    customExecutionComplete(task, result) {
        const activeTerminal = this._activeTasks[task.getMapKey()];
        if (!activeTerminal?.terminal) {
            return Promise.reject(new Error('Expected to have a terminal for a custom execution task'));
        }
        return new Promise((resolve) => {
            // activeTerminal.terminal.rendererExit(result);
            resolve();
        });
    }
    _getInstances(task) {
        const recentKey = task.getKey();
        return Object.values(this._activeTasks).filter((value) => recentKey && recentKey === value.task.getKey());
    }
    _removeFromActiveTasks(task) {
        const key = typeof task === 'string' ? task : task.getMapKey();
        const taskToRemove = this._activeTasks[key];
        if (!taskToRemove) {
            return;
        }
        delete this._activeTasks[key];
    }
    _fireTaskEvent(event) {
        if (event.kind !== TaskEventKind.Changed) {
            const activeTask = this._activeTasks[event.__task.getMapKey()];
            if (activeTask) {
                activeTask.state = event.kind;
            }
        }
        this._onDidStateChange.fire(event);
    }
    terminate(task) {
        const activeTerminal = this._activeTasks[task.getMapKey()];
        if (!activeTerminal) {
            return Promise.resolve({ success: false, task: undefined });
        }
        const terminal = activeTerminal.terminal;
        if (!terminal) {
            return Promise.resolve({ success: false, task: undefined });
        }
        return new Promise((resolve, reject) => {
            terminal.onDisposed((terminal) => {
                this._fireTaskEvent(TaskEvent.terminated(task, terminal.instanceId, terminal.exitReason));
            });
            const onExit = terminal.onExit(() => {
                const task = activeTerminal.task;
                try {
                    onExit.dispose();
                    this._fireTaskEvent(TaskEvent.terminated(task, terminal.instanceId, terminal.exitReason));
                }
                catch (error) {
                    // Do nothing.
                }
                resolve({ success: true, task: task });
            });
            terminal.dispose();
        });
    }
    terminateAll() {
        const promises = [];
        for (const [key, terminalData] of Object.entries(this._activeTasks)) {
            const terminal = terminalData?.terminal;
            if (terminal) {
                promises.push(new Promise((resolve, reject) => {
                    const onExit = terminal.onExit(() => {
                        const task = terminalData.task;
                        try {
                            onExit.dispose();
                            this._fireTaskEvent(TaskEvent.terminated(task, terminal.instanceId, terminal.exitReason));
                        }
                        catch (error) {
                            // Do nothing.
                        }
                        if (this._activeTasks[key] === terminalData) {
                            delete this._activeTasks[key];
                        }
                        resolve({ success: true, task: terminalData.task });
                    });
                }));
                terminal.dispose();
            }
        }
        return Promise.all(promises);
    }
    _showDependencyCycleMessage(task) {
        this._log(nls.localize('dependencyCycle', 'There is a dependency cycle. See task "{0}".', task._label));
        this._showOutput();
    }
    _executeTask(task, resolver, trigger, liveDependencies, encounteredTasks, alreadyResolved) {
        this._showTaskLoadErrors(task);
        const mapKey = task.getMapKey();
        // It's important that we add this task's entry to _activeTasks before
        // any of the code in the then runs (see #180541 and #180578). Wrapping
        // it in Promise.resolve().then() ensures that.
        const promise = Promise.resolve()
            .then(async () => {
            alreadyResolved = alreadyResolved ?? new Map();
            const promises = [];
            if (task.configurationProperties.dependsOn) {
                const nextLiveDependencies = new Set(liveDependencies).add(task.getCommonTaskId());
                for (const dependency of task.configurationProperties.dependsOn) {
                    const dependencyTask = await resolver.resolve(dependency.uri, dependency.task);
                    if (dependencyTask) {
                        this._adoptConfigurationForDependencyTask(dependencyTask, task);
                        let taskResult;
                        const commonKey = dependencyTask.getCommonTaskId();
                        if (nextLiveDependencies.has(commonKey)) {
                            this._showDependencyCycleMessage(dependencyTask);
                            taskResult = Promise.resolve({});
                        }
                        else {
                            taskResult = encounteredTasks.get(commonKey);
                            if (!taskResult) {
                                const activeTask = this._activeTasks[dependencyTask.getMapKey()] ??
                                    this._getInstances(dependencyTask).pop();
                                taskResult = activeTask && this._getDependencyPromise(activeTask);
                            }
                        }
                        if (!taskResult) {
                            this._fireTaskEvent(TaskEvent.general(TaskEventKind.DependsOnStarted, task));
                            taskResult = this._executeDependencyTask(dependencyTask, resolver, trigger, nextLiveDependencies, encounteredTasks, alreadyResolved);
                        }
                        encounteredTasks.set(commonKey, taskResult);
                        promises.push(taskResult);
                        if (task.configurationProperties.dependsOrder === "sequence" /* DependsOrder.sequence */) {
                            const promiseResult = await taskResult;
                            if (promiseResult.exitCode !== 0) {
                                break;
                            }
                        }
                    }
                    else {
                        this._log(nls.localize('dependencyFailed', "Couldn't resolve dependent task '{0}' in workspace folder '{1}'", Types.isString(dependency.task)
                            ? dependency.task
                            : JSON.stringify(dependency.task, undefined, 0), dependency.uri.toString()));
                        this._showOutput();
                    }
                }
            }
            return Promise.all(promises).then((summaries) => {
                for (const summary of summaries) {
                    if (summary.exitCode !== 0) {
                        return { exitCode: summary.exitCode };
                    }
                }
                if ((ContributedTask.is(task) || CustomTask.is(task)) && task.command) {
                    if (this._isRerun) {
                        return this._reexecuteCommand(task, trigger, alreadyResolved);
                    }
                    else {
                        return this._executeCommand(task, trigger, alreadyResolved);
                    }
                }
                return { exitCode: 0 };
            });
        })
            .finally(() => {
            delete this._activeTasks[mapKey];
        });
        const lastInstance = this._getInstances(task).pop();
        const count = lastInstance?.count ?? { count: 0 };
        count.count++;
        const activeTask = { task, promise, count };
        this._activeTasks[mapKey] = activeTask;
        return promise;
    }
    _createInactiveDependencyPromise(task) {
        return new Promise((resolve) => {
            const taskInactiveDisposable = this.onDidStateChange((taskEvent) => {
                if (taskEvent.kind === TaskEventKind.Inactive && taskEvent.__task === task) {
                    taskInactiveDisposable.dispose();
                    resolve({ exitCode: 0 });
                }
            });
        });
    }
    _adoptConfigurationForDependencyTask(dependencyTask, task) {
        if (dependencyTask.configurationProperties.icon) {
            dependencyTask.configurationProperties.icon.id ||= task.configurationProperties.icon?.id;
            dependencyTask.configurationProperties.icon.color ||= task.configurationProperties.icon?.color;
        }
        else {
            dependencyTask.configurationProperties.icon = task.configurationProperties.icon;
        }
    }
    async _getDependencyPromise(task) {
        if (!task.task.configurationProperties.isBackground) {
            return task.promise;
        }
        if (!task.task.configurationProperties.problemMatchers ||
            task.task.configurationProperties.problemMatchers.length === 0) {
            return task.promise;
        }
        if (task.state === TaskEventKind.Inactive) {
            return { exitCode: 0 };
        }
        return this._createInactiveDependencyPromise(task.task);
    }
    async _executeDependencyTask(task, resolver, trigger, liveDependencies, encounteredTasks, alreadyResolved) {
        // If the task is a background task with a watching problem matcher, we don't wait for the whole task to finish,
        // just for the problem matcher to go inactive.
        if (!task.configurationProperties.isBackground) {
            return this._executeTask(task, resolver, trigger, liveDependencies, encounteredTasks, alreadyResolved);
        }
        const inactivePromise = this._createInactiveDependencyPromise(task);
        return Promise.race([
            inactivePromise,
            this._executeTask(task, resolver, trigger, liveDependencies, encounteredTasks, alreadyResolved),
        ]);
    }
    async _resolveAndFindExecutable(systemInfo, workspaceFolder, task, cwd, envPath) {
        const command = await this._configurationResolverService.resolveAsync(workspaceFolder, CommandString.value(task.command.name));
        cwd = cwd
            ? await this._configurationResolverService.resolveAsync(workspaceFolder, cwd)
            : undefined;
        const delimiter = (await this._pathService.path).delimiter;
        const paths = envPath
            ? await Promise.all(envPath
                .split(delimiter)
                .map((p) => this._configurationResolverService.resolveAsync(workspaceFolder, p)))
            : undefined;
        const foundExecutable = await systemInfo?.findExecutable(command, cwd, paths);
        if (foundExecutable) {
            return foundExecutable;
        }
        if (path.isAbsolute(command)) {
            return command;
        }
        return path.join(cwd ?? '', command);
    }
    _findUnresolvedVariables(variables, alreadyResolved) {
        if (alreadyResolved.size === 0) {
            return variables;
        }
        const unresolved = new Set();
        for (const variable of variables) {
            if (!alreadyResolved.has(variable.substring(2, variable.length - 1))) {
                unresolved.add(variable);
            }
        }
        return unresolved;
    }
    _mergeMaps(mergeInto, mergeFrom) {
        for (const entry of mergeFrom) {
            if (!mergeInto.has(entry[0])) {
                mergeInto.set(entry[0], entry[1]);
            }
        }
    }
    async _acquireInput(taskSystemInfo, workspaceFolder, task, variables, alreadyResolved) {
        const resolved = await this._resolveVariablesFromSet(taskSystemInfo, workspaceFolder, task, variables, alreadyResolved);
        this._fireTaskEvent(TaskEvent.general(TaskEventKind.AcquiredInput, task));
        return resolved;
    }
    _resolveVariablesFromSet(taskSystemInfo, workspaceFolder, task, variables, alreadyResolved) {
        const isProcess = task.command && task.command.runtime === RuntimeType.Process;
        const options = task.command && task.command.options ? task.command.options : undefined;
        const cwd = options ? options.cwd : undefined;
        let envPath = undefined;
        if (options && options.env) {
            for (const key of Object.keys(options.env)) {
                if (key.toLowerCase() === 'path') {
                    if (Types.isString(options.env[key])) {
                        envPath = options.env[key];
                    }
                    break;
                }
            }
        }
        const unresolved = this._findUnresolvedVariables(variables, alreadyResolved);
        let resolvedVariables;
        if (taskSystemInfo && workspaceFolder) {
            const resolveSet = {
                variables: unresolved,
            };
            if (taskSystemInfo.platform === 3 /* Platform.Platform.Windows */ && isProcess) {
                resolveSet.process = { name: CommandString.value(task.command.name) };
                if (cwd) {
                    resolveSet.process.cwd = cwd;
                }
                if (envPath) {
                    resolveSet.process.path = envPath;
                }
            }
            resolvedVariables = taskSystemInfo
                .resolveVariables(workspaceFolder, resolveSet, TaskSourceKind.toConfigurationTarget(task._source.kind))
                .then(async (resolved) => {
                if (!resolved) {
                    return undefined;
                }
                this._mergeMaps(alreadyResolved, resolved.variables);
                resolved.variables = new Map(alreadyResolved);
                if (isProcess) {
                    let process = CommandString.value(task.command.name);
                    if (taskSystemInfo.platform === 3 /* Platform.Platform.Windows */) {
                        process = await this._resolveAndFindExecutable(taskSystemInfo, workspaceFolder, task, cwd, envPath);
                    }
                    resolved.variables.set(TerminalTaskSystem.ProcessVarName, process);
                }
                return resolved;
            });
            return resolvedVariables;
        }
        else {
            const variablesArray = new Array();
            unresolved.forEach((variable) => variablesArray.push(variable));
            return new Promise((resolve, reject) => {
                this._configurationResolverService
                    .resolveWithInteraction(workspaceFolder, variablesArray, 'tasks', undefined, TaskSourceKind.toConfigurationTarget(task._source.kind))
                    .then(async (resolvedVariablesMap) => {
                    if (resolvedVariablesMap) {
                        this._mergeMaps(alreadyResolved, resolvedVariablesMap);
                        resolvedVariablesMap = new Map(alreadyResolved);
                        if (isProcess) {
                            let processVarValue;
                            if (Platform.isWindows) {
                                processVarValue = await this._resolveAndFindExecutable(taskSystemInfo, workspaceFolder, task, cwd, envPath);
                            }
                            else {
                                processVarValue = await this._configurationResolverService.resolveAsync(workspaceFolder, CommandString.value(task.command.name));
                            }
                            resolvedVariablesMap.set(TerminalTaskSystem.ProcessVarName, processVarValue);
                        }
                        const resolvedVariablesResult = {
                            variables: resolvedVariablesMap,
                        };
                        resolve(resolvedVariablesResult);
                    }
                    else {
                        resolve(undefined);
                    }
                }, (reason) => {
                    reject(reason);
                });
            });
        }
    }
    _executeCommand(task, trigger, alreadyResolved) {
        const taskWorkspaceFolder = task.getWorkspaceFolder();
        let workspaceFolder;
        if (taskWorkspaceFolder) {
            workspaceFolder = this._currentTask.workspaceFolder = taskWorkspaceFolder;
        }
        else {
            const folders = this._contextService.getWorkspace().folders;
            workspaceFolder = folders.length > 0 ? folders[0] : undefined;
        }
        const systemInfo = (this._currentTask.systemInfo =
            this._taskSystemInfoResolver(workspaceFolder));
        const variables = new Set();
        this._collectTaskVariables(variables, task);
        const resolvedVariables = this._acquireInput(systemInfo, workspaceFolder, task, variables, alreadyResolved);
        return resolvedVariables.then((resolvedVariables) => {
            if (resolvedVariables && !this._isTaskEmpty(task)) {
                this._currentTask.resolvedVariables = resolvedVariables;
                return this._executeInTerminal(task, trigger, new VariableResolver(workspaceFolder, systemInfo, resolvedVariables.variables, this._configurationResolverService), workspaceFolder);
            }
            else {
                // Allows the taskExecutions array to be updated in the extension host
                this._fireTaskEvent(TaskEvent.general(TaskEventKind.End, task));
                return Promise.resolve({ exitCode: 0 });
            }
        }, (reason) => {
            return Promise.reject(reason);
        });
    }
    _isTaskEmpty(task) {
        const isCustomExecution = task.command.runtime === RuntimeType.CustomExecution;
        return !(task.command !== undefined &&
            task.command.runtime &&
            (isCustomExecution || task.command.name !== undefined));
    }
    _reexecuteCommand(task, trigger, alreadyResolved) {
        const lastTask = this._lastTask;
        if (!lastTask) {
            return Promise.reject(new Error('No task previously run'));
        }
        const workspaceFolder = (this._currentTask.workspaceFolder = lastTask.workspaceFolder);
        const variables = new Set();
        this._collectTaskVariables(variables, task);
        // Check that the task hasn't changed to include new variables
        let hasAllVariables = true;
        variables.forEach((value) => {
            if (value.substring(2, value.length - 1) in lastTask.getVerifiedTask().resolvedVariables) {
                hasAllVariables = false;
            }
        });
        if (!hasAllVariables) {
            return this._acquireInput(lastTask.getVerifiedTask().systemInfo, lastTask.getVerifiedTask().workspaceFolder, task, variables, alreadyResolved).then((resolvedVariables) => {
                if (!resolvedVariables) {
                    // Allows the taskExecutions array to be updated in the extension host
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.End, task));
                    return { exitCode: 0 };
                }
                this._currentTask.resolvedVariables = resolvedVariables;
                return this._executeInTerminal(task, trigger, new VariableResolver(lastTask.getVerifiedTask().workspaceFolder, lastTask.getVerifiedTask().systemInfo, resolvedVariables.variables, this._configurationResolverService), workspaceFolder);
            }, (reason) => {
                return Promise.reject(reason);
            });
        }
        else {
            this._currentTask.resolvedVariables = lastTask.getVerifiedTask().resolvedVariables;
            return this._executeInTerminal(task, trigger, new VariableResolver(lastTask.getVerifiedTask().workspaceFolder, lastTask.getVerifiedTask().systemInfo, lastTask.getVerifiedTask().resolvedVariables.variables, this._configurationResolverService), workspaceFolder);
        }
    }
    async _executeInTerminal(task, trigger, resolver, workspaceFolder) {
        let terminal = undefined;
        let error = undefined;
        let promise = undefined;
        if (task.configurationProperties.isBackground) {
            const problemMatchers = await this._resolveMatchers(resolver, task.configurationProperties.problemMatchers);
            const watchingProblemMatcher = new WatchingProblemCollector(problemMatchers, this._markerService, this._modelService, this._fileService);
            if (problemMatchers.length > 0 && !watchingProblemMatcher.isWatching()) {
                this._appendOutput(nls.localize('TerminalTaskSystem.nonWatchingMatcher', 'Task {0} is a background task but uses a problem matcher without a background pattern', task._label));
                this._showOutput();
            }
            const toDispose = new DisposableStore();
            let eventCounter = 0;
            const mapKey = task.getMapKey();
            toDispose.add(watchingProblemMatcher.onDidStateChange((event) => {
                if (event.kind === "backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */) {
                    eventCounter++;
                    this._busyTasks[mapKey] = task;
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.Active, task, terminal?.instanceId));
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherStarted, task, terminal?.instanceId));
                }
                else if (event.kind === "backgroundProcessingEnds" /* ProblemCollectorEventKind.BackgroundProcessingEnds */) {
                    eventCounter--;
                    if (this._busyTasks[mapKey]) {
                        delete this._busyTasks[mapKey];
                    }
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.Inactive, task, terminal?.instanceId));
                    if (eventCounter === 0) {
                        if (watchingProblemMatcher.numberOfMatches > 0 &&
                            watchingProblemMatcher.maxMarkerSeverity &&
                            watchingProblemMatcher.maxMarkerSeverity >= MarkerSeverity.Error) {
                            this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherFoundErrors, task, terminal?.instanceId));
                            const reveal = task.command.presentation.reveal;
                            const revealProblems = task.command.presentation.revealProblems;
                            if (revealProblems === RevealProblemKind.OnProblem) {
                                this._viewsService.openView(Markers.MARKERS_VIEW_ID, true);
                            }
                            else if (reveal === RevealKind.Silent) {
                                this._terminalService.setActiveInstance(terminal);
                                this._terminalGroupService.showPanel(false);
                            }
                        }
                        else {
                            this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherEnded, task, terminal?.instanceId));
                        }
                    }
                }
            }));
            watchingProblemMatcher.aboutToStart();
            let delayer = undefined;
            [terminal, error] = await this._createTerminal(task, resolver, workspaceFolder);
            if (error) {
                return Promise.reject(new Error(error.message));
            }
            if (!terminal) {
                return Promise.reject(new Error(`Failed to create terminal for task ${task._label}`));
            }
            this._terminalStatusManager.addTerminal(task, terminal, watchingProblemMatcher);
            let processStartedSignaled = false;
            terminal.processReady.then(() => {
                if (!processStartedSignaled) {
                    this._fireTaskEvent(TaskEvent.processStarted(task, terminal.instanceId, terminal.processId));
                    processStartedSignaled = true;
                }
            }, (_error) => {
                this._logService.error('Task terminal process never got ready');
            });
            this._fireTaskEvent(TaskEvent.start(task, terminal.instanceId, resolver.values));
            let onData;
            if (problemMatchers.length) {
                // prevent https://github.com/microsoft/vscode/issues/174511 from happening
                onData = terminal.onLineData((line) => {
                    watchingProblemMatcher.processLine(line);
                    if (!delayer) {
                        delayer = new Async.Delayer(3000);
                    }
                    delayer.trigger(() => {
                        watchingProblemMatcher.forceDelivery();
                        delayer = undefined;
                    });
                });
            }
            promise = new Promise((resolve, reject) => {
                const onExit = terminal.onExit((terminalLaunchResult) => {
                    const exitCode = typeof terminalLaunchResult === 'number'
                        ? terminalLaunchResult
                        : terminalLaunchResult?.code;
                    onData?.dispose();
                    onExit.dispose();
                    const key = task.getMapKey();
                    if (this._busyTasks[mapKey]) {
                        delete this._busyTasks[mapKey];
                    }
                    this._removeFromActiveTasks(task);
                    this._fireTaskEvent(TaskEvent.changed());
                    if (terminalLaunchResult !== undefined) {
                        // Only keep a reference to the terminal if it is not being disposed.
                        switch (task.command.presentation.panel) {
                            case PanelKind.Dedicated:
                                this._sameTaskTerminals[key] = terminal.instanceId.toString();
                                break;
                            case PanelKind.Shared:
                                this._idleTaskTerminals.set(key, terminal.instanceId.toString(), 1 /* Touch.AsOld */);
                                break;
                        }
                    }
                    const reveal = task.command.presentation.reveal;
                    if (reveal === RevealKind.Silent &&
                        (exitCode !== 0 ||
                            (watchingProblemMatcher.numberOfMatches > 0 &&
                                watchingProblemMatcher.maxMarkerSeverity &&
                                watchingProblemMatcher.maxMarkerSeverity >= MarkerSeverity.Error))) {
                        try {
                            this._terminalService.setActiveInstance(terminal);
                            this._terminalGroupService.showPanel(false);
                        }
                        catch (e) {
                            // If the terminal has already been disposed, then setting the active instance will fail. #99828
                            // There is nothing else to do here.
                        }
                    }
                    watchingProblemMatcher.done();
                    watchingProblemMatcher.dispose();
                    if (!processStartedSignaled) {
                        this._fireTaskEvent(TaskEvent.processStarted(task, terminal.instanceId, terminal.processId));
                        processStartedSignaled = true;
                    }
                    this._fireTaskEvent(TaskEvent.processEnded(task, terminal.instanceId, exitCode));
                    for (let i = 0; i < eventCounter; i++) {
                        this._fireTaskEvent(TaskEvent.general(TaskEventKind.Inactive, task, terminal.instanceId));
                    }
                    eventCounter = 0;
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.End, task));
                    toDispose.dispose();
                    resolve({ exitCode: exitCode ?? undefined });
                });
            });
            if (trigger === Triggers.reconnect && !!terminal.xterm) {
                const bufferLines = [];
                const bufferReverseIterator = terminal.xterm.getBufferReverseIterator();
                const startRegex = new RegExp(watchingProblemMatcher.beginPatterns.map((pattern) => pattern.source).join('|'));
                for (const nextLine of bufferReverseIterator) {
                    bufferLines.push(nextLine);
                    if (startRegex.test(nextLine)) {
                        break;
                    }
                }
                let delayer = undefined;
                for (let i = bufferLines.length - 1; i >= 0; i--) {
                    watchingProblemMatcher.processLine(bufferLines[i]);
                    if (!delayer) {
                        delayer = new Async.Delayer(3000);
                    }
                    delayer.trigger(() => {
                        watchingProblemMatcher.forceDelivery();
                        delayer = undefined;
                    });
                }
            }
        }
        else {
            ;
            [terminal, error] = await this._createTerminal(task, resolver, workspaceFolder);
            if (error) {
                return Promise.reject(new Error(error.message));
            }
            if (!terminal) {
                return Promise.reject(new Error(`Failed to create terminal for task ${task._label}`));
            }
            this._fireTaskEvent(TaskEvent.start(task, terminal.instanceId, resolver.values));
            const mapKey = task.getMapKey();
            this._busyTasks[mapKey] = task;
            this._fireTaskEvent(TaskEvent.general(TaskEventKind.Active, task, terminal.instanceId));
            const problemMatchers = await this._resolveMatchers(resolver, task.configurationProperties.problemMatchers);
            const startStopProblemMatcher = new StartStopProblemCollector(problemMatchers, this._markerService, this._modelService, 0 /* ProblemHandlingStrategy.Clean */, this._fileService);
            this._terminalStatusManager.addTerminal(task, terminal, startStopProblemMatcher);
            startStopProblemMatcher.onDidStateChange((event) => {
                if (event.kind === "backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */) {
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherStarted, task, terminal?.instanceId));
                }
                else if (event.kind === "backgroundProcessingEnds" /* ProblemCollectorEventKind.BackgroundProcessingEnds */) {
                    if (startStopProblemMatcher.numberOfMatches &&
                        startStopProblemMatcher.maxMarkerSeverity &&
                        startStopProblemMatcher.maxMarkerSeverity >= MarkerSeverity.Error) {
                        this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherFoundErrors, task, terminal?.instanceId));
                    }
                    else {
                        this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherEnded, task, terminal?.instanceId));
                    }
                }
            });
            let processStartedSignaled = false;
            terminal.processReady.then(() => {
                if (!processStartedSignaled) {
                    this._fireTaskEvent(TaskEvent.processStarted(task, terminal.instanceId, terminal.processId));
                    processStartedSignaled = true;
                }
            }, (_error) => {
                // The process never got ready. Need to think how to handle this.
            });
            const onData = terminal.onLineData((line) => {
                startStopProblemMatcher.processLine(line);
            });
            promise = new Promise((resolve, reject) => {
                const onExit = terminal.onExit((terminalLaunchResult) => {
                    const exitCode = typeof terminalLaunchResult === 'number'
                        ? terminalLaunchResult
                        : terminalLaunchResult?.code;
                    onExit.dispose();
                    const key = task.getMapKey();
                    this._removeFromActiveTasks(task);
                    this._fireTaskEvent(TaskEvent.changed());
                    if (terminalLaunchResult !== undefined) {
                        // Only keep a reference to the terminal if it is not being disposed.
                        switch (task.command.presentation.panel) {
                            case PanelKind.Dedicated:
                                this._sameTaskTerminals[key] = terminal.instanceId.toString();
                                break;
                            case PanelKind.Shared:
                                this._idleTaskTerminals.set(key, terminal.instanceId.toString(), 1 /* Touch.AsOld */);
                                break;
                        }
                    }
                    const reveal = task.command.presentation.reveal;
                    const revealProblems = task.command.presentation.revealProblems;
                    const revealProblemPanel = terminal &&
                        revealProblems === RevealProblemKind.OnProblem &&
                        startStopProblemMatcher.numberOfMatches > 0;
                    if (revealProblemPanel) {
                        this._viewsService.openView(Markers.MARKERS_VIEW_ID);
                    }
                    else if (terminal &&
                        reveal === RevealKind.Silent &&
                        (exitCode !== 0 ||
                            (startStopProblemMatcher.numberOfMatches > 0 &&
                                startStopProblemMatcher.maxMarkerSeverity &&
                                startStopProblemMatcher.maxMarkerSeverity >= MarkerSeverity.Error))) {
                        try {
                            this._terminalService.setActiveInstance(terminal);
                            this._terminalGroupService.showPanel(false);
                        }
                        catch (e) {
                            // If the terminal has already been disposed, then setting the active instance will fail. #99828
                            // There is nothing else to do here.
                        }
                    }
                    // Hack to work around #92868 until terminal is fixed.
                    setTimeout(() => {
                        onData.dispose();
                        startStopProblemMatcher.done();
                        startStopProblemMatcher.dispose();
                    }, 100);
                    if (!processStartedSignaled && terminal) {
                        this._fireTaskEvent(TaskEvent.processStarted(task, terminal.instanceId, terminal.processId));
                        processStartedSignaled = true;
                    }
                    this._fireTaskEvent(TaskEvent.processEnded(task, terminal?.instanceId, exitCode ?? undefined));
                    if (this._busyTasks[mapKey]) {
                        delete this._busyTasks[mapKey];
                    }
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.Inactive, task, terminal?.instanceId));
                    if (startStopProblemMatcher.numberOfMatches &&
                        startStopProblemMatcher.maxMarkerSeverity &&
                        startStopProblemMatcher.maxMarkerSeverity >= MarkerSeverity.Error) {
                        this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherFoundErrors, task, terminal?.instanceId));
                    }
                    else {
                        this._fireTaskEvent(TaskEvent.general(TaskEventKind.ProblemMatcherEnded, task, terminal?.instanceId));
                    }
                    this._fireTaskEvent(TaskEvent.general(TaskEventKind.End, task, terminal?.instanceId));
                    resolve({ exitCode: exitCode ?? undefined });
                });
            });
        }
        const showProblemPanel = task.command.presentation &&
            task.command.presentation.revealProblems === RevealProblemKind.Always;
        if (showProblemPanel) {
            this._viewsService.openView(Markers.MARKERS_VIEW_ID);
        }
        else if (task.command.presentation &&
            (task.command.presentation.focus || task.command.presentation.reveal === RevealKind.Always)) {
            this._terminalService.setActiveInstance(terminal);
            await this._terminalService.revealTerminal(terminal);
            if (task.command.presentation.focus) {
                this._terminalService.focusInstance(terminal);
            }
        }
        if (this._activeTasks[task.getMapKey()]) {
            this._activeTasks[task.getMapKey()].terminal = terminal;
        }
        else {
            console.warn('No active tasks found for the terminal.');
        }
        this._fireTaskEvent(TaskEvent.changed());
        return promise;
    }
    _createTerminalName(task) {
        const needsFolderQualification = this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
        return needsFolderQualification
            ? task.getQualifiedLabel()
            : task.configurationProperties.name || '';
    }
    async _createShellLaunchConfig(task, workspaceFolder, variableResolver, platform, options, command, args, waitOnExit) {
        let shellLaunchConfig;
        const isShellCommand = task.command.runtime === RuntimeType.Shell;
        const needsFolderQualification = this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
        const terminalName = this._createTerminalName(task);
        const type = ReconnectionType;
        const originalCommand = task.command.name;
        let cwd;
        if (options.cwd) {
            cwd = options.cwd;
            if (!path.isAbsolute(cwd)) {
                if (workspaceFolder && workspaceFolder.uri.scheme === Schemas.file) {
                    cwd = path.join(workspaceFolder.uri.fsPath, cwd);
                }
            }
            // This must be normalized to the OS
            cwd = isUNC(cwd)
                ? cwd
                : resources.toLocalResource(URI.from({ scheme: Schemas.file, path: cwd }), this._environmentService.remoteAuthority, this._pathService.defaultUriScheme);
        }
        if (isShellCommand) {
            let os;
            switch (platform) {
                case 3 /* Platform.Platform.Windows */:
                    os = 1 /* Platform.OperatingSystem.Windows */;
                    break;
                case 1 /* Platform.Platform.Mac */:
                    os = 2 /* Platform.OperatingSystem.Macintosh */;
                    break;
                case 2 /* Platform.Platform.Linux */:
                default:
                    os = 3 /* Platform.OperatingSystem.Linux */;
                    break;
            }
            const defaultProfile = await this._terminalProfileResolverService.getDefaultProfile({
                allowAutomationShell: true,
                os,
                remoteAuthority: this._environmentService.remoteAuthority,
            });
            let icon;
            if (task.configurationProperties.icon?.id) {
                icon = ThemeIcon.fromId(task.configurationProperties.icon.id);
            }
            else {
                const taskGroupKind = task.configurationProperties.group
                    ? GroupKind.to(task.configurationProperties.group)
                    : undefined;
                const kindId = typeof taskGroupKind === 'string' ? taskGroupKind : taskGroupKind?.kind;
                icon = kindId === 'test' ? ThemeIcon.fromId(Codicon.beaker.id) : defaultProfile.icon;
            }
            shellLaunchConfig = {
                name: terminalName,
                type,
                executable: defaultProfile.path,
                args: defaultProfile.args,
                env: { ...defaultProfile.env },
                icon,
                color: task.configurationProperties.icon?.color || undefined,
                waitOnExit,
            };
            let shellSpecified = false;
            const shellOptions = task.command.options && task.command.options.shell;
            if (shellOptions) {
                if (shellOptions.executable) {
                    // Clear out the args so that we don't end up with mismatched args.
                    if (shellOptions.executable !== shellLaunchConfig.executable) {
                        shellLaunchConfig.args = undefined;
                    }
                    shellLaunchConfig.executable = await this._resolveVariable(variableResolver, shellOptions.executable);
                    shellSpecified = true;
                }
                if (shellOptions.args) {
                    shellLaunchConfig.args = await this._resolveVariables(variableResolver, shellOptions.args.slice());
                }
            }
            if (shellLaunchConfig.args === undefined) {
                shellLaunchConfig.args = [];
            }
            const shellArgs = Array.isArray(shellLaunchConfig.args)
                ? shellLaunchConfig.args.slice(0)
                : [shellLaunchConfig.args];
            const toAdd = [];
            const basename = path.posix
                .basename((await this._pathService.fileURI(shellLaunchConfig.executable)).path)
                .toLowerCase();
            const commandLine = this._buildShellCommandLine(platform, basename, shellOptions, command, originalCommand, args);
            let windowsShellArgs = false;
            if (platform === 3 /* Platform.Platform.Windows */) {
                windowsShellArgs = true;
                // If we don't have a cwd, then the terminal uses the home dir.
                const userHome = await this._pathService.userHome();
                if (basename === 'cmd.exe' &&
                    ((options.cwd && isUNC(options.cwd)) || (!options.cwd && isUNC(userHome.fsPath)))) {
                    return undefined;
                }
                if (basename === 'powershell.exe' || basename === 'pwsh.exe') {
                    if (!shellSpecified) {
                        toAdd.push('-Command');
                    }
                }
                else if (basename === 'bash.exe' || basename === 'zsh.exe') {
                    windowsShellArgs = false;
                    if (!shellSpecified) {
                        toAdd.push('-c');
                    }
                }
                else if (basename === 'wsl.exe') {
                    if (!shellSpecified) {
                        toAdd.push('-e');
                    }
                }
                else {
                    if (!shellSpecified) {
                        toAdd.push('/d', '/c');
                    }
                }
            }
            else {
                if (!shellSpecified) {
                    // Under Mac remove -l to not start it as a login shell.
                    if (platform === 1 /* Platform.Platform.Mac */) {
                        // Background on -l on osx https://github.com/microsoft/vscode/issues/107563
                        // TODO: Handle by pulling the default terminal profile?
                        // const osxShellArgs = this._configurationService.inspect(TerminalSettingId.ShellArgsMacOs);
                        // if ((osxShellArgs.user === undefined) && (osxShellArgs.userLocal === undefined) && (osxShellArgs.userLocalValue === undefined)
                        // 	&& (osxShellArgs.userRemote === undefined) && (osxShellArgs.userRemoteValue === undefined)
                        // 	&& (osxShellArgs.userValue === undefined) && (osxShellArgs.workspace === undefined)
                        // 	&& (osxShellArgs.workspaceFolder === undefined) && (osxShellArgs.workspaceFolderValue === undefined)
                        // 	&& (osxShellArgs.workspaceValue === undefined)) {
                        // 	const index = shellArgs.indexOf('-l');
                        // 	if (index !== -1) {
                        // 		shellArgs.splice(index, 1);
                        // 	}
                        // }
                    }
                    toAdd.push('-c');
                }
            }
            const combinedShellArgs = this._addAllArgument(toAdd, shellArgs);
            combinedShellArgs.push(commandLine);
            shellLaunchConfig.args = windowsShellArgs ? combinedShellArgs.join(' ') : combinedShellArgs;
            if (task.command.presentation && task.command.presentation.echo) {
                if (needsFolderQualification && workspaceFolder) {
                    const folder = cwd && typeof cwd === 'object' && 'path' in cwd
                        ? path.basename(cwd.path)
                        : workspaceFolder.name;
                    shellLaunchConfig.initialText =
                        this.taskShellIntegrationStartSequence(cwd) +
                            formatMessageForTerminal(nls.localize({
                                key: 'task.executingInFolder',
                                comment: [
                                    'The workspace folder the task is running in',
                                    'The task command line or label',
                                ],
                            }, 'Executing task in folder {0}: {1}', folder, commandLine), { excludeLeadingNewLine: true }) +
                            this.taskShellIntegrationOutputSequence;
                }
                else {
                    shellLaunchConfig.initialText =
                        this.taskShellIntegrationStartSequence(cwd) +
                            formatMessageForTerminal(nls.localize({
                                key: 'task.executing.shellIntegration',
                                comment: ['The task command line or label'],
                            }, 'Executing task: {0}', commandLine), { excludeLeadingNewLine: true }) +
                            this.taskShellIntegrationOutputSequence;
                }
            }
            else {
                shellLaunchConfig.initialText = {
                    text: this.taskShellIntegrationStartSequence(cwd) + this.taskShellIntegrationOutputSequence,
                    trailingNewLine: false,
                };
            }
        }
        else {
            const commandExecutable = task.command.runtime !== RuntimeType.CustomExecution
                ? CommandString.value(command)
                : undefined;
            const executable = !isShellCommand
                ? await this._resolveVariable(variableResolver, await this._resolveVariable(variableResolver, '${' + TerminalTaskSystem.ProcessVarName + '}'))
                : commandExecutable;
            // When we have a process task there is no need to quote arguments. So we go ahead and take the string value.
            shellLaunchConfig = {
                name: terminalName,
                type,
                icon: task.configurationProperties.icon?.id
                    ? ThemeIcon.fromId(task.configurationProperties.icon.id)
                    : undefined,
                color: task.configurationProperties.icon?.color || undefined,
                executable: executable,
                args: args.map((a) => (Types.isString(a) ? a : a.value)),
                waitOnExit,
            };
            if (task.command.presentation && task.command.presentation.echo) {
                const getArgsToEcho = (args) => {
                    if (!args || args.length === 0) {
                        return '';
                    }
                    if (Types.isString(args)) {
                        return args;
                    }
                    return args.join(' ');
                };
                if (needsFolderQualification && workspaceFolder) {
                    shellLaunchConfig.initialText =
                        this.taskShellIntegrationStartSequence(cwd) +
                            formatMessageForTerminal(nls.localize({
                                key: 'task.executingInFolder',
                                comment: [
                                    'The workspace folder the task is running in',
                                    'The task command line or label',
                                ],
                            }, 'Executing task in folder {0}: {1}', workspaceFolder.name, `${shellLaunchConfig.executable} ${getArgsToEcho(shellLaunchConfig.args)}`), { excludeLeadingNewLine: true }) +
                            this.taskShellIntegrationOutputSequence;
                }
                else {
                    shellLaunchConfig.initialText =
                        this.taskShellIntegrationStartSequence(cwd) +
                            formatMessageForTerminal(nls.localize({
                                key: 'task.executing.shell-integration',
                                comment: ['The task command line or label'],
                            }, 'Executing task: {0}', `${shellLaunchConfig.executable} ${getArgsToEcho(shellLaunchConfig.args)}`), { excludeLeadingNewLine: true }) +
                            this.taskShellIntegrationOutputSequence;
                }
            }
            else {
                shellLaunchConfig.initialText = {
                    text: this.taskShellIntegrationStartSequence(cwd) + this.taskShellIntegrationOutputSequence,
                    trailingNewLine: false,
                };
            }
        }
        if (cwd) {
            shellLaunchConfig.cwd = cwd;
        }
        if (options.env) {
            if (shellLaunchConfig.env) {
                shellLaunchConfig.env = { ...shellLaunchConfig.env, ...options.env };
            }
            else {
                shellLaunchConfig.env = options.env;
            }
        }
        shellLaunchConfig.isFeatureTerminal = true;
        shellLaunchConfig.useShellEnvironment = true;
        shellLaunchConfig.tabActions = this._terminalTabActions;
        return shellLaunchConfig;
    }
    _addAllArgument(shellCommandArgs, configuredShellArgs) {
        const combinedShellArgs = Objects.deepClone(configuredShellArgs);
        shellCommandArgs.forEach((element) => {
            const shouldAddShellCommandArg = configuredShellArgs.every((arg, index) => {
                if (arg.toLowerCase() === element && configuredShellArgs.length > index + 1) {
                    // We can still add the argument, but only if not all of the following arguments begin with "-".
                    return !configuredShellArgs.slice(index + 1).every((testArg) => testArg.startsWith('-'));
                }
                else {
                    return arg.toLowerCase() !== element;
                }
            });
            if (shouldAddShellCommandArg) {
                combinedShellArgs.push(element);
            }
        });
        return combinedShellArgs;
    }
    async _reconnectToTerminal(task) {
        if (!this._reconnectedTerminals) {
            return;
        }
        for (let i = 0; i < this._reconnectedTerminals.length; i++) {
            const terminal = this._reconnectedTerminals[i];
            if (getReconnectionData(terminal)?.lastTask === task.getCommonTaskId()) {
                this._reconnectedTerminals.splice(i, 1);
                return terminal;
            }
        }
        return undefined;
    }
    async _doCreateTerminal(task, group, launchConfigs) {
        const reconnectedTerminal = await this._reconnectToTerminal(task);
        const onDisposed = (terminal) => this._fireTaskEvent(TaskEvent.terminated(task, terminal.instanceId, terminal.exitReason));
        if (reconnectedTerminal) {
            if ('command' in task && task.command.presentation) {
                reconnectedTerminal.waitOnExit = getWaitOnExitValue(task.command.presentation, task.configurationProperties);
            }
            reconnectedTerminal.onDisposed(onDisposed);
            this._logService.trace('reconnected to task and terminal', task._id);
            return reconnectedTerminal;
        }
        if (group) {
            // Try to find an existing terminal to split.
            // Even if an existing terminal is found, the split can fail if the terminal width is too small.
            for (const terminal of Object.values(this._terminals)) {
                if (terminal.group === group) {
                    this._logService.trace(`Found terminal to split for group ${group}`);
                    const originalInstance = terminal.terminal;
                    const result = await this._terminalService.createTerminal({
                        location: { parentTerminal: originalInstance },
                        config: launchConfigs,
                    });
                    result.onDisposed(onDisposed);
                    if (result) {
                        return result;
                    }
                }
            }
            this._logService.trace(`No terminal found to split for group ${group}`);
        }
        // Either no group is used, no terminal with the group exists or splitting an existing terminal failed.
        const createdTerminal = await this._terminalService.createTerminal({ config: launchConfigs });
        createdTerminal.onDisposed(onDisposed);
        return createdTerminal;
    }
    _reconnectToTerminals() {
        if (this._hasReconnected) {
            this._logService.trace(`Already reconnected, to ${this._reconnectedTerminals?.length} terminals so returning`);
            return;
        }
        this._reconnectedTerminals =
            this._terminalService
                .getReconnectedTerminals(ReconnectionType)
                ?.filter((t) => !t.isDisposed && getReconnectionData(t)) || [];
        this._logService.trace(`Attempting reconnection of ${this._reconnectedTerminals?.length} terminals`);
        if (!this._reconnectedTerminals?.length) {
            this._logService.trace(`No terminals to reconnect to so returning`);
        }
        else {
            for (const terminal of this._reconnectedTerminals) {
                const data = getReconnectionData(terminal);
                if (data) {
                    const terminalData = { lastTask: data.lastTask, group: data.group, terminal };
                    this._terminals[terminal.instanceId] = terminalData;
                    this._logService.trace('Reconnecting to task terminal', terminalData.lastTask, terminal.instanceId);
                }
            }
        }
        this._hasReconnected = true;
    }
    _deleteTaskAndTerminal(terminal, terminalData) {
        delete this._terminals[terminal.instanceId];
        delete this._sameTaskTerminals[terminalData.lastTask];
        this._idleTaskTerminals.delete(terminalData.lastTask);
        // Delete the task now as a work around for cases when the onExit isn't fired.
        // This can happen if the terminal wasn't shutdown with an "immediate" flag and is expected.
        // For correct terminal re-use, the task needs to be deleted immediately.
        // Note that this shouldn't be a problem anymore since user initiated terminal kills are now immediate.
        const mapKey = terminalData.lastTask;
        this._removeFromActiveTasks(mapKey);
        if (this._busyTasks[mapKey]) {
            delete this._busyTasks[mapKey];
        }
    }
    async _createTerminal(task, resolver, workspaceFolder) {
        const platform = resolver.taskSystemInfo ? resolver.taskSystemInfo.platform : Platform.platform;
        const options = await this._resolveOptions(resolver, task.command.options);
        const presentationOptions = task.command.presentation;
        if (!presentationOptions) {
            throw new Error('Task presentation options should not be undefined here.');
        }
        const waitOnExit = getWaitOnExitValue(presentationOptions, task.configurationProperties);
        let command;
        let args;
        let launchConfigs;
        if (task.command.runtime === RuntimeType.CustomExecution) {
            this._currentTask.shellLaunchConfig = launchConfigs = {
                customPtyImplementation: (id, cols, rows) => new TerminalProcessExtHostProxy(id, cols, rows, this._terminalService),
                waitOnExit,
                name: this._createTerminalName(task),
                initialText: task.command.presentation && task.command.presentation.echo
                    ? formatMessageForTerminal(nls.localize({
                        key: 'task.executing',
                        comment: ['The task command line or label'],
                    }, 'Executing task: {0}', task._label), { excludeLeadingNewLine: true })
                    : undefined,
                isFeatureTerminal: true,
                icon: task.configurationProperties.icon?.id
                    ? ThemeIcon.fromId(task.configurationProperties.icon.id)
                    : undefined,
                color: task.configurationProperties.icon?.color || undefined,
            };
        }
        else {
            const resolvedResult = await this._resolveCommandAndArgs(resolver, task.command);
            command = resolvedResult.command;
            args = resolvedResult.args;
            this._currentTask.shellLaunchConfig = launchConfigs = await this._createShellLaunchConfig(task, workspaceFolder, resolver, platform, options, command, args, waitOnExit);
            if (launchConfigs === undefined) {
                return [
                    undefined,
                    new TaskError(Severity.Error, nls.localize('TerminalTaskSystem', "Can't execute a shell command on an UNC drive using cmd.exe."), 7 /* TaskErrors.UnknownError */),
                ];
            }
        }
        const prefersSameTerminal = presentationOptions.panel === PanelKind.Dedicated;
        const allowsSharedTerminal = presentationOptions.panel === PanelKind.Shared;
        const group = presentationOptions.group;
        const taskKey = task.getMapKey();
        let terminalToReuse;
        if (prefersSameTerminal) {
            const terminalId = this._sameTaskTerminals[taskKey];
            if (terminalId) {
                terminalToReuse = this._terminals[terminalId];
                delete this._sameTaskTerminals[taskKey];
            }
        }
        else if (allowsSharedTerminal) {
            // Always allow to reuse the terminal previously used by the same task.
            let terminalId = this._idleTaskTerminals.remove(taskKey);
            if (!terminalId) {
                // There is no idle terminal which was used by the same task.
                // Search for any idle terminal used previously by a task of the same group
                // (or, if the task has no group, a terminal used by a task without group).
                for (const taskId of this._idleTaskTerminals.keys()) {
                    const idleTerminalId = this._idleTaskTerminals.get(taskId);
                    if (idleTerminalId &&
                        this._terminals[idleTerminalId] &&
                        this._terminals[idleTerminalId].group === group) {
                        terminalId = this._idleTaskTerminals.remove(taskId);
                        break;
                    }
                }
            }
            if (terminalId) {
                terminalToReuse = this._terminals[terminalId];
            }
        }
        if (terminalToReuse) {
            if (!launchConfigs) {
                throw new Error('Task shell launch configuration should not be undefined here.');
            }
            terminalToReuse.terminal.scrollToBottom();
            if (task.configurationProperties.isBackground) {
                launchConfigs.reconnectionProperties = {
                    ownerId: ReconnectionType,
                    data: { lastTask: task.getCommonTaskId(), group, label: task._label, id: task._id },
                };
            }
            await terminalToReuse.terminal.reuseTerminal(launchConfigs);
            if (task.command.presentation && task.command.presentation.clear) {
                terminalToReuse.terminal.clearBuffer();
            }
            this._terminals[terminalToReuse.terminal.instanceId.toString()].lastTask = taskKey;
            return [terminalToReuse.terminal, undefined];
        }
        this._terminalCreationQueue = this._terminalCreationQueue.then(() => this._doCreateTerminal(task, group, launchConfigs));
        const terminal = (await this._terminalCreationQueue);
        if (task.configurationProperties.isBackground) {
            terminal.shellLaunchConfig.reconnectionProperties = {
                ownerId: ReconnectionType,
                data: { lastTask: task.getCommonTaskId(), group, label: task._label, id: task._id },
            };
        }
        const terminalKey = terminal.instanceId.toString();
        const terminalData = { terminal: terminal, lastTask: taskKey, group };
        terminal.onDisposed(() => this._deleteTaskAndTerminal(terminal, terminalData));
        this._terminals[terminalKey] = terminalData;
        terminal.shellLaunchConfig.tabActions = this._terminalTabActions;
        return [terminal, undefined];
    }
    _buildShellCommandLine(platform, shellExecutable, shellOptions, command, originalCommand, args) {
        const basename = path.parse(shellExecutable).name.toLowerCase();
        const shellQuoteOptions = this._getQuotingOptions(basename, shellOptions, platform);
        function needsQuotes(value) {
            if (value.length >= 2) {
                const first = value[0] === shellQuoteOptions.strong
                    ? shellQuoteOptions.strong
                    : value[0] === shellQuoteOptions.weak
                        ? shellQuoteOptions.weak
                        : undefined;
                if (first === value[value.length - 1]) {
                    return false;
                }
            }
            let quote;
            for (let i = 0; i < value.length; i++) {
                // We found the end quote.
                const ch = value[i];
                if (ch === quote) {
                    quote = undefined;
                }
                else if (quote !== undefined) {
                    // skip the character. We are quoted.
                    continue;
                }
                else if (ch === shellQuoteOptions.escape) {
                    // Skip the next character
                    i++;
                }
                else if (ch === shellQuoteOptions.strong || ch === shellQuoteOptions.weak) {
                    quote = ch;
                }
                else if (ch === ' ') {
                    return true;
                }
            }
            return false;
        }
        function quote(value, kind) {
            if (kind === ShellQuoting.Strong && shellQuoteOptions.strong) {
                return [shellQuoteOptions.strong + value + shellQuoteOptions.strong, true];
            }
            else if (kind === ShellQuoting.Weak && shellQuoteOptions.weak) {
                return [shellQuoteOptions.weak + value + shellQuoteOptions.weak, true];
            }
            else if (kind === ShellQuoting.Escape && shellQuoteOptions.escape) {
                if (Types.isString(shellQuoteOptions.escape)) {
                    return [value.replace(/ /g, shellQuoteOptions.escape + ' '), true];
                }
                else {
                    const buffer = [];
                    for (const ch of shellQuoteOptions.escape.charsToEscape) {
                        buffer.push(`\\${ch}`);
                    }
                    const regexp = new RegExp('[' + buffer.join(',') + ']', 'g');
                    const escapeChar = shellQuoteOptions.escape.escapeChar;
                    return [value.replace(regexp, (match) => escapeChar + match), true];
                }
            }
            return [value, false];
        }
        function quoteIfNecessary(value) {
            if (Types.isString(value)) {
                if (needsQuotes(value)) {
                    return quote(value, ShellQuoting.Strong);
                }
                else {
                    return [value, false];
                }
            }
            else {
                return quote(value.value, value.quoting);
            }
        }
        // If we have no args and the command is a string then use the command to stay backwards compatible with the old command line
        // model. To allow variable resolving with spaces we do continue if the resolved value is different than the original one
        // and the resolved one needs quoting.
        if ((!args || args.length === 0) &&
            Types.isString(command) &&
            (command === originalCommand || needsQuotes(originalCommand))) {
            return command;
        }
        const result = [];
        let commandQuoted = false;
        let argQuoted = false;
        let value;
        let quoted;
        [value, quoted] = quoteIfNecessary(command);
        result.push(value);
        commandQuoted = quoted;
        for (const arg of args) {
            ;
            [value, quoted] = quoteIfNecessary(arg);
            result.push(value);
            argQuoted = argQuoted || quoted;
        }
        let commandLine = result.join(' ');
        // There are special rules quoted command line in cmd.exe
        if (platform === 3 /* Platform.Platform.Windows */) {
            if (basename === 'cmd' && commandQuoted && argQuoted) {
                commandLine = '"' + commandLine + '"';
            }
            else if ((basename === 'powershell' || basename === 'pwsh') && commandQuoted) {
                commandLine = '& ' + commandLine;
            }
        }
        return commandLine;
    }
    _getQuotingOptions(shellBasename, shellOptions, platform) {
        if (shellOptions && shellOptions.quoting) {
            return shellOptions.quoting;
        }
        return (TerminalTaskSystem._shellQuotes[shellBasename] ||
            TerminalTaskSystem._osShellQuotes[Platform.PlatformToString(platform)]);
    }
    _collectTaskVariables(variables, task) {
        if (task.command && task.command.name) {
            this._collectCommandVariables(variables, task.command, task);
        }
        this._collectMatcherVariables(variables, task.configurationProperties.problemMatchers);
        if (task.command.runtime === RuntimeType.CustomExecution &&
            (CustomTask.is(task) || ContributedTask.is(task))) {
            let definition;
            if (CustomTask.is(task)) {
                definition = task._source.config.element;
            }
            else {
                definition = Objects.deepClone(task.defines);
                delete definition._key;
                delete definition.type;
            }
            this._collectDefinitionVariables(variables, definition);
        }
    }
    _collectDefinitionVariables(variables, definition) {
        if (Types.isString(definition)) {
            this._collectVariables(variables, definition);
        }
        else if (Array.isArray(definition)) {
            definition.forEach((element) => this._collectDefinitionVariables(variables, element));
        }
        else if (Types.isObject(definition)) {
            for (const key in definition) {
                this._collectDefinitionVariables(variables, definition[key]);
            }
        }
    }
    _collectCommandVariables(variables, command, task) {
        // The custom execution should have everything it needs already as it provided
        // the callback.
        if (command.runtime === RuntimeType.CustomExecution) {
            return;
        }
        if (command.name === undefined) {
            throw new Error('Command name should never be undefined here.');
        }
        this._collectVariables(variables, command.name);
        command.args?.forEach((arg) => this._collectVariables(variables, arg));
        // Try to get a scope.
        const scope = task._source.scope;
        if (scope !== 1 /* TaskScope.Global */) {
            variables.add('${workspaceFolder}');
        }
        if (command.options) {
            const options = command.options;
            if (options.cwd) {
                this._collectVariables(variables, options.cwd);
            }
            const optionsEnv = options.env;
            if (optionsEnv) {
                Object.keys(optionsEnv).forEach((key) => {
                    const value = optionsEnv[key];
                    if (Types.isString(value)) {
                        this._collectVariables(variables, value);
                    }
                });
            }
            if (options.shell) {
                if (options.shell.executable) {
                    this._collectVariables(variables, options.shell.executable);
                }
                options.shell.args?.forEach((arg) => this._collectVariables(variables, arg));
            }
        }
    }
    _collectMatcherVariables(variables, values) {
        if (values === undefined || values === null || values.length === 0) {
            return;
        }
        values.forEach((value) => {
            let matcher;
            if (Types.isString(value)) {
                if (value[0] === '$') {
                    matcher = ProblemMatcherRegistry.get(value.substring(1));
                }
                else {
                    matcher = ProblemMatcherRegistry.get(value);
                }
            }
            else {
                matcher = value;
            }
            if (matcher && matcher.filePrefix) {
                if (Types.isString(matcher.filePrefix)) {
                    this._collectVariables(variables, matcher.filePrefix);
                }
                else {
                    for (const fp of [
                        ...asArray(matcher.filePrefix.include || []),
                        ...asArray(matcher.filePrefix.exclude || []),
                    ]) {
                        this._collectVariables(variables, fp);
                    }
                }
            }
        });
    }
    _collectVariables(variables, value) {
        const string = Types.isString(value) ? value : value.value;
        const r = /\$\{(.*?)\}/g;
        let matches;
        do {
            matches = r.exec(string);
            if (matches) {
                variables.add(matches[0]);
            }
        } while (matches);
    }
    async _resolveCommandAndArgs(resolver, commandConfig) {
        // First we need to use the command args:
        let args = commandConfig.args ? commandConfig.args.slice() : [];
        args = await this._resolveVariables(resolver, args);
        const command = await this._resolveVariable(resolver, commandConfig.name);
        return { command, args };
    }
    async _resolveVariables(resolver, value) {
        return Promise.all(value.map((s) => this._resolveVariable(resolver, s)));
    }
    async _resolveMatchers(resolver, values) {
        if (values === undefined || values === null || values.length === 0) {
            return [];
        }
        const result = [];
        for (const value of values) {
            let matcher;
            if (Types.isString(value)) {
                if (value[0] === '$') {
                    matcher = ProblemMatcherRegistry.get(value.substring(1));
                }
                else {
                    matcher = ProblemMatcherRegistry.get(value);
                }
            }
            else {
                matcher = value;
            }
            if (!matcher) {
                this._appendOutput(nls.localize('unknownProblemMatcher', "Problem matcher {0} can't be resolved. The matcher will be ignored"));
                continue;
            }
            const taskSystemInfo = resolver.taskSystemInfo;
            const hasFilePrefix = matcher.filePrefix !== undefined;
            const hasUriProvider = taskSystemInfo !== undefined && taskSystemInfo.uriProvider !== undefined;
            if (!hasFilePrefix && !hasUriProvider) {
                result.push(matcher);
            }
            else {
                const copy = Objects.deepClone(matcher);
                if (hasUriProvider && taskSystemInfo !== undefined) {
                    copy.uriProvider = taskSystemInfo.uriProvider;
                }
                if (hasFilePrefix) {
                    const filePrefix = copy.filePrefix;
                    if (Types.isString(filePrefix)) {
                        copy.filePrefix = await this._resolveVariable(resolver, filePrefix);
                    }
                    else if (filePrefix !== undefined) {
                        if (filePrefix.include) {
                            filePrefix.include = Array.isArray(filePrefix.include)
                                ? await Promise.all(filePrefix.include.map((x) => this._resolveVariable(resolver, x)))
                                : await this._resolveVariable(resolver, filePrefix.include);
                        }
                        if (filePrefix.exclude) {
                            filePrefix.exclude = Array.isArray(filePrefix.exclude)
                                ? await Promise.all(filePrefix.exclude.map((x) => this._resolveVariable(resolver, x)))
                                : await this._resolveVariable(resolver, filePrefix.exclude);
                        }
                    }
                }
                result.push(copy);
            }
        }
        return result;
    }
    async _resolveVariable(resolver, value) {
        // TODO@Dirk Task.getWorkspaceFolder should return a WorkspaceFolder that is defined in workspace.ts
        if (Types.isString(value)) {
            return resolver.resolve(value);
        }
        else if (value !== undefined) {
            return {
                value: await resolver.resolve(value.value),
                quoting: value.quoting,
            };
        }
        else {
            // This should never happen
            throw new Error('Should never try to resolve undefined.');
        }
    }
    async _resolveOptions(resolver, options) {
        if (options === undefined || options === null) {
            let cwd;
            try {
                cwd = await this._resolveVariable(resolver, '${workspaceFolder}');
            }
            catch (e) {
                // No workspace
            }
            return { cwd };
        }
        const result = Types.isString(options.cwd)
            ? { cwd: await this._resolveVariable(resolver, options.cwd) }
            : { cwd: await this._resolveVariable(resolver, '${workspaceFolder}') };
        if (options.env) {
            result.env = Object.create(null);
            for (const key of Object.keys(options.env)) {
                const value = options.env[key];
                if (Types.isString(value)) {
                    result.env[key] = await this._resolveVariable(resolver, value);
                }
                else {
                    result.env[key] = value.toString();
                }
            }
        }
        return result;
    }
    static { this.WellKnownCommands = {
        ant: true,
        cmake: true,
        eslint: true,
        gradle: true,
        grunt: true,
        gulp: true,
        jake: true,
        jenkins: true,
        jshint: true,
        make: true,
        maven: true,
        msbuild: true,
        msc: true,
        nmake: true,
        npm: true,
        rake: true,
        tsc: true,
        xbuild: true,
    }; }
    getSanitizedCommand(cmd) {
        let result = cmd.toLowerCase();
        const index = result.lastIndexOf(path.sep);
        if (index !== -1) {
            result = result.substring(index + 1);
        }
        if (TerminalTaskSystem.WellKnownCommands[result]) {
            return result;
        }
        return 'other';
    }
    getTaskForTerminal(instanceId) {
        for (const key in this._activeTasks) {
            const activeTask = this._activeTasks[key];
            if (activeTask.terminal?.instanceId === instanceId) {
                return activeTask.task;
            }
        }
        return undefined;
    }
    _appendOutput(output) {
        const outputChannel = this._outputService.getChannel(this._outputChannelId);
        outputChannel?.append(output);
    }
}
function getWaitOnExitValue(presentationOptions, configurationProperties) {
    if (presentationOptions.close === undefined || presentationOptions.close === false) {
        if (presentationOptions.reveal !== RevealKind.Never ||
            !configurationProperties.isBackground ||
            presentationOptions.close === false) {
            if (presentationOptions.panel === PanelKind.New) {
                return taskShellIntegrationWaitOnExitSequence(nls.localize('closeTerminal', 'Press any key to close the terminal.'));
            }
            else if (presentationOptions.showReuseMessage) {
                return taskShellIntegrationWaitOnExitSequence(nls.localize('reuseTerminal', 'Terminal will be reused by tasks, press any key to close it.'));
            }
            else {
                return true;
            }
        }
    }
    return !presentationOptions.close;
}
function taskShellIntegrationWaitOnExitSequence(message) {
    return (exitCode) => {
        return `${VSCodeSequence("D" /* VSCodeOscPt.CommandFinished */, exitCode.toString())}${message}`;
    };
}
function getReconnectionData(terminal) {
    return terminal.shellLaunchConfig.attachPersistentProcess?.reconnectionProperties?.data;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYXNrU3lzdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rlcm1pbmFsVGFza1N5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBUyxNQUFNLGdDQUFnQyxDQUFBO0FBQ2pFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBSXpDLE9BQU8sRUFBa0IsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFNL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFFTixzQkFBc0IsQ0FBQyxrQ0FBa0MsR0FDekQsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwQyxPQUFPLEVB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