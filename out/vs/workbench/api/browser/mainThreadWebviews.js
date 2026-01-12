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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdlYnZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNwRixPQUFPLEtBQUssZUFBZSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsdUJBQXVCLEdBQ3ZCLE1BQU0sc0NBQXNDLENBQUE7QUFRN0MsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFNUYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFDWixTQUFRLFVBQVU7O2FBR00saUNBQTRCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDOUQsT0FBTyxDQUFDLElBQUk7UUFDWixPQUFPLENBQUMsS0FBSztRQUNiLE9BQU8sQ0FBQyxNQUFNO1FBQ2QsT0FBTyxDQUFDLE1BQU07UUFDZCxnQkFBZ0I7S0FDaEIsQ0FBQyxBQU5r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