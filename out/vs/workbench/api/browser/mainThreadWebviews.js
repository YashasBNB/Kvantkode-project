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
var MainThreadWebviews_1;
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { isWeb } from '../../../base/common/platform.js';
import { escape } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { deserializeWebviewMessage, serializeWebviewMessage, } from '../common/extHostWebviewMessaging.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
let MainThreadWebviews = class MainThreadWebviews extends Disposable {
    static { MainThreadWebviews_1 = this; }
    static { this.standardSupportedLinkSchemes = new Set([
        Schemas.http,
        Schemas.https,
        Schemas.mailto,
        Schemas.vscode,
        'vscode-insider',
    ]); }
    constructor(context, _openerService, _productService) {
        super();
        this._openerService = _openerService;
        this._productService = _productService;
        this._webviews = new Map();
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviews);
    }
    addWebview(handle, webview, options) {
        if (this._webviews.has(handle)) {
            throw new Error('Webview already registered');
        }
        this._webviews.set(handle, webview);
        this.hookupWebviewEventDelegate(handle, webview, options);
    }
    $setHtml(handle, value) {
        this.tryGetWebview(handle)?.setHtml(value);
    }
    $setOptions(handle, options) {
        const webview = this.tryGetWebview(handle);
        if (webview) {
            webview.contentOptions = reviveWebviewContentOptions(options);
        }
    }
    async $postMessage(handle, jsonMessage, ...buffers) {
        const webview = this.tryGetWebview(handle);
        if (!webview) {
            return false;
        }
        const { message, arrayBuffers } = deserializeWebviewMessage(jsonMessage, buffers);
        return webview.postMessage(message, arrayBuffers);
    }
    hookupWebviewEventDelegate(handle, webview, options) {
        const disposables = new DisposableStore();
        disposables.add(webview.onDidClickLink((uri) => this.onDidClickLink(handle, uri)));
        disposables.add(webview.onMessage((message) => {
            const serialized = serializeWebviewMessage(message.message, options);
            this._proxy.$onMessage(handle, serialized.message, new SerializableObjectWithBuffers(serialized.buffers));
        }));
        disposables.add(webview.onMissingCsp((extension) => this._proxy.$onMissingCsp(handle, extension.value)));
        disposables.add(webview.onDidDispose(() => {
            disposables.dispose();
            this._webviews.delete(handle);
        }));
    }
    onDidClickLink(handle, link) {
        const webview = this.getWebview(handle);
        if (this.isSupportedLink(webview, URI.parse(link))) {
            this._openerService.open(link, {
                fromUserGesture: true,
                allowContributedOpeners: true,
                allowCommands: Array.isArray(webview.contentOptions.enableCommandUris) ||
                    webview.contentOptions.enableCommandUris === true,
                fromWorkspace: true,
            });
        }
    }
    isSupportedLink(webview, link) {
        if (MainThreadWebviews_1.standardSupportedLinkSchemes.has(link.scheme)) {
            return true;
        }
        if (!isWeb && this._productService.urlProtocol === link.scheme) {
            return true;
        }
        if (link.scheme === Schemas.command) {
            if (Array.isArray(webview.contentOptions.enableCommandUris)) {
                return webview.contentOptions.enableCommandUris.includes(link.path);
            }
            return webview.contentOptions.enableCommandUris === true;
        }
        return false;
    }
    tryGetWebview(handle) {
        return this._webviews.get(handle);
    }
    getWebview(handle) {
        const webview = this.tryGetWebview(handle);
        if (!webview) {
            throw new Error(`Unknown webview handle:${handle}`);
        }
        return webview;
    }
    getWebviewResolvedFailedContent(viewType) {
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none';">
			</head>
			<body>${localize('errorMessage', 'An error occurred while loading view: {0}', escape(viewType))}</body>
		</html>`;
    }
};
MainThreadWebviews = MainThreadWebviews_1 = __decorate([
    __param(1, IOpenerService),
    __param(2, IProductService)
], MainThreadWebviews);
export { MainThreadWebviews };
export function reviveWebviewExtension(extensionData) {
    return {
        id: extensionData.id,
        location: URI.revive(extensionData.location),
    };
}
export function reviveWebviewContentOptions(webviewOptions) {
    return {
        allowScripts: webviewOptions.enableScripts,
        allowForms: webviewOptions.enableForms,
        enableCommandUris: webviewOptions.enableCommandUris,
        localResourceRoots: Array.isArray(webviewOptions.localResourceRoots)
            ? webviewOptions.localResourceRoots.map((r) => URI.revive(r))
            : undefined,
        portMapping: webviewOptions.portMapping,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXZWJ2aWV3cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDcEYsT0FBTyxLQUFLLGVBQWUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHVCQUF1QixHQUN2QixNQUFNLHNDQUFzQyxDQUFBO0FBUTdDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRTVGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQ1osU0FBUSxVQUFVOzthQUdNLGlDQUE0QixHQUFHLElBQUksR0FBRyxDQUFDO1FBQzlELE9BQU8sQ0FBQyxJQUFJO1FBQ1osT0FBTyxDQUFDLEtBQUs7UUFDYixPQUFPLENBQUMsTUFBTTtRQUNkLE9BQU8sQ0FBQyxNQUFNO1FBQ2QsZ0JBQWdCO0tBQ2hCLENBQUMsQUFOa0QsQ0FN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