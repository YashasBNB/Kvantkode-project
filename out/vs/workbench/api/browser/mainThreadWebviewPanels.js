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
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { DiffEditorInput } from '../../common/editor/diffEditorInput.js';
import { ExtensionKeyedWebviewOriginStore, } from '../../contrib/webview/browser/webview.js';
import { WebviewInput } from '../../contrib/webviewPanel/browser/webviewEditorInput.js';
import { IWebviewWorkbenchService, } from '../../contrib/webviewPanel/browser/webviewWorkbenchService.js';
import { editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection, } from '../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../services/editor/common/editorService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { reviveWebviewContentOptions, reviveWebviewExtension, } from './mainThreadWebviews.js';
/**
 * Bi-directional map between webview handles and inputs.
 */
class WebviewInputStore {
    constructor() {
        this._handlesToInputs = new Map();
        this._inputsToHandles = new Map();
    }
    add(handle, input) {
        this._handlesToInputs.set(handle, input);
        this._inputsToHandles.set(input, handle);
    }
    getHandleForInput(input) {
        return this._inputsToHandles.get(input);
    }
    getInputForHandle(handle) {
        return this._handlesToInputs.get(handle);
    }
    delete(handle) {
        const input = this.getInputForHandle(handle);
        this._handlesToInputs.delete(handle);
        if (input) {
            this._inputsToHandles.delete(input);
        }
    }
    get size() {
        return this._handlesToInputs.size;
    }
    [Symbol.iterator]() {
        return this._handlesToInputs.values();
    }
}
class WebviewViewTypeTransformer {
    constructor(prefix) {
        this.prefix = prefix;
    }
    fromExternal(viewType) {
        return this.prefix + viewType;
    }
    toExternal(viewType) {
        return viewType.startsWith(this.prefix) ? viewType.substr(this.prefix.length) : undefined;
    }
}
let MainThreadWebviewPanels = class MainThreadWebviewPanels extends Disposable {
    constructor(context, _mainThreadWebviews, _configurationService, _editorGroupService, _editorService, extensionService, storageService, _webviewWorkbenchService) {
        super();
        this._mainThreadWebviews = _mainThreadWebviews;
        this._configurationService = _configurationService;
        this._editorGroupService = _editorGroupService;
        this._editorService = _editorService;
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this.webviewPanelViewType = new WebviewViewTypeTransformer('mainThreadWebview-');
        this._webviewInputs = new WebviewInputStore();
        this._revivers = this._register(new DisposableMap());
        this.webviewOriginStore = new ExtensionKeyedWebviewOriginStore('mainThreadWebviewPanel.origins', storageService);
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewPanels);
        this._register(Event.any(_editorService.onDidActiveEditorChange, _editorService.onDidVisibleEditorsChange, _editorGroupService.onDidAddGroup, _editorGroupService.onDidRemoveGroup, _editorGroupService.onDidMoveGroup)(() => {
            this.updateWebviewViewStates(this._editorService.activeEditor);
        }));
        this._register(_webviewWorkbenchService.onDidChangeActiveWebviewEditor((input) => {
            this.updateWebviewViewStates(input);
        }));
        // This reviver's only job is to activate extensions.
        // This should trigger the real reviver to be registered from the extension host side.
        this._register(_webviewWorkbenchService.registerResolver({
            canResolve: (webview) => {
                const viewType = this.webviewPanelViewType.toExternal(webview.viewType);
                if (typeof viewType === 'string') {
                    extensionService.activateByEvent(`onWebviewPanel:${viewType}`);
                }
                return false;
            },
            resolveWebview: () => {
                throw new Error('not implemented');
            },
        }));
    }
    get webviewInputs() {
        return this._webviewInputs;
    }
    addWebviewInput(handle, input, options) {
        this._webviewInputs.add(handle, input);
        this._mainThreadWebviews.addWebview(handle, input.webview, options);
        const disposeSub = input.webview.onDidDispose(() => {
            disposeSub.dispose();
            this._proxy.$onDidDisposeWebviewPanel(handle).finally(() => {
                this._webviewInputs.delete(handle);
            });
        });
    }
    $createWebviewPanel(extensionData, handle, viewType, initData, showOptions) {
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        const mainThreadShowOptions = showOptions
            ? {
                preserveFocus: !!showOptions.preserveFocus,
                group: targetGroup,
            }
            : {};
        const extension = reviveWebviewExtension(extensionData);
        const origin = this.webviewOriginStore.getOrigin(viewType, extension.id);
        const webview = this._webviewWorkbenchService.openWebview({
            origin,
            providedViewType: viewType,
            title: initData.title,
            options: reviveWebviewOptions(initData.panelOptions),
            contentOptions: reviveWebviewContentOptions(initData.webviewOptions),
            extension,
        }, this.webviewPanelViewType.fromExternal(viewType), initData.title, mainThreadShowOptions);
        this.addWebviewInput(handle, webview, {
            serializeBuffersForPostMessage: initData.serializeBuffersForPostMessage,
        });
    }
    $disposeWebview(handle) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview) {
            return;
        }
        webview.dispose();
    }
    $setTitle(handle, value) {
        this.tryGetWebviewInput(handle)?.setName(value);
    }
    $setIconPath(handle, value) {
        const webview = this.tryGetWebviewInput(handle);
        if (webview) {
            webview.iconPath = reviveWebviewIcon(value);
        }
    }
    $reveal(handle, showOptions) {
        const webview = this.tryGetWebviewInput(handle);
        if (!webview || webview.isDisposed()) {
            return;
        }
        const targetGroup = this.getTargetGroupFromShowOptions(showOptions);
        this._webviewWorkbenchService.revealWebview(webview, targetGroup, !!showOptions.preserveFocus);
    }
    getTargetGroupFromShowOptions(showOptions) {
        if (typeof showOptions.viewColumn === 'undefined' ||
            showOptions.viewColumn === ACTIVE_GROUP ||
            (this._editorGroupService.count === 1 && this._editorGroupService.activeGroup.isEmpty)) {
            return ACTIVE_GROUP;
        }
        if (showOptions.viewColumn === SIDE_GROUP) {
            return SIDE_GROUP;
        }
        if (showOptions.viewColumn >= 0) {
            // First check to see if an existing group exists
            const groupInColumn = this._editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[showOptions.viewColumn];
            if (groupInColumn) {
                return groupInColumn.id;
            }
            // We are dealing with an unknown group and therefore need a new group.
            // Note that the new group's id may not match the one requested. We only allow
            // creating a single new group, so if someone passes in `showOptions.viewColumn = 99`
            // and there are two editor groups open, we simply create a third editor group instead
            // of creating all the groups up to 99.
            const newGroup = this._editorGroupService.findGroup({ location: 1 /* GroupLocation.LAST */ });
            if (newGroup) {
                const direction = preferredSideBySideGroupDirection(this._configurationService);
                return this._editorGroupService.addGroup(newGroup, direction);
            }
        }
        return ACTIVE_GROUP;
    }
    $registerSerializer(viewType, options) {
        if (this._revivers.has(viewType)) {
            throw new Error(`Reviver for ${viewType} already registered`);
        }
        this._revivers.set(viewType, this._webviewWorkbenchService.registerResolver({
            canResolve: (webviewInput) => {
                return webviewInput.viewType === this.webviewPanelViewType.fromExternal(viewType);
            },
            resolveWebview: async (webviewInput) => {
                const viewType = this.webviewPanelViewType.toExternal(webviewInput.viewType);
                if (!viewType) {
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(webviewInput.viewType));
                    return;
                }
                const handle = generateUuid();
                this.addWebviewInput(handle, webviewInput, options);
                let state = undefined;
                if (webviewInput.webview.state) {
                    try {
                        state = JSON.parse(webviewInput.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewInput.webview.state);
                    }
                }
                try {
                    await this._proxy.$deserializeWebviewPanel(handle, viewType, {
                        title: webviewInput.getTitle(),
                        state,
                        panelOptions: webviewInput.webview.options,
                        webviewOptions: webviewInput.webview.contentOptions,
                        active: webviewInput === this._editorService.activeEditor,
                    }, editorGroupToColumn(this._editorGroupService, webviewInput.group || 0));
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewInput.webview.setHtml(this._mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            },
        }));
    }
    $unregisterSerializer(viewType) {
        if (!this._revivers.has(viewType)) {
            throw new Error(`No reviver for ${viewType} registered`);
        }
        this._revivers.deleteAndDispose(viewType);
    }
    updateWebviewViewStates(activeEditorInput) {
        if (!this._webviewInputs.size) {
            return;
        }
        const viewStates = {};
        const updateViewStatesForInput = (group, topLevelInput, editorInput) => {
            if (!(editorInput instanceof WebviewInput)) {
                return;
            }
            editorInput.updateGroup(group.id);
            const handle = this._webviewInputs.getHandleForInput(editorInput);
            if (handle) {
                viewStates[handle] = {
                    visible: topLevelInput === group.activeEditor,
                    active: editorInput === activeEditorInput,
                    position: editorGroupToColumn(this._editorGroupService, group.id),
                };
            }
        };
        for (const group of this._editorGroupService.groups) {
            for (const input of group.editors) {
                if (input instanceof DiffEditorInput) {
                    updateViewStatesForInput(group, input, input.primary);
                    updateViewStatesForInput(group, input, input.secondary);
                }
                else {
                    updateViewStatesForInput(group, input, input);
                }
            }
        }
        if (Object.keys(viewStates).length) {
            this._proxy.$onDidChangeWebviewPanelViewStates(viewStates);
        }
    }
    tryGetWebviewInput(handle) {
        return this._webviewInputs.getInputForHandle(handle);
    }
};
MainThreadWebviewPanels = __decorate([
    __param(2, IConfigurationService),
    __param(3, IEditorGroupsService),
    __param(4, IEditorService),
    __param(5, IExtensionService),
    __param(6, IStorageService),
    __param(7, IWebviewWorkbenchService)
], MainThreadWebviewPanels);
export { MainThreadWebviewPanels };
function reviveWebviewIcon(value) {
    if (!value) {
        return undefined;
    }
    return {
        light: URI.revive(value.light),
        dark: URI.revive(value.dark),
    };
}
function reviveWebviewOptions(panelOptions) {
    return {
        enableFindWidget: panelOptions.enableFindWidget,
        retainContextWhenHidden: panelOptions.retainContextWhenHidden,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFdlYnZpZXdQYW5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXhFLE9BQU8sRUFDTixnQ0FBZ0MsR0FFaEMsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFdkYsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFJTixvQkFBb0IsRUFDcEIsaUNBQWlDLEdBQ2pDLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUNOLFlBQVksRUFDWixjQUFjLEVBRWQsVUFBVSxHQUNWLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGlC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