/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { toExtensionData, shouldSerializeBuffersForPostMessage, } from './extHostWebview.js';
import { ViewBadge } from './extHostTypeConverters.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
/* eslint-disable local/code-no-native-private */
class ExtHostWebviewView extends Disposable {
    #handle;
    #proxy;
    #viewType;
    #webview;
    #isDisposed;
    #isVisible;
    #title;
    #description;
    #badge;
    constructor(handle, proxy, viewType, title, webview, isVisible) {
        super();
        this.#isDisposed = false;
        this.#onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this.#onDidChangeVisibility.event;
        this.#onDidDispose = this._register(new Emitter());
        this.onDidDispose = this.#onDidDispose.event;
        this.#viewType = viewType;
        this.#title = title;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#webview = webview;
        this.#isVisible = isVisible;
    }
    dispose() {
        if (this.#isDisposed) {
            return;
        }
        this.#isDisposed = true;
        this.#onDidDispose.fire();
        this.#webview.dispose();
        super.dispose();
    }
    #onDidChangeVisibility;
    #onDidDispose;
    get title() {
        this.assertNotDisposed();
        return this.#title;
    }
    set title(value) {
        this.assertNotDisposed();
        if (this.#title !== value) {
            this.#title = value;
            this.#proxy.$setWebviewViewTitle(this.#handle, value);
        }
    }
    get description() {
        this.assertNotDisposed();
        return this.#description;
    }
    set description(value) {
        this.assertNotDisposed();
        if (this.#description !== value) {
            this.#description = value;
            this.#proxy.$setWebviewViewDescription(this.#handle, value);
        }
    }
    get visible() {
        return this.#isVisible;
    }
    get webview() {
        return this.#webview;
    }
    get viewType() {
        return this.#viewType;
    }
    /* internal */ _setVisible(visible) {
        if (visible === this.#isVisible || this.#isDisposed) {
            return;
        }
        this.#isVisible = visible;
        this.#onDidChangeVisibility.fire();
    }
    get badge() {
        this.assertNotDisposed();
        return this.#badge;
    }
    set badge(badge) {
        this.assertNotDisposed();
        if (badge?.value === this.#badge?.value && badge?.tooltip === this.#badge?.tooltip) {
            return;
        }
        this.#badge = ViewBadge.from(badge);
        this.#proxy.$setWebviewViewBadge(this.#handle, badge);
    }
    show(preserveFocus) {
        this.assertNotDisposed();
        this.#proxy.$show(this.#handle, !!preserveFocus);
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
}
export class ExtHostWebviewViews {
    constructor(mainContext, _extHostWebview) {
        this._extHostWebview = _extHostWebview;
        this._viewProviders = new Map();
        this._webviewViews = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviewViews);
    }
    registerWebviewViewProvider(extension, viewType, provider, webviewOptions) {
        if (this._viewProviders.has(viewType)) {
            throw new Error(`View provider for '${viewType}' already registered`);
        }
        this._viewProviders.set(viewType, { provider, extension });
        this._proxy.$registerWebviewViewProvider(toExtensionData(extension), viewType, {
            retainContextWhenHidden: webviewOptions?.retainContextWhenHidden,
            serializeBuffersForPostMessage: shouldSerializeBuffersForPostMessage(extension),
        });
        return new extHostTypes.Disposable(() => {
            this._viewProviders.delete(viewType);
            this._proxy.$unregisterWebviewViewProvider(viewType);
        });
    }
    async $resolveWebviewView(webviewHandle, viewType, title, state, cancellation) {
        const entry = this._viewProviders.get(viewType);
        if (!entry) {
            throw new Error(`No view provider found for '${viewType}'`);
        }
        const { provider, extension } = entry;
        const webview = this._extHostWebview.createNewWebview(webviewHandle, {
        /* todo */
        }, extension);
        const revivedView = new ExtHostWebviewView(webviewHandle, this._proxy, viewType, title, webview, true);
        this._webviewViews.set(webviewHandle, revivedView);
        await provider.resolveWebviewView(revivedView, { state }, cancellation);
    }
    async $onDidChangeWebviewViewVisibility(webviewHandle, visible) {
        const webviewView = this.getWebviewView(webviewHandle);
        webviewView._setVisible(visible);
    }
    async $disposeWebviewView(webviewHandle) {
        const webviewView = this.getWebviewView(webviewHandle);
        this._webviewViews.delete(webviewHandle);
        webviewView.dispose();
        this._extHostWebview.deleteWebview(webviewHandle);
    }
    getWebviewView(handle) {
        const entry = this._webviewViews.get(handle);
        if (!entry) {
            throw new Error('No webview found');
        }
        return entry;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFdlYnZpZXdWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUdOLGVBQWUsRUFDZixvQ0FBb0MsR0FDcEMsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFdEQsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFBO0FBRWpELGlEQUFpRDtBQUVqRCxNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFDakMsT0FBTyxDQUErQjtJQUN0QyxNQUFNLENBQTZDO0lBRW5ELFNBQVMsQ0FBUTtJQUNqQixRQUFRLENBQWdCO0lBRWpDLFdBQVcsQ0FBUTtJQUNuQixVQUFVLENBQVM7SUFDbkIsTUFBTSxDQUFvQjtJQUMxQixZQUFZLENBQW9CO0lBQ2hDLE1BQU0sQ0FBOEI7SUFFcEMsWUFDQyxNQUFxQyxFQUNyQyxLQUFrRCxFQUNsRCxRQUFnQixFQUNoQixLQUF5QixFQUN6QixPQUF1QixFQUN2QixTQUFrQjtRQUVsQixLQUFLLEVBQUUsQ0FBQTtRQWRSLGdCQUFXLEdBQUcsS0FBSyxDQUFBO1FBcUNWLDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3JELDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFaEUsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM1QyxpQkFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBekJ0RCxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtRQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtJQUM1QixDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUV2QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVRLHNCQUFzQixDQUFzQztJQUc1RCxhQUFhLENBQXNDO0lBRzVELElBQVcsS0FBSztRQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBVyxLQUFLLENBQUMsS0FBeUI7UUFDekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1lBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVcsV0FBVztRQUNyQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVELElBQVcsV0FBVyxDQUFDLEtBQXlCO1FBQy9DLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3hCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxjQUFjLENBQUMsV0FBVyxDQUFDLE9BQWdCO1FBQzFDLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUE7UUFDekIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFRCxJQUFXLEtBQUs7UUFDZixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQVcsS0FBSyxDQUFDLEtBQW1DO1FBQ25ELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRXhCLElBQUksS0FBSyxFQUFFLEtBQUssS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssSUFBSSxLQUFLLEVBQUUsT0FBTyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDcEYsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFTSxJQUFJLENBQUMsYUFBdUI7UUFDbEMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBbUI7SUFhL0IsWUFDQyxXQUF5QyxFQUN4QixlQUFnQztRQUFoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFaakMsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFNdEMsQ0FBQTtRQUVjLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXFELENBQUE7UUFNNUYsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBRU0sMkJBQTJCLENBQ2pDLFNBQWdDLEVBQ2hDLFFBQWdCLEVBQ2hCLFFBQW9DLEVBQ3BDLGNBRUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsUUFBUSxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEVBQUU7WUFDOUUsdUJBQXVCLEVBQUUsY0FBYyxFQUFFLHVCQUF1QjtZQUNoRSw4QkFBOEIsRUFBRSxvQ0FBb0MsQ0FBQyxTQUFTLENBQUM7U0FDL0UsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDckQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUN4QixhQUFxQixFQUNyQixRQUFnQixFQUNoQixLQUF5QixFQUN6QixLQUFVLEVBQ1YsWUFBK0I7UUFFL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFckMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FDcEQsYUFBYSxFQUNiO1FBQ0MsVUFBVTtTQUNWLEVBQ0QsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGtCQUFrQixDQUN6QyxhQUFhLEVBQ2IsSUFBSSxDQUFDLE1BQU0sRUFDWCxRQUFRLEVBQ1IsS0FBSyxFQUNMLE9BQU8sRUFDUCxJQUFJLENBQ0osQ0FBQTtRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLGFBQXFCLEVBQUUsT0FBZ0I7UUFDOUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN0RCxXQUFXLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsYUFBcUI7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN4QyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFckIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFjO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0NBQ0QifQ==