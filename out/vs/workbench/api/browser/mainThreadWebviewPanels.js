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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdQYW5lbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkV2Vidmlld1BhbmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFeEUsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUV2RixPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUlOLG9CQUFvQixFQUNwQixpQ0FBaUMsR0FDakMsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sWUFBWSxFQUNaLGNBQWMsRUFFZCxVQUFVLEdBQ1YsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRixPQUFPLEtBQUssZUFBZSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFFTiwyQkFBMkIsRUFDM0Isc0JBQXNCLEdBQ3RCLE1BQU0seUJBQXlCLENBQUE7QUFFaEM7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQjtJQUF2QjtRQUNrQixxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtRQUNsRCxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtJQThCcEUsQ0FBQztJQTVCTyxHQUFHLENBQUMsTUFBYyxFQUFFLEtBQW1CO1FBQzdDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFtQjtRQUMzQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVNLGlCQUFpQixDQUFDLE1BQWM7UUFDdEMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBYztRQUMzQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVcsSUFBSTtRQUNkLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQTtJQUNsQyxDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3RDLENBQUM7Q0FDRDtBQUVELE1BQU0sMEJBQTBCO0lBQy9CLFlBQW1DLE1BQWM7UUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBQUcsQ0FBQztJQUU5QyxZQUFZLENBQUMsUUFBZ0I7UUFDbkMsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQTtJQUM5QixDQUFDO0lBRU0sVUFBVSxDQUFDLFFBQWdCO1FBQ2pDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzFGLENBQUM7Q0FDRDtBQUVNLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQ1osU0FBUSxVQUFVO0lBYWxCLFlBQ0MsT0FBd0IsRUFDUCxtQkFBdUMsRUFDakMscUJBQTZELEVBQzlELG1CQUEwRCxFQUNoRSxjQUErQyxFQUM1QyxnQkFBbUMsRUFDckMsY0FBK0IsRUFDdEIsd0JBQW1FO1FBRTdGLEtBQUssRUFBRSxDQUFBO1FBUlUsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFvQjtRQUNoQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzdDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDL0MsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBR3BCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFsQjdFLHlCQUFvQixHQUFHLElBQUksMEJBQTBCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUkzRSxtQkFBYyxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUV4QyxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBVSxDQUFDLENBQUE7UUFnQnZFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGdDQUFnQyxDQUM3RCxnQ0FBZ0MsRUFDaEMsY0FBYyxDQUNkLENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRW5GLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLEdBQUcsQ0FDUixjQUFjLENBQUMsdUJBQXVCLEVBQ3RDLGNBQWMsQ0FBQyx5QkFBeUIsRUFDeEMsbUJBQW1CLENBQUMsYUFBYSxFQUNqQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFDcEMsbUJBQW1CLENBQUMsY0FBYyxDQUNsQyxDQUFDLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQy9ELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLHdCQUF3QixDQUFDLDhCQUE4QixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDakUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxxREFBcUQ7UUFDckQsc0ZBQXNGO1FBQ3RGLElBQUksQ0FBQyxTQUFTLENBQ2Isd0JBQXdCLENBQUMsZ0JBQWdCLENBQUM7WUFDekMsVUFBVSxFQUFFLENBQUMsT0FBcUIsRUFBRSxFQUFFO2dCQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDdkUsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDbEMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGtCQUFrQixRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUMvRCxDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELGNBQWMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRU0sZUFBZSxDQUNyQixNQUFxQyxFQUNyQyxLQUFtQixFQUNuQixPQUFvRDtRQUVwRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVuRSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbEQsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBRXBCLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtnQkFDMUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxtQkFBbUIsQ0FDekIsYUFBMEQsRUFDMUQsTUFBcUMsRUFDckMsUUFBZ0IsRUFDaEIsUUFBMEMsRUFDMUMsV0FBb0Q7UUFFcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ25FLE1BQU0scUJBQXFCLEdBQXdCLFdBQVc7WUFDN0QsQ0FBQyxDQUFDO2dCQUNBLGFBQWEsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWE7Z0JBQzFDLEtBQUssRUFBRSxXQUFXO2FBQ2xCO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVMLE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUV4RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUN4RDtZQUNDLE1BQU07WUFDTixnQkFBZ0IsRUFBRSxRQUFRO1lBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixPQUFPLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztZQUNwRCxjQUFjLEVBQUUsMkJBQTJCLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztZQUNwRSxTQUFTO1NBQ1QsRUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUNoRCxRQUFRLENBQUMsS0FBSyxFQUNkLHFCQUFxQixDQUNyQixDQUFBO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFO1lBQ3JDLDhCQUE4QixFQUFFLFFBQVEsQ0FBQyw4QkFBOEI7U0FDdkUsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLGVBQWUsQ0FBQyxNQUFxQztRQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTTtRQUNQLENBQUM7UUFDRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVNLFNBQVMsQ0FBQyxNQUFxQyxFQUFFLEtBQWE7UUFDcEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRU0sWUFBWSxDQUNsQixNQUFxQyxFQUNyQyxLQUFtRDtRQUVuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFTSxPQUFPLENBQ2IsTUFBcUMsRUFDckMsV0FBb0Q7UUFFcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDdEMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbkUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVPLDZCQUE2QixDQUNwQyxXQUFvRDtRQUVwRCxJQUNDLE9BQU8sV0FBVyxDQUFDLFVBQVUsS0FBSyxXQUFXO1lBQzdDLFdBQVcsQ0FBQyxVQUFVLEtBQUssWUFBWTtZQUN2QyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQ3JGLENBQUM7WUFDRixPQUFPLFlBQVksQ0FBQTtRQUNwQixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzNDLE9BQU8sVUFBVSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakMsaURBQWlEO1lBQ2pELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLHFDQUE2QixDQUNwRixXQUFXLENBQUMsVUFBVSxDQUN0QixDQUFBO1lBQ0QsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxhQUFhLENBQUMsRUFBRSxDQUFBO1lBQ3hCLENBQUM7WUFFRCx1RUFBdUU7WUFDdkUsOEVBQThFO1lBQzlFLHFGQUFxRjtZQUNyRixzRkFBc0Y7WUFDdEYsdUNBQXVDO1lBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLDRCQUFvQixFQUFFLENBQUMsQ0FBQTtZQUNyRixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sU0FBUyxHQUFHLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO2dCQUMvRSxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUVNLG1CQUFtQixDQUN6QixRQUFnQixFQUNoQixPQUFvRDtRQUVwRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLFFBQVEscUJBQXFCLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ2pCLFFBQVEsRUFDUixJQUFJLENBQUMsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUM7WUFDOUMsVUFBVSxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sWUFBWSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2xGLENBQUM7WUFDRCxjQUFjLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBaUIsRUFBRTtnQkFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzVFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FDL0UsQ0FBQTtvQkFDRCxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUE7Z0JBRTdCLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFFbkQsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFBO2dCQUNyQixJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ2hDLElBQUksQ0FBQzt3QkFDSixLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUMvQyxDQUFDO29CQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDN0UsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksQ0FBQztvQkFDSixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQ3pDLE1BQU0sRUFDTixRQUFRLEVBQ1I7d0JBQ0MsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUU7d0JBQzlCLEtBQUs7d0JBQ0wsWUFBWSxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTzt3QkFDMUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYzt3QkFDbkQsTUFBTSxFQUFFLFlBQVksS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVk7cUJBQ3pELEVBQ0QsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQ3RFLENBQUE7Z0JBQ0YsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQzNCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FDbEUsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVNLHFCQUFxQixDQUFDLFFBQWdCO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLFFBQVEsYUFBYSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVPLHVCQUF1QixDQUFDLGlCQUEwQztRQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMvQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUE4QyxFQUFFLENBQUE7UUFFaEUsTUFBTSx3QkFBd0IsR0FBRyxDQUNoQyxLQUFtQixFQUNuQixhQUEwQixFQUMxQixXQUF3QixFQUN2QixFQUFFO1lBQ0gsSUFBSSxDQUFDLENBQUMsV0FBVyxZQUFZLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLE9BQU07WUFDUCxDQUFDO1lBRUQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNqRSxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRztvQkFDcEIsT0FBTyxFQUFFLGFBQWEsS0FBSyxLQUFLLENBQUMsWUFBWTtvQkFDN0MsTUFBTSxFQUFFLFdBQVcsS0FBSyxpQkFBaUI7b0JBQ3pDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztpQkFDakUsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyRCxLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxLQUFLLFlBQVksZUFBZSxFQUFFLENBQUM7b0JBQ3RDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNyRCx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDeEQsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHdCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzlDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBcUM7UUFDL0QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3JELENBQUM7Q0FDRCxDQUFBO0FBNVRZLHVCQUF1QjtJQWlCakMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsd0JBQXdCLENBQUE7R0F0QmQsdUJBQXVCLENBNFRuQzs7QUFFRCxTQUFTLGlCQUFpQixDQUN6QixLQUFtRDtJQUVuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsT0FBTztRQUNOLEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDOUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztLQUM1QixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsWUFBa0Q7SUFDL0UsT0FBTztRQUNOLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxnQkFBZ0I7UUFDL0MsdUJBQXVCLEVBQUUsWUFBWSxDQUFDLHVCQUF1QjtLQUM3RCxDQUFBO0FBQ0YsQ0FBQyJ9