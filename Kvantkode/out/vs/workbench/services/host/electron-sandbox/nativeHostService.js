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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9ob3N0L2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlSG9zdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBR04sY0FBYyxFQUNkLGlCQUFpQixHQUlqQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsZUFBZSxFQUNmLFNBQVMsRUFDVCxtQkFBbUIsR0FDbkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxF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