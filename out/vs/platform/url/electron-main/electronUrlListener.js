/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { app } from 'electron';
import { disposableTimeout } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
/**
 * A listener for URLs that are opened from the OS and handled by VSCode.
 * Depending on the platform, this works differently:
 * - Windows: we use `app.setAsDefaultProtocolClient()` to register VSCode with the OS
 *            and additionally add the `open-url` command line argument to identify.
 * - macOS:   we rely on `app.on('open-url')` to be called by the OS
 * - Linux:   we have a special shortcut installed (`resources/linux/code-url-handler.desktop`)
 *            that calls VSCode with the `open-url` command line argument
 *            (https://github.com/microsoft/vscode/pull/56727)
 */
export class ElectronURLListener extends Disposable {
    constructor(initialProtocolUrls, urlService, windowsMainService, environmentMainService, productService, logService) {
        super();
        this.urlService = urlService;
        this.logService = logService;
        this.uris = [];
        this.retryCount = 0;
        if (initialProtocolUrls) {
            logService.trace('ElectronURLListener initialUrisToHandle:', initialProtocolUrls.map((url) => url.originalUrl));
            // the initial set of URIs we need to handle once the window is ready
            this.uris = initialProtocolUrls;
        }
        // Windows: install as protocol handler
        if (isWindows) {
            const windowsParameters = environmentMainService.isBuilt
                ? []
                : [`"${environmentMainService.appRoot}"`];
            windowsParameters.push('--open-url', '--');
            app.setAsDefaultProtocolClient(productService.urlProtocol, process.execPath, windowsParameters);
        }
        // macOS: listen to `open-url` events from here on to handle
        const onOpenElectronUrl = Event.map(Event.fromNodeEventEmitter(app, 'open-url', (event, url) => ({
            event,
            url,
        })), ({ event, url }) => {
            event.preventDefault(); // always prevent default and return the url as string
            return url;
        });
        this._register(onOpenElectronUrl((url) => {
            const uri = this.uriFromRawUrl(url);
            if (!uri) {
                return;
            }
            this.urlService.open(uri, { originalUrl: url });
        }));
        // Send initial links to the window once it has loaded
        const isWindowReady = windowsMainService.getWindows().filter((window) => window.isReady).length > 0;
        if (isWindowReady) {
            logService.trace('ElectronURLListener: window is ready to handle URLs');
            this.flush();
        }
        else {
            logService.trace('ElectronURLListener: waiting for window to be ready to handle URLs...');
            this._register(Event.once(windowsMainService.onDidSignalReadyWindow)(() => this.flush()));
        }
    }
    uriFromRawUrl(url) {
        try {
            return URI.parse(url);
        }
        catch (e) {
            return undefined;
        }
    }
    async flush() {
        if (this.retryCount++ > 10) {
            this.logService.trace('ElectronURLListener#flush(): giving up after 10 retries');
            return;
        }
        this.logService.trace('ElectronURLListener#flush(): flushing URLs');
        const uris = [];
        for (const obj of this.uris) {
            const handled = await this.urlService.open(obj.uri, { originalUrl: obj.originalUrl });
            if (handled) {
                this.logService.trace('ElectronURLListener#flush(): URL was handled', obj.originalUrl);
            }
            else {
                this.logService.trace('ElectronURLListener#flush(): URL was not yet handled', obj.originalUrl);
                uris.push(obj);
            }
        }
        if (uris.length === 0) {
            return;
        }
        this.uris = uris;
        disposableTimeout(() => this.flush(), 500, this._store);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25VcmxMaXN0ZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXJsL2VsZWN0cm9uLW1haW4vZWxlY3Ryb25VcmxMaXN0ZW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUEwQixNQUFNLFVBQVUsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFRakQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFJbEQsWUFDQyxtQkFBK0MsRUFDOUIsVUFBdUIsRUFDeEMsa0JBQXVDLEVBQ3ZDLHNCQUErQyxFQUMvQyxjQUErQixFQUNkLFVBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFBO1FBTlUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUl2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBVGpDLFNBQUksR0FBbUIsRUFBRSxDQUFBO1FBQ3pCLGVBQVUsR0FBRyxDQUFDLENBQUE7UUFZckIsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLFVBQVUsQ0FBQyxLQUFLLENBQ2YsMENBQTBDLEVBQzFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUNqRCxDQUFBO1lBRUQscUVBQXFFO1lBQ3JFLElBQUksQ0FB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