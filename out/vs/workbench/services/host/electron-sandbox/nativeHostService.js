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
import { Emitter, Event } from '../../../../base/common/event.js';
import { IHostService } from '../browser/host.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isFolderToOpen, isWorkspaceToOpen, } from '../../../../platform/window/common/window.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NativeHostService } from '../../../../platform/native/common/nativeHostService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { disposableWindowInterval, getActiveDocument, getWindowId, getWindowsCount, hasWindow, onDidRegisterWindow, } from '../../../../base/browser/dom.js';
import { memoize } from '../../../../base/common/decorators.js';
import { isAuxiliaryWindow } from '../../../../base/browser/window.js';
let WorkbenchNativeHostService = class WorkbenchNativeHostService extends NativeHostService {
    constructor(environmentService, mainProcessService) {
        super(environmentService.window.id, mainProcessService);
    }
};
WorkbenchNativeHostService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IMainProcessService)
], WorkbenchNativeHostService);
let WorkbenchHostService = class WorkbenchHostService extends Disposable {
    constructor(nativeHostService, labelService, environmentService) {
        super();
        this.nativeHostService = nativeHostService;
        this.labelService = labelService;
        this.environmentService = environmentService;
        //#endregion
        //#region Native Handle
        this._nativeWindowHandleCache = new Map();
        this.onDidChangeFocus = Event.latch(Event.any(Event.map(Event.filter(this.nativeHostService.onDidFocusMainOrAuxiliaryWindow, (id) => hasWindow(id), this._store), () => this.hasFocus, this._store), Event.map(Event.filter(this.nativeHostService.onDidBlurMainOrAuxiliaryWindow, (id) => hasWindow(id), this._store), () => this.hasFocus, this._store), Event.map(this.onDidChangeActiveWindow, () => this.hasFocus, this._store)), undefined, this._store);
        this.onDidChangeFullScreen = Event.filter(this.nativeHostService.onDidChangeWindowFullScreen, (e) => hasWindow(e.windowId), this._store);
    }
    get hasFocus() {
        return getActiveDocument().hasFocus();
    }
    async hadLastFocus() {
        const activeWindowId = await this.nativeHostService.getActiveWindowId();
        if (typeof activeWindowId === 'undefined') {
            return false;
        }
        return activeWindowId === this.nativeHostService.windowId;
    }
    //#endregion
    //#region Window
    get onDidChangeActiveWindow() {
        const emitter = this._register(new Emitter());
        // Emit via native focus tracking
        this._register(Event.filter(this.nativeHostService.onDidFocusMainOrAuxiliaryWindow, (id) => hasWindow(id), this._store)((id) => emitter.fire(id)));
        this._register(onDidRegisterWindow(({ window, disposables }) => {
            // Emit via interval: immediately when opening an auxiliary window,
            // it is possible that document focus has not yet changed, so we
            // poll for a while to ensure we catch the event.
            disposables.add(disposableWindowInterval(window, () => {
                const hasFocus = window.document.hasFocus();
                if (hasFocus) {
                    emitter.fire(window.vscodeWindowId);
                }
                return hasFocus;
            }, 100, 20));
        }));
        return Event.latch(emitter.event, undefined, this._store);
    }
    openWindow(arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(arg1, arg2);
        }
        return this.doOpenEmptyWindow(arg1);
    }
    doOpenWindow(toOpen, options) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (!!remoteAuthority) {
            toOpen.forEach((openable) => (openable.label = openable.label || this.getRecentLabel(openable)));
            if (options?.remoteAuthority === undefined) {
                // set the remoteAuthority of the window the request came from.
                // It will be used when the input is neither file nor vscode-remote.
                options = options ? { ...options, remoteAuthority } : { remoteAuthority };
            }
        }
        return this.nativeHostService.openWindow(toOpen, options);
    }
    getRecentLabel(openable) {
        if (isFolderToOpen(openable)) {
            return this.labelService.getWorkspaceLabel(openable.folderUri, { verbose: 2 /* Verbosity.LONG */ });
        }
        if (isWorkspaceToOpen(openable)) {
            return this.labelService.getWorkspaceLabel({ id: '', configPath: openable.workspaceUri }, { verbose: 2 /* Verbosity.LONG */ });
        }
        return this.labelService.getUriLabel(openable.fileUri, { appendWorkspaceSuffix: true });
    }
    doOpenEmptyWindow(options) {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (!!remoteAuthority && options?.remoteAuthority === undefined) {
            // set the remoteAuthority of the window the request came from
            options = options ? { ...options, remoteAuthority } : { remoteAuthority };
        }
        return this.nativeHostService.openWindow(options);
    }
    toggleFullScreen(targetWindow) {
        return this.nativeHostService.toggleFullScreen({
            targetWindowId: isAuxiliaryWindow(targetWindow) ? targetWindow.vscodeWindowId : undefined,
        });
    }
    async moveTop(targetWindow) {
        if (getWindowsCount() <= 1) {
            return; // does not apply when only one window is opened
        }
        return this.nativeHostService.moveWindowTop(isAuxiliaryWindow(targetWindow) ? { targetWindowId: targetWindow.vscodeWindowId } : undefined);
    }
    getCursorScreenPoint() {
        return this.nativeHostService.getCursorScreenPoint();
    }
    //#endregion
    //#region Lifecycle
    focus(targetWindow, options) {
        return this.nativeHostService.focusWindow({
            force: options?.force,
            targetWindowId: getWindowId(targetWindow),
        });
    }
    restart() {
        return this.nativeHostService.relaunch();
    }
    reload(options) {
        return this.nativeHostService.reload(options);
    }
    close() {
        return this.nativeHostService.closeWindow();
    }
    async withExpectedShutdown(expectedShutdownTask) {
        return await expectedShutdownTask();
    }
    //#endregion
    //#region Screenshots
    getScreenshot() {
        return this.nativeHostService.getScreenshot();
    }
    async getNativeWindowHandle(windowId) {
        if (!this._nativeWindowHandleCache.has(windowId)) {
            this._nativeWindowHandleCache.set(windowId, this.nativeHostService.getNativeWindowHandle(windowId));
        }
        return this._nativeWindowHandleCache.get(windowId);
    }
};
__decorate([
    memoize
], WorkbenchHostService.prototype, "onDidChangeActiveWindow", null);
WorkbenchHostService = __decorate([
    __param(0, INativeHostService),
    __param(1, ILabelService),
    __param(2, IWorkbenchEnvironmentService)
], WorkbenchHostService);
registerSingleton(IHostService, WorkbenchHostService, 1 /* InstantiationType.Delayed */);
registerSingleton(INativeHostService, WorkbenchNativeHostService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaG9zdC9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZUhvc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFhLE1BQU0sNENBQTRDLENBQUE7QUFDckYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUdOLGNBQWMsRUFDZCxpQkFBaUIsR0FJakIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDM0YsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLGVBQWUsRUFDZixTQUFTLEVBQ1QsbUJBQW1CLEdBQ25CLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxp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