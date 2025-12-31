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
import { timeout } from '../../../../base/common/async.js';
import { encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import * as objects from '../../../../base/common/objects.js';
import * as platform from '../../../../base/common/platform.js';
import { removeDangerousEnvVariables } from '../../../../base/common/processes.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { BufferedEmitter } from '../../../../base/parts/ipc/common/ipc.net.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import * as nls from '../../../../nls.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IExtensionHostStarter, } from '../../../../platform/extensions/common/extensionHostStarter.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, isUntitledWorkspace, } from '../../../../platform/workspace/common/workspace.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IShellEnvironmentService } from '../../environment/electron-sandbox/shellEnvironmentService.js';
import { MessagePortExtHostConnection, writeExtHostConnection } from '../common/extensionHostEnv.js';
import { UIKind, isMessageOfType, } from '../common/extensionHostProtocol.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
export class ExtensionHostProcess {
    get onStdout() {
        return this._extensionHostStarter.onDynamicStdout(this._id);
    }
    get onStderr() {
        return this._extensionHostStarter.onDynamicStderr(this._id);
    }
    get onMessage() {
        return this._extensionHostStarter.onDynamicMessage(this._id);
    }
    get onExit() {
        return this._extensionHostStarter.onDynamicExit(this._id);
    }
    constructor(id, _extensionHostStarter) {
        this._extensionHostStarter = _extensionHostStarter;
        this._id = id;
    }
    start(opts) {
        return this._extensionHostStarter.start(this._id, opts);
    }
    enableInspectPort() {
        return this._extensionHostStarter.enableInspectPort(this._id);
    }
    kill() {
        return this._extensionHostStarter.kill(this._id);
    }
}
let NativeLocalProcessExtensionHost = class NativeLocalProcessExtensionHost {
    constructor(runningLocation, startup, _initDataProvider, _contextService, _notificationService, _nativeHostService, _lifecycleService, _environmentService, _userDataProfilesService, _telemetryService, _logService, _loggerService, _labelService, _extensionHostDebugService, _hostService, _productService, _shellEnvironmentService, _extensionHostStarter) {
        this.runningLocation = runningLocation;
        this.startup = startup;
        this._initDataProvider = _initDataProvider;
        this._contextService = _contextService;
        this._notificationService = _notificationService;
        this._nativeHostService = _nativeHostService;
        this._lifecycleService = _lifecycleService;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._labelService = _labelService;
        this._extensionHostDebugService = _extensionHostDebugService;
        this._hostService = _hostService;
        this._productService = _productService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._extensionHostStarter = _extensionHostStarter;
        this.pid = null;
        this.remoteAuthority = null;
        this.extensions = null;
        this._onExit = new Emitter();
        this.onExit = this._onExit.event;
        this._onDidSetInspectPort = new Emitter();
        this._toDispose = new DisposableStore();
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevHost = devOpts.isExtensionDevHost;
        this._isExtensionDevDebug = devOpts.isExtensionDevDebug;
        this._isExtensionDevDebugBrk = devOpts.isExtensionDevDebugBrk;
        this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
        this._terminating = false;
        this._inspectListener = null;
        this._extensionHostProcess = null;
        this._messageProtocol = null;
        this._toDispose.add(this._onExit);
        this._toDispose.add(this._lifecycleService.onWillShutdown((e) => this._onWillShutdown(e)));
        this._toDispose.add(this._extensionHostDebugService.onClose((event) => {
            if (this._isExtensionDevHost &&
                this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._nativeHostService.closeWindow();
            }
        }));
        this._toDispose.add(this._extensionHostDebugService.onReload((event) => {
            if (this._isExtensionDevHost &&
                this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._hostService.reload();
            }
        }));
    }
    dispose() {
        if (this._terminating) {
            return;
        }
        this._terminating = true;
        this._toDispose.dispose();
    }
    start() {
        if (this._terminating) {
            // .terminate() was called
            throw new CancellationError();
        }
        if (!this._messageProtocol) {
            this._messageProtocol = this._start();
        }
        return this._messageProtocol;
    }
    async _start() {
        const [extensionHostCreationResult, portNumber, processEnv] = await Promise.all([
            this._extensionHostStarter.createExtensionHost(),
            this._tryFindDebugPort(),
            this._shellEnvironmentService.getShellEnv(),
        ]);
        this._extensionHostProcess = new ExtensionHostProcess(extensionHostCreationResult.id, this._extensionHostStarter);
        const env = objects.mixin(processEnv, {
            VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess',
            VSCODE_HANDLES_UNCAUGHT_ERRORS: true,
        });
        if (this._environmentService.debugExtensionHost.env) {
            objects.mixin(env, this._environmentService.debugExtensionHost.env);
        }
        removeDangerousEnvVariables(env);
        if (this._isExtensionDevHost) {
            // Unset `VSCODE_CODE_CACHE_PATH` when developing extensions because it might
            // be that dependencies, that otherwise would be cached, get modified.
            delete env['VSCODE_CODE_CACHE_PATH'];
        }
        const opts = {
            responseWindowId: this._nativeHostService.windowId,
            responseChannel: 'vscode:startExtensionHostMessagePortResult',
            responseNonce: generateUuid(),
            env,
            // We only detach the extension host on windows. Linux and Mac orphan by default
            // and detach under Linux and Mac create another process group.
            // We detach because we have noticed that when the renderer exits, its child processes
            // (i.e. extension host) are taken down in a brutal fashion by the OS
            detached: !!platform.isWindows,
            execArgv: undefined,
            silent: true,
        };
        const inspectHost = '127.0.0.1';
        if (portNumber !== 0) {
            opts.execArgv = [
                '--nolazy',
                (this._isExtensionDevDebugBrk ? '--inspect-brk=' : '--inspect=') +
                    `${inspectHost}:${portNumber}`,
            ];
        }
        else {
            opts.execArgv = ['--inspect-port=0'];
        }
        if (this._environmentService.extensionTestsLocationURI) {
            opts.execArgv.unshift('--expose-gc');
        }
        if (this._environmentService.args['prof-v8-extensions']) {
            opts.execArgv.unshift('--prof');
        }
        // Refs https://github.com/microsoft/vscode/issues/189805
        opts.execArgv.unshift('--dns-result-order=ipv4first');
        const onStdout = this._handleProcessOutputStream(this._extensionHostProcess.onStdout, this._toDispose);
        const onStderr = this._handleProcessOutputStream(this._extensionHostProcess.onStderr, this._toDispose);
        const onOutput = Event.any(Event.map(onStdout.event, (o) => ({ data: `%c${o}`, format: [''] })), Event.map(onStderr.event, (o) => ({ data: `%c${o}`, format: ['color: red'] })));
        // Debounce all output, so we can render it in the Chrome console as a group
        const onDebouncedOutput = Event.debounce(onOutput, (r, o) => {
            return r
                ? { data: r.data + o.data, format: [...r.format, ...o.format] }
                : { data: o.data, format: o.format };
        }, 100);
        // Print out extension host output
        this._toDispose.add(onDebouncedOutput((output) => {
            const inspectorUrlMatch = output.data && output.data.match(/ws:\/\/([^\s]+):(\d+)\/[^\s]+/);
            if (inspectorUrlMatch) {
                const [, host, port] = inspectorUrlMatch;
                if (!this._environmentService.isBuilt && !this._isExtensionDevTestFromCli) {
                    console.log(`%c[Extension Host] %cdebugger inspector at devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${inspectorUrlMatch[1]}`, 'color: blue', 'color:');
                }
                if (!this._inspectListener) {
                    this._inspectListener = { host, port: Number(port) };
                    this._onDidSetInspectPort.fire();
                }
            }
            else {
                if (!this._isExtensionDevTestFromCli) {
                    console.group('Extension Host');
                    console.log(output.data, ...output.format);
                    console.groupEnd();
                }
            }
        }));
        // Lifecycle
        this._toDispose.add(this._extensionHostProcess.onExit(({ code, signal }) => this._onExtHostProcessExit(code, signal)));
        // Notify debugger that we are ready to attach to the process if we run a development extension
        if (portNumber) {
            if (this._isExtensionDevHost &&
                this._isExtensionDevDebug &&
                this._environmentService.debugExtensionHost.debugId) {
                this._extensionHostDebugService.attachSession(this._environmentService.debugExtensionHost.debugId, portNumber);
            }
            this._inspectListener = { port: portNumber, host: inspectHost };
            this._onDidSetInspectPort.fire();
        }
        // Help in case we fail to start it
        let startupTimeoutHandle;
        if ((!this._environmentService.isBuilt && !this._environmentService.remoteAuthority) ||
            this._isExtensionDevHost) {
            startupTimeoutHandle = setTimeout(() => {
                this._logService.error(`[LocalProcessExtensionHost]: Extension host did not start in 10 seconds (debugBrk: ${this._isExtensionDevDebugBrk})`);
                const msg = this._isExtensionDevDebugBrk
                    ? nls.localize('extensionHost.startupFailDebug', 'Extension host did not start in 10 seconds, it might be stopped on the first line and needs a debugger to continue.')
                    : nls.localize('extensionHost.startupFail', 'Extension host did not start in 10 seconds, that might be a problem.');
                this._notificationService.prompt(Severity.Warning, msg, [
                    {
                        label: nls.localize('reloadWindow', 'Reload Window'),
                        run: () => this._hostService.reload(),
                    },
                ], {
                    sticky: true,
                    priority: NotificationPriority.URGENT,
                });
            }, 10000);
        }
        // Initialize extension host process with hand shakes
        const protocol = await this._establishProtocol(this._extensionHostProcess, opts);
        await this._performHandshake(protocol);
        clearTimeout(startupTimeoutHandle);
        return protocol;
    }
    /**
     * Find a free port if extension host debugging is enabled.
     */
    async _tryFindDebugPort() {
        if (typeof this._environmentService.debugExtensionHost.port !== 'number') {
            return 0;
        }
        const expected = this._environmentService.debugExtensionHost.port;
        const port = await this._nativeHostService.findFreePort(expected, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */, 2048 /* skip 2048 ports between attempts */);
        if (!this._isExtensionDevTestFromCli) {
            if (!port) {
                console.warn('%c[Extension Host] %cCould not find a free port for debugging', 'color: blue', 'color:');
            }
            else {
                if (port !== expected) {
                    console.warn(`%c[Extension Host] %cProvided debugging port ${expected} is not free, using ${port} instead.`, 'color: blue', 'color:');
                }
                if (this._isExtensionDevDebugBrk) {
                    console.warn(`%c[Extension Host] %cSTOPPED on first line for debugging on port ${port}`, 'color: blue', 'color:');
                }
                else {
                    console.info(`%c[Extension Host] %cdebugger listening on port ${port}`, 'color: blue', 'color:');
                }
            }
        }
        return port || 0;
    }
    _establishProtocol(extensionHostProcess, opts) {
        writeExtHostConnection(new MessagePortExtHostConnection(), opts.env);
        // Get ready to acquire the message port from the shared process worker
        const portPromise = acquirePort(undefined /* we trigger the request via service call! */, opts.responseChannel, opts.responseNonce);
        return new Promise((resolve, reject) => {
            const handle = setTimeout(() => {
                reject('The local extension host took longer than 60s to connect.');
            }, 60 * 1000);
            portPromise.then((port) => {
                this._toDispose.add(toDisposable(() => {
                    // Close the message port when the extension host is disposed
                    port.close();
                }));
                clearTimeout(handle);
                const onMessage = new BufferedEmitter();
                port.onmessage = (e) => {
                    if (e.data) {
                        onMessage.fire(VSBuffer.wrap(e.data));
                    }
                };
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: (message) => port.postMessage(message.buffer),
                });
            });
            // Now that the message port listener is installed, start the ext host process
            const sw = StopWatch.create(false);
            extensionHostProcess.start(opts).then(({ pid }) => {
                if (pid) {
                    this.pid = pid;
                }
                this._logService.info(`Started local extension host with pid ${pid}.`);
                const duration = sw.elapsed();
                if (platform.isCI) {
                    this._logService.info(`IExtensionHostStarter.start() took ${duration} ms.`);
                }
            }, (err) => {
                // Starting the ext host process resulted in an error
                reject(err);
            });
        });
    }
    _performHandshake(protocol) {
        // 1) wait for the incoming `ready` event and send the initialization data.
        // 2) wait for the incoming `initialized` event.
        return new Promise((resolve, reject) => {
            let timeoutHandle;
            const installTimeoutCheck = () => {
                timeoutHandle = setTimeout(() => {
                    reject('The local extension host took longer than 60s to send its ready message.');
                }, 60 * 1000);
            };
            const uninstallTimeoutCheck = () => {
                clearTimeout(timeoutHandle);
            };
            // Wait 60s for the ready message
            installTimeoutCheck();
            const disposable = protocol.onMessage((msg) => {
                if (isMessageOfType(msg, 1 /* MessageType.Ready */)) {
                    // 1) Extension Host is ready to receive messages, initialize it
                    uninstallTimeoutCheck();
                    this._createExtHostInitData().then((data) => {
                        // Wait 60s for the initialized message
                        installTimeoutCheck();
                        protocol.send(VSBuffer.fromString(JSON.stringify(data)));
                    });
                    return;
                }
                if (isMessageOfType(msg, 0 /* MessageType.Initialized */)) {
                    // 2) Extension Host is initialized
                    uninstallTimeoutCheck();
                    // stop listening for messages here
                    disposable.dispose();
                    // release this promise
                    resolve();
                    return;
                }
                console.error(`received unexpected message during handshake phase from the extension host: `, msg);
            });
        });
    }
    async _createExtHostInitData() {
        const initData = await this._initDataProvider.getInitData();
        this.extensions = initData.extensions;
        const workspace = this._contextService.getWorkspace();
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            parentPid: 0,
            environment: {
                isExtensionDevelopmentDebug: this._isExtensionDevDebug,
                appRoot: this._environmentService.appRoot
                    ? URI.file(this._environmentService.appRoot)
                    : undefined,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier || 'desktop',
                appUriScheme: this._productService.urlProtocol,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                appLanguage: platform.language,
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
                workspaceStorageHome: this._environmentService.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel,
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
                ? undefined
                : {
                    configuration: workspace.configuration ?? undefined,
                    id: workspace.id,
                    name: this._labelService.getWorkspaceLabel(workspace),
                    isUntitled: workspace.configuration
                        ? isUntitledWorkspace(workspace.configuration, this._environmentService)
                        : false,
                    transient: workspace.transient,
                },
            remote: {
                authority: this._environmentService.remoteAuthority,
                connectionData: null,
                isRemote: false,
            },
            consoleForward: {
                includeStack: !this._isExtensionDevTestFromCli &&
                    (this._isExtensionDevHost ||
                        !this._environmentService.isBuilt ||
                        this._productService.quality !== 'stable' ||
                        this._environmentService.verbose),
                logNative: !this._isExtensionDevTestFromCli && this._isExtensionDevHost,
            },
            extensions: this.extensions.toSnapshot(),
            telemetryInfo: {
                sessionId: this._telemetryService.sessionId,
                machineId: this._telemetryService.machineId,
                sqmId: this._telemetryService.sqmId,
                devDeviceId: this._telemetryService.devDeviceId,
                firstSessionDate: this._telemetryService.firstSessionDate,
                msftInternal: this._telemetryService.msftInternal,
            },
            logLevel: this._logService.getLevel(),
            loggers: [...this._loggerService.getRegisteredLoggers()],
            logsLocation: this._environmentService.extHostLogsPath,
            autoStart: this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */,
            uiKind: UIKind.Desktop,
            handle: this._environmentService.window.handle
                ? encodeBase64(this._environmentService.window.handle)
                : undefined,
        };
    }
    _onExtHostProcessExit(code, signal) {
        if (this._terminating) {
            // Expected termination path (we asked the process to terminate)
            return;
        }
        this._onExit.fire([code, signal]);
    }
    _handleProcessOutputStream(stream, store) {
        let last = '';
        let isOmitting = false;
        const event = new Emitter();
        stream((chunk) => {
            // not a fancy approach, but this is the same approach used by the split2
            // module which is well-optimized (https://github.com/mcollina/split2)
            last += chunk;
            const lines = last.split(/\r?\n/g);
            last = lines.pop();
            // protected against an extension spamming and leaking memory if no new line is written.
            if (last.length > 10_000) {
                lines.push(last);
                last = '';
            }
            for (const line of lines) {
                if (isOmitting) {
                    if (line === "END_NATIVE_LOG" /* NativeLogMarkers.End */) {
                        isOmitting = false;
                    }
                }
                else if (line === "START_NATIVE_LOG" /* NativeLogMarkers.Start */) {
                    isOmitting = true;
                }
                else if (line.length) {
                    event.fire(line + '\n');
                }
            }
        }, undefined, store);
        return event;
    }
    async enableInspectPort() {
        if (!!this._inspectListener) {
            return true;
        }
        if (!this._extensionHostProcess) {
            return false;
        }
        const result = await this._extensionHostProcess.enableInspectPort();
        if (!result) {
            return false;
        }
        await Promise.race([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
        return !!this._inspectListener;
    }
    getInspectPort() {
        return this._inspectListener ?? undefined;
    }
    _onWillShutdown(event) {
        // If the extension development host was started without debugger attached we need
        // to communicate this back to the main side to terminate the debug session
        if (this._isExtensionDevHost &&
            !this._isExtensionDevTestFromCli &&
            !this._isExtensionDevDebug &&
            this._environmentService.debugExtensionHost.debugId) {
            this._extensionHostDebugService.terminateSession(this._environmentService.debugExtensionHost.debugId);
            event.join(timeout(100 /* wait a bit for IPC to get delivered */), {
                id: 'join.extensionDevelopment',
                label: nls.localize('join.extensionDevelopment', 'Terminating extension debug session'),
            });
        }
    }
};
NativeLocalProcessExtensionHost = __decorate([
    __param(3, IWorkspaceContextService),
    __param(4, INotificationService),
    __param(5, INativeHostService),
    __param(6, ILifecycleService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IUserDataProfilesService),
    __param(9, ITelemetryService),
    __param(10, ILogService),
    __param(11, ILoggerService),
    __param(12, ILabelService),
    __param(13, IExtensionHostDebugService),
    __param(14, IHostService),
    __param(15, IProductService),
    __param(16, IShellEnvironmentService),
    __param(17, IExtensionHostStarter)
], NativeLocalProcessExtensionHost);
export { NativeLocalProcessExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQcm9jZXNzRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxQcm9jZXNzRXh0ZW5zaW9uSG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDbkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUs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