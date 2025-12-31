/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createServer } from 'net';
import { ExtensionHostDebugBroadcastChannel } from '../common/extensionHostDebugIpc.js';
import { OPTIONS, parseArgs } from '../../environment/node/argv.js';
export class ElectronExtensionHostDebugBroadcastChannel extends ExtensionHostDebugBroadcastChannel {
    constructor(windowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
    }
    call(ctx, command, arg) {
        if (command === 'openExtensionDevelopmentHostWindow') {
            return this.openExtensionDevelopmentHostWindow(arg[0], arg[1]);
        }
        else {
            return super.call(ctx, command, arg);
        }
    }
    async openExtensionDevelopmentHostWindow(args, debugRenderer) {
        const pargs = parseArgs(args, OPTIONS);
        pargs.debugRenderer = debugRenderer;
        const extDevPaths = pargs.extensionDevelopmentPath;
        if (!extDevPaths) {
            return { success: false };
        }
        const [codeWindow] = await this.windowsMainService.openExtensionDevelopmentHostWindow(extDevPaths, {
            context: 5 /* OpenContext.API */,
            cli: pargs,
            forceProfile: pargs.profile,
            forceTempProfile: pargs['profile-temp'],
        });
        if (!debugRenderer) {
            return { success: true };
        }
        const win = codeWindow.win;
        if (!win) {
            return { success: true };
        }
        const debug = win.webContents.debugger;
        let listeners = debug.isAttached() ? Infinity : 0;
        const server = createServer((listener) => {
            if (listeners++ === 0) {
                debug.attach();
            }
            let closed = false;
            const writeMessage = (message) => {
                if (!closed) {
                    // in case sendCommand promises settle after closed
                    listener.write(JSON.stringify(message) + '\0'); // null-delimited, CDP-compatible
                }
            };
            const onMessage = (_event, method, params, sessionId) => writeMessage({ method, params, sessionId });
            win.on('close', () => {
                debug.removeListener('message', onMessage);
                listener.end();
                closed = true;
            });
            debug.addListener('message', onMessage);
            let buf = Buffer.alloc(0);
            listener.on('data', (data) => {
                buf = Buffer.concat([buf, data]);
                for (let delimiter = buf.indexOf(0); delimiter !== -1; delimiter = buf.indexOf(0)) {
                    let data;
                    try {
                        const contents = buf.slice(0, delimiter).toString('utf8');
                        buf = buf.slice(delimiter + 1);
                        data = JSON.parse(contents);
                    }
                    catch (e) {
                        console.error('error reading cdp line', e);
                    }
                    // depends on a new API for which electron.d.ts has not been updated:
                    // @ts-ignore
                    debug
                        .sendCommand(data.method, data.params, data.sessionId)
                        .then((result) => writeMessage({ id: data.id, sessionId: data.sessionId, result }))
                        .catch((error) => writeMessage({
                        id: data.id,
                        sessionId: data.sessionId,
                        error: { code: 0, message: error.message },
                    }));
                }
            });
            listener.on('error', (err) => {
                console.error('error on cdp pipe:', err);
            });
            listener.on('close', () => {
                closed = true;
                if (--listeners === 0) {
                    debug.detach();
                }
            });
        });
        await new Promise((r) => server.listen(0, r));
        win.on('close', () => server.close());
        return { rendererDebugPort: server.address().port, success: true };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGVidWcvZWxlY3Ryb24tbWFpbi9leHRlbnNpb25Ib3N0RGVidWdJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLEtBQUssQ0FBQTtBQUUvQyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR25FLE1BQU0sT0FBTywwQ0FFWCxTQUFRLGtDQUE0QztJQUNyRCxZQUFvQixrQkFBdUM7UUFDMUQsS0FBSyxFQUFFLENBQUE7UUFEWSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO0lBRTNELENBQUM7SUFFUSxJQUFJLENBQUMsR0FBYSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQ3RELElBQUksT0FBTyxLQUFLLG9DQUFvQyxFQUFFLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0NBQWtDLENBQy9DLElBQWMsRUFDZCxhQUFzQjtRQUV0QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBRW5DLE1BQU0sV0FBVyxHQUFH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