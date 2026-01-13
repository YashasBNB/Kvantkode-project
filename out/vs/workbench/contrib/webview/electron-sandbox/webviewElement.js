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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvZWxlY3Ryb24tc2FuZGJveC93ZWJ2aWV3RWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENB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