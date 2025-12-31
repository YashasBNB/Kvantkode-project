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
import { app } from 'electron';
import { coalesce } from '../../../base/common/arrays.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { whenDeleted } from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IURLService } from '../../url/common/url.js';
import { IWindowsMainService, } from '../../windows/electron-main/windows.js';
export const ID = 'launchMainService';
export const ILaunchMainService = createDecorator(ID);
let LaunchMainService = class LaunchMainService {
    constructor(logService, windowsMainService, urlService, configurationService) {
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.urlService = urlService;
        this.configurationService = configurationService;
    }
    async start(args, userEnv) {
        this.logService.trace('Received data from other instance: ', args, userEnv);
        // macOS: Electron > 7.x changed its behaviour to not
        // bring the application to the foreground when a window
        // is focused programmatically. Only via `app.focus` and
        // the option `steal: true` can you get the previous
        // behaviour back. The only reason to use this option is
        // when a window is getting focused while the application
        // is not in the foreground and since we got instructed
        // to open a new window from another instance, we ensure
        // that the app has focus.
        if (isMacintosh) {
            app.focus({ steal: true });
        }
        // Check early for open-url which is handled in URL service
        const urlsToOpen = this.parseOpenUrl(args);
        if (urlsToOpen.length) {
            let whenWindowReady = Promise.resolve();
            // Create a window if there is none
            if (this.windowsMainService.getWindowCount() === 0) {
                const window = (await this.windowsMainService.openEmptyWindow({ context: 4 /* OpenContext.DESKTOP */ })).at(0);
                if (window) {
                    whenWindowReady = window.ready();
                }
            }
            // Make sure a window is open, ready to receive the url event
            whenWindowReady.then(() => {
                for (const { uri, originalUrl } of urlsToOpen) {
                    this.urlService.open(uri, { originalUrl });
                }
            });
        }
        // Otherwise handle in windows service
        else {
            return this.startOpenWindow(args, userEnv);
        }
    }
    parseOpenUrl(args) {
        if (args['open-url'] && args._urls && args._urls.length > 0) {
            // --open-url must contain -- followed by the url(s)
            // process.argv is used over args._ as args._ are resolved to file paths at this point
            return coalesce(args._urls.map((url) => {
                try {
                    return { uri: URI.parse(url), originalUrl: url };
                }
                catch (err) {
                    return null;
                }
            }));
        }
        return [];
    }
    async startOpenWindow(args, userEnv) {
        const context = isLaunchedFromCli(userEnv) ? 0 /* OpenContext.CLI */ : 4 /* OpenContext.DESKTOP */;
        let usedWindows = [];
        const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
        const remoteAuthority = args.remote || undefined;
        const baseConfig = {
            context,
            cli: args,
            /**
             * When opening a new window from a second instance that sent args and env
             * over to this instance, we want to preserve the environment only if that second
             * instance was spawned from the CLI or used the `--preserve-env` flag (example:
             * when using `open -n "VSCode.app" --args --preserve-env WORKSPACE_FOLDER`).
             *
             * This is done to ensure that the second window gets treated exactly the same
             * as the first window, for example, it gets the same resolved user shell environment.
             *
             * https://github.com/microsoft/vscode/issues/194736
             */
            userEnv: args['preserve-env'] || context === 0 /* OpenContext.CLI */ ? userEnv : undefined,
            waitMarkerFileURI,
            remoteAuthority,
            forceProfile: args.profile,
            forceTempProfile: args['profile-temp'],
        };
        // Special case extension development
        if (!!args.extensionDevelopmentPath) {
            await this.windowsMainService.openExtensionDevelopmentHostWindow(args.extensionDevelopmentPath, baseConfig);
        }
        // Start without file/folder arguments
        else if (!args._.length && !args['folder-uri'] && !args['file-uri']) {
            let openNewWindow = false;
            // Force new window
            if (args['new-window'] || baseConfig.forceProfile || baseConfig.forceTempProfile) {
                openNewWindow = true;
            }
            // Force reuse window
            else if (args['reuse-window']) {
                openNewWindow = false;
            }
            // Otherwise check for settings
            else {
                const windowConfig = this.configurationService.getValue('window');
                const openWithoutArgumentsInNewWindowConfig = windowConfig?.openWithoutArgumentsInNewWindow || 'default'; /* default */
                switch (openWithoutArgumentsInNewWindowConfig) {
                    case 'on':
                        openNewWindow = true;
                        break;
                    case 'off':
                        openNewWindow = false;
                        break;
                    default:
                        openNewWindow = !isMacintosh; // prefer to restore running instance on macOS
                }
            }
            // Open new Window
            if (openNewWindow) {
                usedWindows = await this.windowsMainService.open({
                    ...baseConfig,
                    forceNewWindow: true,
                    forceEmpty: true,
                });
            }
            // Focus existing window or open if none opened
            else {
                const lastActive = this.windowsMainService.getLastActiveWindow();
                if (lastActive) {
                    this.windowsMainService.openExistingWindow(lastActive, baseConfig);
                    usedWindows = [lastActive];
                }
                else {
                    usedWindows = await this.windowsMainService.open({
                        ...baseConfig,
                        forceEmpty: true,
                    });
                }
            }
        }
        // Start with file/folder arguments
        else {
            usedWindows = await this.windowsMainService.open({
                ...baseConfig,
                forceNewWindow: args['new-window'],
                preferNewWindow: !args['reuse-window'] && !args.wait,
                forceReuseWindow: args['reuse-window'],
                diffMode: args.diff,
                mergeMode: args.merge,
                addMode: args.add,
                removeMode: args.remove,
                noRecentEntry: !!args['skip-add-to-recently-opened'],
                gotoLineMode: args.goto,
            });
        }
        // If the other instance is waiting to be killed, we hook up a window listener if one window
        // is being used and only then resolve the startup promise which will kill this second instance.
        // In addition, we poll for the wait marker file to be deleted to return.
        if (waitMarkerFileURI && usedWindows.length === 1 && usedWindows[0]) {
            return Promise.race([
                usedWindows[0].whenClosedOrLoaded,
                whenDeleted(waitMarkerFileURI.fsPath),
            ]).then(() => undefined, () => undefined);
        }
    }
    async getMainProcessId() {
        this.logService.trace('Received request for process ID from other instance.');
        return process.pid;
    }
};
LaunchMainService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, IURLService),
    __param(3, IConfigurationService)
], LaunchMainService);
export { LaunchMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF1bmNoTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sYXVuY2gvZWxlY3Ryb24tbWFpbi9sYXVuY2hNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFHckQsT0FBTyxFQUVOLG1CQUFtQixHQUVuQixNQUFNLHdDQUF3QyxDQUFBO0FBRy9DLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQTtBQUNyQyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLEVBQUUsQ0FBQyxDQUFBO0FBZWxFLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBRzdCLFlBQytCLFVBQXVCLEVBQ2Ysa0JBQXVDLEVBQy9DLFVBQXVCLEVBQ2Isb0JBQTJDO1FBSHJELGVBQVUs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