/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
export class UrlFinder extends Disposable {
    /**
     * Local server url pattern matching following urls:
     * http://localhost:3000/ - commonly used across multiple frameworks
     * https://127.0.0.1:5001/ - ASP.NET
     * http://:8080 - Beego Golang
     * http://0.0.0.0:4000 - Elixir Phoenix
     */
    static { this.localUrlRegex = /\b\w{0,20}(?::\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{2,5})[\w\-\.\~:\/\?\#[\]\@!\$&\(\)\*\+\,\;\=]*/gim; }
    static { this.extractPortRegex = /(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{1,5})/; }
    /**
     * https://github.com/microsoft/vscode-remote-release/issues/3949
     */
    static { this.localPythonServerRegex = /HTTP\son\s(127\.0\.0\.1|0\.0\.0\.0)\sport\s(\d+)/; }
    static { this.excludeTerminals = ['Dev Containers']; }
    constructor(terminalService, debugService) {
        super();
        this._onDidMatchLocalUrl = new Emitter();
        this.onDidMatchLocalUrl = this._onDidMatchLocalUrl.event;
        this.listeners = new Map();
        this.replPositions = new Map();
        // Terminal
        terminalService.instances.forEach((instance) => {
            this.registerTerminalInstance(instance);
        });
        this._register(terminalService.onDidCreateInstance((instance) => {
            this.registerTerminalInstance(instance);
        }));
        this._register(terminalService.onDidDisposeInstance((instance) => {
            this.listeners.get(instance)?.dispose();
            this.listeners.delete(instance);
        }));
        // Debug
        this._register(debugService.onDidNewSession((session) => {
            if (!session.parentSession || (session.parentSession && session.hasSeparateRepl())) {
                this.listeners.set(session.getId(), session.onDidChangeReplElements(() => {
                    this.processNewReplElements(session);
                }));
            }
        }));
        this._register(debugService.onDidEndSession(({ session }) => {
            if (this.listeners.has(session.getId())) {
                this.listeners.get(session.getId())?.dispose();
                this.listeners.delete(session.getId());
            }
        }));
    }
    registerTerminalInstance(instance) {
        if (!UrlFinder.excludeTerminals.includes(instance.title)) {
            this.listeners.set(instance, instance.onData((data) => {
                this.processData(data);
            }));
        }
    }
    processNewReplElements(session) {
        const oldReplPosition = this.replPositions.get(session.getId());
        const replElements = session.getReplElements();
        this.replPositions.set(session.getId(), {
            position: replElements.length - 1,
            tail: replElements[replElements.length - 1],
        });
        if (!oldReplPosition && replElements.length > 0) {
            replElements.forEach((element) => this.processData(element.toString()));
        }
        else if (oldReplPosition && replElements.length - 1 !== oldReplPosition.position) {
            // Process lines until we reach the old "tail"
            for (let i = replElements.length - 1; i >= 0; i--) {
                const element = replElements[i];
                if (element === oldReplPosition.tail) {
                    break;
                }
                else {
                    this.processData(element.toString());
                }
            }
        }
    }
    dispose() {
        super.dispose();
        const listeners = this.listeners.values();
        for (const listener of listeners) {
            listener.dispose();
        }
    }
    processData(data) {
        // strip ANSI terminal codes
        data = removeAnsiEscapeCodes(data);
        const urlMatches = data.match(UrlFinder.localUrlRegex) || [];
        if (urlMatches && urlMatches.length > 0) {
            urlMatches.forEach((match) => {
                // check if valid url
                let serverUrl;
                try {
                    serverUrl = new URL(match);
                }
                catch (e) {
                    // Not a valid URL
                }
                if (serverUrl) {
                    // check if the port is a valid integer value
                    const portMatch = match.match(UrlFinder.extractPortRegex);
                    const port = parseFloat(serverUrl.port ? serverUrl.port : portMatch ? portMatch[2] : 'NaN');
                    if (!isNaN(port) && Number.isInteger(port) && port > 0 && port <= 65535) {
                        // normalize the host name
                        let host = serverUrl.hostname;
                        if (host !== '0.0.0.0' && host !== '127.0.0.1') {
                            host = 'localhost';
                        }
                        // Exclude node inspect, except when using default port
                        if (port !== 9229 && data.startsWith('Debugger listening on')) {
                            return;
                        }
                        this._onDidMatchLocalUrl.fire({ port, host });
                    }
                }
            });
        }
        else {
            // Try special python case
            const pythonMatch = data.match(UrlFinder.localPythonServerRegex);
            if (pythonMatch && pythonMatch.length === 3) {
                this._onDidMatchLocalUrl.fire({ host: pythonMatch[1], port: Number(pythonMatch[2]) });
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsRmluZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvdXJsRmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFFOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFMUUsTUFBTSxPQUFPLFNBQVUsU0FBUSxVQUFVO0lBQ3hDOzs7Ozs7T0FNRzthQUNxQixrQkFBYSxHQUNwQyxnSEFBZ0gsQUFENUUsQ0FDNEU7YUFDekYscUJBQWdCLEdBQUcsK0NBQStDLEFBQWxELENBQWtEO0lBQzFGOztPQUVHO2FBQ3FCLDJCQUFzQixHQUM3QyxrREFBa0QsQUFETCxDQUNLO2FBRTNCLHFCQUFnQixHQUFHLENBQUMsZ0JBQWdCLENBQUMsQUFBckIsQ0FBcUI7SUFNN0QsWUFBWSxlQUFpQyxFQUFFLFlBQTJCO1FBQ3pFLEtBQUssRUFBRSxDQUFBO1FBTEEsd0JBQW1CLEdBQTRDLElBQUksT0FBTyxFQUFFLENBQUE7UUFDcEUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUMzRCxjQUFTLEdBQWlELElBQUksR0FBRyxFQUFFLENBQUE7UUFzRG5FLGtCQUFhLEdBQTBELElBQUksR0FBRyxFQUFFLENBQUE7UUFsRHZGLFdBQVc7UUFDWCxlQUFlLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzlDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FB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