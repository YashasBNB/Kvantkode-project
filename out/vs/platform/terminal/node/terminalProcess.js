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
var TerminalProcess_1;
import * as fs from 'fs';
import { exec } from 'child_process';
import { timeout } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows, } from '../../../base/common/platform.js';
import { findExecutable } from '../../../base/node/processes.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService, LogLevel } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ChildProcessMonitor } from './childProcessMonitor.js';
import { getShellIntegrationInjection, getWindowsBuildNumber, } from './terminalEnvironment.js';
import { WindowsShellHelper } from './windowsShellHelper.js';
import { spawn } from 'node-pty';
import { chunkInput } from '../common/terminalProcess.js';
var ShutdownConstants;
(function (ShutdownConstants) {
    /**
     * The amount of ms that must pass between data events after exit is queued before the actual
     * kill call is triggered. This data flush mechanism works around an [issue in node-pty][1]
     * where not all data is flushed which causes problems for task problem matchers. Additionally
     * on Windows under conpty, killing a process while data is being output will cause the [conhost
     * flush to hang the pty host][2] because [conhost should be hosted on another thread][3].
     *
     * [1]: https://github.com/Tyriar/node-pty/issues/72
     * [2]: https://github.com/microsoft/vscode/issues/71966
     * [3]: https://github.com/microsoft/node-pty/pull/415
     */
    ShutdownConstants[ShutdownConstants["DataFlushTimeout"] = 250] = "DataFlushTimeout";
    /**
     * The maximum ms to allow after dispose is called because forcefully killing the process.
     */
    ShutdownConstants[ShutdownConstants["MaximumShutdownTime"] = 5000] = "MaximumShutdownTime";
})(ShutdownConstants || (ShutdownConstants = {}));
var Constants;
(function (Constants) {
    /**
     * The minimum duration between kill and spawn calls on Windows/conpty as a mitigation for a
     * hang issue. See:
     * - https://github.com/microsoft/vscode/issues/71966
     * - https://github.com/microsoft/vscode/issues/117956
     * - https://github.com/microsoft/vscode/issues/121336
     */
    Constants[Constants["KillSpawnThrottleInterval"] = 250] = "KillSpawnThrottleInterval";
    /**
     * The amount of time to wait when a call is throttled beyond the exact amount, this is used to
     * try prevent early timeouts causing a kill/spawn call to happen at double the regular
     * interval.
     */
    Constants[Constants["KillSpawnSpacingDuration"] = 50] = "KillSpawnSpacingDuration";
    /**
     * How long to wait between chunk writes.
     */
    Constants[Constants["WriteInterval"] = 5] = "WriteInterval";
})(Constants || (Constants = {}));
const posixShellTypeMap = new Map([
    ['bash', "bash" /* PosixShellType.Bash */],
    ['csh', "csh" /* PosixShellType.Csh */],
    ['fish', "fish" /* PosixShellType.Fish */],
    ['ksh', "ksh" /* PosixShellType.Ksh */],
    ['sh', "sh" /* PosixShellType.Sh */],
    ['zsh', "zsh" /* PosixShellType.Zsh */],
]);
const generalShellTypeMap = new Map([
    ['pwsh', "pwsh" /* GeneralShellType.PowerShell */],
    ['powershell', "pwsh" /* GeneralShellType.PowerShell */],
    ['python', "python" /* GeneralShellType.Python */],
    ['julia', "julia" /* GeneralShellType.Julia */],
    ['nu', "nu" /* GeneralShellType.NuShell */],
    ['node', "node" /* GeneralShellType.Node */],
]);
let TerminalProcess = class TerminalProcess extends Disposable {
    static { TerminalProcess_1 = this; }
    static { this._lastKillOrStart = 0; }
    get exitMessage() {
        return this._exitMessage;
    }
    get currentTitle() {
        return this._windowsShellHelper?.shellTitle || this._currentTitle;
    }
    get shellType() {
        return isWindows
            ? this._windowsShellHelper?.shellType
            : posixShellTypeMap.get(this._currentTitle) || generalShellTypeMap.get(this._currentTitle);
    }
    get hasChildProcesses() {
        return this._childProcessMonitor?.hasChildProcesses || false;
    }
    constructor(shellLaunchConfig, cwd, cols, rows, env, 
    /**
     * environment used for `findExecutable`
     */
    _executableEnv, _options, _logService, _productService) {
        super();
        this.shellLaunchConfig = shellLaunchConfig;
        this._executableEnv = _executableEnv;
        this._options = _options;
        this._logService = _logService;
        this._productService = _productService;
        this.id = 0;
        this.shouldPersist = false;
        this._properties = {
            cwd: '',
            initialCwd: '',
            fixedDimensions: { cols: undefined, rows: undefined },
            title: '',
            shellType: undefined,
            hasChildProcesses: true,
            resolvedShellLaunchConfig: {},
            overrideDimensions: undefined,
            failedShellIntegrationActivation: false,
            usedShellIntegrationInjection: undefined,
        };
        this._currentTitle = '';
        this._titleInterval = null;
        this._writeQueue = [];
        this._isPtyPaused = false;
        this._unacknowledgedCharCount = 0;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        let name;
        if (isWindows) {
            name = path.basename(this.shellLaunchConfig.executable || '');
        }
        else {
            // Using 'xterm-256color' here helps ensure that the majority of Linux distributions will use a
            // color prompt as defined in the default ~/.bashrc file.
            name = 'xterm-256color';
        }
        this._initialCwd = cwd;
        this._properties["initialCwd" /* ProcessPropertyType.InitialCwd */] = this._initialCwd;
        this._properties["cwd" /* ProcessPropertyType.Cwd */] = this._initialCwd;
        const useConpty = this._options.windowsEnableConpty &&
            process.platform === 'win32' &&
            getWindowsBuildNumber() >= 18309;
        const useConptyDll = useConpty && this._options.windowsUseConptyDll;
        this._ptyOptions = {
            name,
            cwd,
            // TODO: When node-pty is updated this cast can be removed
            env: env,
            cols,
            rows,
            useConpty,
            useConptyDll,
            // This option will force conpty to not redraw the whole viewport on launch
            conptyInheritCursor: useConpty && !!shellLaunchConfig.initialText,
        };
        // Delay resizes to avoid conpty not respecting very early resize calls
        if (isWindows) {
            if (useConpty &&
                cols === 0 &&
                rows === 0 &&
                this.shellLaunchConfig.executable?.endsWith('Git\\bin\\bash.exe')) {
                this._delayedResizer = new DelayedResizer();
                this._register(this._delayedResizer.onTrigger((dimensions) => {
                    this._delayedResizer?.dispose();
                    this._delayedResizer = undefined;
                    if (dimensions.cols && dimensions.rows) {
                        this.resize(dimensions.cols, dimensions.rows);
                    }
                }));
            }
            // WindowsShellHelper is used to fetch the process title and shell type
            this.onProcessReady((e) => {
                this._windowsShellHelper = this._register(new WindowsShellHelper(e.pid));
                this._register(this._windowsShellHelper.onShellTypeChanged((e) => this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: e })));
                this._register(this._windowsShellHelper.onShellNameChanged((e) => this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: e })));
            });
        }
        this._register(toDisposable(() => {
            if (this._titleInterval) {
                clearInterval(this._titleInterval);
                this._titleInterval = null;
            }
        }));
    }
    async start() {
        const results = await Promise.all([this._validateCwd(), this._validateExecutable()]);
        const firstError = results.find((r) => r !== undefined);
        if (firstError) {
            return firstError;
        }
        let injection;
        if (this._options.shellIntegration.enabled) {
            injection = await getShellIntegrationInjection(this.shellLaunchConfig, this._options, this._ptyOptions.env, this._logService, this._productService);
            if (injection) {
                this._onDidChangeProperty.fire({
                    type: "usedShellIntegrationInjection" /* ProcessPropertyType.UsedShellIntegrationInjection */,
                    value: true,
                });
                if (injection.envMixin) {
                    for (const [key, value] of Object.entries(injection.envMixin)) {
                        this._ptyOptions.env ||= {};
                        this._ptyOptions.env[key] = value;
                    }
                }
                if (injection.filesToCopy) {
                    for (const f of injection.filesToCopy) {
                        try {
                            await fs.promises.mkdir(path.dirname(f.dest), { recursive: true });
                            await fs.promises.copyFile(f.source, f.dest);
                        }
                        catch {
                            // Swallow error, this should only happen when multiple users are on the same
                            // machine. Since the shell integration scripts rarely change, plus the other user
                            // should be using the same version of the server in this case, assume the script is
                            // fine if copy fails and swallow the error.
                        }
                    }
                }
            }
            else {
                this._onDidChangeProperty.fire({
                    type: "failedShellIntegrationActivation" /* ProcessPropertyType.FailedShellIntegrationActivation */,
                    value: true,
                });
            }
        }
        try {
            await this.setupPtyProcess(this.shellLaunchConfig, this._ptyOptions, injection);
            if (injection?.newArgs) {
                return { injectedArgs: injection.newArgs };
            }
            return undefined;
        }
        catch (err) {
            this._logService.trace('node-pty.node-pty.IPty#spawn native exception', err);
            return { message: `A native exception occurred during launch (${err.message})` };
        }
    }
    async _validateCwd() {
        try {
            const result = await fs.promises.stat(this._initialCwd);
            if (!result.isDirectory()) {
                return {
                    message: localize('launchFail.cwdNotDirectory', 'Starting directory (cwd) "{0}" is not a directory', this._initialCwd.toString()),
                };
            }
        }
        catch (err) {
            if (err?.code === 'ENOENT') {
                return {
                    message: localize('launchFail.cwdDoesNotExist', 'Starting directory (cwd) "{0}" does not exist', this._initialCwd.toString()),
                };
            }
        }
        this._onDidChangeProperty.fire({
            type: "initialCwd" /* ProcessPropertyType.InitialCwd */,
            value: this._initialCwd,
        });
        return undefined;
    }
    async _validateExecutable() {
        const slc = this.shellLaunchConfig;
        if (!slc.executable) {
            throw new Error('IShellLaunchConfig.executable not set');
        }
        const cwd = slc.cwd instanceof URI ? slc.cwd.path : slc.cwd;
        const envPaths = slc.env && slc.env.PATH ? slc.env.PATH.split(path.delimiter) : undefined;
        const executable = await findExecutable(slc.executable, cwd, envPaths, this._executableEnv);
        if (!executable) {
            return {
                message: localize('launchFail.executableDoesNotExist', 'Path to shell executable "{0}" does not exist', slc.executable),
            };
        }
        try {
            const result = await fs.promises.stat(executable);
            if (!result.isFile() && !result.isSymbolicLink()) {
                return {
                    message: localize('launchFail.executableIsNotFileOrSymlink', 'Path to shell executable "{0}" is not a file or a symlink', slc.executable),
                };
            }
            // Set the executable explicitly here so that node-pty doesn't need to search the
            // $PATH too.
            slc.executable = executable;
        }
        catch (err) {
            if (err?.code === 'EACCES') {
                // Swallow
            }
            else {
                throw err;
            }
        }
        return undefined;
    }
    async setupPtyProcess(shellLaunchConfig, options, shellIntegrationInjection) {
        const args = shellIntegrationInjection?.newArgs || shellLaunchConfig.args || [];
        await this._throttleKillSpawn();
        this._logService.trace('node-pty.IPty#spawn', shellLaunchConfig.executable, args, options);
        const ptyProcess = spawn(shellLaunchConfig.executable, args, options);
        this._ptyProcess = ptyProcess;
        this._childProcessMonitor = this._register(new ChildProcessMonitor(ptyProcess.pid, this._logService));
        this._childProcessMonitor.onDidChangeHasChildProcesses((value) => this._onDidChangeProperty.fire({ type: "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */, value }));
        this._processStartupComplete = new Promise((c) => {
            this.onProcessReady(() => c());
        });
        ptyProcess.onData((data) => {
            // Handle flow control
            this._unacknowledgedCharCount += data.length;
            if (!this._isPtyPaused &&
                this._unacknowledgedCharCount > 100000 /* FlowControlConstants.HighWatermarkChars */) {
                this._logService.trace(`Flow control: Pause (${this._unacknowledgedCharCount} > ${100000 /* FlowControlConstants.HighWatermarkChars */})`);
                this._isPtyPaused = true;
                ptyProcess.pause();
            }
            // Refire the data event
            this._logService.trace('node-pty.IPty#onData', data);
            this._onProcessData.fire(data);
            if (this._closeTimeout) {
                this._queueProcessExit();
            }
            this._windowsShellHelper?.checkShell();
            this._childProcessMonitor?.handleOutput();
        });
        ptyProcess.onExit((e) => {
            this._exitCode = e.exitCode;
            this._queueProcessExit();
        });
        this._sendProcessId(ptyProcess.pid);
        this._setupTitlePolling(ptyProcess);
    }
    _setupTitlePolling(ptyProcess) {
        // Send initial timeout async to give event listeners a chance to init
        setTimeout(() => this._sendProcessTitle(ptyProcess));
        // Setup polling for non-Windows, for Windows `process` doesn't change
        if (!isWindows) {
            this._titleInterval = setInterval(() => {
                if (this._currentTitle !== ptyProcess.process) {
                    this._sendProcessTitle(ptyProcess);
                }
            }, 200);
        }
    }
    // Allow any trailing data events to be sent before the exit event is sent.
    // See https://github.com/Tyriar/node-pty/issues/72
    _queueProcessExit() {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#_queueProcessExit', new Error().stack?.replace(/^Error/, ''));
        }
        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
        }
        this._closeTimeout = setTimeout(() => {
            this._closeTimeout = undefined;
            this._kill();
        }, 250 /* ShutdownConstants.DataFlushTimeout */);
    }
    async _kill() {
        // Wait to kill to process until the start up code has run. This prevents us from firing a process exit before a
        // process start.
        await this._processStartupComplete;
        if (this._store.isDisposed) {
            return;
        }
        // Attempt to kill the pty, it may have already been killed at this
        // point but we want to make sure
        try {
            if (this._ptyProcess) {
                await this._throttleKillSpawn();
                this._logService.trace('node-pty.IPty#kill');
                this._ptyProcess.kill();
            }
        }
        catch (ex) {
            // Swallow, the pty has already been killed
        }
        this._onProcessExit.fire(this._exitCode || 0);
        this.dispose();
    }
    async _throttleKillSpawn() {
        // Only throttle on Windows/conpty
        if (!isWindows || !('useConpty' in this._ptyOptions) || !this._ptyOptions.useConpty) {
            return;
        }
        // Don't throttle when using conpty.dll as it seems to have been fixed in later versions
        if (this._ptyOptions.useConptyDll) {
            return;
        }
        // Use a loop to ensure multiple calls in a single interval space out
        while (Date.now() - TerminalProcess_1._lastKillOrStart < 250 /* Constants.KillSpawnThrottleInterval */) {
            this._logService.trace('Throttling kill/spawn call');
            await timeout(250 /* Constants.KillSpawnThrottleInterval */ -
                (Date.now() - TerminalProcess_1._lastKillOrStart) +
                50 /* Constants.KillSpawnSpacingDuration */);
        }
        TerminalProcess_1._lastKillOrStart = Date.now();
    }
    _sendProcessId(pid) {
        this._onProcessReady.fire({
            pid,
            cwd: this._initialCwd,
            windowsPty: this.getWindowsPty(),
        });
    }
    _sendProcessTitle(ptyProcess) {
        if (this._store.isDisposed) {
            return;
        }
        // HACK: The node-pty API can return undefined somehow https://github.com/microsoft/vscode/issues/222323
        this._currentTitle = ptyProcess.process ?? '';
        this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: this._currentTitle });
        // If fig is installed it may change the title of the process
        let sanitizedTitle = this.currentTitle.replace(/ \(figterm\)$/g, '');
        // Ensure any prefixed path is removed so that the executable name since we use this to
        // detect the shell type
        if (!isWindows) {
            sanitizedTitle = path.basename(sanitizedTitle);
        }
        if (sanitizedTitle.toLowerCase().startsWith('python')) {
            this._onDidChangeProperty.fire({
                type: "shellType" /* ProcessPropertyType.ShellType */,
                value: "python" /* GeneralShellType.Python */,
            });
        }
        else if (sanitizedTitle.toLowerCase().startsWith('julia')) {
            this._onDidChangeProperty.fire({
                type: "shellType" /* ProcessPropertyType.ShellType */,
                value: "julia" /* GeneralShellType.Julia */,
            });
        }
        else {
            const shellTypeValue = posixShellTypeMap.get(sanitizedTitle) || generalShellTypeMap.get(sanitizedTitle);
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: shellTypeValue });
        }
    }
    shutdown(immediate) {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#shutdown', new Error().stack?.replace(/^Error/, ''));
        }
        // don't force immediate disposal of the terminal processes on Windows as an additional
        // mitigation for https://github.com/microsoft/vscode/issues/71966 which causes the pty host
        // to become unresponsive, disconnecting all terminals across all windows.
        if (immediate && !isWindows) {
            this._kill();
        }
        else {
            if (!this._closeTimeout && !this._store.isDisposed) {
                this._queueProcessExit();
                // Allow a maximum amount of time for the process to exit, otherwise force kill it
                setTimeout(() => {
                    if (this._closeTimeout && !this._store.isDisposed) {
                        this._closeTimeout = undefined;
                        this._kill();
                    }
                }, 5000 /* ShutdownConstants.MaximumShutdownTime */);
            }
        }
    }
    input(data, isBinary = false) {
        if (this._store.isDisposed || !this._ptyProcess) {
            return;
        }
        this._writeQueue.push(...chunkInput(data).map((e) => {
            return { isBinary, data: e };
        }));
        this._startWrite();
    }
    async processBinary(data) {
        this.input(data, true);
    }
    async refreshProperty(type) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */: {
                const newCwd = await this.getCwd();
                if (newCwd !== this._properties.cwd) {
                    this._properties.cwd = newCwd;
                    this._onDidChangeProperty.fire({
                        type: "cwd" /* ProcessPropertyType.Cwd */,
                        value: this._properties.cwd,
                    });
                }
                return newCwd;
            }
            case "initialCwd" /* ProcessPropertyType.InitialCwd */: {
                const initialCwd = await this.getInitialCwd();
                if (initialCwd !== this._properties.initialCwd) {
                    this._properties.initialCwd = initialCwd;
                    this._onDidChangeProperty.fire({
                        type: "initialCwd" /* ProcessPropertyType.InitialCwd */,
                        value: this._properties.initialCwd,
                    });
                }
                return initialCwd;
            }
            case "title" /* ProcessPropertyType.Title */:
                return this.currentTitle;
            default:
                return this.shellType;
        }
    }
    async updateProperty(type, value) {
        if (type === "fixedDimensions" /* ProcessPropertyType.FixedDimensions */) {
            this._properties.fixedDimensions =
                value;
        }
    }
    _startWrite() {
        // Don't write if it's already queued of is there is nothing to write
        if (this._writeTimeout !== undefined || this._writeQueue.length === 0) {
            return;
        }
        this._doWrite();
        // Don't queue more writes if the queue is empty
        if (this._writeQueue.length === 0) {
            this._writeTimeout = undefined;
            return;
        }
        // Queue the next write
        this._writeTimeout = setTimeout(() => {
            this._writeTimeout = undefined;
            this._startWrite();
        }, 5 /* Constants.WriteInterval */);
    }
    _doWrite() {
        const object = this._writeQueue.shift();
        this._logService.trace('node-pty.IPty#write', object.data);
        if (object.isBinary) {
            this._ptyProcess.write(Buffer.from(object.data, 'binary'));
        }
        else {
            this._ptyProcess.write(object.data);
        }
        this._childProcessMonitor?.handleInput();
    }
    resize(cols, rows) {
        if (this._store.isDisposed) {
            return;
        }
        if (typeof cols !== 'number' || typeof rows !== 'number' || isNaN(cols) || isNaN(rows)) {
            return;
        }
        // Ensure that cols and rows are always >= 1, this prevents a native
        // exception in winpty.
        if (this._ptyProcess) {
            cols = Math.max(cols, 1);
            rows = Math.max(rows, 1);
            // Delay resize if needed
            if (this._delayedResizer) {
                this._delayedResizer.cols = cols;
                this._delayedResizer.rows = rows;
                return;
            }
            this._logService.trace('node-pty.IPty#resize', cols, rows);
            try {
                this._ptyProcess.resize(cols, rows);
            }
            catch (e) {
                // Swallow error if the pty has already exited
                this._logService.trace('node-pty.IPty#resize exception ' + e.message);
                if (this._exitCode !== undefined &&
                    e.message !== 'ioctl(2) failed, EBADF' &&
                    e.message !== 'Cannot resize a pty that has already exited') {
                    throw e;
                }
            }
        }
    }
    clearBuffer() {
        this._ptyProcess?.clear();
    }
    acknowledgeDataEvent(charCount) {
        // Prevent lower than 0 to heal from errors
        this._unacknowledgedCharCount = Math.max(this._unacknowledgedCharCount - charCount, 0);
        this._logService.trace(`Flow control: Ack ${charCount} chars (unacknowledged: ${this._unacknowledgedCharCount})`);
        if (this._isPtyPaused &&
            this._unacknowledgedCharCount < 5000 /* FlowControlConstants.LowWatermarkChars */) {
            this._logService.trace(`Flow control: Resume (${this._unacknowledgedCharCount} < ${5000 /* FlowControlConstants.LowWatermarkChars */})`);
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    clearUnacknowledgedChars() {
        this._unacknowledgedCharCount = 0;
        this._logService.trace(`Flow control: Cleared all unacknowledged chars, forcing resume`);
        if (this._isPtyPaused) {
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    async setUnicodeVersion(version) {
        // No-op
    }
    getInitialCwd() {
        return Promise.resolve(this._initialCwd);
    }
    async getCwd() {
        if (isMacintosh) {
            // From Big Sur (darwin v20) there is a spawn blocking thread issue on Electron,
            // this is fixed in VS Code's internal Electron.
            // https://github.com/Microsoft/vscode/issues/105446
            return new Promise((resolve) => {
                if (!this._ptyProcess) {
                    resolve(this._initialCwd);
                    return;
                }
                this._logService.trace('node-pty.IPty#pid');
                exec('lsof -OPln -p ' + this._ptyProcess.pid + ' | grep cwd', { env: { ...process.env, LANG: 'en_US.UTF-8' } }, (error, stdout, stderr) => {
                    if (!error && stdout !== '') {
                        resolve(stdout.substring(stdout.indexOf('/'), stdout.length - 1));
                    }
                    else {
                        this._logService.error('lsof did not run successfully, it may not be on the $PATH?', error, stdout, stderr);
                        resolve(this._initialCwd);
                    }
                });
            });
        }
        if (isLinux) {
            if (!this._ptyProcess) {
                return this._initialCwd;
            }
            this._logService.trace('node-pty.IPty#pid');
            try {
                return await fs.promises.readlink(`/proc/${this._ptyProcess.pid}/cwd`);
            }
            catch (error) {
                return this._initialCwd;
            }
        }
        return this._initialCwd;
    }
    getWindowsPty() {
        return isWindows
            ? {
                backend: 'useConpty' in this._ptyOptions && this._ptyOptions.useConpty ? 'conpty' : 'winpty',
                buildNumber: getWindowsBuildNumber(),
            }
            : undefined;
    }
};
TerminalProcess = TerminalProcess_1 = __decorate([
    __param(7, ILogService),
    __param(8, IProductService)
], TerminalProcess);
export { TerminalProcess };
/**
 * Tracks the latest resize event to be trigger at a later point.
 */
class DelayedResizer extends Disposable {
    get onTrigger() {
        return this._onTrigger.event;
    }
    constructor() {
        super();
        this._onTrigger = this._register(new Emitter());
        this._timeout = setTimeout(() => {
            this._onTrigger.fire({ rows: this.rows, cols: this.cols });
        }, 1000);
        this._register(toDisposable(() => clearTimeout(this._timeout)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvbm9kZS90ZXJtaW5hbFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDcEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUVOLE9BQU8sRUFDUCxXQUFXLEVBQ1gsU0FBUyxHQUNULE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFnQnhFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIscUJBQXFCLEdBRXJCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7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