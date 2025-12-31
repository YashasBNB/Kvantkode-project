/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BrowserClipboardService_1;
import { isSafari, isWebkitWebView } from '../../../base/browser/browser.js';
import { $, addDisposableListener, getActiveDocument, getActiveWindow, isHTMLElement, onDidRegisterWindow, } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
import { ILogService } from '../../log/common/log.js';
/**
 * Custom mime type used for storing a list of uris in the clipboard.
 *
 * Requires support for custom web clipboards https://github.com/w3c/clipboard-apis/pull/175
 */
const vscodeResourcesMime = 'application/vnd.code.resources';
let BrowserClipboardService = class BrowserClipboardService extends Disposable {
    static { BrowserClipboardService_1 = this; }
    constructor(layoutService, logService) {
        super();
        this.layoutService = layoutService;
        this.logService = logService;
        this.mapTextToType = new Map(); // unsupported in web (only in-memory)
        this.findText = ''; // unsupported in web (only in-memory)
        this.resources = []; // unsupported in web (only in-memory)
        this.resourcesStateHash = undefined;
        if (isSafari || isWebkitWebView) {
            this.installWebKitWriteTextWorkaround();
        }
        // Keep track of copy operations to reset our set of
        // copied resources: since we keep resources in memory
        // and not in the clipboard, we have to invalidate
        // that state when the user copies other data.
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(addDisposableListener(window.document, 'copy', () => this.clearResourcesState()));
        }, { window: mainWindow, disposables: this._store }));
    }
    async readImage() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            const clipboardItem = clipboardItems[0];
            const supportedImageTypes = [
                'image/png',
                'image/jpeg',
                'image/gif',
                'image/tiff',
                'image/bmp',
            ];
            const mimeType = supportedImageTypes.find((type) => clipboardItem.types.includes(type));
            if (mimeType) {
                const blob = await clipboardItem.getType(mimeType);
                const buffer = await blob.arrayBuffer();
                return new Uint8Array(buffer);
            }
            else {
                console.error('No supported image type found in the clipboard');
            }
        }
        catch (error) {
            console.error('Error reading image from clipboard:', error);
        }
        // Return an empty Uint8Array if no image is found or an error occurs
        return new Uint8Array(0);
    }
    // In Safari, it has the following note:
    //
    // "The request to write to the clipboard must be triggered during a user gesture.
    // A call to clipboard.write or clipboard.writeText outside the scope of a user
    // gesture(such as "click" or "touch" event handlers) will result in the immediate
    // rejection of the promise returned by the API call."
    // From: https://webkit.org/blog/10855/async-clipboard-api/
    //
    // Since extensions run in a web worker, and handle gestures in an asynchronous way,
    // they are not classified by Safari as "in response to a user gesture" and will reject.
    //
    // This function sets up some handlers to work around that behavior.
    installWebKitWriteTextWorkaround() {
        const handler = () => {
            const currentWritePromise = new DeferredPromise();
            // Cancel the previous promise since we just created a new one in response to this new event
            if (this.webKitPendingClipboardWritePromise &&
                !this.webKitPendingClipboardWritePromise.isSettled) {
                this.webKitPendingClipboardWritePromise.cancel();
            }
            this.webKitPendingClipboardWritePromise = currentWritePromise;
            // The ctor of ClipboardItem allows you to pass in a promise that will resolve to a string.
            // This allows us to pass in a Promise that will either be cancelled by another event or
            // resolved with the contents of the first call to this.writeText.
            // see https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/ClipboardItem#parameters
            getActiveWindow()
                .navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': currentWritePromise.p,
                }),
            ])
                .catch(async (err) => {
                if (!(err instanceof Error) ||
                    err.name !== 'NotAllowedError' ||
                    !currentWritePromise.isRejected) {
                    this.logService.error(err);
                }
            });
        };
        this._register(Event.runAndSubscribe(this.layoutService.onDidAddContainer, ({ container, disposables }) => {
            disposables.add(addDisposableListener(container, 'click', handler));
            disposables.add(addDisposableListener(container, 'keydown', handler));
        }, { container: this.layoutService.mainContainer, disposables: this._store }));
    }
    async writeText(text, type) {
        // Clear resources given we are writing text
        this.clearResourcesState();
        // With type: only in-memory is supported
        if (type) {
            this.mapTextToType.set(type, text);
            return;
        }
        if (this.webKitPendingClipboardWritePromise) {
            // For Safari, we complete this Promise which allows the call to `navigator.clipboard.write()`
            // above to resolve and successfully copy to the clipboard. If we let this continue, Safari
            // would throw an error because this call stack doesn't appear to originate from a user gesture.
            return this.webKitPendingClipboardWritePromise.complete(text);
        }
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            return await getActiveWindow().navigator.clipboard.writeText(text);
        }
        catch (error) {
            console.error(error);
        }
        // Fallback to textarea and execCommand solution
        this.fallbackWriteText(text);
    }
    fallbackWriteText(text) {
        const activeDocument = getActiveDocument();
        const activeElement = activeDocument.activeElement;
        const textArea = activeDocument.body.appendChild($('textarea', { 'aria-hidden': true }));
        textArea.style.height = '1px';
        textArea.style.width = '1px';
        textArea.style.position = 'absolute';
        textArea.value = text;
        textArea.focus();
        textArea.select();
        activeDocument.execCommand('copy');
        if (isHTMLElement(activeElement)) {
            activeElement.focus();
        }
        textArea.remove();
    }
    async readText(type) {
        // With type: only in-memory is supported
        if (type) {
            return this.mapTextToType.get(type) || '';
        }
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            return await getActiveWindow().navigator.clipboard.readText();
        }
        catch (error) {
            console.error(error);
        }
        return '';
    }
    async readFindText() {
        return this.findText;
    }
    async writeFindText(text) {
        this.findText = text;
    }
    static { this.MAX_RESOURCE_STATE_SOURCE_LENGTH = 1000; }
    async writeResources(resources) {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            await getActiveWindow().navigator.clipboard.write([
                new ClipboardItem({
                    [`web ${vscodeResourcesMime}`]: new Blob([JSON.stringify(resources.map((x) => x.toJSON()))], {
                        type: vscodeResourcesMime,
                    }),
                }),
            ]);
            // Continue to write to the in-memory clipboard as well.
            // This is needed because some browsers allow the paste but then can't read the custom resources.
        }
        catch (error) {
            // Noop
        }
        if (resources.length === 0) {
            this.clearResourcesState();
        }
        else {
            this.resources = resources;
            this.resourcesStateHash = await this.computeResourcesStateHash();
        }
    }
    async readResources() {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            const items = await getActiveWindow().navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes(`web ${vscodeResourcesMime}`)) {
                    const blob = await item.getType(`web ${vscodeResourcesMime}`);
                    const resources = JSON.parse(await blob.text()).map((x) => URI.from(x));
                    return resources;
                }
            }
        }
        catch (error) {
            // Noop
        }
        const resourcesStateHash = await this.computeResourcesStateHash();
        if (this.resourcesStateHash !== resourcesStateHash) {
            this.clearResourcesState(); // state mismatch, resources no longer valid
        }
        return this.resources;
    }
    async computeResourcesStateHash() {
        if (this.resources.length === 0) {
            return undefined; // no resources, no hash needed
        }
        // Resources clipboard is managed in-memory only and thus
        // fails to invalidate when clipboard data is changing.
        // As such, we compute the hash of the current clipboard
        // and use that to later validate the resources clipboard.
        const clipboardText = await this.readText();
        return hash(clipboardText.substring(0, BrowserClipboardService_1.MAX_RESOURCE_STATE_SOURCE_LENGTH));
    }
    async hasResources() {
        // Guard access to navigator.clipboard with try/catch
        // as we have seen DOMExceptions in certain browsers
        // due to security policies.
        try {
            const items = await getActiveWindow().navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes(`web ${vscodeResourcesMime}`)) {
                    return true;
                }
            }
        }
        catch (error) {
            // Noop
        }
        return this.resources.length > 0;
    }
    clearInternalState() {
        this.clearResourcesState();
    }
    clearResourcesState() {
        this.resources = [];
        this.resourcesStateHash = undefined;
    }
};
BrowserClipboardService = BrowserClipboardService_1 = __decorate([
    __param(0, ILayoutService),
    __param(1, ILogService)
], BrowserClipboardService);
export { BrowserClipboardService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NsaXBib2FyZC9icm93c2VyL2NsaXBib2FyZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixhQUFhLEVBQ2IsbUJBQW1CLEdBQ25CLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRDs7OztHQUlHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxnQ0FBZ0MsQ0FBQTtBQUVyRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O0lBR3RELFlBQ2lCLGFBQThDLEVBQ2pELFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBSDBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNoQyxlQUFVLEdB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