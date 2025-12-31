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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V2Vidmlld1BhbmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNELE9BQU8sS0FBSyxjQUFjLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUNOLHVCQUF1QixFQUd2QixlQUFlLEVBQ2Ysb0NBQW9DLEdBQ3BDLE1BQU0scUJBQXFCLENBQUE7QUFJNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFBO0FBSWpELE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUNsQyxPQUFPLENBQStCO0lBQ3RDLE1BQU0sQ0FBOEM7SUFDcEQsU0FBUyxDQUFRO0lBRWpCLFFBQVEsQ0FBZ0I7SUFDeEIsUUFBUSxDQUE0QjtJQUU3QyxNQUFNLENBQVE7SUFDZCxTQUFTLENBQVc7SUFDcEIsV0FBVyxDQUEyQztJQUN0RCxRQUFRLENBQWdCO0lBQ3hCLE9BQU8sQ0FBUztJQUNoQixXQUFXLENBQWlCO0lBRW5CLGFBQWEsQ0FBc0M7SUFHbkQscUJBQXFCLENBRTdCO0lBR0QsWUFDQyxNQUFxQyxFQUNyQyxLQUFtRCxFQUNuRCxPQUF1QixFQUN2QixNQU1DO1FBRUQsS0FBSyxFQUFFLENBQUE7UUF6QlIsZ0JB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