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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvc2FuZGJveC9lbGVjdHJvbi1zYW5kYm94L3ByZWxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLDBDQUEwQztBQUUxQyxDQUFDO0FBQUEsQ0FBQztJQUNELE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFJOUUsbUJBQW1CO0lBRW5CLFNBQVMsV0FBVyxDQUFDLE9BQWU7UUFDbkMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxPQUFPLEdBQUcsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxHQUFXO1FBQzdCLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxZQUFZO0lBRVosK0JBQStCO0lBRS9CLElBQUksYUFBYSxHQUFzQyxTQUFTLENBQUE7SUFFaEUsTUFBTSxvQkFBb0IsR0FBbUMsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUN4RSxNQUFNLHNCQUFzQixHQUFH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