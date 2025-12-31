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
var UtilityProcess_1;
import { MessageChannelMain, app, utilityProcess, } from 'electron';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { ILogService } from '../../log/common/log.js';
import { StringDecoder } from 'string_decoder';
import { timeout } from '../../../base/common/async.js';
import { FileAccess } from '../../../base/common/network.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import Severity from '../../../base/common/severity.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { removeDangerousEnvVariables } from '../../../base/common/processes.js';
import { deepClone } from '../../../base/common/objects.js';
import { isWindows } from '../../../base/common/platform.js';
import { isUNCAccessRestrictionsDisabled, getUNCHostAllowlist } from '../../../base/node/unc.js';
function isWindowUtilityProcessConfiguration(config) {
    const candidate = config;
    return typeof candidate.responseWindowId === 'number';
}
let UtilityProcess = class UtilityProcess extends Disposable {
    static { UtilityProcess_1 = this; }
    static { this.ID_COUNTER = 0; }
    static { this.all = new Map(); }
    static getAll() {
        return Array.from(UtilityProcess_1.all.values());
    }
    constructor(logService, telemetryService, lifecycleMainService) {
        super();
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.lifecycleMainService = lifecycleMainService;
        this.id = String(++UtilityProcess_1.ID_COUNTER);
        this._onStdout = this._register(new Emitter());
        this.onStdout = this._onStdout.event;
        this._onStderr = this._register(new Emitter());
        this.onStderr = this._onStderr.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onSpawn = this._register(new Emitter());
        this.onSpawn = this._onSpawn.event;
        this._onExit = this._register(new Emitter());
        this.onExit = this._onExit.event;
        this._onCrash = this._register(new Emitter());
        this.onCrash = this._onCrash.event;
        this.process = undefined;
        this.processPid = undefined;
        this.configuration = undefined;
    }
    log(msg, severity) {
        let logMsg;
        if (this.configuration?.correlationId) {
            logMsg = `[UtilityProcess id: ${this.configuration?.correlationId}, type: ${this.configuration?.type}, pid: ${this.processPid ?? '<none>'}]: ${msg}`;
        }
        else {
            logMsg = `[UtilityProcess type: ${this.configuration?.type}, pid: ${this.processPid ?? '<none>'}]: ${msg}`;
        }
        switch (severity) {
            case Severity.Error:
                this.logService.error(logMsg);
                break;
            case Severity.Warning:
                this.logService.warn(logMsg);
                break;
            case Severity.Info:
                this.logService.trace(logMsg);
                break;
        }
    }
    validateCanStart() {
        if (this.process) {
            this.log('Cannot start utility process because it is already running...', Severity.Error);
            return false;
        }
        return true;
    }
    start(configuration) {
        const started = this.doStart(configuration);
        if (started && configuration.payload) {
            const posted = this.postMessage(configuration.payload);
            if (posted) {
                this.log('payload sent via postMessage()', Severity.Info);
            }
        }
        return started;
    }
    doStart(configuration) {
        if (!this.validateCanStart()) {
            return false;
        }
        this.configuration = configuration;
        const serviceName = `${this.configuration.type}-${this.id}`;
        const modulePath = FileAccess.asFileUri('bootstrap-fork.js').fsPath;
        const args = this.configuration.args ?? [];
        const execArgv = this.configuration.execArgv ?? [];
        const allowLoadingUnsignedLibraries = this.configuration.allowLoadingUnsignedLibraries;
        const respondToAuthRequestsFromMainProcess = this.configuration.respondToAuthRequestsFromMainProcess;
        const stdio = 'pipe';
        const env = this.createEnv(configuration);
        this.log('creating new...', Severity.Info);
        // Fork utility process
        this.process = utilityProcess.fork(modulePath, args, {
            serviceName,
            env,
            execArgv, // !!! Add `--trace-warnings` for node.js tracing !!!
            allowLoadingUnsignedLibraries,
            respondToAuthRequestsFromMainProcess,
            stdio,
        });
        // Register to events
        this.registerListeners(this.process, this.configuration, serviceName);
        return true;
    }
    createEnv(configuration) {
        const env = configuration.env
            ? { ...configuration.env }
            : { ...deepClone(process.env) };
        // Apply supported environment variables from config
        env['VSCODE_ESM_ENTRYPOINT'] = configuration.entryPoint;
        if (typeof configuration.parentLifecycleBound === 'number') {
            env['VSCODE_PARENT_PID'] = String(configuration.parentLifecycleBound);
        }
        env['VSCODE_CRASH_REPORTER_PROCESS_TYPE'] = configuration.type;
        if (isWindows) {
            if (isUNCAccessRestrictionsDisabled()) {
                env['NODE_DISABLE_UNC_ACCESS_CHECKS'] = '1';
            }
            else {
                env['NODE_UNC_HOST_ALLOWLIST'] = getUNCHostAllowlist().join('\\');
            }
        }
        // Remove any environment variables that are not allowed
        removeDangerousEnvVariables(env);
        // Ensure all values are strings, otherwise the process will not start
        for (const key of Object.keys(env)) {
            env[key] = String(env[key]);
        }
        return env;
    }
    registerListeners(process, configuration, serviceName) {
        // Stdout
        if (process.stdout) {
            const stdoutDecoder = new StringDecoder('utf-8');
            this._register(Event.fromNodeEventEmitter(process.stdout, 'data')((chunk) => this._onStdout.fire(typeof chunk === 'string' ? chunk : stdoutDecoder.write(chunk))));
        }
        // Stderr
        if (process.stderr) {
            const stderrDecoder = new StringDecoder('utf-8');
            this._register(Event.fromNodeEventEmitter(process.stderr, 'data')((chunk) => this._onStderr.fire(typeof chunk === 'string' ? chunk : stderrDecoder.write(chunk))));
        }
        // Messages
        this._register(Event.fromNodeEventEmitter(process, 'message')((msg) => this._onMessage.fire(msg)));
        // Spawn
        this._register(Event.fromNodeEventEmitter(process, 'spawn')(() => {
            this.processPid = process.pid;
            if (typeof process.pid === 'number') {
                UtilityProcess_1.all.set(process.pid, {
                    pid: process.pid,
                    name: isWindowUtilityProcessConfiguration(configuration)
                        ? `${configuration.type} [${configuration.responseWindowId}]`
                        : configuration.type,
                });
            }
            this.log('successfully created', Severity.Info);
            this._onSpawn.fire(process.pid);
        }));
        // Exit
        this._register(Event.fromNodeEventEmitter(process, 'exit')((code) => {
            this.log(`received exit event with code ${code}`, Severity.Info);
            // Event
            this._onExit.fire({ pid: this.processPid, code, signal: 'unknown' });
            // Cleanup
            this.onDidExitOrCrashOrKill();
        }));
        // V8 Error
        this._register(Event.fromNodeEventEmitter(process, 'error', (type, location, report) => ({
            type,
            location,
            report,
        }))(({ type, location, report }) => {
            this.log(`crashed due to ${type} from V8 at ${location}`, Severity.Info);
            let addons = [];
            try {
                const reportJSON = JSON.parse(report);
                addons = reportJSON.sharedObjects
                    .filter((sharedObject) => sharedObject.endsWith('.node'))
                    .map((addon) => {
                    const index = addon.indexOf('extensions') === -1
                        ? addon.indexOf('node_modules')
                        : addon.indexOf('extensions');
                    return addon.substring(index);
                });
            }
            catch (e) {
                // ignore
            }
            this.telemetryService.publicLog2('utilityprocessv8error', {
                processtype: configuration.type,
                error: type,
                location,
                addons,
            });
        }));
        // Child process gone
        this._register(Event.fromNodeEventEmitter(app, 'child-process-gone', (event, details) => ({ event, details }))(({ details }) => {
            if (details.type === 'Utility' && details.name === serviceName) {
                this.log(`crashed with code ${details.exitCode} and reason '${details.reason}'`, Severity.Error);
                this.telemetryService.publicLog2('utilityprocesscrash', {
                    type: configuration.type,
                    reason: details.reason,
                    code: details.exitCode,
                });
                // Event
                this._onCrash.fire({
                    pid: this.processPid,
                    code: details.exitCode,
                    reason: details.reason,
                });
                // Cleanup
                this.onDidExitOrCrashOrKill();
            }
        }));
    }
    once(message, callback) {
        const disposable = this._register(this._onMessage.event((msg) => {
            if (msg === message) {
                disposable.dispose();
                callback();
            }
        }));
    }
    postMessage(message, transfer) {
        if (!this.process) {
            return false; // already killed, crashed or never started
        }
        this.process.postMessage(message, transfer);
        return true;
    }
    connect(payload) {
        const { port1: outPort, port2: utilityProcessPort } = new MessageChannelMain();
        this.postMessage(payload, [utilityProcessPort]);
        return outPort;
    }
    enableInspectPort() {
        if (!this.process || typeof this.processPid !== 'number') {
            return false;
        }
        this.log('enabling inspect port', Severity.Info);
        // use (undocumented) _debugProcess feature of node if available
        const processExt = process;
        if (typeof processExt._debugProcess === 'function') {
            processExt._debugProcess(this.processPid);
            return true;
        }
        // not supported...
        return false;
    }
    kill() {
        if (!this.process) {
            return; // already killed, crashed or never started
        }
        this.log('attempting to kill the process...', Severity.Info);
        const killed = this.process.kill();
        if (killed) {
            this.log('successfully killed the process', Severity.Info);
            this.onDidExitOrCrashOrKill();
        }
        else {
            this.log('unable to kill the process', Severity.Warning);
        }
    }
    onDidExitOrCrashOrKill() {
        if (typeof this.processPid === 'number') {
            UtilityProcess_1.all.delete(this.processPid);
        }
        this.process = undefined;
    }
    async waitForExit(maxWaitTimeMs) {
        if (!this.process) {
            return; // already killed, crashed or never started
        }
        this.log('waiting to exit...', Severity.Info);
        await Promise.race([Event.toPromise(this.onExit), timeout(maxWaitTimeMs)]);
        if (this.process) {
            this.log(`did not exit within ${maxWaitTimeMs}ms, will kill it now...`, Severity.Info);
            this.kill();
        }
    }
};
UtilityProcess = UtilityProcess_1 = __decorate([
    __param(0, ILogService),
    __param(1, ITelemetryService),
    __param(2, ILifecycleMainService)
], UtilityProcess);
export { UtilityProcess };
let WindowUtilityProcess = class WindowUtilityProcess extends UtilityProcess {
    constructor(logService, windowsMainService, telemetryService, lifecycleMainService) {
        super(logService, telemetryService, lifecycleMainService);
        this.windowsMainService = windowsMainService;
    }
    start(configuration) {
        const responseWindow = this.windowsMainService.getWindowById(configuration.responseWindowId);
        if (!responseWindow?.win ||
            responseWindow.win.isDestroyed() ||
            responseWindow.win.webContents.isDestroyed()) {
            this.log('Refusing to start utility process because requesting window cannot be found or is destroyed...', Severity.Error);
            return true;
        }
        // Start utility process
        const started = super.doStart(configuration);
        if (!started) {
            return false;
        }
        // Register to window events
        this.registerWindowListeners(responseWindow.win, configuration);
        // Establish & exchange message ports
        const windowPort = this.connect(configuration.payload);
        responseWindow.win.webContents.postMessage(configuration.responseChannel, configuration.responseNonce, [windowPort]);
        return true;
    }
    registerWindowListeners(window, configuration) {
        // If the lifecycle of the utility process is bound to the window,
        // we kill the process if the window closes or changes
        if (configuration.windowLifecycleBound) {
            this._register(Event.filter(this.lifecycleMainService.onWillLoadWindow, (e) => e.window.win === window)(() => this.kill()));
            this._register(Event.fromNodeEventEmitter(window, 'closed')(() => this.kill()));
        }
    }
};
WindowUtilityProcess = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, ITelemetryService),
    __param(3, ILifecycleMainService)
], WindowUtilityProcess);
export { WindowUtilityProcess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91dGlsaXR5UHJvY2Vzcy9lbGVjdHJvbi1tYWluL3V0aWxpdHlQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBR04sa0JBQWtCLEVBQ2xCLEdBQUcsRUFDSCxjQUFjLEdBRWQsTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLCtCQUErQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJB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