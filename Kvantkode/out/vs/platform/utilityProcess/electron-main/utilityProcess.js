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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eVByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3V0aWxpdHlQcm9jZXNzL2VsZWN0cm9uLW1haW4vdXRpbGl0eVByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTixrQkFBa0IsRUFDbEIsR0FBRyxFQUNILGNBQWMsR0FFZCxNQUFNLFVBQVUsQ0FBQTtBQUNqQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUUsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQTZFaEcsU0FBUyxtQ0FBbUMsQ0FDM0MsTUFBb0M7SUFFcEMsTUFBTSxTQUFTLEdBQUcsTUFBNEMsQ0FBQTtJQUU5RCxPQUFPLE9BQU8sU0FBUyxDQUFDLGdCQUFnQixLQUFLLFFBQVEsQ0FBQTtBQUN0RCxDQUFDO0FBeUNNLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVOzthQUM5QixlQUFVLEdBQUcsQ0FBQyxBQUFKLENBQUk7YUFFTCxRQUFHLEdBQUcsSUFBSSxHQUFHLEVBQStCLEFBQXpDLENBQXlDO0lBQ3BFLE1BQU0sQ0FBQyxNQUFNO1FBQ1osT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQTBCRCxZQUNjLFVBQXdDLEVBQ2xDLGdCQUFvRCxFQUNoRCxvQkFBOEQ7UUFFckYsS0FBSyxFQUFFLENBQUE7UUFKdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNqQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQzdCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUEzQnJFLE9BQUUsR0FBRyxNQUFNLENBQUMsRUFBRSxnQkFBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRXhDLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUN6RCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUE7UUFFdkIsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQ3pELGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQTtRQUV2QixlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDM0QsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRXpCLGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFDcEUsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBRXJCLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE0QixDQUFDLENBQUE7UUFDekUsV0FBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO1FBRW5CLGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUE2QixDQUFDLENBQUE7UUFDM0UsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBRTlCLFlBQU8sR0FBdUMsU0FBUyxDQUFBO1FBQ3ZELGVBQVUsR0FBdUIsU0FBUyxDQUFBO1FBQzFDLGtCQUFhLEdBQTZDLFNBQVMsQ0FBQTtJQVEzRSxDQUFDO0lBRVMsR0FBRyxDQUFDLEdBQVcsRUFBRSxRQUFrQjtRQUM1QyxJQUFJLE1BQWMsQ0FBQTtRQUNsQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLENBQUM7WUFDdkMsTUFBTSxHQUFHLHVCQUF1QixJQUFJLENBQUMsYUFBYSxFQUFFLGFBQWEsV0FBVyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxJQUFJLFFBQVEsTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNySixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyx5QkFBeUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLFVBQVUsSUFBSSxDQUFDLFVBQVUsSUFBSSxRQUFRLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDM0csQ0FBQztRQUVELFFBQVEsUUFBUSxFQUFFLENBQUM7WUFDbEIsS0FBSyxRQUFRLENBQUMsS0FBSztnQkFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzdCLE1BQUs7WUFDTixLQUFLLFFBQVEsQ0FBQyxPQUFPO2dCQUNwQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUIsTUFBSztZQUNOLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2pCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QixNQUFLO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQywrREFBK0QsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFekYsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQTJDO1FBQ2hELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFM0MsSUFBSSxPQUFPLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFUyxPQUFPLENBQUMsYUFBMkM7UUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFFbEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUE7UUFDM0QsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNuRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUE7UUFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFBO1FBQ2xELE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQTtRQUN0RixNQUFNLG9DQUFvQyxHQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLG9DQUFvQyxDQUFBO1FBQ3hELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQTtRQUNwQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTFDLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRTtZQUNwRCxXQUFXO1lBQ1gsR0FBRztZQUNILFFBQVEsRUFBRSxxREFBcUQ7WUFDL0QsNkJBQTZCO1lBQzdCLG9DQUFvQztZQUNwQyxLQUFLO1NBQ0wsQ0FBQyxDQUFBO1FBRUYscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFckUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sU0FBUyxDQUFDLGFBQTJDO1FBQzVELE1BQU0sR0FBRyxHQUEyQixhQUFhLENBQUMsR0FBRztZQUNwRCxDQUFDLENBQUMsRUFBRSxHQUFHLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDMUIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUE7UUFFaEMsb0RBQW9EO1FBQ3BELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUE7UUFDdkQsSUFBSSxPQUFPLGFBQWEsQ0FBQyxvQkFBb0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1RCxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUNELEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUE7UUFDOUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksK0JBQStCLEVBQUUsRUFBRSxDQUFDO2dCQUN2QyxHQUFHLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxHQUFHLENBQUE7WUFDNUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLG1CQUFtQixFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xFLENBQUM7UUFDRixDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWhDLHNFQUFzRTtRQUN0RSxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVCLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFTyxpQkFBaUIsQ0FDeEIsT0FBK0IsRUFDL0IsYUFBMkMsRUFDM0MsV0FBbUI7UUFFbkIsU0FBUztRQUNULElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixPQUFPLENBQUMsTUFBTSxFQUNkLE1BQU0sQ0FDTixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDWCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNuRixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsU0FBUztRQUNULElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixPQUFPLENBQUMsTUFBTSxFQUNkLE1BQU0sQ0FDTixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDWCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNuRixDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsV0FBVztRQUNYLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDbEYsQ0FBQTtRQUVELFFBQVE7UUFDUixJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsT0FBTyxFQUNQLE9BQU8sQ0FDUCxDQUFDLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQTtZQUU3QixJQUFJLE9BQU8sT0FBTyxDQUFDLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckMsZ0JBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7b0JBQ25DLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztvQkFDaEIsSUFBSSxFQUFFLG1DQUFtQyxDQUFDLGFBQWEsQ0FBQzt3QkFDdkQsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksS0FBSyxhQUFhLENBQUMsZ0JBQWdCLEdBQUc7d0JBQzdELENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSTtpQkFDckIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsT0FBTztRQUNQLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLG9CQUFvQixDQUN6QixPQUFPLEVBQ1AsTUFBTSxDQUNOLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNWLElBQUksQ0FBQyxHQUFHLENBQUMsaUNBQWlDLElBQUksRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVoRSxRQUFRO1lBQ1IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7WUFFckUsVUFBVTtZQUNWLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLElBQUk7WUFDSixRQUFRO1lBQ1IsTUFBTTtTQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxlQUFlLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUV4RSxJQUFJLE1BQU0sR0FBYSxFQUFFLENBQUE7WUFDekIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3JDLE1BQU0sR0FBRyxVQUFVLENBQUMsYUFBYTtxQkFDL0IsTUFBTSxDQUFDLENBQUMsWUFBb0IsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDaEUsR0FBRyxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUU7b0JBQ3RCLE1BQU0sS0FBSyxHQUNWLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNqQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7d0JBQy9CLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUMvQixPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzlCLENBQUMsQ0FBQyxDQUFBO1lBQ0osQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osU0FBUztZQUNWLENBQUM7WUFpQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsdUJBQXVCLEVBQUU7Z0JBQzFCLFdBQVcsRUFBRSxhQUFhLENBQUMsSUFBSTtnQkFDL0IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUTtnQkFDUixNQUFNO2FBQ04sQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHFCQUFxQjtRQUNyQixJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxvQkFBb0IsQ0FDekIsR0FBRyxFQUNILG9CQUFvQixFQUNwQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FDeEMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtZQUNqQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyxHQUFHLENBQ1AscUJBQXFCLE9BQU8sQ0FBQyxRQUFRLGdCQUFnQixPQUFPLENBQUMsTUFBTSxHQUFHLEVBQ3RFLFFBQVEsQ0FBQyxLQUFLLENBQ2QsQ0FBQTtnQkEyQkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIscUJBQXFCLEVBQUU7b0JBQ3hCLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSTtvQkFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO29CQUN0QixJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVE7aUJBQ3RCLENBQUMsQ0FBQTtnQkFFRixRQUFRO2dCQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUNsQixHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVc7b0JBQ3JCLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtvQkFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2lCQUN0QixDQUFDLENBQUE7Z0JBRUYsVUFBVTtnQkFDVixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZ0IsRUFBRSxRQUFvQjtRQUMxQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzdCLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNyQixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBRXBCLFFBQVEsRUFBRSxDQUFBO1lBQ1gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUFDLE9BQWdCLEVBQUUsUUFBcUM7UUFDbEUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQSxDQUFDLDJDQUEyQztRQUN6RCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sQ0FBQyxPQUFpQjtRQUN4QixNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7UUFDOUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFL0MsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQU1oRCxnRUFBZ0U7UUFDaEUsTUFBTSxVQUFVLEdBQWUsT0FBTyxDQUFBO1FBQ3RDLElBQUksT0FBTyxVQUFVLENBQUMsYUFBYSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BELFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBRXpDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELG1CQUFtQjtRQUNuQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNLENBQUMsMkNBQTJDO1FBQ25ELENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2xDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLGdCQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQXFCO1FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTSxDQUFDLDJDQUEyQztRQUNuRCxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0MsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUxRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsR0FBRyxDQUFDLHVCQUF1QixhQUFhLHlCQUF5QixFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0RixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQzs7QUF2YlcsY0FBYztJQWlDeEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7R0FuQ1gsY0FBYyxDQXdiMUI7O0FBRU0sSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxjQUFjO0lBQ3ZELFlBQ2MsVUFBdUIsRUFDRSxrQkFBdUMsRUFDMUQsZ0JBQW1DLEVBQy9CLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFKbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtJQUs5RSxDQUFDO0lBRVEsS0FBSyxDQUFDLGFBQWlEO1FBQy9ELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDNUYsSUFDQyxDQUFDLGNBQWMsRUFBRSxHQUFHO1lBQ3BCLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFO1lBQ2hDLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUMzQyxDQUFDO1lBQ0YsSUFBSSxDQUFDLEdBQUcsQ0FDUCxnR0FBZ0csRUFDaEcsUUFBUSxDQUFDLEtBQUssQ0FDZCxDQUFBO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRS9ELHFDQUFxQztRQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0RCxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQ3pDLGFBQWEsQ0FBQyxlQUFlLEVBQzdCLGFBQWEsQ0FBQyxhQUFhLEVBQzNCLENBQUMsVUFBVSxDQUFDLENBQ1osQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHVCQUF1QixDQUM5QixNQUFxQixFQUNyQixhQUFpRDtRQUVqRCxrRUFBa0U7UUFDbEUsc0RBQXNEO1FBRXRELElBQUksYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFDMUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLE1BQU0sQ0FDOUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FDcEIsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTlEWSxvQkFBb0I7SUFFOUIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQUxYLG9CQUFvQixDQThEaEMifQ==