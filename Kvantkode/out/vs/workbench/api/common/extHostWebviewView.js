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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2Vidmlld1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBR04sZUFBZSxFQUNmLG9DQUFvQyxHQUNwQyxNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUV0RCxPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUE7QUFFakQsaURBQWlEO0FBRWpELE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUNqQyxPQUFPLENBQStCO0lBQ3RDLE1BQU0sQ0FBNkM7SUFFbkQsU0FBUyxDQUFRO0lBQ2pCLFFBQVEsQ0FBZ0I7SUFFakMsV0FBVyxDQUFRO0lBQ25CLFVBQVUsQ0FBUztJQUNuQixNQUFNLENBQW9CO0lBQzFCLFlBQVksQ0FBb0I7SUFDaEMsTUFBTSxDQUE4QjtJQUVwQyxZQUNDLE1BQXFDLEVBQ3JDLEtBQWtELEVBQ2xELFFBQWdCLEVBQ2hCLEtBQXlCLEVBQ3pCLE9BQXVCLEVBQ3ZCLFNBQWtCO1FBRWxCLEtBQUssRUFBRSxDQUFBO1FBZFIsZ0JBQVcsR0FBRyxLQUFLLENBQUE7UUFxQ1YsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDckQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQUVoRSxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUF6QnRELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzVCLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV6QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXZCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRVEsc0JBQXNCLENBQXNDO0lBRzVELGFBQWEsQ0FBc0M7SUFHNUQsSUFBVyxLQUFLO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFXLEtBQUssQ0FBQyxLQUF5QjtRQUN6QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7WUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBVyxXQUFXO1FBQ3JCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBRUQsSUFBVyxXQUFXLENBQUMsS0FBeUI7UUFDL0MsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVELElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVELGNBQWMsQ0FBQyxXQUFXLENBQUMsT0FBZ0I7UUFDMUMsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQTtRQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQVcsS0FBSztRQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0lBRUQsSUFBVyxLQUFLLENBQUMsS0FBbUM7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFeEIsSUFBSSxLQUFLLEVBQUUsS0FBSyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxJQUFJLEtBQUssRUFBRSxPQUFPLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNwRixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVNLElBQUksQ0FBQyxhQUF1QjtRQUNsQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjtJQWEvQixZQUNDLFdBQXlDLEVBQ3hCLGVBQWdDO1FBQWhDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQVpqQyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQU10QyxDQUFBO1FBRWMsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBcUQsQ0FBQTtRQU01RixJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFTSwyQkFBMkIsQ0FDakMsU0FBZ0MsRUFDaEMsUUFBZ0IsRUFDaEIsUUFBb0MsRUFDcEMsY0FFQztRQUVELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixRQUFRLHNCQUFzQixDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRTtZQUM5RSx1QkFBdUIsRUFBRSxjQUFjLEVBQUUsdUJBQXVCO1lBQ2hFLDhCQUE4QixFQUFFLG9DQUFvQyxDQUFDLFNBQVMsQ0FBQztTQUMvRSxDQUFDLENBQUE7UUFFRixPQUFPLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQ3hCLGFBQXFCLEVBQ3JCLFFBQWdCLEVBQ2hCLEtBQXlCLEVBQ3pCLEtBQVUsRUFDVixZQUErQjtRQUUvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUVyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUNwRCxhQUFhLEVBQ2I7UUFDQyxVQUFVO1NBQ1YsRUFDRCxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksa0JBQWtCLENBQ3pDLGFBQWEsRUFDYixJQUFJLENBQUMsTUFBTSxFQUNYLFFBQVEsRUFDUixLQUFLLEVBQ0wsT0FBTyxFQUNQLElBQUksQ0FDSixDQUFBO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRWxELE1BQU0sUUFBUSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCxLQUFLLENBQUMsaUNBQWlDLENBQUMsYUFBcUIsRUFBRSxPQUFnQjtRQUM5RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3RELFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxhQUFxQjtRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3hDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyQixJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQWM7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9