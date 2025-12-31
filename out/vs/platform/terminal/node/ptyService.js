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
import { execFile, exec } from 'child_process';
import { AutoOpenBarrier, ProcessTimeRunOnceScheduler, Promises, Queue, timeout, } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { isWindows, OS, } from '../../../base/common/platform.js';
import { getSystemShell } from '../../../base/node/shell.js';
import { LogLevel } from '../../log/common/log.js';
import { RequestStore } from '../common/requestStore.js';
import { TitleEventSource, } from '../common/terminal.js';
import { TerminalDataBufferer } from '../common/terminalDataBuffering.js';
import { escapeNonWindowsPath } from '../common/terminalEnvironment.js';
import { getWindowsBuildNumber } from './terminalEnvironment.js';
import { TerminalProcess } from './terminalProcess.js';
import { localize } from '../../../nls.js';
import { ignoreProcessNames } from './childProcessMonitor.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { ShellIntegrationAddon } from '../common/xterm/shellIntegrationAddon.js';
import { formatMessageForTerminal } from '../common/terminalStrings.js';
import { join } from 'path';
import { memoize } from '../../../base/common/decorators.js';
import * as performance from '../../../base/common/performance.js';
import pkg from '@xterm/headless';
import { AutoRepliesPtyServiceContribution } from './terminalContrib/autoReplies/autoRepliesContribController.js';
const { Terminal: XtermTerminal } = pkg;
export function traceRpc(_target, key, descriptor) {
    if (typeof descriptor.value !== 'function') {
        throw new Error('not supported');
    }
    const fnKey = 'value';
    const fn = descriptor.value;
    descriptor[fnKey] = async function (...args) {
        if (this.traceRpcArgs.logService.getLevel() === LogLevel.Trace) {
            this.traceRpcArgs.logService.trace(`[RPC Request] PtyService#${fn.name}(${args.map((e) => JSON.stringify(e)).join(', ')})`);
        }
        if (this.traceRpcArgs.simulatedLatency) {
            await timeout(this.traceRpcArgs.simulatedLatency);
        }
        let result;
        try {
            result = await fn.apply(this, args);
        }
        catch (e) {
            this.traceRpcArgs.logService.error(`[RPC Response] PtyService#${fn.name}`, e);
            throw e;
        }
        if (this.traceRpcArgs.logService.getLevel() === LogLevel.Trace) {
            this.traceRpcArgs.logService.trace(`[RPC Response] PtyService#${fn.name}`, result);
        }
        return result;
    };
}
let SerializeAddon;
let Unicode11Addon;
export class PtyService extends Disposable {
    async installAutoReply(match, reply) {
        await this._autoRepliesContribution.installAutoReply(match, reply);
    }
    async uninstallAllAutoReplies() {
        await this._autoRepliesContribution.uninstallAllAutoReplies();
    }
    _traceEvent(name, event) {
        event((e) => {
            if (this._logService.getLevel() === LogLevel.Trace) {
                this._logService.trace(`[RPC Event] PtyService#${name}.fire(${JSON.stringify(e)})`);
            }
        });
        return event;
    }
    get traceRpcArgs() {
        return {
            logService: this._logService,
            simulatedLatency: this._simulatedLatency,
        };
    }
    constructor(_logService, _productService, _reconnectConstants, _simulatedLatency) {
        super();
        this._logService = _logService;
        this._productService = _productService;
        this._reconnectConstants = _reconnectConstants;
        this._simulatedLatency = _simulatedLatency;
        this._ptys = new Map();
        this._workspaceLayoutInfos = new Map();
        this._revivedPtyIdMap = new Map();
        // #region Pty service contribution RPC calls
        this._autoRepliesContribution = new AutoRepliesPtyServiceContribution(this._logService);
        // #endregion
        this._contributions = [this._autoRepliesContribution];
        this._lastPtyId = 0;
        this._onHeartbeat = this._register(new Emitter());
        this.onHeartbeat = this._traceEvent('_onHeartbeat', this._onHeartbeat.event);
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._traceEvent('_onProcessData', this._onProcessData.event);
        this._onProcessReplay = this._register(new Emitter());
        this.onProcessReplay = this._traceEvent('_onProcessReplay', this._onProcessReplay.event);
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._traceEvent('_onProcessReady', this._onProcessReady.event);
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._traceEvent('_onProcessExit', this._onProcessExit.event);
        this._onProcessOrphanQuestion = this._register(new Emitter());
        this.onProcessOrphanQuestion = this._traceEvent('_onProcessOrphanQuestion', this._onProcessOrphanQuestion.event);
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._traceEvent('_onDidRequestDetach', this._onDidRequestDetach.event);
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._traceEvent('_onDidChangeProperty', this._onDidChangeProperty.event);
        this._register(toDisposable(() => {
            for (const pty of this._ptys.values()) {
                pty.shutdown(true);
            }
            this._ptys.clear();
        }));
        this._detachInstanceRequestStore = this._register(new RequestStore(undefined, this._logService));
        this._detachInstanceRequestStore.onCreateRequest(this._onDidRequestDetach.fire, this._onDidRequestDetach);
    }
    async refreshIgnoreProcessNames(names) {
        ignoreProcessNames.length = 0;
        ignoreProcessNames.push(...names);
    }
    async requestDetachInstance(workspaceId, instanceId) {
        return this._detachInstanceRequestStore.createRequest({ workspaceId, instanceId });
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        let processDetails = undefined;
        const pty = this._ptys.get(persistentProcessId);
        if (pty) {
            processDetails = await this._buildProcessDetails(persistentProcessId, pty);
        }
        this._detachInstanceRequestStore.acceptReply(requestId, processDetails);
    }
    async freePortKillProcess(port) {
        const stdout = await new Promise((resolve, reject) => {
            exec(isWindows
                ? `netstat -ano | findstr "${port}"`
                : `lsof -nP -iTCP -sTCP:LISTEN | grep ${port}`, {}, (err, stdout) => {
                if (err) {
                    return reject('Problem occurred when listing active processes');
                }
                resolve(stdout);
            });
        });
        const processesForPort = stdout.split(/\r?\n/).filter((s) => !!s.trim());
        if (processesForPort.length >= 1) {
            const capturePid = /\s+(\d+)(?:\s+|$)/;
            const processId = processesForPort[0].match(capturePid)?.[1];
            if (processId) {
                try {
                    process.kill(Number.parseInt(processId));
                }
                catch { }
            }
            else {
                throw new Error(`Processes for port ${port} were not found`);
            }
            return { port, processId };
        }
        throw new Error(`Could not kill process with port ${port}`);
    }
    async serializeTerminalState(ids) {
        const promises = [];
        for (const [persistentProcessId, persistentProcess] of this._ptys.entries()) {
            // Only serialize persistent processes that have had data written or performed a replay
            if (persistentProcess.hasWrittenData && ids.indexOf(persistentProcessId) !== -1) {
                promises.push(Promises.withAsyncBody(async (r) => {
                    r({
                        id: persistentProcessId,
                        shellLaunchConfig: persistentProcess.shellLaunchConfig,
                        processDetails: await this._buildProcessDetails(persistentProcessId, persistentProcess),
                        processLaunchConfig: persistentProcess.processLaunchOptions,
                        unicodeVersion: persistentProcess.unicodeVersion,
                        replayEvent: await persistentProcess.serializeNormalBuffer(),
                        timestamp: Date.now(),
                    });
                }));
            }
        }
        const serialized = {
            version: 1,
            state: await Promise.all(promises),
        };
        return JSON.stringify(serialized);
    }
    async reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocale) {
        const promises = [];
        for (const terminal of state) {
            promises.push(this._reviveTerminalProcess(workspaceId, terminal));
        }
        await Promise.all(promises);
    }
    async _reviveTerminalProcess(workspaceId, terminal) {
        const restoreMessage = localize('terminal-history-restored', 'History restored');
        // Conpty v1.22+ uses passthrough and doesn't reprint the buffer often, this means that when
        // the terminal is revived, the cursor would be at the bottom of the buffer then when
        // PSReadLine requests `GetConsoleCursorInfo` it will be handled by conpty itself by design.
        // This causes the cursor to move to the top into the replayed terminal contents. To avoid
        // this, the post restore message will print new lines to get a clear viewport and put the
        // cursor back at to top left.
        let postRestoreMessage = '';
        if (isWindows) {
            const lastReplayEvent = terminal.replayEvent.events.length > 0 ? terminal.replayEvent.events.at(-1) : undefined;
            if (lastReplayEvent) {
                postRestoreMessage += '\r\n'.repeat(lastReplayEvent.rows - 1) + `\x1b[H`;
            }
        }
        // TODO: We may at some point want to show date information in a hover via a custom sequence:
        //   new Date(terminal.timestamp).toLocaleDateString(dateTimeFormatLocale)
        //   new Date(terminal.timestamp).toLocaleTimeString(dateTimeFormatLocale)
        const newId = await this.createProcess({
            ...terminal.shellLaunchConfig,
            cwd: terminal.processDetails.cwd,
            color: terminal.processDetails.color,
            icon: terminal.processDetails.icon,
            name: terminal.processDetails.titleSource === TitleEventSource.Api
                ? terminal.processDetails.title
                : undefined,
            initialText: terminal.replayEvent.events[0].data +
                formatMessageForTerminal(restoreMessage, { loudFormatting: true }) +
                postRestoreMessage,
        }, terminal.processDetails.cwd, terminal.replayEvent.events[0].cols, terminal.replayEvent.events[0].rows, terminal.unicodeVersion, terminal.processLaunchConfig.env, terminal.processLaunchConfig.executableEnv, terminal.processLaunchConfig.options, true, terminal.processDetails.workspaceId, terminal.processDetails.workspaceName, true, terminal.replayEvent.events[0].data);
        // Don't start the process here as there's no terminal to answer CPR
        const oldId = this._getRevivingProcessId(workspaceId, terminal.id);
        this._revivedPtyIdMap.set(oldId, { newId, state: terminal });
        this._logService.info(`Revived process, old id ${oldId} -> new id ${newId}`);
    }
    async shutdownAll() {
        this.dispose();
    }
    async createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, workspaceId, workspaceName, isReviving, rawReviveBuffer) {
        if (shellLaunchConfig.attachPersistentProcess) {
            throw new Error('Attempt to create a process when attach object was provided');
        }
        const id = ++this._lastPtyId;
        const process = new TerminalProcess(shellLaunchConfig, cwd, cols, rows, env, executableEnv, options, this._logService, this._productService);
        const processLaunchOptions = {
            env,
            executableEnv,
            options,
        };
        const persistentProcess = new PersistentTerminalProcess(id, process, workspaceId, workspaceName, shouldPersist, cols, rows, processLaunchOptions, unicodeVersion, this._reconnectConstants, this._logService, isReviving && typeof shellLaunchConfig.initialText === 'string'
            ? shellLaunchConfig.initialText
            : undefined, rawReviveBuffer, shellLaunchConfig.icon, shellLaunchConfig.color, shellLaunchConfig.name, shellLaunchConfig.fixedDimensions);
        process.onProcessExit((event) => {
            for (const contrib of this._contributions) {
                contrib.handleProcessDispose(id);
            }
            persistentProcess.dispose();
            this._ptys.delete(id);
            this._onProcessExit.fire({ id, event });
        });
        persistentProcess.onProcessData((event) => this._onProcessData.fire({ id, event }));
        persistentProcess.onProcessReplay((event) => this._onProcessReplay.fire({ id, event }));
        persistentProcess.onProcessReady((event) => this._onProcessReady.fire({ id, event }));
        persistentProcess.onProcessOrphanQuestion(() => this._onProcessOrphanQuestion.fire({ id }));
        persistentProcess.onDidChangeProperty((property) => this._onDidChangeProperty.fire({ id, property }));
        persistentProcess.onPersistentProcessReady(() => {
            for (const contrib of this._contributions) {
                contrib.handleProcessReady(id, process);
            }
        });
        this._ptys.set(id, persistentProcess);
        return id;
    }
    async attachToProcess(id) {
        try {
            await this._throwIfNoPty(id).attach();
            this._logService.info(`Persistent process reconnection "${id}"`);
        }
        catch (e) {
            this._logService.warn(`Persistent process reconnection "${id}" failed`, e.message);
            throw e;
        }
    }
    async updateTitle(id, title, titleSource) {
        this._throwIfNoPty(id).setTitle(title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        this._throwIfNoPty(id).setIcon(userInitiated, icon, color);
    }
    async clearBuffer(id) {
        this._throwIfNoPty(id).clearBuffer();
    }
    async refreshProperty(id, type) {
        return this._throwIfNoPty(id).refreshProperty(type);
    }
    async updateProperty(id, type, value) {
        return this._throwIfNoPty(id).updateProperty(type, value);
    }
    async detachFromProcess(id, forcePersist) {
        return this._throwIfNoPty(id).detach(forcePersist);
    }
    async reduceConnectionGraceTime() {
        for (const pty of this._ptys.values()) {
            pty.reduceGraceTime();
        }
    }
    async listProcesses() {
        const persistentProcesses = Array.from(this._ptys.entries()).filter(([_, pty]) => pty.shouldPersistTerminal);
        this._logService.info(`Listing ${persistentProcesses.length} persistent terminals, ${this._ptys.size} total terminals`);
        const promises = persistentProcesses.map(async ([id, terminalProcessData]) => this._buildProcessDetails(id, terminalProcessData));
        const allTerminals = await Promise.all(promises);
        return allTerminals.filter((entry) => entry.isOrphan);
    }
    async getPerformanceMarks() {
        return performance.getMarks();
    }
    async start(id) {
        const pty = this._ptys.get(id);
        return pty ? pty.start() : { message: `Could not find pty with id "${id}"` };
    }
    async shutdown(id, immediate) {
        // Don't throw if the pty is already shutdown
        return this._ptys.get(id)?.shutdown(immediate);
    }
    async input(id, data) {
        const pty = this._throwIfNoPty(id);
        if (pty) {
            for (const contrib of this._contributions) {
                contrib.handleProcessInput(id, data);
            }
            pty.input(data);
        }
    }
    async processBinary(id, data) {
        return this._throwIfNoPty(id).writeBinary(data);
    }
    async resize(id, cols, rows) {
        const pty = this._throwIfNoPty(id);
        if (pty) {
            for (const contrib of this._contributions) {
                contrib.handleProcessResize(id, cols, rows);
            }
            pty.resize(cols, rows);
        }
    }
    async getInitialCwd(id) {
        return this._throwIfNoPty(id).getInitialCwd();
    }
    async getCwd(id) {
        return this._throwIfNoPty(id).getCwd();
    }
    async acknowledgeDataEvent(id, charCount) {
        return this._throwIfNoPty(id).acknowledgeDataEvent(charCount);
    }
    async setUnicodeVersion(id, version) {
        return this._throwIfNoPty(id).setUnicodeVersion(version);
    }
    async getLatency() {
        return [];
    }
    async orphanQuestionReply(id) {
        return this._throwIfNoPty(id).orphanQuestionReply();
    }
    async getDefaultSystemShell(osOverride = OS) {
        return getSystemShell(osOverride, process.env);
    }
    async getEnvironment() {
        return { ...process.env };
    }
    async getWslPath(original, direction) {
        if (direction === 'win-to-unix') {
            if (!isWindows) {
                return original;
            }
            if (getWindowsBuildNumber() < 17063) {
                return original.replace(/\\/g, '/');
            }
            const wslExecutable = this._getWSLExecutablePath();
            if (!wslExecutable) {
                return original;
            }
            return new Promise((c) => {
                const proc = execFile(wslExecutable, ['-e', 'wslpath', original], {}, (error, stdout, stderr) => {
                    c(error ? original : escapeNonWindowsPath(stdout.trim()));
                });
                proc.stdin.end();
            });
        }
        if (direction === 'unix-to-win') {
            // The backend is Windows, for example a local Windows workspace with a wsl session in
            // the terminal.
            if (isWindows) {
                if (getWindowsBuildNumber() < 17063) {
                    return original;
                }
                const wslExecutable = this._getWSLExecutablePath();
                if (!wslExecutable) {
                    return original;
                }
                return new Promise((c) => {
                    const proc = execFile(wslExecutable, ['-e', 'wslpath', '-w', original], {}, (error, stdout, stderr) => {
                        c(error ? original : stdout.trim());
                    });
                    proc.stdin.end();
                });
            }
        }
        // Fallback just in case
        return original;
    }
    _getWSLExecutablePath() {
        const useWSLexe = getWindowsBuildNumber() >= 16299;
        const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        const systemRoot = process.env['SystemRoot'];
        if (systemRoot) {
            return join(systemRoot, is32ProcessOn64Windows ? 'Sysnative' : 'System32', useWSLexe ? 'wsl.exe' : 'bash.exe');
        }
        return undefined;
    }
    async getRevivedPtyNewId(workspaceId, id) {
        try {
            return this._revivedPtyIdMap.get(this._getRevivingProcessId(workspaceId, id))?.newId;
        }
        catch (e) {
            this._logService.warn(`Couldn't find terminal ID ${workspaceId}-${id}`, e.message);
        }
        return undefined;
    }
    async setTerminalLayoutInfo(args) {
        this._workspaceLayoutInfos.set(args.workspaceId, args);
    }
    async getTerminalLayoutInfo(args) {
        performance.mark('code/willGetTerminalLayoutInfo');
        const layout = this._workspaceLayoutInfos.get(args.workspaceId);
        if (layout) {
            const doneSet = new Set();
            const expandedTabs = await Promise.all(layout.tabs.map(async (tab) => this._expandTerminalTab(args.workspaceId, tab, doneSet)));
            const tabs = expandedTabs.filter((t) => t.terminals.length > 0);
            performance.mark('code/didGetTerminalLayoutInfo');
            return { tabs };
        }
        performance.mark('code/didGetTerminalLayoutInfo');
        return undefined;
    }
    async _expandTerminalTab(workspaceId, tab, doneSet) {
        const expandedTerminals = await Promise.all(tab.terminals.map((t) => this._expandTerminalInstance(workspaceId, t, doneSet)));
        const filtered = expandedTerminals.filter((term) => term.terminal !== null);
        return {
            isActive: tab.isActive,
            activePersistentProcessId: tab.activePersistentProcessId,
            terminals: filtered,
        };
    }
    async _expandTerminalInstance(workspaceId, t, doneSet) {
        try {
            const oldId = this._getRevivingProcessId(workspaceId, t.terminal);
            const revivedPtyId = this._revivedPtyIdMap.get(oldId)?.newId;
            this._logService.info(`Expanding terminal instance, old id ${oldId} -> new id ${revivedPtyId}`);
            this._revivedPtyIdMap.delete(oldId);
            const persistentProcessId = revivedPtyId ?? t.terminal;
            if (doneSet.has(persistentProcessId)) {
                throw new Error(`Terminal ${persistentProcessId} has already been expanded`);
            }
            doneSet.add(persistentProcessId);
            const persistentProcess = this._throwIfNoPty(persistentProcessId);
            const processDetails = persistentProcess &&
                (await this._buildProcessDetails(t.terminal, persistentProcess, revivedPtyId !== undefined));
            return {
                terminal: { ...processDetails, id: persistentProcessId },
                relativeSize: t.relativeSize,
            };
        }
        catch (e) {
            this._logService.warn(`Couldn't get layout info, a terminal was probably disconnected`, e.message);
            this._logService.debug('Reattach to wrong terminal debug info - layout info by id', t);
            this._logService.debug('Reattach to wrong terminal debug info - _revivePtyIdMap', Array.from(this._revivedPtyIdMap.values()));
            this._logService.debug('Reattach to wrong terminal debug info - _ptys ids', Array.from(this._ptys.keys()));
            // this will be filtered out and not reconnected
            return {
                terminal: null,
                relativeSize: t.relativeSize,
            };
        }
    }
    _getRevivingProcessId(workspaceId, ptyId) {
        return `${workspaceId}-${ptyId}`;
    }
    async _buildProcessDetails(id, persistentProcess, wasRevived = false) {
        performance.mark(`code/willBuildProcessDetails/${id}`);
        // If the process was just revived, don't do the orphan check as it will
        // take some time
        const [cwd, isOrphan] = await Promise.all([
            persistentProcess.getCwd(),
            wasRevived ? true : persistentProcess.isOrphaned(),
        ]);
        const result = {
            id,
            title: persistentProcess.title,
            titleSource: persistentProcess.titleSource,
            pid: persistentProcess.pid,
            workspaceId: persistentProcess.workspaceId,
            workspaceName: persistentProcess.workspaceName,
            cwd,
            isOrphan,
            icon: persistentProcess.icon,
            color: persistentProcess.color,
            fixedDimensions: persistentProcess.fixedDimensions,
            environmentVariableCollections: persistentProcess.processLaunchOptions.options.environmentVariableCollections,
            reconnectionProperties: persistentProcess.shellLaunchConfig.reconnectionProperties,
            waitOnExit: persistentProcess.shellLaunchConfig.waitOnExit,
            hideFromUser: persistentProcess.shellLaunchConfig.hideFromUser,
            isFeatureTerminal: persistentProcess.shellLaunchConfig.isFeatureTerminal,
            type: persistentProcess.shellLaunchConfig.type,
            hasChildProcesses: persistentProcess.hasChildProcesses,
            shellIntegrationNonce: persistentProcess.processLaunchOptions.options.shellIntegration.nonce,
            tabActions: persistentProcess.shellLaunchConfig.tabActions,
        };
        performance.mark(`code/didBuildProcessDetails/${id}`);
        return result;
    }
    _throwIfNoPty(id) {
        const pty = this._ptys.get(id);
        if (!pty) {
            throw new ErrorNoTelemetry(`Could not find pty ${id} on pty host`);
        }
        return pty;
    }
}
__decorate([
    traceRpc
], PtyService.prototype, "installAutoReply", null);
__decorate([
    traceRpc
], PtyService.prototype, "uninstallAllAutoReplies", null);
__decorate([
    memoize
], PtyService.prototype, "traceRpcArgs", null);
__decorate([
    traceRpc
], PtyService.prototype, "refreshIgnoreProcessNames", null);
__decorate([
    traceRpc
], PtyService.prototype, "requestDetachInstance", null);
__decorate([
    traceRpc
], PtyService.prototype, "acceptDetachInstanceReply", null);
__decorate([
    traceRpc
], PtyService.prototype, "freePortKillProcess", null);
__decorate([
    traceRpc
], PtyService.prototype, "serializeTerminalState", null);
__decorate([
    traceRpc
], PtyService.prototype, "reviveTerminalProcesses", null);
__decorate([
    traceRpc
], PtyService.prototype, "shutdownAll", null);
__decorate([
    traceRpc
], PtyService.prototype, "createProcess", null);
__decorate([
    traceRpc
], PtyService.prototype, "attachToProcess", null);
__decorate([
    traceRpc
], PtyService.prototype, "updateTitle", null);
__decorate([
    traceRpc
], PtyService.prototype, "updateIcon", null);
__decorate([
    traceRpc
], PtyService.prototype, "clearBuffer", null);
__decorate([
    traceRpc
], PtyService.prototype, "refreshProperty", null);
__decorate([
    traceRpc
], PtyService.prototype, "updateProperty", null);
__decorate([
    traceRpc
], PtyService.prototype, "detachFromProcess", null);
__decorate([
    traceRpc
], PtyService.prototype, "reduceConnectionGraceTime", null);
__decorate([
    traceRpc
], PtyService.prototype, "listProcesses", null);
__decorate([
    traceRpc
], PtyService.prototype, "getPerformanceMarks", null);
__decorate([
    traceRpc
], PtyService.prototype, "start", null);
__decorate([
    traceRpc
], PtyService.prototype, "shutdown", null);
__decorate([
    traceRpc
], PtyService.prototype, "input", null);
__decorate([
    traceRpc
], PtyService.prototype, "processBinary", null);
__decorate([
    traceRpc
], PtyService.prototype, "resize", null);
__decorate([
    traceRpc
], PtyService.prototype, "getInitialCwd", null);
__decorate([
    traceRpc
], PtyService.prototype, "getCwd", null);
__decorate([
    traceRpc
], PtyService.prototype, "acknowledgeDataEvent", null);
__decorate([
    traceRpc
], PtyService.prototype, "setUnicodeVersion", null);
__decorate([
    traceRpc
], PtyService.prototype, "getLatency", null);
__decorate([
    traceRpc
], PtyService.prototype, "orphanQuestionReply", null);
__decorate([
    traceRpc
], PtyService.prototype, "getDefaultSystemShell", null);
__decorate([
    traceRpc
], PtyService.prototype, "getEnvironment", null);
__decorate([
    traceRpc
], PtyService.prototype, "getWslPath", null);
__decorate([
    traceRpc
], PtyService.prototype, "getRevivedPtyNewId", null);
__decorate([
    traceRpc
], PtyService.prototype, "setTerminalLayoutInfo", null);
__decorate([
    traceRpc
], PtyService.prototype, "getTerminalLayoutInfo", null);
var InteractionState;
(function (InteractionState) {
    /** The terminal has not been interacted with. */
    InteractionState["None"] = "None";
    /** The terminal has only been interacted with by the replay mechanism. */
    InteractionState["ReplayOnly"] = "ReplayOnly";
    /** The terminal has been directly interacted with this session. */
    InteractionState["Session"] = "Session";
})(InteractionState || (InteractionState = {}));
class PersistentTerminalProcess extends Disposable {
    get pid() {
        return this._pid;
    }
    get shellLaunchConfig() {
        return this._terminalProcess.shellLaunchConfig;
    }
    get hasWrittenData() {
        return this._interactionState.value !== "None" /* InteractionState.None */;
    }
    get title() {
        return this._title || this._terminalProcess.currentTitle;
    }
    get titleSource() {
        return this._titleSource;
    }
    get icon() {
        return this._icon;
    }
    get color() {
        return this._color;
    }
    get fixedDimensions() {
        return this._fixedDimensions;
    }
    get hasChildProcesses() {
        return this._terminalProcess.hasChildProcesses;
    }
    setTitle(title, titleSource) {
        if (titleSource === TitleEventSource.Api) {
            this._interactionState.setValue("Session" /* InteractionState.Session */, 'setTitle');
            this._serializer.freeRawReviveBuffer();
        }
        this._title = title;
        this._titleSource = titleSource;
    }
    setIcon(userInitiated, icon, color) {
        if (!this._icon ||
            ('id' in icon && 'id' in this._icon && icon.id !== this._icon.id) ||
            !this.color ||
            color !== this._color) {
            this._serializer.freeRawReviveBuffer();
            if (userInitiated) {
                this._interactionState.setValue("Session" /* InteractionState.Session */, 'setIcon');
            }
        }
        this._icon = icon;
        this._color = color;
    }
    _setFixedDimensions(fixedDimensions) {
        this._fixedDimensions = fixedDimensions;
    }
    constructor(_persistentProcessId, _terminalProcess, workspaceId, workspaceName, shouldPersistTerminal, cols, rows, processLaunchOptions, unicodeVersion, reconnectConstants, _logService, reviveBuffer, rawReviveBuffer, _icon, _color, name, fixedDimensions) {
        super();
        this._persistentProcessId = _persistentProcessId;
        this._terminalProcess = _terminalProcess;
        this.workspaceId = workspaceId;
        this.workspaceName = workspaceName;
        this.shouldPersistTerminal = shouldPersistTerminal;
        this.processLaunchOptions = processLaunchOptions;
        this.unicodeVersion = unicodeVersion;
        this._logService = _logService;
        this._icon = _icon;
        this._color = _color;
        this._pendingCommands = new Map();
        this._isStarted = false;
        this._orphanRequestQueue = new Queue();
        this._onProcessReplay = this._register(new Emitter());
        this.onProcessReplay = this._onProcessReplay.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onPersistentProcessReady = this._register(new Emitter());
        /** Fired when the persistent process has a ready process and has finished its replay. */
        this.onPersistentProcessReady = this._onPersistentProcessReady.event;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessOrphanQuestion = this._register(new Emitter());
        this.onProcessOrphanQuestion = this._onProcessOrphanQuestion.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._inReplay = false;
        this._pid = -1;
        this._cwd = '';
        this._titleSource = TitleEventSource.Process;
        this._interactionState = new MutationLogger(`Persistent process "${this._persistentProcessId}" interaction state`, "None" /* InteractionState.None */, this._logService);
        this._wasRevived = reviveBuffer !== undefined;
        this._serializer = new XtermSerializer(cols, rows, reconnectConstants.scrollback, unicodeVersion, reviveBuffer, processLaunchOptions.options.shellIntegration.nonce, shouldPersistTerminal ? rawReviveBuffer : undefined, this._logService);
        if (name) {
            this.setTitle(name, TitleEventSource.Api);
        }
        this._fixedDimensions = fixedDimensions;
        this._orphanQuestionBarrier = null;
        this._orphanQuestionReplyTime = 0;
        this._disconnectRunner1 = this._register(new ProcessTimeRunOnceScheduler(() => {
            this._logService.info(`Persistent process "${this._persistentProcessId}": The reconnection grace time of ${printTime(reconnectConstants.graceTime)} has expired, shutting down pid "${this._pid}"`);
            this.shutdown(true);
        }, reconnectConstants.graceTime));
        this._disconnectRunner2 = this._register(new ProcessTimeRunOnceScheduler(() => {
            this._logService.info(`Persistent process "${this._persistentProcessId}": The short reconnection grace time of ${printTime(reconnectConstants.shortGraceTime)} has expired, shutting down pid ${this._pid}`);
            this.shutdown(true);
        }, reconnectConstants.shortGraceTime));
        this._register(this._terminalProcess.onProcessExit(() => this._bufferer.stopBuffering(this._persistentProcessId)));
        this._register(this._terminalProcess.onProcessReady((e) => {
            this._pid = e.pid;
            this._cwd = e.cwd;
            this._onProcessReady.fire(e);
        }));
        this._register(this._terminalProcess.onDidChangeProperty((e) => {
            this._onDidChangeProperty.fire(e);
        }));
        // Data buffering to reduce the amount of messages going to the renderer
        this._bufferer = new TerminalDataBufferer((_, data) => this._onProcessData.fire(data));
        this._register(this._bufferer.startBuffering(this._persistentProcessId, this._terminalProcess.onProcessData));
        // Data recording for reconnect
        this._register(this.onProcessData((e) => this._serializer.handleData(e)));
    }
    async attach() {
        if (!this._disconnectRunner1.isScheduled() && !this._disconnectRunner2.isScheduled()) {
            this._logService.warn(`Persistent process "${this._persistentProcessId}": Process had no disconnect runners but was an orphan`);
        }
        this._disconnectRunner1.cancel();
        this._disconnectRunner2.cancel();
    }
    async detach(forcePersist) {
        // Keep the process around if it was indicated to persist and it has had some iteraction or
        // was replayed
        if (this.shouldPersistTerminal &&
            (this._interactionState.value !== "None" /* InteractionState.None */ || forcePersist)) {
            this._disconnectRunner1.schedule();
        }
        else {
            this.shutdown(true);
        }
    }
    serializeNormalBuffer() {
        return this._serializer.generateReplayEvent(true, this._interactionState.value !== "Session" /* InteractionState.Session */);
    }
    async refreshProperty(type) {
        return this._terminalProcess.refreshProperty(type);
    }
    async updateProperty(type, value) {
        if (type === "fixedDimensions" /* ProcessPropertyType.FixedDimensions */) {
            return this._setFixedDimensions(value);
        }
    }
    async start() {
        if (!this._isStarted) {
            const result = await this._terminalProcess.start();
            if (result && 'message' in result) {
                // it's a terminal launch error
                return result;
            }
            this._isStarted = true;
            // If the process was revived, trigger a replay on first start. An alternative approach
            // could be to start it on the pty host before attaching but this fails on Windows as
            // conpty's inherit cursor option which is required, ends up sending DSR CPR which
            // causes conhost to hang when no response is received from the terminal (which wouldn't
            // be attached yet). https://github.com/microsoft/terminal/issues/11213
            if (this._wasRevived) {
                this.triggerReplay();
            }
            else {
                this._onPersistentProcessReady.fire();
            }
            return result;
        }
        this._onProcessReady.fire({
            pid: this._pid,
            cwd: this._cwd,
            windowsPty: this._terminalProcess.getWindowsPty(),
        });
        this._onDidChangeProperty.fire({
            type: "title" /* ProcessPropertyType.Title */,
            value: this._terminalProcess.currentTitle,
        });
        this._onDidChangeProperty.fire({
            type: "shellType" /* ProcessPropertyType.ShellType */,
            value: this._terminalProcess.shellType,
        });
        this.triggerReplay();
        return undefined;
    }
    shutdown(immediate) {
        return this._terminalProcess.shutdown(immediate);
    }
    input(data) {
        this._interactionState.setValue("Session" /* InteractionState.Session */, 'input');
        this._serializer.freeRawReviveBuffer();
        if (this._inReplay) {
            return;
        }
        return this._terminalProcess.input(data);
    }
    writeBinary(data) {
        return this._terminalProcess.processBinary(data);
    }
    resize(cols, rows) {
        if (this._inReplay) {
            return;
        }
        this._serializer.handleResize(cols, rows);
        // Buffered events should flush when a resize occurs
        this._bufferer.flushBuffer(this._persistentProcessId);
        return this._terminalProcess.resize(cols, rows);
    }
    async clearBuffer() {
        this._serializer.clearBuffer();
        this._terminalProcess.clearBuffer();
    }
    setUnicodeVersion(version) {
        this.unicodeVersion = version;
        this._serializer.setUnicodeVersion?.(version);
        // TODO: Pass in unicode version in ctor
    }
    acknowledgeDataEvent(charCount) {
        if (this._inReplay) {
            return;
        }
        return this._terminalProcess.acknowledgeDataEvent(charCount);
    }
    getInitialCwd() {
        return this._terminalProcess.getInitialCwd();
    }
    getCwd() {
        return this._terminalProcess.getCwd();
    }
    async triggerReplay() {
        if (this._interactionState.value === "None" /* InteractionState.None */) {
            this._interactionState.setValue("ReplayOnly" /* InteractionState.ReplayOnly */, 'triggerReplay');
        }
        const ev = await this._serializer.generateReplayEvent();
        let dataLength = 0;
        for (const e of ev.events) {
            dataLength += e.data.length;
        }
        this._logService.info(`Persistent process "${this._persistentProcessId}": Replaying ${dataLength} chars and ${ev.events.length} size events`);
        this._onProcessReplay.fire(ev);
        this._terminalProcess.clearUnacknowledgedChars();
        this._onPersistentProcessReady.fire();
    }
    sendCommandResult(reqId, isError, serializedPayload) {
        const data = this._pendingCommands.get(reqId);
        if (!data) {
            return;
        }
        this._pendingCommands.delete(reqId);
    }
    orphanQuestionReply() {
        this._orphanQuestionReplyTime = Date.now();
        if (this._orphanQuestionBarrier) {
            const barrier = this._orphanQuestionBarrier;
            this._orphanQuestionBarrier = null;
            barrier.open();
        }
    }
    reduceGraceTime() {
        if (this._disconnectRunner2.isScheduled()) {
            // we are disconnected and already running the short reconnection timer
            return;
        }
        if (this._disconnectRunner1.isScheduled()) {
            // we are disconnected and running the long reconnection timer
            this._disconnectRunner2.schedule();
        }
    }
    async isOrphaned() {
        return await this._orphanRequestQueue.queue(async () => this._isOrphaned());
    }
    async _isOrphaned() {
        // The process is already known to be orphaned
        if (this._disconnectRunner1.isScheduled() || this._disconnectRunner2.isScheduled()) {
            return true;
        }
        // Ask whether the renderer(s) whether the process is orphaned and await the reply
        if (!this._orphanQuestionBarrier) {
            // the barrier opens after 4 seconds with or without a reply
            this._orphanQuestionBarrier = new AutoOpenBarrier(4000);
            this._orphanQuestionReplyTime = 0;
            this._onProcessOrphanQuestion.fire();
        }
        await this._orphanQuestionBarrier.wait();
        return Date.now() - this._orphanQuestionReplyTime > 500;
    }
}
class MutationLogger {
    get value() {
        return this._value;
    }
    setValue(value, reason) {
        if (this._value !== value) {
            this._value = value;
            this._log(reason);
        }
    }
    constructor(_name, _value, _logService) {
        this._name = _name;
        this._value = _value;
        this._logService = _logService;
        this._log('initialized');
    }
    _log(reason) {
        this._logService.debug(`MutationLogger "${this._name}" set to "${this._value}", reason: ${reason}`);
    }
}
class XtermSerializer {
    constructor(cols, rows, scrollback, unicodeVersion, reviveBufferWithRestoreMessage, shellIntegrationNonce, _rawReviveBuffer, logService) {
        this._rawReviveBuffer = _rawReviveBuffer;
        this._xterm = new XtermTerminal({
            cols,
            rows,
            scrollback,
            allowProposedApi: true,
        });
        if (reviveBufferWithRestoreMessage) {
            this._xterm.writeln(reviveBufferWithRestoreMessage);
        }
        this.setUnicodeVersion(unicodeVersion);
        this._shellIntegrationAddon = new ShellIntegrationAddon(shellIntegrationNonce, true, undefined, logService);
        this._xterm.loadAddon(this._shellIntegrationAddon);
    }
    freeRawReviveBuffer() {
        // Free the memory of the terminal if it will need to be re-serialized
        this._rawReviveBuffer = undefined;
    }
    handleData(data) {
        this._xterm.write(data);
    }
    handleResize(cols, rows) {
        this._xterm.resize(cols, rows);
    }
    clearBuffer() {
        this._xterm.clear();
    }
    async generateReplayEvent(normalBufferOnly, restoreToLastReviveBuffer) {
        const serialize = new (await this._getSerializeConstructor())();
        this._xterm.loadAddon(serialize);
        const options = {
            scrollback: this._xterm.options.scrollback,
        };
        if (normalBufferOnly) {
            options.excludeAltBuffer = true;
            options.excludeModes = true;
        }
        let serialized;
        if (restoreToLastReviveBuffer && this._rawReviveBuffer) {
            serialized = this._rawReviveBuffer;
        }
        else {
            serialized = serialize.serialize(options);
        }
        return {
            events: [
                {
                    cols: this._xterm.cols,
                    rows: this._xterm.rows,
                    data: serialized,
                },
            ],
            commands: this._shellIntegrationAddon.serialize(),
        };
    }
    async setUnicodeVersion(version) {
        if (this._xterm.unicode.activeVersion === version) {
            return;
        }
        if (version === '11') {
            this._unicodeAddon = new (await this._getUnicode11Constructor())();
            this._xterm.loadAddon(this._unicodeAddon);
        }
        else {
            this._unicodeAddon?.dispose();
            this._unicodeAddon = undefined;
        }
        this._xterm.unicode.activeVersion = version;
    }
    async _getUnicode11Constructor() {
        if (!Unicode11Addon) {
            Unicode11Addon = (await import('@xterm/addon-unicode11')).Unicode11Addon;
        }
        return Unicode11Addon;
    }
    async _getSerializeConstructor() {
        if (!SerializeAddon) {
            SerializeAddon = (await import('@xterm/addon-serialize')).SerializeAddon;
        }
        return SerializeAddon;
    }
}
function printTime(ms) {
    let h = 0;
    let m = 0;
    let s = 0;
    if (ms >= 1000) {
        s = Math.floor(ms / 1000);
        ms -= s * 1000;
    }
    if (s >= 60) {
        m = Math.floor(s / 60);
        s -= m * 60;
    }
    if (m >= 60) {
        h = Math.floor(m / 60);
        m -= h * 60;
    }
    const _h = h ? `${h}h` : ``;
    const _m = m ? `${m}m` : ``;
    const _s = s ? `${s}s` : ``;
    const _ms = ms ? `${ms}ms` : ``;
    return `${_h}${_m}${_s}${_ms}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvcHR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sZUFBZSxFQUNmLDJCQUEyQixFQUMzQixRQUFRLEVBQ1IsS0FBSyxFQUNMLE9BQU8sR0FDUCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFFTixTQUFTLEVBRVQsRUFBRSxHQUNGLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBZSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEQsT0FBTyxFQWFOLGdCQUFnQixHQVVoQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBWXZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGtCQUFrQixF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