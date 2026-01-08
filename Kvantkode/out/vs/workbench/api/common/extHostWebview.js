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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsWUFBWSxHQUNaLE1BQU0sMkRBQTJELENBQUE7QUFJbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFakcsT0FBTyxFQUVOLFlBQVksRUFDWix1QkFBdUIsR0FDdkIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdoRCxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBRXhELE1BQU0sT0FBTyxjQUFjO0lBQ2pCLE9BQU8sQ0FBK0I7SUFDdEMsTUFBTSxDQUF5QztJQUMvQyxtQkFBbUIsQ0FBK0I7SUFFbEQsV0FBVyxDQUFtQjtJQUM5QixVQUFVLENBQStCO0lBQ3pDLFVBQVUsQ0FBdUI7SUFFMUMsS0FBSyxDQUFhO0lBQ2xCLFFBQVEsQ0FBdUI7SUFDL0IsV0FBVyxDQUFpQjtJQUM1QixzQkFBc0IsQ0FBUTtJQUU5QiwrQkFBK0IsQ0FBUztJQUN4Qyw2QkFBNkIsQ0FBUztJQUV0QyxZQUNDLE1BQXFDLEVBQ3JDLEtBQThDLEVBQzlDLE9BQThCLEVBQzlCLFVBQTZCLEVB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