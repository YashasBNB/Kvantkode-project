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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyRW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvc2VydmVyRW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBRW5DLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQXNCLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDN0YsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd6RCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQW1EO0lBQzVFLDhCQUE4QjtJQUU5QixJQUFJLEVBQUU7UUFDTCxJQUFJLEVBQUUsUUFBUTtRQUNkLEdBQUcsRUFBRSxHQUFHO1FBQ1IsSUFBSSxFQUFFLFlBQVk7UUFDbEIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3hCLE1BQU0sRUFDTiwrRkFBK0YsQ0FDL0Y7S0FDRDtJQUNELElBQUksRUFBRTtRQUNMLElBQUksRUFBRSxRQUFRO1FBQ2QsR0FBRyxFQUFFLEdBQUc7UUFDUixJQUFJLEVBQUUsbUJBQW1CO1FBQ3pCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixNQUFNLEVBQ04sd0xBQXdMLENBQ3hMO0tBQ0Q7SUFDRCxhQUFhLEVBQUU7UUFDZCxJQUFJLEVBQUUsUUFBUTtRQUNkLEdBQUcsRUFBRSxHQUFHO1FBQ1IsSUFBSSxFQUFFLE1BQU07UUFDWixXQUFXLEVBQUUsR0FBRyxDQUFDLFFB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