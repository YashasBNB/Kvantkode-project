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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { reviveWebviewExtension } from './mainThreadWebviews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { IWebviewViewService, } from '../../contrib/webviewView/browser/webviewViewService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
let MainThreadWebviewsViews = class MainThreadWebviewsViews extends Disposable {
    constructor(context, mainThreadWebviews, _telemetryService, _webviewViewService) {
        super();
        this.mainThreadWebviews = mainThreadWebviews;
        this._telemetryService = _telemetryService;
        this._webviewViewService = _webviewViewService;
        this._webviewViews = this._register(new DisposableMap());
        this._webviewViewProviders = this._register(new DisposableMap());
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewViews);
    }
    $setWebviewViewTitle(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.title = value;
    }
    $setWebviewViewDescription(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.description = value;
    }
    $setWebviewViewBadge(handle, badge) {
        const webviewView = this.getWebviewView(handle);
        webviewView.badge = badge;
    }
    $show(handle, preserveFocus) {
        const webviewView = this.getWebviewView(handle);
        webviewView.show(preserveFocus);
    }
    $registerWebviewViewProvider(extensionData, viewType, options) {
        if (this._webviewViewProviders.has(viewType)) {
            throw new Error(`View provider for ${viewType} already registered`);
        }
        const extension = reviveWebviewExtension(extensionData);
        const registration = this._webviewViewService.register(viewType, {
            resolve: async (webviewView, cancellation) => {
                const handle = generateUuid();
                this._webviewViews.set(handle, webviewView);
                this.mainThreadWebviews.addWebview(handle, webviewView.webview, {
                    serializeBuffersForPostMessage: options.serializeBuffersForPostMessage,
                });
                let state = undefined;
                if (webviewView.webview.state) {
                    try {
                        state = JSON.parse(webviewView.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewView.webview.state);
                    }
                }
                webviewView.webview.extension = extension;
                if (options) {
                    webviewView.webview.options = options;
                }
                webviewView.onDidChangeVisibility((visible) => {
                    this._proxy.$onDidChangeWebviewViewVisibility(handle, visible);
                });
                webviewView.onDispose(() => {
                    this._proxy.$disposeWebviewView(handle);
                    this._webviewViews.deleteAndDispose(handle);
                });
                this._telemetryService.publicLog2('webviews:createWebviewView', {
                    extensionId: extension.id.value,
                    id: viewType,
                });
                try {
                    await this._proxy.$resolveWebviewView(handle, viewType, webviewView.title, state, cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewView.webview.setHtml(this.mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            },
        });
        this._webviewViewProviders.set(viewType, registration);
    }
    $unregisterWebviewViewProvider(viewType) {
        if (!this._webviewViewProviders.has(viewType)) {
            throw new Error(`No view provider for ${viewType} registered`);
        }
        this._webviewViewProviders.deleteAndDispose(viewType);
    }
    getWebviewView(handle) {
        const webviewView = this._webviewViews.get(handle);
        if (!webviewView) {
            throw new Error('unknown webview view');
        }
        return webviewView;
    }
};
MainThreadWebviewsViews = __decorate([
    __param(2, ITelemetryService),
    __param(3, IWebviewViewService)
], MainThreadWebviewsViews);
export { MainThreadWebviewsViews };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkV2Vidmlld1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBc0Isc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRixPQUFPLEtBQUssZUFBZSxNQUFNLCtCQUErQixDQUFBO0FBRWhFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUc1RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUNaLFNBQVEsVUFBVTtJQVFsQixZQUNDLE9BQXdCLEVBQ1Asa0JBQXNDLEVBQ3BDLGlCQUFxRCxFQUNuRCxtQkFBeUQ7UUFFOUUsS0FBSyxFQUFFLENBQUE7UUFKVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ25CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDbEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQVA5RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQTtRQUN4RSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQTtRQVVuRixJQUFJLENBQUMsTUFBTSxH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