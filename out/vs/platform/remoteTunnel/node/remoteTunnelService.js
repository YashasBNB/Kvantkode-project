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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZVR1bm5lbC9ub2RlL3JlbW90ZVR1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLDJCQUEyQixFQUMzQiwrQkFBK0IsRUFJL0IsV0FBVyxFQUNYLE1BQU0sRUFDTixZQUFZLEVBR1osb0JBQW9CLEdBRXBCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQVcsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQThCLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25HLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8s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