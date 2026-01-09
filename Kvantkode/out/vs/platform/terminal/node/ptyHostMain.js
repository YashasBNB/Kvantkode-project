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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5SG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvcHR5SG9zdE1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLElBQUksa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsTUFBTSxJQUFJLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRXJELE9BQU8sRUFBdUIsbUJBQW1CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUMsT0FB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