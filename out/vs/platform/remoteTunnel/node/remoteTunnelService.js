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
import { CONFIGURATION_KEY_HOST_NAME, CONFIGURATION_KEY_PREVENT_SLEEP, LOGGER_NAME, LOG_ID, TunnelStates, INACTIVE_TUNNEL_MODE, } from '../common/remoteTunnel.js';
import { Emitter } from '../../../base/common/event.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILoggerService, LogLevelToString } from '../../log/common/log.js';
import { dirname, join } from '../../../base/common/path.js';
import { spawn } from 'child_process';
import { IProductService } from '../../product/common/productService.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { createCancelablePromise, Delayer } from '../../../base/common/async.js';
import { ISharedProcessLifecycleService } from '../../lifecycle/node/sharedProcessLifecycleService.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { localize } from '../../../nls.js';
import { hostname, homedir } from 'os';
import { IStorageService } from '../../storage/common/storage.js';
import { isString } from '../../../base/common/types.js';
import { StreamSplitter } from '../../../base/node/nodeStreams.js';
import { joinPath } from '../../../base/common/resources.js';
const restartTunnelOnConfigurationChanges = [
    CONFIGURATION_KEY_HOST_NAME,
    CONFIGURATION_KEY_PREVENT_SLEEP,
];
// This is the session used run the tunnel access.
// if set, the remote tunnel access is currently enabled.
// if not set, the remote tunnel access is currently disabled.
const TUNNEL_ACCESS_SESSION = 'remoteTunnelSession';
// Boolean indicating whether the tunnel should be installed as a service.
const TUNNEL_ACCESS_IS_SERVICE = 'remoteTunnelIsService';
/**
 * This service runs on the shared service. It is running the `code-tunnel` command
 * to make the current machine available for remote access.
 */
