/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import * as objects from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { normalizeVersion, parseVersion, } from '../../../platform/extensions/common/extensionValidator.js';
import { deserializeWebviewMessage, serializeWebviewMessage } from './extHostWebviewMessaging.js';
import { asWebviewUri, webviewGenericCspSource, } from '../../contrib/webview/common/webview.js';
import * as extHostProtocol from './extHost.protocol.js';
export class ExtHostWebview {
    #handle;
    #proxy;
    #deprecationService;
    #remoteInfo;
    #workspace;
    #extension;
    #html;
    #options;
    #isDisposed;
    #hasCalledAsWebviewUri;
    #serializeBuffersForPostMessage;
    #shouldRewriteOldResourceUris;
    constructor(handle, proxy, options, remoteInfo, workspace, extension, deprecationService) {
        this.#html = '';
        this.#isDisposed = false;
        this.#hasCalledAsWebviewUri = false;
        /* internal */ this._onMessageEmitter = new Emitter();
        this.onDidReceiveMessage = this._onMessageEmitter.event;
        this.#onDidDisposeEmitter = new Emitter();
        /* internal */ this._onDidDispose = this.#onDidDisposeEmitter.event;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#options = options;
        this.#remoteInfo = remoteInfo;
        this.#workspace = workspace;
        this.#extension = extension;
        this.#serializeBuffersForPostMessage = shouldSerializeBuffersForPostMessage(extension);
        this.#shouldRewriteOldResourceUris = shouldTryRewritingOldResourceUris(extension);
        this.#deprecationService = deprecationService;
    }
    #onDidDisposeEmitter;
    dispose() {
        this.#isDisposed = true;
        this.#onDidDisposeEmitter.fire();
        this.#onDidDisposeEmitter.dispose();
        this._onMessageEmitter.dispose();
    }
    asWebviewUri(resource) {
        this.#hasCalledAsWebviewUri = true;
        return asWebviewUri(resource, this.#remoteInfo);
    }
    get cspSource() {
        const extensionLocation = this.#extension.extensionLocation;
        if (extensionLocation.scheme === Schemas.https || extensionLocation.scheme === Schemas.http) {
            // The extension is being served up from a CDN.
            // Also include the CDN in the default csp.
            let extensionCspRule = extensionLocation.toString();
            if (!extensionCspRule.endsWith('/')) {
                // Always treat the location as a directory so that we allow all content under it
                extensionCspRule += '/';
            }
            return extensionCspRule + ' ' + webviewGenericCspSource;
        }
        return webviewGenericCspSource;
    }
    get html() {
        this.assertNotDisposed();
        return this.#html;
    }
    set html(value) {
        this.assertNotDisposed();
        if (this.#html !== value) {
            this.#html = value;
            if (this.#shouldRewriteOldResourceUris &&
                !this.#hasCalledAsWebviewUri &&
                /(["'])vscode-resource:([^\s'"]+?)(["'])/i.test(value)) {
                this.#hasCalledAsWebviewUri = true;
                this.#deprecationService.report('Webview vscode-resource: uris', this.#extension, `Please migrate to use the 'webview.asWebviewUri' api instead: https://aka.ms/vscode-webview-use-aswebviewuri`);
            }
            this.#proxy.$setHtml(this.#handle, this.rewriteOldResourceUrlsIfNeeded(value));
        }
    }
    get options() {
        this.assertNotDisposed();
        return this.#options;
    }
    set options(newOptions) {
        this.assertNotDisposed();
        if (!objects.equals(this.#options, newOptions)) {
            this.#proxy.$setOptions(this.#handle, serializeWebviewOptions(this.#extension, this.#workspace, newOptions));
        }
        this.#options = newOptions;
    }
    async postMessage(message) {
        if (this.#isDisposed) {
            return false;
        }
        const serialized = serializeWebviewMessage(message, {
            serializeBuffersForPostMessage: this.#serializeBuffersForPostMessage,
        });
        return this.#proxy.$postMessage(this.#handle, serialized.message, ...serialized.buffers);
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
    rewriteOldResourceUrlsIfNeeded(value) {
        if (!this.#shouldRewriteOldResourceUris) {
            return value;
        }
        const isRemote = this.#extension.extensionLocation?.scheme === Schemas.vscodeRemote;
        const remoteAuthority = this.#extension.extensionLocation.scheme === Schemas.vscodeRemote
            ? this.#extension.extensionLocation.authority
            : undefined;
        return value
            .replace(/(["'])(?:vscode-resource):(\/\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_match, startQuote, _1, scheme, path, endQuote) => {
            const uri = URI.from({
                scheme: scheme || 'file',
                path: decodeURIComponent(path),
            });
            const webviewUri = asWebviewUri(uri, { isRemote, authority: remoteAuthority }).toString();
            return `${startQuote}${webviewUri}${endQuote}`;
        })
            .replace(/(["'])(?:vscode-webview-resource):(\/\/[^\s\/'"]+\/([^\s\/'"]+?)(?=\/))?([^\s'"]+?)(["'])/gi, (_match, startQuote, _1, scheme, path, endQuote) => {
            const uri = URI.from({
                scheme: scheme || 'file',
                path: decodeURIComponent(path),
            });
            const webviewUri = asWebviewUri(uri, { isRemote, authority: remoteAuthority }).toString();
            return `${startQuote}${webviewUri}${endQuote}`;
        });
    }
}
export function shouldSerializeBuffersForPostMessage(extension) {
    try {
        const version = normalizeVersion(parseVersion(extension.engines.vscode));
        return !!version && version.majorBase >= 1 && version.minorBase >= 57;
    }
    catch {
        return false;
    }
}
function shouldTryRewritingOldResourceUris(extension) {
    try {
        const version = normalizeVersion(parseVersion(extension.engines.vscode));
        if (!version) {
            return false;
        }
        return version.majorBase < 1 || (version.majorBase === 1 && version.minorBase < 60);
    }
    catch {
        return false;
    }
}
export class ExtHostWebviews extends Disposable {
    constructor(mainContext, remoteInfo, workspace, _logService, _deprecationService) {
        super();
        this.remoteInfo = remoteInfo;
        this.workspace = workspace;
        this._logService = _logService;
        this._deprecationService = _deprecationService;
        this._webviews = new Map();
        this._webviewProxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviews);
    }
    dispose() {
        super.dispose();
        for (const webview of this._webviews.values()) {
            webview.dispose();
        }
        this._webviews.clear();
    }
    $onMessage(handle, jsonMessage, buffers) {
        const webview = this.getWebview(handle);
        if (webview) {
            const { message } = deserializeWebviewMessage(jsonMessage, buffers.value);
            webview._onMessageEmitter.fire(message);
        }
    }
    $onMissingCsp(_handle, extensionId) {
        this._logService.warn(`${extensionId} created a webview without a content security policy: https://aka.ms/vscode-webview-missing-csp`);
    }
    createNewWebview(handle, options, extension) {
        const webview = new ExtHostWebview(handle, this._webviewProxy, reviveOptions(options), this.remoteInfo, this.workspace, extension, this._deprecationService);
        this._webviews.set(handle, webview);
        const sub = webview._onDidDispose(() => {
            sub.dispose();
            this.deleteWebview(handle);
        });
        return webview;
    }
    deleteWebview(handle) {
        this._webviews.delete(handle);
    }
    getWebview(handle) {
        return this._webviews.get(handle);
    }
}
export function toExtensionData(extension) {
    return { id: extension.identifier, location: extension.extensionLocation };
}
export function serializeWebviewOptions(extension, workspace, options) {
    return {
        enableCommandUris: options.enableCommandUris,
        enableScripts: options.enableScripts,
        enableForms: options.enableForms,
        portMapping: options.portMapping,
        localResourceRoots: options.localResourceRoots || getDefaultLocalResourceRoots(extension, workspace),
    };
}
function reviveOptions(options) {
    return {
        enableCommandUris: options.enableCommandUris,
        enableScripts: options.enableScripts,
        enableForms: options.enableForms,
        portMapping: options.portMapping,
        localResourceRoots: options.localResourceRoots?.map((components) => URI.from(components)),
    };
}
function getDefaultLocalResourceRoots(extension, workspace) {
    return [
        ...(workspace?.getWorkspaceFolders() || []).map((x) => x.uri),
        extension.extensionLocation,
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2Vidmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLDJEQUEyRCxDQUFBO0FBSWxFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWpHLE9BQU8sRUFFTixZQUFZLEVBQ1osdUJBQXVCLEdBQ3ZCLE1BQU0seUNBQXlDLENBQUE7QUFHaEQsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQTtBQUV4RCxNQUFNLE9BQU8sY0FBYztJQUNqQixPQUFPLENBQStCO0lBQ3RDLE1BQU0sQ0FBeUM7SUFDL0MsbUJBQW1CLENBQStCO0lBRWxELFdBQVcsQ0FBbUI7SUFDOUIsVUFBVSxDQUErQjtJQUN6QyxVQUFVLENBQXVCO0lBRTFDLEtBQUssQ0FBYTtJQUNsQixRQUFRLENBQXVCO0lBQy9CLFdBQVcsQ0FBaUI7SUFDNUIsc0JBQXNCLENBQVE7SUFFOUIsK0JBQStCLENBQVM7SUFDeEMsNkJBQTZCLENBQVM7SUFFdEMsWUFDQyxNQUFxQyxFQUNyQyxLQUE4QyxFQUM5QyxPQUE4QixFQUM5QixVQUE2QixFQUM3QixT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