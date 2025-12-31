"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
;
(function () {
    const { ipcRenderer, webFrame, contextBridge } = require('electron');
    function validateIPC(channel) {
        if (!channel || !channel.startsWith('vscode:')) {
            throw new Error(`Unsupported event IPC channel '${channel}'`);
        }
        return true;
    }
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
    };
    try {
        contextBridge.exposeInMainWorld('vscode', globals);
    }
    catch (error) {
        console.error(error);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbG9hZC1hdXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3NhbmRib3gvZWxlY3Ryb24tc2FuZGJveC9wcmVsb2FkLWF1eC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsQ0FBQztBQUFBLENBQUM7SUFDRCxNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFFcEUsU0FBUyxXQUFXLENBQUMsT0FBZTtRQUNuQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHO1FBQ2Y7OztXQUdHO1FBQ0gsV0FBVyxFQUFFO1lBQ1osSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7Z0JBQ25DLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQzFCLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7Z0JBQ3JDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFFcEIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQzVDLENBQUM7U0FDRDtRQUVEOztXQUVHO1FBQ0gsUUFBUSxFQUFFO1lBQ1QsWUFBWSxDQUFDLEtBQWE7Z0JBQ3pCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQy9CLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1NBQ0Q7S0FDRCxDQUFBO0lBRUQsSUFBSSxDQUFDO1FBQ0osYUFBYSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JCLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFBIn0=