let RemoteTunnelService = class RemoteTunnelService extends Disposable {
    constructor(telemetryService, productService, environmentService, loggerService, sharedProcessLifecycleService, configurationService, storageService) {
        super();
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this._onDidTokenFailedEmitter = new Emitter();
        this.onDidTokenFailed = this._onDidTokenFailedEmitter.event;
        this._onDidChangeTunnelStatusEmitter = new Emitter();
        this.onDidChangeTunnelStatus = this._onDidChangeTunnelStatusEmitter.event;
        this._onDidChangeModeEmitter = new Emitter();
        this.onDidChangeMode = this._onDidChangeModeEmitter.event;
        /**
         * "Mode" in the terminal state we want to get to -- started, stopped, and
         * the attributes associated with each.
         *
         * At any given time, work may be ongoing to get `_tunnelStatus` into a
         * state that reflects the desired `mode`.
         */
        this._mode = INACTIVE_TUNNEL_MODE;
        this._initialized = false;
        this.defaultOnOutput = (a, isErr) => {
            if (isErr) {
                this._logger.error(a);
            }
            else {
                this._logger.info(a);
            }
        };
        this._logger = this._register(loggerService.createLogger(joinPath(environmentService.logsHome, `${LOG_ID}.log`), {
            id: LOG_ID,
            name: LOGGER_NAME,
        }));
        this._startTunnelProcessDelayer = new Delayer(100);
        this._register(this._logger.onDidChangeLogLevel((l) => this._logger.info('Log level changed to ' + LogLevelToString(l))));
        this._register(sharedProcessLifecycleService.onWillShutdown(() => {
            this._tunnelProcess?.cancel();
            this._tunnelProcess = undefined;
            this.dispose();
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (restartTunnelOnConfigurationChanges.some((c) => e.affectsConfiguration(c))) {
                this._startTunnelProcessDelayer.trigger(() => this.updateTunnelProcess());
            }
        }));
        this._mode = this._restoreMode();
        this._tunnelStatus = TunnelStates.uninitialized;
    }
    async getTunnelStatus() {
        return this._tunnelStatus;
    }
    setTunnelStatus(tunnelStatus) {
        this._tunnelStatus = tunnelStatus;
        this._onDidChangeTunnelStatusEmitter.fire(tunnelStatus);
    }
    setMode(mode) {
        if (isSameMode(this._mode, mode)) {
            return;
        }
        this._mode = mode;
        this._storeMode(mode);
        this._onDidChangeModeEmitter.fire(this._mode);
        if (mode.active) {
            this._logger.info(`Session updated: ${mode.session.accountLabel} (${mode.session.providerId}) (service=${mode.asService})`);
            if (mode.session.token) {
                this._logger.info(`Session token updated: ${mode.session.accountLabel} (${mode.session.providerId})`);
            }
        }
        else {
            this._logger.info(`Session reset`);
        }
    }
    getMode() {
        return Promise.resolve(this._mode);
    }
    async initialize(mode) {
        if (this._initialized) {
            return this._tunnelStatus;
        }
        this._initialized = true;
        this.setMode(mode);
        try {
            await this._startTunnelProcessDelayer.trigger(() => this.updateTunnelProcess());
        }
        catch (e) {
            this._logger.error(e);
        }
        return this._tunnelStatus;
    }
    getTunnelCommandLocation() {
        if (!this._tunnelCommand) {
            let binParentLocation;
            if (isMacintosh) {
                // appRoot = /Applications/Visual Studio Code - Insiders.app/Contents/Resources/app
                // bin = /Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin
                binParentLocation = this.environmentService.appRoot;
            }
            else {
                // appRoot = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app
                // bin = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\bin
                // appRoot = /usr/share/code-insiders/resources/app
                // bin = /usr/share/code-insiders/bin
                binParentLocation = dirname(dirname(this.environmentService.appRoot));
            }
            this._tunnelCommand = join(binParentLocation, 'bin', `${this.productService.tunnelApplicationName}${isWindows ? '.exe' : ''}`);
        }
        return this._tunnelCommand;
    }
    async startTunnel(mode) {
        if (isSameMode(this._mode, mode) && this._tunnelStatus.type !== 'disconnected') {
            return this._tunnelStatus;
        }
        this.setMode(mode);
        try {
            await this._startTunnelProcessDelayer.trigger(() => this.updateTunnelProcess());
        }
        catch (e) {
            this._logger.error(e);
        }
        return this._tunnelStatus;
    }
    async stopTunnel() {
        if (this._tunnelProcess) {
            this._tunnelProcess.cancel();
            this._tunnelProcess = undefined;
        }
        if (this._mode.active) {
            // Be careful to only uninstall the service if we're the ones who installed it:
            const needsServiceUninstall = this._mode.asService;
            this.setMode(INACTIVE_TUNNEL_MODE);
            try {
                if (needsServiceUninstall) {
                    this.runCodeTunnelCommand('uninstallService', ['service', 'uninstall']);
                }
            }
            catch (e) {
                this._logger.error(e);
            }
        }
        try {
            await this.runCodeTunnelCommand('stop', ['kill']);
        }
        catch (e) {
            this._logger.error(e);
        }
        this.setTunnelStatus(TunnelStates.disconnected());
    }
    async updateTunnelProcess() {
        this.telemetryService.publicLog2('remoteTunnel.enablement', {
            enabled: this._mode.active,
            service: this._mode.active && this._mode.asService,
        });
        if (this._tunnelProcess) {
            this._tunnelProcess.cancel();
            this._tunnelProcess = undefined;
        }
        let output = '';
        let isServiceInstalled = false;
        const onOutput = (a, isErr) => {
            if (isErr) {
                this._logger.error(a);
            }
            else {
                output += a;
            }
            if (!this.environmentService.isBuilt && a.startsWith('   Compiling')) {
                this.setTunnelStatus(TunnelStates.connecting(localize('remoteTunnelService.building', 'Building CLI from sources')));
            }
        };
        const statusProcess = this.runCodeTunnelCommand('status', ['status'], onOutput);
        this._tunnelProcess = statusProcess;
        try {
            await statusProcess;
            if (this._tunnelProcess !== statusProcess) {
                return;
            }
            // split and find the line, since in dev builds additional noise is
            // added by cargo to the output.
            let status;
            try {
                status = JSON.parse(output
                    .trim()
                    .split('\n')
                    .find((l) => l.startsWith('{')));
            }
            catch (e) {
                this._logger.error(`Could not parse status output: ${JSON.stringify(output.trim())}`);
                this.setTunnelStatus(TunnelStates.disconnected());
                return;
            }
            isServiceInstalled = status.service_installed;
            this._logger.info(status.tunnel ? 'Other tunnel running, attaching...' : 'No other tunnel running');
            // If a tunnel is running but the mode isn't "active", we'll still attach
            // to the tunnel to show its state in the UI. If neither are true, disconnect
            if (!status.tunnel && !this._mode.active) {
                this.setTunnelStatus(TunnelStates.disconnected());
                return;
            }
        }
        catch (e) {
            this._logger.error(e);
            this.setTunnelStatus(TunnelStates.disconnected());
            return;
        }
        finally {
            if (this._tunnelProcess === statusProcess) {
                this._tunnelProcess = undefined;
            }
        }
        const session = this._mode.active ? this._mode.session : undefined;
        if (session && session.token) {
            const token = session.token;
            this.setTunnelStatus(TunnelStates.connecting(localize({
                key: 'remoteTunnelService.authorizing',
                comment: ['{0} is a user account name, {1} a provider name (e.g. Github)'],
            }, 'Connecting as {0} ({1})', session.accountLabel, session.providerId)));
            const onLoginOutput = (a, isErr) => {
                a = a.replaceAll(token, '*'.repeat(4));
                onOutput(a, isErr);
            };
            const loginProcess = this.runCodeTunnelCommand('login', [
                'user',
                'login',
                '--provider',
                session.providerId,
                '--log',
                LogLevelToString(this._logger.getLevel()),
            ], onLoginOutput, { VSCODE_CLI_ACCESS_TOKEN: token });
            this._tunnelProcess = loginProcess;
            try {
                await loginProcess;
                if (this._tunnelProcess !== loginProcess) {
                    return;
                }
            }
            catch (e) {
                this._logger.error(e);
                this._tunnelProcess = undefined;
                this._onDidTokenFailedEmitter.fire(session);
                this.setTunnelStatus(TunnelStates.disconnected(session));
                return;
            }
        }
        const hostName = this._getTunnelName();
        if (hostName) {
            this.setTunnelStatus(TunnelStates.connecting(localize({ key: 'remoteTunnelService.openTunnelWithName', comment: ['{0} is a tunnel name'] }, 'Opening tunnel {0}', hostName)));
        }
        else {
            this.setTunnelStatus(TunnelStates.connecting(localize('remoteTunnelService.openTunnel', 'Opening tunnel')));
        }
        const args = [
            '--accept-server-license-terms',
            '--log',
            LogLevelToString(this._logger.getLevel()),
        ];
        if (hostName) {
            args.push('--name', hostName);
        }
        else {
            args.push('--random-name');
        }
        let serviceInstallFailed = false;
        if (this._mode.active && this._mode.asService && !isServiceInstalled) {
            // I thought about calling `code tunnel kill` here, but having multiple
            // tunnel processes running is pretty much idempotent. If there's
            // another tunnel process running, the service process will
            // take over when it exits, no hard feelings.
            serviceInstallFailed = (await this.installTunnelService(args)) === false;
        }
        return this.serverOrAttachTunnel(session, args, serviceInstallFailed);
    }
    async installTunnelService(args) {
        let status;
        try {
            status = await this.runCodeTunnelCommand('serviceInstall', ['service', 'install', ...args]);
        }
        catch (e) {
            this._logger.error(e);
            status = 1;
        }
        if (status !== 0) {
            const msg = localize('remoteTunnelService.serviceInstallFailed', 'Failed to install tunnel as a service, starting in session...');
            this._logger.warn(msg);
            this.setTunnelStatus(TunnelStates.connecting(msg));
            return false;
        }
        return true;
    }
    async serverOrAttachTunnel(session, args, serviceInstallFailed) {
        args.push('--parent-process-id', String(process.pid));
        if (this._preventSleep()) {
            args.push('--no-sleep');
        }
        let isAttached = false;
        const serveCommand = this.runCodeTunnelCommand('tunnel', args, (message, isErr) => {
            if (isErr) {
                this._logger.error(message);
            }
            else {
                this._logger.info(message);
            }
            if (message.includes('Connected to an existing tunnel process')) {
                isAttached = true;
            }
            const m = message.match(/Open this link in your browser (https:\/\/([^\/\s]+)\/([^\/\s]+)\/([^\/\s]+))/);
            if (m) {
                const info = { link: m[1], domain: m[2], tunnelName: m[4], isAttached };
                this.setTunnelStatus(TunnelStates.connected(info, serviceInstallFailed));
            }
            else if (message.match(/error refreshing token/)) {
                serveCommand.cancel();
                this._onDidTokenFailedEmitter.fire(session);
                this.setTunnelStatus(TunnelStates.disconnected(session));
            }
        });
        this._tunnelProcess = serveCommand;
        serveCommand.finally(() => {
            if (serveCommand === this._tunnelProcess) {
                // process exited unexpectedly
                this._logger.info(`tunnel process terminated`);
                this._tunnelProcess = undefined;
                this._mode = INACTIVE_TUNNEL_MODE;
                this.setTunnelStatus(TunnelStates.disconnected());
            }
        });
    }
    runCodeTunnelCommand(logLabel, commandArgs, onOutput = this.defaultOnOutput, env) {
        return createCancelablePromise((token) => {
            return new Promise((resolve, reject) => {
                if (token.isCancellationRequested) {
                    resolve(-1);
                }
                let tunnelProcess;
                const stdio = ['ignore', 'pipe', 'pipe'];
                token.onCancellationRequested(() => {
                    if (tunnelProcess) {
                        this._logger.info(`${logLabel} terminating(${tunnelProcess.pid})`);
                        tunnelProcess.kill();
                    }
                });
                if (!this.environmentService.isBuilt) {
                    onOutput('Building tunnel CLI from sources and run\n', false);
                    onOutput(`${logLabel} Spawning: cargo run -- tunnel ${commandArgs.join(' ')}\n`, false);
                    tunnelProcess = spawn('cargo', ['run', '--', 'tunnel', ...commandArgs], {
                        cwd: join(this.environmentService.appRoot, 'cli'),
                        stdio,
                        env: { ...process.env, RUST_BACKTRACE: '1', ...env },
                    });
                }
                else {
                    onOutput('Running tunnel CLI\n', false);
                    const tunnelCommand = this.getTunnelCommandLocation();
                    onOutput(`${logLabel} Spawning: ${tunnelCommand} tunnel ${commandArgs.join(' ')}\n`, false);
                    tunnelProcess = spawn(tunnelCommand, ['tunnel', ...commandArgs], {
                        cwd: homedir(),
                        stdio,
                        env: { ...process.env, ...env },
                    });
                }
                tunnelProcess.stdout.pipe(new StreamSplitter('\n')).on('data', (data) => {
                    if (tunnelProcess) {
                        const message = data.toString();
                        onOutput(message, false);
                    }
                });
                tunnelProcess.stderr.pipe(new StreamSplitter('\n')).on('data', (data) => {
                    if (tunnelProcess) {
                        const message = data.toString();
                        onOutput(message, true);
                    }
                });
                tunnelProcess.on('exit', (e) => {
                    if (tunnelProcess) {
                        onOutput(`${logLabel} exit(${tunnelProcess.pid}): + ${e} `, false);
                        tunnelProcess = undefined;
                        resolve(e || 0);
                    }
                });
                tunnelProcess.on('error', (e) => {
                    if (tunnelProcess) {
                        onOutput(`${logLabel} error(${tunnelProcess.pid}): + ${e} `, true);
                        tunnelProcess = undefined;
                        reject();
                    }
                });
            });
        });
    }
    async getTunnelName() {
        return this._getTunnelName();
    }
    _preventSleep() {
        return !!this.configurationService.getValue(CONFIGURATION_KEY_PREVENT_SLEEP);
    }
    _getTunnelName() {
        let name = this.configurationService.getValue(CONFIGURATION_KEY_HOST_NAME) || hostname();
        name = name
            .replace(/^-+/g, '')
            .replace(/[^\w-]/g, '')
            .substring(0, 20);
        return name || undefined;
    }
    _restoreMode() {
        try {
            const tunnelAccessSession = this.storageService.get(TUNNEL_ACCESS_SESSION, -1 /* StorageScope.APPLICATION */);
            const asService = this.storageService.getBoolean(TUNNEL_ACCESS_IS_SERVICE, -1 /* StorageScope.APPLICATION */, false);
            if (tunnelAccessSession) {
                const session = JSON.parse(tunnelAccessSession);
                if (session &&
                    isString(session.accountLabel) &&
                    isString(session.sessionId) &&
                    isString(session.providerId)) {
                    return { active: true, session, asService };
                }
                this._logger.error('Problems restoring session from storage, invalid format', session);
            }
        }
        catch (e) {
            this._logger.error('Problems restoring session from storage', e);
        }
        return INACTIVE_TUNNEL_MODE;
    }
    _storeMode(mode) {
        if (mode.active) {
            const sessionWithoutToken = {
                providerId: mode.session.providerId,
                sessionId: mode.session.sessionId,
                accountLabel: mode.session.accountLabel,
            };
            this.storageService.store(TUNNEL_ACCESS_SESSION, JSON.stringify(sessionWithoutToken), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(TUNNEL_ACCESS_IS_SERVICE, mode.asService, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(TUNNEL_ACCESS_SESSION, -1 /* StorageScope.APPLICATION */);
            this.storageService.remove(TUNNEL_ACCESS_IS_SERVICE, -1 /* StorageScope.APPLICATION */);
        }
    }
};
RemoteTunnelService = __decorate([
    __param(0, ITelemetryService),
    __param(1, IProductService),
    __param(2, INativeEnvironmentService),
    __param(3, ILoggerService),
    __param(4, ISharedProcessLifecycleService),
    __param(5, IConfigurationService),
    __param(6, IStorageService)
], RemoteTunnelService);
export { RemoteTunnelService };
function isSameSession(a1, a2) {
    if (a1 && a2) {
        return a1.sessionId === a2.sessionId && a1.providerId === a2.providerId && a1.token === a2.token;
    }
    return a1 === a2;
}
const isSameMode = (a, b) => {
    if (a.active !== b.active) {
        return false;
    }
    else if (a.active && b.active) {
        return a.asService === b.asService && isSameSession(a.session, b.session);
    }
    else {
        return true;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlVHVubmVsL25vZGUvcmVtb3RlVHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLCtCQUErQixFQUkvQixXQUFXLEVBQ1gsTUFBTSxFQUNOLFlBQVksRUFHWixvQkFBb0IsR0FFcEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBVyxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzVELE9BQU8sRUFBOEIsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbkcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFzQjVELE1BQU0sbUNBQW1DLEdBQXNCO0lBQzlELDJCQUEyQjtJQUMzQiwrQkFBK0I7Q0FDL0IsQ0FBQTtBQUVELGtEQUFrRDtBQUNsRCx5REFBeUQ7QUFDekQsOERBQThEO0FBQzlELE1BQU0scUJBQXFCLEdBQUcscUJBQXFCLENBQUE7QUFDbkQsMEVBQTBFO0FBQzFFLE1BQU0sd0JBQXdCLEdBQUcsdUJBQXVCLENBQUE7QUFFeEQ7OztHQUdHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBZ0NsRCxZQUNvQixnQkFBb0QsRUFDdEQsY0FBZ0QsRUFDdEMsa0JBQThELEVBQ3pFLGFBQTZCLEVBQ2IsNkJBQTZELEVBQ3RFLG9CQUE0RCxFQUNsRSxjQUFnRDtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQVI2QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3JDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNyQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTJCO1FBR2pELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDakQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBcENqRCw2QkFBd0IsR0FBRyxJQUFJLE9BQU8sRUFBb0MsQ0FBQTtRQUMzRSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBRXJELG9DQUErQixHQUFHLElBQUksT0FBTyxFQUFnQixDQUFBO1FBQzlELDRCQUF1QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUE7UUFFbkUsNEJBQXVCLEdBQUcsSUFBSSxPQUFPLEVBQWMsQ0FBQTtRQUNwRCxvQkFBZSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7UUFJcEU7Ozs7OztXQU1HO1FBQ0ssVUFBSyxHQUFlLG9CQUFvQixDQUFBO1FBU3hDLGlCQUFZLEdBQUcsS0FBSyxDQUFBO1FBK0ZYLG9CQUFlLEdBQUcsQ0FBQyxDQUFTLEVBQUUsS0FBYyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQXpGQSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLGFBQWEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLEVBQUU7WUFDbEYsRUFBRSxFQUFFLE1BQU07WUFDVixJQUFJLEVBQUUsV0FBVztTQUNqQixDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVsRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNoRSxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsQ0FBQTtZQUM3QixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtZQUMvQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ25ELElBQUksbUNBQW1DLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNoRixJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUE7WUFDMUUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUE7SUFDaEQsQ0FBQztJQUVNLEtBQUssQ0FBQyxlQUFlO1FBQzNCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU8sZUFBZSxDQUFDLFlBQTBCO1FBQ2pELElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVPLE9BQU8sQ0FBQyxJQUFnQjtRQUMvQixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUNoQixvQkFBb0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLGNBQWMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUN4RyxDQUFBO1lBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDaEIsMEJBQTBCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLENBQ2xGLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWdCO1FBQ2hDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQTtRQUNoRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQVVPLHdCQUF3QjtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksaUJBQWlCLENBQUE7WUFDckIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsbUZBQW1GO2dCQUNuRixtRkFBbUY7Z0JBQ25GLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUE7WUFDcEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLDRGQUE0RjtnQkFDNUYsOEVBQThFO2dCQUM5RSxtREFBbUQ7Z0JBQ25ELHFDQUFxQztnQkFDckMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUN0RSxDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQ3pCLGlCQUFpQixFQUNqQixLQUFLLEVBQ0wsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDeEUsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBc0I7UUFDdkMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUNoRixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFbEIsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUE7UUFDaEYsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVTtRQUNmLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDNUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUE7UUFDaEMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QiwrRUFBK0U7WUFDL0UsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQTtZQUNsRCxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFFbEMsSUFBSSxDQUFDO2dCQUNKLElBQUkscUJBQXFCLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hFLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQjtRQUNoQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qix5QkFBeUIsRUFBRTtZQUM1QixPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQzFCLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVM7U0FDbEQsQ0FBQyxDQUFBO1FBRUYsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUM1QixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2YsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUE7UUFDOUIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFTLEVBQUUsS0FBYyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLENBQUMsQ0FBQTtZQUNaLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxlQUFlLENBQ25CLFlBQVksQ0FBQyxVQUFVLENBQ3RCLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwyQkFBMkIsQ0FBQyxDQUNyRSxDQUNELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQy9FLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksQ0FBQztZQUNKLE1BQU0sYUFBYSxDQUFBO1lBQ25CLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxhQUFhLEVBQUUsQ0FBQztnQkFDM0MsT0FBTTtZQUNQLENBQUM7WUFFRCxtRUFBbUU7WUFDbkUsZ0NBQWdDO1lBQ2hDLElBQUksTUFHSCxDQUFBO1lBRUQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUNsQixNQUFNO3FCQUNKLElBQUksRUFBRTtxQkFDTixLQUFLLENBQUMsSUFBSSxDQUFDO3FCQUNYLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBRSxDQUNqQyxDQUFBO1lBQ0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRixJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxPQUFNO1lBQ1AsQ0FBQztZQUVELGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDaEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUNoRixDQUFBO1lBRUQseUVBQXlFO1lBQ3pFLDZFQUE2RTtZQUM3RSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7Z0JBQ2pELE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1lBQ2pELE9BQU07UUFDUCxDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDbEUsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7WUFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FDbkIsWUFBWSxDQUFDLFVBQVUsQ0FDdEIsUUFBUSxDQUNQO2dCQUNDLEdBQUcsRUFBRSxpQ0FBaUM7Z0JBQ3RDLE9BQU8sRUFBRSxDQUFDLCtEQUErRCxDQUFDO2FBQzFFLEVBQ0QseUJBQXlCLEVBQ3pCLE9BQU8sQ0FBQyxZQUFZLEVBQ3BCLE9BQU8sQ0FBQyxVQUFVLENBQ2xCLENBQ0QsQ0FDRCxDQUFBO1lBQ0QsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFTLEVBQUUsS0FBYyxFQUFFLEVBQUU7Z0JBQ25ELENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkIsQ0FBQyxDQUFBO1lBQ0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUM3QyxPQUFPLEVBQ1A7Z0JBQ0MsTUFBTTtnQkFDTixPQUFPO2dCQUNQLFlBQVk7Z0JBQ1osT0FBTyxDQUFDLFVBQVU7Z0JBQ2xCLE9BQU87Z0JBQ1AsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN6QyxFQUNELGFBQWEsRUFDYixFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxDQUNsQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUE7WUFDbEMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sWUFBWSxDQUFBO2dCQUNsQixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQzFDLE9BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNyQixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQTtnQkFDL0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDM0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQ3hELE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGVBQWUsQ0FDbkIsWUFBWSxDQUFDLFVBQVUsQ0FDdEIsUUFBUSxDQUNQLEVBQUUsR0FBRyxFQUFFLHdDQUF3QyxFQUFFLE9BQU8sRUFBRSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFDcEYsb0JBQW9CLEVBQ3BCLFFBQVEsQ0FDUixDQUNELENBQ0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FDbkIsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUNyRixDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHO1lBQ1osK0JBQStCO1lBQy9CLE9BQU87WUFDUCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3pDLENBQUE7UUFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLG9CQUFvQixHQUFHLEtBQUssQ0FBQTtRQUNoQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN0RSx1RUFBdUU7WUFDdkUsaUVBQWlFO1lBQ2pFLDJEQUEyRDtZQUMzRCw2Q0FBNkM7WUFDN0Msb0JBQW9CLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQTtRQUN6RSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBdUI7UUFDekQsSUFBSSxNQUFjLENBQUE7UUFDbEIsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDNUYsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ1gsQ0FBQztRQUVELElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FDbkIsMENBQTBDLEVBQzFDLCtEQUErRCxDQUMvRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbEQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUNqQyxPQUF5QyxFQUN6QyxJQUFjLEVBQ2Qsb0JBQTZCO1FBRTdCLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXJELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN4QixDQUFDO1FBRUQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FDN0MsUUFBUSxFQUNSLElBQUksRUFDSixDQUFDLE9BQWUsRUFBRSxLQUFjLEVBQUUsRUFBRTtZQUNuQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzVCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMzQixDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQztnQkFDakUsVUFBVSxHQUFHLElBQUksQ0FBQTtZQUNsQixDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FDdEIsK0VBQStFLENBQy9FLENBQUE7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNQLE1BQU0sSUFBSSxHQUFtQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFBO2dCQUN2RixJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtZQUN6RSxDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDckIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDM0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDekQsQ0FBQztRQUNGLENBQUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUE7UUFDbEMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxZQUFZLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMxQyw4QkFBOEI7Z0JBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUE7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO2dCQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLG9CQUFvQixDQUFBO2dCQUVqQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxvQkFBb0IsQ0FDM0IsUUFBZ0IsRUFDaEIsV0FBcUIsRUFDckIsV0FBd0QsSUFBSSxDQUFDLGVBQWUsRUFDNUUsR0FBNEI7UUFFNUIsT0FBTyx1QkFBdUIsQ0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2hELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNaLENBQUM7Z0JBQ0QsSUFBSSxhQUF1QyxDQUFBO2dCQUMzQyxNQUFNLEtBQUssR0FBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUV0RCxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO29CQUNsQyxJQUFJLGFBQWEsRUFBRSxDQUFDO3dCQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsZ0JBQWdCLGFBQWEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFBO3dCQUNsRSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQ3JCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDdEMsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssQ0FBQyxDQUFBO29CQUM3RCxRQUFRLENBQUMsR0FBRyxRQUFRLGtDQUFrQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3ZGLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRTt3QkFDdkUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQzt3QkFDakQsS0FBSzt3QkFDTCxHQUFHLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRTtxQkFDcEQsQ0FBQyxDQUFBO2dCQUNILENBQUM7cUJBQU0sQ0FBQztvQkFDUCxRQUFRLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3ZDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO29CQUNyRCxRQUFRLENBQ1AsR0FBRyxRQUFRLGNBQWMsYUFBYSxXQUFXLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFDMUUsS0FBSyxDQUNMLENBQUE7b0JBQ0QsYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRTt3QkFDaEUsR0FBRyxFQUFFLE9BQU8sRUFBRTt3QkFDZCxLQUFLO3dCQUNMLEdBQUcsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRTtxQkFDL0IsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBRUQsYUFBYSxDQUFDLE1BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQ3hFLElBQUksYUFBYSxFQUFFLENBQUM7d0JBQ25CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTt3QkFDL0IsUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDekIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtnQkFDRixhQUFhLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDeEUsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO3dCQUMvQixRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO29CQUN4QixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNGLGFBQWEsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzlCLElBQUksYUFBYSxFQUFFLENBQUM7d0JBQ25CLFFBQVEsQ0FBQyxHQUFHLFFBQVEsU0FBUyxhQUFhLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUNsRSxhQUFhLEdBQUcsU0FBUyxDQUFBO3dCQUN6QixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO29CQUNoQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO2dCQUNGLGFBQWEsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQy9CLElBQUksYUFBYSxFQUFFLENBQUM7d0JBQ25CLFFBQVEsQ0FBQyxHQUFHLFFBQVEsVUFBVSxhQUFhLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO3dCQUNsRSxhQUFhLEdBQUcsU0FBUyxDQUFBO3dCQUN6QixNQUFNLEVBQUUsQ0FBQTtvQkFDVCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxLQUFLLENBQUMsYUFBYTtRQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtJQUM3QixDQUFDO0lBRU8sYUFBYTtRQUNwQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLCtCQUErQixDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBUywyQkFBMkIsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFBO1FBQ2hHLElBQUksR0FBRyxJQUFJO2FBQ1QsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7YUFDbkIsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7YUFDdEIsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsQixPQUFPLElBQUksSUFBSSxTQUFTLENBQUE7SUFDekIsQ0FBQztJQUVPLFlBQVk7UUFDbkIsSUFBSSxDQUFDO1lBQ0osTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FDbEQscUJBQXFCLG9DQUVyQixDQUFBO1lBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQy9DLHdCQUF3QixxQ0FFeEIsS0FBSyxDQUNMLENBQUE7WUFDRCxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQXlCLENBQUE7Z0JBQ3ZFLElBQ0MsT0FBTztvQkFDUCxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztvQkFDOUIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7b0JBQzNCLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQzNCLENBQUM7b0JBQ0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFBO2dCQUM1QyxDQUFDO2dCQUNELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHlEQUF5RCxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7UUFDRCxPQUFPLG9CQUFvQixDQUFBO0lBQzVCLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBZ0I7UUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsTUFBTSxtQkFBbUIsR0FBRztnQkFDM0IsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUztnQkFDakMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTthQUN2QyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHFCQUFxQixFQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLG1FQUduQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHdCQUF3QixFQUN4QixJQUFJLENBQUMsU0FBUyxtRUFHZCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsb0NBQTJCLENBQUE7WUFDM0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLG9DQUEyQixDQUFBO1FBQy9FLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXZrQlksbUJBQW1CO0lBaUM3QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsOEJBQThCLENBQUE7SUFDOUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtHQXZDTCxtQkFBbUIsQ0F1a0IvQjs7QUFFRCxTQUFTLGFBQWEsQ0FDckIsRUFBb0MsRUFDcEMsRUFBb0M7SUFFcEMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7UUFDZCxPQUFPLEVBQUUsQ0FBQyxTQUFTLEtBQUssRUFBRSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUMsVUFBVSxLQUFLLEVBQUUsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFBO0lBQ2pHLENBQUM7SUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBRSxFQUFFO0lBQ25ELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0IsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO1NBQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDMUUsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7QUFDRixDQUFDLENBQUEifQ==