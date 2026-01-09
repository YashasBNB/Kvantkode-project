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
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { parsePtyHostDebugPort } from '../../environment/node/environmentService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { NullTelemetryService } from '../../telemetry/common/telemetryUtils.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { Client as MessagePortClient } from '../../../base/parts/ipc/electron-main/ipc.mp.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { deepClone } from '../../../base/common/objects.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Schemas } from '../../../base/common/network.js';
let ElectronPtyHostStarter = class ElectronPtyHostStarter extends Disposable {
    constructor(_reconnectConstants, _configurationService, _environmentMainService, _lifecycleMainService, _logService) {
        super();
        this._reconnectConstants = _reconnectConstants;
        this._configurationService = _configurationService;
        this._environmentMainService = _environmentMainService;
        this._lifecycleMainService = _lifecycleMainService;
        this._logService = _logService;
        this.utilityProcess = undefined;
        this._onRequestConnection = new Emitter();
        this.onRequestConnection = this._onRequestConnection.event;
        this._onWillShutdown = new Emitter();
        this.onWillShutdown = this._onWillShutdown.event;
        this._register(this._lifecycleMainService.onWillShutdown(() => this._onWillShutdown.fire()));
        // Listen for new windows to establish connection directly to pty host
        validatedIpcMain.on('vscode:createPtyHostMessageChannel', (e, nonce) => this._onWindowConnection(e, nonce));
        this._register(toDisposable(() => {
            validatedIpcMain.removeHandler('vscode:createPtyHostMessageChannel');
        }));
    }
    start() {
        this.utilityProcess = new UtilityProcess(this._logService, NullTelemetryService, this._lifecycleMainService);
        const inspectParams = parsePtyHostDebugPort(this._environmentMainService.args, this._environmentMainService.isBuilt);
        const execArgv = inspectParams.port
            ? ['--nolazy', `--inspect${inspectParams.break ? '-brk' : ''}=${inspectParams.port}`]
            : undefined;
        this.utilityProcess.start({
            type: 'ptyHost',
            entryPoint: 'vs/platform/terminal/node/ptyHostMain',
            execArgv,
            args: [
                '--logsPath',
                this._environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
            ],
            env: this._createPtyHostConfiguration(),
        });
        const port = this.utilityProcess.connect();
        const client = new MessagePortClient(port, 'ptyHost');
        const store = new DisposableStore();
        store.add(client);
        store.add(toDisposable(() => {
            this.utilityProcess?.kill();
            this.utilityProcess?.dispose();
            this.utilityProcess = undefined;
        }));
        return {
            client,
            store,
            onDidProcessExit: this.utilityProcess.onExit,
        };
    }
    _createPtyHostConfiguration() {
        this._environmentMainService.unsetSnapExportedVariables();
        const config = {
            ...deepClone(process.env),
            VSCODE_ESM_ENTRYPOINT: 'vs/platform/terminal/node/ptyHostMain',
            VSCODE_PIPE_LOGGING: 'true',
            VSCODE_VERBOSE_LOGGING: 'true', // transmit console logs from server to client,
            VSCODE_RECONNECT_GRACE_TIME: String(this._reconnectConstants.graceTime),
            VSCODE_RECONNECT_SHORT_GRACE_TIME: String(this._reconnectConstants.shortGraceTime),
            VSCODE_RECONNECT_SCROLLBACK: String(this._reconnectConstants.scrollback),
        };
        const simulatedLatency = this._configurationService.getValue("terminal.integrated.developer.ptyHost.latency" /* TerminalSettingId.DeveloperPtyHostLatency */);
        if (simulatedLatency && typeof simulatedLatency === 'number') {
            config.VSCODE_LATENCY = String(simulatedLatency);
        }
        const startupDelay = this._configurationService.getValue("terminal.integrated.developer.ptyHost.startupDelay" /* TerminalSettingId.DeveloperPtyHostStartupDelay */);
        if (startupDelay && typeof startupDelay === 'number') {
            config.VSCODE_STARTUP_DELAY = String(startupDelay);
        }
        this._environmentMainService.restoreSnapExportedVariables();
        return config;
    }
    _onWindowConnection(e, nonce) {
        this._onRequestConnection.fire();
        const port = this.utilityProcess.connect();
        // Check back if the requesting window meanwhile closed
        // Since shared process is delayed on startup there is
        // a chance that the window close before the shared process
        // was ready for a connection.
        if (e.sender.isDestroyed()) {
            port.close();
            return;
        }
        e.sender.postMessage('vscode:createPtyHostMessageChannelResult', nonce, [port]);
    }
};
ElectronPtyHostStarter = __decorate([
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, ILifecycleMainService),
    __param(4, ILogService)
], ElectronPtyHostStarter);
export { ElectronPtyHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25QdHlIb3N0U3RhcnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvZWxlY3Ryb24tbWFpbi9lbGVjdHJvblB0eUhvc3RTdGFydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWxELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFB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