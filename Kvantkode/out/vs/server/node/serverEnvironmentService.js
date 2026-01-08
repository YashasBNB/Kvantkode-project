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
import * as nls from '../../nls.js';
import { NativeEnvironmentService } from '../../platform/environment/node/environmentService.js';
import { OPTIONS } from '../../platform/environment/node/argv.js';
import { refineServiceDecorator } from '../../platform/instantiation/common/instantiation.js';
import { IEnvironmentService, } from '../../platform/environment/common/environment.js';
import { memoize } from '../../base/common/decorators.js';
export const serverOptions = {
    /* ----- server setup ----- */
    host: {
        type: 'string',
        cat: 'o',
        args: 'ip-address',
        description: nls.localize('host', "The host name or IP address the server should listen to. If not set, defaults to 'localhost'."),
    },
    port: {
        type: 'string',
        cat: 'o',
        args: 'port | port range',
        description: nls.localize('port', 'The port the server should listen to. If 0 is passed a random free port is picked. If a range in the format num-num is passed, a free port from the range (end inclusive) is selected.'),
    },
    'socket-path': {
        type: 'string',
        cat: 'o',
        args: 'path',
        description: nls.localize('socket-path', 'The path to a socket file for the server to listen to.'),
    },
    'server-base-path': {
        type: 'string',
        cat: 'o',
        args: 'path',
        description: nls.localize('server-base-path', "The path under which the web UI and the code server is provided. Defaults to '/'.`"),
    },
    'connection-token': {
        type: 'string',
        cat: 'o',
        args: 'token',
        deprecates: ['connectionToken'],
        description: nls.localize('connection-token', 'A secret that must be included with all requests.'),
    },
    'connection-token-file': {
        type: 'string',
        cat: 'o',
        args: 'path',
        deprecates: ['connection-secret', 'connectionTokenFile'],
        description: nls.localize('connection-token-file', 'Path to a file that contains the connection token.'),
    },
    'without-connection-token': {
        type: 'boolean',
        cat: 'o',
        description: nls.localize('without-connection-token', 'Run without a connection token. Only use this if the connection is secured by other means.'),
    },
    'disable-websocket-compression': { type: 'boolean' },
    'print-startup-performance': { type: 'boolean' },
    'print-ip-address': { type: 'boolean' },
    'accept-server-license-terms': {
        type: 'boolean',
        cat: 'o',
        description: nls.localize('acceptLicenseTerms', 'If set, the user accepts the server license terms and the server will be started without a user prompt.'),
    },
    'server-data-dir': {
        type: 'string',
        cat: 'o',
        description: nls.localize('serverDataDir', 'Specifies the directory that server data is kept in.'),
    },
    'telemetry-level': {
        type: 'string',
        cat: 'o',
        args: 'level',
        description: nls.localize('telemetry-level', "Sets the initial telemetry level. Valid levels are: 'off', 'crash', 'error' and 'all'. If not specified, the server will send telemetry until a client connects, it will then use the clients telemetry setting. Setting this to 'off' is equivalent to --disable-telemetry"),
    },
    /* ----- vs code options ---	-- */
    'user-data-dir': OPTIONS['user-data-dir'],
    'enable-smoke-test-driver': OPTIONS['enable-smoke-test-driver'],
    'disable-telemetry': OPTIONS['disable-telemetry'],
    'disable-workspace-trust': OPTIONS['disable-workspace-trust'],
    'file-watcher-polling': { type: 'string', deprecates: ['fileWatcherPolling'] },
    log: OPTIONS['log'],
    logsPath: OPTIONS['logsPath'],
    'force-disable-user-env': OPTIONS['force-disable-user-env'],
    /* ----- vs code web options ----- */
    folder: {
        type: 'string',
        deprecationMessage: 'No longer supported. Folder needs to be provided in the browser URL or with `default-folder`.',
    },
    workspace: {
        type: 'string',
        deprecationMessage: 'No longer supported. Workspace needs to be provided in the browser URL or with `default-workspace`.',
    },
    'default-folder': {
        type: 'string',
        description: nls.localize('default-folder', 'The workspace folder to open when no input is specified in the browser URL. A relative or absolute path resolved against the current working directory.'),
    },
    'default-workspace': {
        type: 'string',
        description: nls.localize('default-workspace', 'The workspace to open when no input is specified in the browser URL. A relative or absolute path resolved against the current working directory.'),
    },
    'enable-sync': { type: 'boolean' },
    'github-auth': { type: 'string' },
    'use-test-resolver': { type: 'boolean' },
    /* ----- extension management ----- */
    'extensions-dir': OPTIONS['extensions-dir'],
    'extensions-download-dir': OPTIONS['extensions-download-dir'],
    'builtin-extensions-dir': OPTIONS['builtin-extensions-dir'],
    'install-extension': OPTIONS['install-extension'],
    'install-builtin-extension': OPTIONS['install-builtin-extension'],
    'update-extensions': OPTIONS['update-extensions'],
    'uninstall-extension': OPTIONS['uninstall-extension'],
    'list-extensions': OPTIONS['list-extensions'],
    'locate-extension': OPTIONS['locate-extension'],
    'show-versions': OPTIONS['show-versions'],
    category: OPTIONS['category'],
    force: OPTIONS['force'],
    'do-not-sync': OPTIONS['do-not-sync'],
    'do-not-include-pack-dependencies': OPTIONS['do-not-include-pack-dependencies'],
    'pre-release': OPTIONS['pre-release'],
    'start-server': {
        type: 'boolean',
        cat: 'e',
        description: nls.localize('start-server', "Start the server when installing or uninstalling extensions. To be used in combination with 'install-extension', 'install-builtin-extension' and 'uninstall-extension'."),
    },
    /* ----- remote development options ----- */
    'enable-remote-auto-shutdown': { type: 'boolean' },
    'remote-auto-shutdown-without-delay': { type: 'boolean' },
    'use-host-proxy': { type: 'boolean' },
    'without-browser-env-var': { type: 'boolean' },
    /* ----- server cli ----- */
    help: OPTIONS['help'],
    version: OPTIONS['version'],
    'locate-shell-integration-path': OPTIONS['locate-shell-integration-path'],
    compatibility: { type: 'string' },
    _: OPTIONS['_'],
};
export const IServerEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class ServerEnvironmentService extends NativeEnvironmentService {
    get userRoamingDataHome() {
        return this.appSettingsHome;
    }
    get args() {
        return super.args;
    }
}
__decorate([
    memoize
], ServerEnvironmentService.prototype, "userRoamingDataHome", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyRW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXJFbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFFbkMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBc0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3pELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBbUQ7SUFDNUUsOEJBQThCO0lBRTlCLElBQUksRUFBRTtRQUNMLElBQUksRUFBRSxRQUFRO1FBQ2QsR0FBRyxFQUFFLEdBQUc7UUFDUixJQUFJLEVBQUUsWUFBWTtRQUNsQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDeEIsTUFBTSxFQUNOLCtGQUErRixDQUMvRjtLQUNEO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsSUFBSSxFQUFFLFFBQVE7UUFDZCxHQUFHLEVBQUUsR0FBRztRQUNSLElBQUksRUFBRSxtQkFBbUI7UUFDekIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLE1BQU0sRUFDTix3TEFBd0wsQ0FDeEw7S0FDRDtJQUNELGFBQWEsRUFBRTtRQUNkLElBQUksRUFBRSxRQUFRO1FBQ2QsR0FBRyxFQUFFLEdBQUc7UUFDUixJQUFJLEVBQUUsTUFBTTtRQUNaLFdBQVcsRUFBRSxHQUFHLENB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