"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
;
(function () {
    const { ipcRenderer, webFrame, contextBridge, webUtils } = require('electron');
    //#region Utilities
    function validateIPC(channel) {
        if (!channel || !channel.startsWith('vscode:')) {
            throw new Error(`Unsupported event IPC channel '${channel}'`);
        }
        return true;
    }
    function parseArgv(key) {
        for (const arg of process.argv) {
            if (arg.indexOf(`--${key}=`) === 0) {
                return arg.split('=')[1];
            }
        }
        return undefined;
    }
    //#endregion
    //#region Resolve Configuration
    let configuration = undefined;
    const resolveConfiguration = (async () => {
        const windowConfigIpcChannel = parseArgv('vscode-window-config');
        if (!windowConfigIpcChannel) {
            throw new Error('Preload: did not find expected vscode-window-config in renderer process arguments list.');
        }
        try {
            validateIPC(windowConfigIpcChannel);
            // Resolve configuration from electron-main
            const resolvedConfiguration = (configuration =
                await ipcRenderer.invoke(windowConfigIpcChannel));
            // Apply `userEnv` directly
            Object.assign(process.env, resolvedConfiguration.userEnv);
            // Apply zoom level early before even building the
            // window DOM elements to avoid UI flicker. We always
            // have to set the zoom level from within the window
            // because Chrome has it's own way of remembering zoom
            // settings per origin (if vscode-file:// is used) and
            // we want to ensure that the user configuration wins.
            webFrame.setZoomLevel(resolvedConfiguration.zoomLevel ?? 0);
            return resolvedConfiguration;
        }
        catch (error) {
            throw new Error(`Preload: unable to fetch vscode-window-config: ${error}`);
        }
    })();
    //#endregion
    //#region Resolve Shell Environment
    /**
     * If VSCode is not run from a terminal, we should resolve additional
     * shell specific environment from the OS shell to ensure we are seeing
     * all development related environment variables. We do this from the
     * main process because it may involve spawning a shell.
     */
    const resolveShellEnv = (async () => {
        // Resolve `userEnv` from configuration and
        // `shellEnv` from the main side
        const [userEnv, shellEnv] = await Promise.all([
            (async () => (await resolveConfiguration).userEnv)(),
            ipcRenderer.invoke('vscode:fetchShellEnv'),
        ]);
        return { ...process.env, ...shellEnv, ...userEnv };
    })();
    //#endregion
    //#region Globals Definition
    // #######################################################################
    // ###                                                                 ###
    // ###       !!! DO NOT USE GET/SET PROPERTIES ANYWHERE HERE !!!       ###
    // ###       !!!  UNLESS THE ACCESS IS WITHOUT SIDE EFFECTS  !!!       ###
    // ###       (https://github.com/electron/electron/issues/25516)       ###
    // ###                                                                 ###
    // #######################################################################
    const globals = {
        /**
         * A minimal set of methods exposed from Electron's `ipcRenderer`
         * to support communication to main process.
         */
        ipcRenderer: {
            send(channel, ...args) {
                if (validateIPC(channel)) {
                    ipcRenderer.send(channel, ...args);
                }
            },
            invoke(channel, ...args) {
                validateIPC(channel);
                return ipcRenderer.invoke(channel, ...args);
            },
            on(channel, listener) {
                validateIPC(channel);
                ipcRenderer.on(channel, listener);
                return this;
            },
            once(channel, listener) {
                validateIPC(channel);
                ipcRenderer.once(channel, listener);
                return this;
            },
            removeListener(channel, listener) {
                validateIPC(channel);
                ipcRenderer.removeListener(channel, listener);
                return this;
            },
        },
        ipcMessagePort: {
            acquire(responseChannel, nonce) {
                if (validateIPC(responseChannel)) {
                    const responseListener = (e, responseNonce) => {
                        // validate that the nonce from the response is the same
                        // as when requested. and if so, use `postMessage` to
                        // send the `MessagePort` safely over, even when context
                        // isolation is enabled
                        if (nonce === responseNonce) {
                            ipcRenderer.off(responseChannel, responseListener);
                            window.postMessage(nonce, '*', e.ports);
                        }
                    };
                    // handle reply from main
                    ipcRenderer.on(responseChannel, responseListener);
                }
            },
        },
        /**
         * Support for subset of methods of Electron's `webFrame` type.
         */
        webFrame: {
            setZoomLevel(level) {
                if (typeof level === 'number') {
                    webFrame.setZoomLevel(level);
                }
            },
        },
        /**
         * Support for subset of Electron's `webUtils` type.
         */
        webUtils: {
            getPathForFile(file) {
                return webUtils.getPathForFile(file);
            },
        },
        /**
         * Support for a subset of access to node.js global `process`.
         *
         * Note: when `sandbox` is enabled, the only properties available
         * are https://github.com/electron/electron/blob/master/docs/api/process.md#sandbox
         */
        process: {
            get platform() {
                return process.platform;
            },
            get arch() {
                return process.arch;
            },
            get env() {
                return { ...process.env };
            },
            get versions() {
                return process.versions;
            },
            get type() {
                return 'renderer';
            },
            get execPath() {
                return process.execPath;
            },
            cwd() {
                return (process.env['VSCODE_CWD'] ||
                    process.execPath.substr(0, process.execPath.lastIndexOf(process.platform === 'win32' ? '\\' : '/')));
            },
            shellEnv() {
                return resolveShellEnv;
            },
            getProcessMemoryInfo() {
                return process.getProcessMemoryInfo();
            },
            on(type, callback) {
                process.on(type, callback);
            },
        },
        /**
         * Some information about the context we are running in.
         */
        context: {
            /**
             * A configuration object made accessible from the main side
             * to configure the sandbox browser window.
             *
             * Note: intentionally not using a getter here because the
             * actual value will be set after `resolveConfiguration`
             * has finished.
             */
            configuration() {
                return configuration;
            },
            /**
             * Allows to await the resolution of the configuration object.
             */
            async resolveConfiguration() {
                return resolveConfiguration;
            },
        },
    };
    // Use `contextBridge` APIs to expose globals to VSCode
    // only if context isolation is enabled, otherwise just
    // add to the DOM global.
    if (process.contextIsolated) {
        try {
            contextBridge.exposeInMainWorld('vscode', globals);
        }
        catch (error) {
            console.error(error);
        }
    }
    else {
        ;
        window.vscode = globals;
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9zYW5kYm94L2VsZWN0cm9uLXNhbmRib3gvcHJlbG9hZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsMENBQTBDO0FBRTFDLENBQUM7QUFBQSxDQUFDO0lBQ0QsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUk5RSxtQkFBbUI7SUFFbkIsU0FBUyxXQUFXLENBQUMsT0FBZTtRQUNuQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEdBQVc7UUFDN0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELFlBQVk7SUFFWiwrQkFBK0I7SUFFL0IsSUFBSSxhQUFhLEdBQXNDLFNBQVMsQ0FBQTtJQUVoRSxNQUFNLG9CQUFvQixHQUFtQyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ3hFLE1BQU0sc0JBQXNCLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEtBQUssQ0FDZCx5RkFBeUYsQ0FDekYsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUVuQywyQ0FBMkM7WUFDM0MsTUFBTSxxQkFBcUIsR0FBMEIsQ0FBQyxhQUFhO2dCQUNsRSxNQUFNLFdBQVcsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1lBRWxELDJCQUEyQjtZQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFekQsa0RBQWtEO1lBQ2xELHFEQUFxRDtZQUNyRCxvREFBb0Q7WUFDcEQsc0RBQXNEO1lBQ3RELHNEQUFzRDtZQUN0RCxzREFBc0Q7WUFDdEQsUUFBUSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUE7WUFFM0QsT0FBTyxxQkFBcUIsQ0FBQTtRQUM3QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLENBQUM7SUFDRixDQUFDLENBQUMsRUFBRSxDQUFBO0lBRUosWUFBWTtJQUVaLG1DQUFtQztJQUVuQzs7Ozs7T0FLRztJQUNILE1BQU0sZUFBZSxHQUFnQyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hFLDJDQUEyQztRQUMzQyxnQ0FBZ0M7UUFDaEMsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDN0MsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BELFdBQVcsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUM7U0FDMUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLFFBQVEsRUFBRSxHQUFHLE9BQU8sRUFBRSxDQUFBO0lBQ25ELENBQUMsQ0FBQyxFQUFFLENBQUE7SUFFSixZQUFZO0lBRVosNEJBQTRCO0lBRTVCLDBFQUEwRTtJQUMxRSwwRUFBMEU7SUFDMUUsMEVBQTBFO0lBQzFFLDBFQUEwRTtJQUMxRSwwRUFBMEU7SUFDMUUsMEVBQTBFO0lBQzFFLDBFQUEwRTtJQUUxRSxNQUFNLE9BQU8sR0FBRztRQUNmOzs7V0FHRztRQUVILFdBQVcsRUFBRTtZQUNaLElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO2dCQUNuQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUMxQixXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO2dCQUNyQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBRXBCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQsRUFBRSxDQUFDLE9BQWUsRUFBRSxRQUFvRTtnQkFDdkYsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUVwQixXQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFFakMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxRQUFvRTtnQkFDekYsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUVwQixXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFFbkMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsY0FBYyxDQUNiLE9BQWUsRUFDZixRQUFvRTtnQkFFcEUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUVwQixXQUFXLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFFN0MsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0Q7UUFFRCxjQUFjLEVBQUU7WUFDZixPQUFPLENBQUMsZUFBdUIsRUFBRSxLQUFhO2dCQUM3QyxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUNsQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBNEIsRUFBRSxhQUFxQixFQUFFLEVBQUU7d0JBQ2hGLHdEQUF3RDt3QkFDeEQscURBQXFEO3dCQUNyRCx3REFBd0Q7d0JBQ3hELHVCQUF1Qjt3QkFDdkIsSUFBSSxLQUFLLEtBQUssYUFBYSxFQUFFLENBQUM7NEJBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLENBQUE7NEJBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQ3hDLENBQUM7b0JBQ0YsQ0FBQyxDQUFBO29CQUVELHlCQUF5QjtvQkFDekIsV0FBVyxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDbEQsQ0FBQztZQUNGLENBQUM7U0FDRDtRQUVEOztXQUVHO1FBQ0gsUUFBUSxFQUFFO1lBQ1QsWUFBWSxDQUFDLEtBQWE7Z0JBQ3pCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQy9CLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1NBQ0Q7UUFFRDs7V0FFRztRQUNILFFBQVEsRUFBRTtZQUNULGNBQWMsQ0FBQyxJQUFVO2dCQUN4QixPQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDckMsQ0FBQztTQUNEO1FBRUQ7Ozs7O1dBS0c7UUFDSCxPQUFPLEVBQUU7WUFDUixJQUFJLFFBQVE7Z0JBQ1gsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFBO1lBQ3hCLENBQUM7WUFDRCxJQUFJLElBQUk7Z0JBQ1AsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFBO1lBQ3BCLENBQUM7WUFDRCxJQUFJLEdBQUc7Z0JBQ04sT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQzFCLENBQUM7WUFDRCxJQUFJLFFBQVE7Z0JBQ1gsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFBO1lBQ3hCLENBQUM7WUFDRCxJQUFJLElBQUk7Z0JBQ1AsT0FBTyxVQUFVLENBQUE7WUFDbEIsQ0FBQztZQUNELElBQUksUUFBUTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUE7WUFDeEIsQ0FBQztZQUVELEdBQUc7Z0JBQ0YsT0FBTyxDQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO29CQUN6QixPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FDdEIsQ0FBQyxFQUNELE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN2RSxDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsUUFBUTtnQkFDUCxPQUFPLGVBQWUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsb0JBQW9CO2dCQUNuQixPQUFPLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQ3RDLENBQUM7WUFFRCxFQUFFLENBQUMsSUFBWSxFQUFFLFFBQWtDO2dCQUNsRCxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUMzQixDQUFDO1NBQ0Q7UUFFRDs7V0FFRztRQUNILE9BQU8sRUFBRTtZQUNSOzs7Ozs7O2VBT0c7WUFDSCxhQUFhO2dCQUNaLE9BQU8sYUFBYSxDQUFBO1lBQ3JCLENBQUM7WUFFRDs7ZUFFRztZQUNILEtBQUssQ0FBQyxvQkFBb0I7Z0JBQ3pCLE9BQU8sb0JBQW9CLENBQUE7WUFDNUIsQ0FBQztTQUNEO0tBQ0QsQ0FBQTtJQUVELHVEQUF1RDtJQUN2RCx1REFBdUQ7SUFDdkQseUJBQXlCO0lBQ3pCLElBQUksT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQztZQUNKLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxDQUFDO1FBQUMsTUFBYyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUE7SUFDbEMsQ0FBQztBQUNGLENBQUMsQ0FBQyxFQUFFLENBQUEifQ==