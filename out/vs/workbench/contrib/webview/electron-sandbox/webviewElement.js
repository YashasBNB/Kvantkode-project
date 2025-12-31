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
import { Delayer } from '../../../../base/common/async.js';
import { Schemas } from '../../../../base/common/network.js';
import { consumeStream } from '../../../../base/common/stream.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { WebviewElement } from '../browser/webviewElement.js';
import { WindowIgnoreMenuShortcutsManager } from './windowIgnoreMenuShortcutsManager.js';
/**
 * Webview backed by an iframe but that uses Electron APIs to power the webview.
 */
let ElectronWebviewElement = class ElectronWebviewElement extends WebviewElement {
    get platform() {
        return 'electron';
    }
    constructor(initInfo, webviewThemeDataProvider, contextMenuService, tunnelService, fileService, environmentService, remoteAuthorityResolverService, logService, configurationService, mainProcessService, notificationService, _nativeHostService, instantiationService, accessibilityService) {
        super(initInfo, webviewThemeDataProvider, configurationService, contextMenuService, notificationService, environmentService, fileService, logService, remoteAuthorityResolverService, tunnelService, instantiationService, accessibilityService);
        this._nativeHostService = _nativeHostService;
        this._findStarted = false;
        this._iframeDelayer = this._register(new Delayer(200));
        this._webviewKeyboardHandler = new WindowIgnoreMenuShortcutsManager(configurationService, mainProcessService, _nativeHostService);
        this._webviewMainService = ProxyChannel.toService(mainProcessService.getChannel('webview'));
        if (initInfo.options.enableFindWidget) {
            this._register(this.onDidHtmlChange((newContent) => {
                if (this._findStarted && this._cachedHtmlContent !== newContent) {
                    this.stopFind(false);
                    this._cachedHtmlContent = newContent;
                }
            }));
            this._register(this._webviewMainService.onFoundInFrame((result) => {
                this._hasFindResult.fire(result.matches > 0);
            }));
        }
    }
    dispose() {
        // Make sure keyboard handler knows it closed (#71800)
        this._webviewKeyboardHandler.didBlur();
        super.dispose();
    }
    webviewContentEndpoint(iframeId) {
        return `${Schemas.vscodeWebview}://${iframeId}`;
    }
    streamToBuffer(stream) {
        // Join buffers from stream without using the Node.js backing pool.
        // This lets us transfer the resulting buffer to the webview.
        return consumeStream(stream, (buffers) => {
            const totalLength = buffers.reduce((prev, curr) => prev + curr.byteLength, 0);
            const ret = new ArrayBuffer(totalLength);
            const view = new Uint8Array(ret);
            let offset = 0;
            for (const element of buffers) {
                view.set(element.buffer, offset);
                offset += element.byteLength;
            }
            return ret;
        });
    }
    /**
     * Webviews expose a stateful find API.
     * Successive calls to find will move forward or backward through onFindResults
     * depending on the supplied options.
     *
     * @param value The string to search for. Empty strings are ignored.
     */
    find(value, previous) {
        if (!this.element) {
            return;
        }
        if (!this._findStarted) {
            this.updateFind(value);
        }
        else {
            // continuing the find, so set findNext to false
            const options = { forward: !previous, findNext: false, matchCase: false };
            this._webviewMainService.findInFrame({ windowId: this._nativeHostService.windowId }, this.id, value, options);
        }
    }
    updateFind(value) {
        if (!value || !this.element) {
            return;
        }
        // FindNext must be true for a first request
        const options = {
            forward: true,
            findNext: true,
            matchCase: false,
        };
        this._iframeDelayer.trigger(() => {
            this._findStarted = true;
            this._webviewMainService.findInFrame({ windowId: this._nativeHostService.windowId }, this.id, value, options);
        });
    }
    stopFind(keepSelection) {
        if (!this.element) {
            return;
        }
        this._iframeDelayer.cancel();
        this._findStarted = false;
        this._webviewMainService.stopFindInFrame({ windowId: this._nativeHostService.windowId }, this.id, {
            keepSelection,
        });
        this._onDidStopFind.fire();
    }
    handleFocusChange(isFocused) {
        super.handleFocusChange(isFocused);
        if (isFocused) {
            this._webviewKeyboardHandler.didFocus();
        }
        else {
            this._webviewKeyboardHandler.didBlur();
        }
    }
};
ElectronWebviewElement = __decorate([
    __param(2, IContextMenuService),
    __param(3, ITunnelService),
    __param(4, IFileService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IRemoteAuthorityResolverService),
    __param(7, ILogService),
    __param(8, IConfigurationService),
    __param(9, IMainProcessService),
    __param(10, INotificationService),
    __param(11, INativeHostService),
    __param(12, IInstantiationService),
    __param(13, IAccessibilityService)
], ElectronWebviewElement);
export { ElectronWebviewElement };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2VsZWN0cm9uLXNhbmRib3gvd2Vidmlld0VsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBSzdFLE9BQU8sRUFB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