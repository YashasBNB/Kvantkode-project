/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-native-private */
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as typeConverters from './extHostTypeConverters.js';
import { serializeWebviewOptions, toExtensionData, shouldSerializeBuffersForPostMessage, } from './extHostWebview.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as extHostTypes from './extHostTypes.js';
class ExtHostWebviewPanel extends Disposable {
    #handle;
    #proxy;
    #viewType;
    #webview;
    #options;
    #title;
    #iconPath;
    #viewColumn;
    #visible;
    #active;
    #isDisposed;
    #onDidDispose;
    #onDidChangeViewState;
    constructor(handle, proxy, webview, params) {
        super();
        this.#viewColumn = undefined;
        this.#visible = true;
        this.#isDisposed = false;
        this.#onDidDispose = this._register(new Emitter());
        this.onDidDispose = this.#onDidDispose.event;
        this.#onDidChangeViewState = this._register(new Emitter());
        this.onDidChangeViewState = this.#onDidChangeViewState.event;
        this.#handle = handle;
        this.#proxy = proxy;
        this.#webview = webview;
        this.#viewType = params.viewType;
        this.#options = params.panelOptions;
        this.#viewColumn = params.viewColumn;
        this.#title = params.title;
        this.#active = params.active;
    }
    dispose() {
        if (this.#isDisposed) {
            return;
        }
        this.#isDisposed = true;
        this.#onDidDispose.fire();
        this.#proxy.$disposeWebview(this.#handle);
        this.#webview.dispose();
        super.dispose();
    }
    get webview() {
        this.assertNotDisposed();
        return this.#webview;
    }
    get viewType() {
        this.assertNotDisposed();
        return this.#viewType;
    }
    get title() {
        this.assertNotDisposed();
        return this.#title;
    }
    set title(value) {
        this.assertNotDisposed();
        if (this.#title !== value) {
            this.#title = value;
            this.#proxy.$setTitle(this.#handle, value);
        }
    }
    get iconPath() {
        this.assertNotDisposed();
        return this.#iconPath;
    }
    set iconPath(value) {
        this.assertNotDisposed();
        if (this.#iconPath !== value) {
            this.#iconPath = value;
            this.#proxy.$setIconPath(this.#handle, URI.isUri(value) ? { light: value, dark: value } : value);
        }
    }
    get options() {
        return this.#options;
    }
    get viewColumn() {
        this.assertNotDisposed();
        if (typeof this.#viewColumn === 'number' && this.#viewColumn < 0) {
            // We are using a symbolic view column
            // Return undefined instead to indicate that the real view column is currently unknown but will be resolved.
            return undefined;
        }
        return this.#viewColumn;
    }
    get active() {
        this.assertNotDisposed();
        return this.#active;
    }
    get visible() {
        this.assertNotDisposed();
        return this.#visible;
    }
    _updateViewState(newState) {
        if (this.#isDisposed) {
            return;
        }
        if (this.active !== newState.active ||
            this.visible !== newState.visible ||
            this.viewColumn !== newState.viewColumn) {
            this.#active = newState.active;
            this.#visible = newState.visible;
            this.#viewColumn = newState.viewColumn;
            this.#onDidChangeViewState.fire({ webviewPanel: this });
        }
    }
    reveal(viewColumn, preserveFocus) {
        this.assertNotDisposed();
        this.#proxy.$reveal(this.#handle, {
            viewColumn: typeof viewColumn === 'undefined' ? undefined : typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: !!preserveFocus,
        });
    }
    assertNotDisposed() {
        if (this.#isDisposed) {
            throw new Error('Webview is disposed');
        }
    }
}
export class ExtHostWebviewPanels extends Disposable {
    static newHandle() {
        return generateUuid();
    }
    constructor(mainContext, webviews, workspace) {
        super();
        this.webviews = webviews;
        this.workspace = workspace;
        this._webviewPanels = new Map();
        this._serializers = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadWebviewPanels);
    }
    dispose() {
        super.dispose();
        this._webviewPanels.forEach((value) => value.dispose());
        this._webviewPanels.clear();
    }
    createWebviewPanel(extension, viewType, title, showOptions, options = {}) {
        const viewColumn = typeof showOptions === 'object' ? showOptions.viewColumn : showOptions;
        const webviewShowOptions = {
            viewColumn: typeConverters.ViewColumn.from(viewColumn),
            preserveFocus: typeof showOptions === 'object' && !!showOptions.preserveFocus,
        };
        const serializeBuffersForPostMessage = shouldSerializeBuffersForPostMessage(extension);
        const handle = ExtHostWebviewPanels.newHandle();
        this._proxy.$createWebviewPanel(toExtensionData(extension), handle, viewType, {
            title,
            panelOptions: serializeWebviewPanelOptions(options),
            webviewOptions: serializeWebviewOptions(extension, this.workspace, options),
            serializeBuffersForPostMessage,
        }, webviewShowOptions);
        const webview = this.webviews.createNewWebview(handle, options, extension);
        const panel = this.createNewWebviewPanel(handle, viewType, title, viewColumn, options, webview, true);
        return panel;
    }
    $onDidChangeWebviewPanelViewStates(newStates) {
        const handles = Object.keys(newStates);
        // Notify webviews of state changes in the following order:
        // - Non-visible
        // - Visible
        // - Active
        handles.sort((a, b) => {
            const stateA = newStates[a];
            const stateB = newStates[b];
            if (stateA.active) {
                return 1;
            }
            if (stateB.active) {
                return -1;
            }
            return +stateA.visible - +stateB.visible;
        });
        for (const handle of handles) {
            const panel = this.getWebviewPanel(handle);
            if (!panel) {
                continue;
            }
            const newState = newStates[handle];
            panel._updateViewState({
                active: newState.active,
                visible: newState.visible,
                viewColumn: typeConverters.ViewColumn.to(newState.position),
            });
        }
    }
    async $onDidDisposeWebviewPanel(handle) {
        const panel = this.getWebviewPanel(handle);
        panel?.dispose();
        this._webviewPanels.delete(handle);
        this.webviews.deleteWebview(handle);
    }
    registerWebviewPanelSerializer(extension, viewType, serializer) {
        if (this._serializers.has(viewType)) {
            throw new Error(`Serializer for '${viewType}' already registered`);
        }
        this._serializers.set(viewType, { serializer, extension });
        this._proxy.$registerSerializer(viewType, {
            serializeBuffersForPostMessage: shouldSerializeBuffersForPostMessage(extension),
        });
        return new extHostTypes.Disposable(() => {
            this._serializers.delete(viewType);
            this._proxy.$unregisterSerializer(viewType);
        });
    }
    async $deserializeWebviewPanel(webviewHandle, viewType, initData, position) {
        const entry = this._serializers.get(viewType);
        if (!entry) {
            throw new Error(`No serializer found for '${viewType}'`);
        }
        const { serializer, extension } = entry;
        const webview = this.webviews.createNewWebview(webviewHandle, initData.webviewOptions, extension);
        const revivedPanel = this.createNewWebviewPanel(webviewHandle, viewType, initData.title, position, initData.panelOptions, webview, initData.active);
        await serializer.deserializeWebviewPanel(revivedPanel, initData.state);
    }
    createNewWebviewPanel(webviewHandle, viewType, title, position, options, webview, active) {
        const panel = new ExtHostWebviewPanel(webviewHandle, this._proxy, webview, {
            viewType,
            title,
            viewColumn: position,
            panelOptions: options,
            active,
        });
        this._webviewPanels.set(webviewHandle, panel);
        return panel;
    }
    getWebviewPanel(handle) {
        return this._webviewPanels.get(handle);
    }
}
function serializeWebviewPanelOptions(options) {
    return {
        enableFindWidget: options.enableFindWidget,
        retainContextWhenHidden: options.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXZWJ2aWV3UGFuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sdUJBQXVCLEVBR3ZCLGVBQWUsRUFDZixvQ0FBb0MsR0FDcEMsTUFBTSxxQkFBcUIsQ0FBQTtBQUk1QixPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUE7QUFJakQsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBQ2xDLE9BQU8sQ0FBK0I7SUFDdEMsTUFBTSxDQUE4QztJQUNwRCxTQUFTLENBQVE7SUFFakIsUUFBUSxDQUFnQjtJQUN4QixRQUFRLENBQTRCO0lBRTdDLE1BQU0sQ0FBUTtJQUNkLFNBQVMsQ0FBVztJQUNwQixXQUFXLENBQTJDO0lBQ3RELFFBQVEsQ0FBZ0I7SUFDeEIsT0FBTyxDQUFTO0lBQ2hCLFdBQVcsQ0FBaUI7SUFFbkIsYUFBYSxDQUFzQztJQUduRCxxQkFBcUIsQ0FFN0I7SUFHRCxZQUNDLE1BQXFDLEVBQ3JDLEtBQW1ELEVBQ25ELE9BQXVCLEVBQ3ZCLE1BTUM7UUFFRCxLQUFLLEVBQUUsQ0FBQTtRQXpC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