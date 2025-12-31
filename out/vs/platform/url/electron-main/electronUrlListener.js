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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25VcmxMaXN0ZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VybC9lbGVjdHJvbi1tYWluL2VsZWN0cm9uVXJsTGlzdGVuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBMEIsTUFBTSxVQUFVLENBQUE7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBUWpEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBSWxELFlBQ0MsbUJBQStDLEVBQzlCLFVBQXVCLEVBQ3hDLGtCQUF1QyxFQUN2QyxzQkFBK0MsRUFDL0MsY0FBK0IsRUFDZCxVQUF1QjtRQUV4QyxLQUFLLEVBQUUsQ0FBQTtRQU5VLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQVRqQyxTQUFJLEdBQW1CLEVBQUUsQ0FBQTtRQUN6QixlQUFVLEdBQUcsQ0FBQyxDQUFBO1FBWXJCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixVQUFVLENBQUMsS0FBSyxDQUNmLDBDQUEwQyxFQUMxQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FDakQsQ0FBQTtZQUVELHFFQUFxRTtZQUNyRSxJQUFJLENBQUMsSUFB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