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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYXNrU3lzdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90ZXJtaW5hbFRhc2tTeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxTQUFTLEVBQVMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUl6QyxPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBTS9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBRU4sc0JBQXNCLENBQUMsa0NBQWtDLEdBQ3pELE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsT0FBTyxFQUFFLE9B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