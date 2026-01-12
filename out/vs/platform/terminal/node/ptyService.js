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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS9wdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQzlDLE9BQU8sRUFDTixlQUFlLEVBQ2YsMkJBQTJCLEVBQzNCLFFBQVEsRUFDUixLQUFLLEVBQ0wsT0FBTyxHQUNQLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUVOLFNBQVMsRUFFVCxFQUFFLEdBQ0YsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUFlLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBYU4sZ0JBQWdCLEdBVWhCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFZdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsa0JB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