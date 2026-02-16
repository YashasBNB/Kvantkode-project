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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsRmluZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci91cmxGaW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUxRSxNQUFNLE9BQU8sU0FBVSxTQUFRLFVBQVU7SUFDeEM7Ozs7OztPQU1HO2FBQ3FCLGtCQUFhLEdBQ3BDLGdIQUFnSCxBQUQ1RSxDQUM0RTthQUN6RixxQkFBZ0IsR0FBRywrQ0FBK0MsQUFBbEQsQ0FBa0Q7SUFDMUY7O09BRUc7YUFDcUIsMkJBQXNCLEdBQzdDLGtEQUFrRCxBQURMLENBQ0s7YUFFM0IscUJBQWdCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxBQUFyQixDQUFxQjtJQU03RCxZQUFZLGVBQWlDLEVBQUUsWUFBMkI7UUFDekUsS0FBSyxFQUFFLENBQUE7UUFMQSx3QkFBbUIsR0FBNEMsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUNwRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBQzNELGNBQVMsR0FBaUQsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQXNEbkUsa0JBQWEsR0FBMEQsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQWxEdkYsV0FBVztRQUNYLGVBQWUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDOUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hDLENBQUMs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