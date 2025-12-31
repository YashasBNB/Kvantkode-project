/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DefaultURITransformer } from '../../../base/common/uriIpc.js';
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { Server as ChildProcessServer } from '../../../base/parts/ipc/node/ipc.cp.js';
import { Server as UtilityProcessServer } from '../../../base/parts/ipc/node/ipc.mp.js';
import { localize } from '../../../nls.js';
import { OPTIONS, parseArgs } from '../../environment/node/argv.js';
import { NativeEnvironmentService } from '../../environment/node/environmentService.js';
import { getLogLevel } from '../../log/common/log.js';
import { LoggerChannel } from '../../log/common/logIpc.js';
import { LogService } from '../../log/common/logService.js';
import { LoggerService } from '../../log/node/loggerService.js';
import product from '../../product/common/product.js';
import { TerminalIpcChannels } from '../common/terminal.js';
import { HeartbeatService } from './heartbeatService.js';
import { PtyService } from './ptyService.js';
import { isUtilityProcess } from '../../../base/parts/sandbox/node/electronTypes.js';
import { timeout } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
startPtyHost();
async function startPtyHost() {
    // Parse environment variables
    const startupDelay = parseInt(process.env.VSCODE_STARTUP_DELAY ?? '0');
    const simulatedLatency = parseInt(process.env.VSCODE_LATENCY ?? '0');
    const reconnectConstants = {
        graceTime: parseInt(process.env.VSCODE_RECONNECT_GRACE_TIME || '0'),
        shortGraceTime: parseInt(process.env.VSCODE_RECONNECT_SHORT_GRACE_TIME || '0'),
        scrollback: parseInt(process.env.VSCODE_RECONNECT_SCROLLBACK || '100'),
    };
    // Sanitize environment
    delete process.env.VSCODE_RECONNECT_GRACE_TIME;
    delete process.env.VSCODE_RECONNECT_SHORT_GRACE_TIME;
    delete process.env.VSCODE_RECONNECT_SCROLLBACK;
    delete process.env.VSCODE_LATENCY;
    delete process.env.VSCODE_STARTUP_DELAY;
    // Delay startup if needed, this must occur before RPC is setup to avoid the channel from timing
    // out.
    if (startupDelay) {
        await timeout(startupDelay);
    }
    // Setup RPC
    const _isUtilityProcess = isUtilityProcess(process);
    let server;
    if (_isUtilityProcess) {
        server = new UtilityProcessServer();
    }
    else {
        server = new ChildProcessServer(TerminalIpcChannels.PtyHost);
    }
    // Services
    const productService = { _serviceBrand: undefined, ...product };
    const environmentService = new NativeEnvironmentService(parseArgs(process.argv, OPTIONS), productService);
    const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
    server.registerChannel(TerminalIpcChannels.Logger, new LoggerChannel(loggerService, () => DefaultURITransformer));
    const logger = loggerService.createLogger('ptyhost', { name: localize('ptyHost', 'Pty Host') });
    const logService = new LogService(logger);
    // Log developer config
    if (startupDelay) {
        logService.warn(`Pty Host startup is delayed ${startupDelay}ms`);
    }
    if (simulatedLatency) {
        logService.warn(`Pty host is simulating ${simulatedLatency}ms latency`);
    }
    const disposables = new DisposableStore();
    // Heartbeat responsiveness tracking
    const heartbeatService = new HeartbeatService();
    server.registerChannel(TerminalIpcChannels.Heartbeat, ProxyChannel.fromService(heartbeatService, disposables));
    // Init pty service
    const ptyService = new PtyService(logService, productService, reconnectConstants, simulatedLatency);
    const ptyServiceChannel = ProxyChannel.fromService(ptyService, disposables);
    server.registerChannel(TerminalIpcChannels.PtyHost, ptyServiceChannel);
    // Register a channel for direct communication via Message Port
    if (_isUtilityProcess) {
        server.registerChannel(TerminalIpcChannels.PtyHostWindow, ptyServiceChannel);
    }
    // Clean up
    process.once('exit', () => {
        logService.trace('Pty host exiting');
        logService.dispose();
        heartbeatService.dispose();
        ptyService.dispose();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5SG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3B0eUhvc3RNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsTUFBTSxJQUFJLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckYsT0FBTyxFQUFFLE1BQU0sSUFBSSxvQkFBb0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUVyRCxPQUFPLEVBQXVCLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFN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