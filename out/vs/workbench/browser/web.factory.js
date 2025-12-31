/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Menu, } from './web.api.js';
import { BrowserMain } from './web.main.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { mark } from '../../base/common/performance.js';
import { MenuId, MenuRegistry } from '../../platform/actions/common/actions.js';
import { DeferredPromise } from '../../base/common/async.js';
import { asArray } from '../../base/common/arrays.js';
let created = false;
const workbenchPromise = new DeferredPromise();
/**
 * Creates the workbench with the provided options in the provided container.
 *
 * @param domElement the container to create the workbench in
 * @param options for setting up the workbench
 */
export function create(domElement, options) {
    // Mark start of workbench
    mark('code/didLoadWorkbenchMain');
    // Assert that the workbench is not created more than once. We currently
    // do not support this and require a full context switch to clean-up.
    if (created) {
        throw new Error('Unable to create the VSCode workbench more than once.');
    }
    else {
        created = true;
    }
    // Register commands if any
    if (Array.isArray(options.commands)) {
        for (const command of options.commands) {
            CommandsRegistry.registerCommand(command.id, (accessor, ...args) => {
                // we currently only pass on the arguments but not the accessor
                // to the command to reduce our exposure of internal API.
                return command.handler(...args);
            });
            // Commands with labels appear in the command palette
            if (command.label) {
                for (const menu of asArray(command.menu ?? Menu.CommandPalette)) {
                    MenuRegistry.appendMenuItem(asMenuId(menu), {
                        command: { id: command.id, title: command.label },
                    });
                }
            }
        }
    }
    // Startup workbench and resolve waiters
    let instantiatedWorkbench = undefined;
    new BrowserMain(domElement, options).open().then((workbench) => {
        instantiatedWorkbench = workbench;
        workbenchPromise.complete(workbench);
    });
    return toDisposable(() => {
        if (instantiatedWorkbench) {
            instantiatedWorkbench.shutdown();
        }
        else {
            workbenchPromise.p.then((instantiatedWorkbench) => instantiatedWorkbench.shutdown());
        }
    });
}
function asMenuId(menu) {
    switch (menu) {
        case Menu.CommandPalette:
            return MenuId.CommandPalette;
        case Menu.StatusBarWindowIndicatorMenu:
            return MenuId.StatusBarWindowIndicatorMenu;
    }
}
export var commands;
(function (commands) {
    /**
     * {@linkcode IWorkbench.commands IWorkbench.commands.executeCommand}
     */
    async function executeCommand(command, ...args) {
        const workbench = await workbenchPromise.p;
        return workbench.commands.executeCommand(command, ...args);
    }
    commands.executeCommand = executeCommand;
})(commands || (commands = {}));
export var logger;
(function (logger) {
    /**
     * {@linkcode IWorkbench.logger IWorkbench.logger.log}
     */
    function log(level, message) {
        workbenchPromise.p.then((workbench) => workbench.logger.log(level, message));
    }
    logger.log = log;
})(logger || (logger = {}));
export var env;
(function (env) {
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.retrievePerformanceMarks}
     */
    async function retrievePerformanceMarks() {
        const workbench = await workbenchPromise.p;
        return workbench.env.retrievePerformanceMarks();
    }
    env.retrievePerformanceMarks = retrievePerformanceMarks;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.getUriScheme}
     */
    async function getUriScheme() {
        const workbench = await workbenchPromise.p;
        return workbench.env.getUriScheme();
    }
    env.getUriScheme = getUriScheme;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.openUri}
     */
    async function openUri(target) {
        const workbench = await workbenchPromise.p;
        return workbench.env.openUri(target);
    }
    env.openUri = openUri;
})(env || (env = {}));
export var window;
(function (window) {
    /**
     * {@linkcode IWorkbench.window IWorkbench.window.withProgress}
     */
    async function withProgress(options, task) {
        const workbench = await workbenchPromise.p;
        return workbench.window.withProgress(options, task);
    }
    window.withProgress = withProgress;
    async function createTerminal(options) {
        const workbench = await workbenchPromise.p;
        workbench.window.createTerminal(options);
    }
    window.createTerminal = createTerminal;
    async function showInformationMessage(message, ...items) {
        const workbench = await workbenchPromise.p;
        return await workbench.window.showInformationMessage(message, ...items);
    }
    window.showInformationMessage = showInformationMessage;
})(window || (window = {}));
export var workspace;
(function (workspace) {
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.didResolveRemoteAuthority}
     */
    async function didResolveRemoteAuthority() {
        const workbench = await workbenchPromise.p;
        await workbench.workspace.didResolveRemoteAuthority();
    }
    workspace.didResolveRemoteAuthority = didResolveRemoteAuthority;
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.openTunnel}
     */
    async function openTunnel(tunnelOptions) {
        const workbench = await workbenchPromise.p;
        return workbench.workspace.openTunnel(tunnelOptions);
    }
    workspace.openTunnel = openTunnel;
})(workspace || (workspace = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93ZWIuZmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBS04sSUFBSSxHQUNKLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFM0MsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxJQUFJLEVBQW1CLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBYXJELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtBQUNuQixNQUFNLGdCQUFnQixHQUFHLElBQUksZUFBZSxFQUFjLENBQUE7QUFFMUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsTUFBTSxDQUNyQixVQUF1QixFQUN2QixPQUFzQztJQUV0QywwQkFBMEI7SUFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFFakMsd0VBQXdFO0lBQ3hFLHFFQUFxRTtJQUNyRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxHQUFHLElBQUksQ0FBQTtJQUNmLENBQUM7SUFFRCwyQkFBMkI7SUFDM0IsSUFBSSxLQUFLLENBQUMs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