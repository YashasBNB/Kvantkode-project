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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3dlYi5mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFLTixJQUFJLEdBQ0osTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUUzQyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLElBQUksRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFhckQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO0FBQ25CLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQWMsQ0FBQTtBQUUxRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQ3JCLFVBQXVCLEVBQ3ZCLE9BQXNDO0lBRXRDLDBCQUEwQjtJQUMxQixJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtJQUVqQyx3RUFBd0U7SUFDeEUscUVBQXFFO0lBQ3JFLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUE7SUFDekUsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEdBQUcsSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUVELDJCQUEyQjtJQUMzQixJQUFJLEtBQUss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