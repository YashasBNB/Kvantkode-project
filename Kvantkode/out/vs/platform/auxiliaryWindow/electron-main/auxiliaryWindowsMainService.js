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
import { BrowserWindow, app, } from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { AuxiliaryWindow } from './auxiliaryWindow.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { defaultAuxWindowState, } from '../../window/electron-main/window.js';
import { WindowStateValidator, defaultBrowserWindowOptions, getLastFocused, } from '../../windows/electron-main/windows.js';
let AuxiliaryWindowsMainService = class AuxiliaryWindowsMainService extends Disposable {
    constructor(instantiationService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.logService = logService;
        this._onDidMaximizeWindow = this._register(new Emitter());
        this.onDidMaximizeWindow = this._onDidMaximizeWindow.event;
        this._onDidUnmaximizeWindow = this._register(new Emitter());
        this.onDidUnmaximizeWindow = this._onDidUnmaximizeWindow.event;
        this._onDidChangeFullScreen = this._register(new Emitter());
        this.onDidChangeFullScreen = this._onDidChangeFullScreen.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this.windows = new Map();
        this.registerListeners();
    }
    registerListeners() {
        // We have to ensure that an auxiliary window gets to know its
        // containing `BrowserWindow` so that it can apply listeners to it
        // Unfortunately we cannot rely on static `BrowserWindow` methods
        // because we might call the methods too early before the window
        // is created.
        app.on('browser-window-created', (_event, browserWindow) => {
            // This is an auxiliary window, try to claim it
            const auxiliaryWindow = this.getWindowByWebContents(browserWindow.webContents);
            if (auxiliaryWindow) {
                this.logService.trace('[aux window] app.on("browser-window-created"): Trying to claim auxiliary window');
                auxiliaryWindow.tryClaimWindow();
            }
            // This is a main window, listen to child windows getting created to claim it
            else {
                const disposables = new DisposableStore();
                disposables.add(Event.fromNodeEventEmitter(browserWindow.webContents, 'did-create-window', (browserWindow, details) => ({ browserWindow, details }))(({ browserWindow, details }) => {
                    const auxiliaryWindow = this.getWindowByWebContents(browserWindow.webContents);
                    if (auxiliaryWindow) {
                        this.logService.trace('[aux window] window.on("did-create-window"): Trying to claim auxiliary window');
                        auxiliaryWindow.tryClaimWindow(details.options);
                    }
                }));
                disposables.add(Event.fromNodeEventEmitter(browserWindow, 'closed')(() => disposables.dispose()));
            }
        });
        validatedIpcMain.handle('vscode:registerAuxiliaryWindow', async (event, mainWindowId) => {
            const auxiliaryWindow = this.getWindowByWebContents(event.sender);
            if (auxiliaryWindow) {
                this.logService.trace('[aux window] vscode:registerAuxiliaryWindow: Registering auxiliary window to main window');
                auxiliaryWindow.parentId = mainWindowId;
            }
            return event.sender.id;
        });
    }
    createWindow(details) {
        const { state, overrides } = this.computeWindowStateAndOverrides(details);
        return this.instantiationService.invokeFunction(defaultBrowserWindowOptions, state, overrides, {
            preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload-aux.js').fsPath,
        });
    }
    computeWindowStateAndOverrides(details) {
        const windowState = {};
        const overrides = {};
        const features = details.features.split(','); // for example: popup=yes,left=270,top=14.5,width=1024,height=768
        for (const feature of features) {
            const [key, value] = feature.split('=');
            switch (key) {
                case 'width':
                    windowState.width = parseInt(value, 10);
                    break;
                case 'height':
                    windowState.height = parseInt(value, 10);
                    break;
                case 'left':
                    windowState.x = parseInt(value, 10);
                    break;
                case 'top':
                    windowState.y = parseInt(value, 10);
                    break;
                case 'window-maximized':
                    windowState.mode = 0 /* WindowMode.Maximized */;
                    break;
                case 'window-fullscreen':
                    windowState.mode = 3 /* WindowMode.Fullscreen */;
                    break;
                case 'window-disable-fullscreen':
                    overrides.disableFullscreen = true;
                    break;
                case 'window-native-titlebar':
                    overrides.forceNativeTitlebar = true;
                    break;
            }
        }
        const state = WindowStateValidator.validateWindowState(this.logService, windowState) ??
            defaultAuxWindowState();
        this.logService.trace('[aux window] using window state', state);
        return { state, overrides };
    }
    registerWindow(webContents) {
        const disposables = new DisposableStore();
        const auxiliaryWindow = this.instantiationService.createInstance(AuxiliaryWindow, webContents);
        this.windows.set(auxiliaryWindow.id, auxiliaryWindow);
        disposables.add(toDisposable(() => this.windows.delete(auxiliaryWindow.id)));
        disposables.add(auxiliaryWindow.onDidMaximize(() => this._onDidMaximizeWindow.fire(auxiliaryWindow)));
        disposables.add(auxiliaryWindow.onDidUnmaximize(() => this._onDidUnmaximizeWindow.fire(auxiliaryWindow)));
        disposables.add(auxiliaryWindow.onDidEnterFullScreen(() => this._onDidChangeFullScreen.fire({ window: auxiliaryWindow, fullscreen: true })));
        disposables.add(auxiliaryWindow.onDidLeaveFullScreen(() => this._onDidChangeFullScreen.fire({ window: auxiliaryWindow, fullscreen: false })));
        disposables.add(auxiliaryWindow.onDidTriggerSystemContextMenu(({ x, y }) => this._onDidTriggerSystemContextMenu.fire({ window: auxiliaryWindow, x, y })));
        Event.once(auxiliaryWindow.onDidClose)(() => disposables.dispose());
    }
    getWindowByWebContents(webContents) {
        const window = this.windows.get(webContents.id);
        return window?.matches(webContents) ? window : undefined;
    }
    getFocusedWindow() {
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
            return this.getWindowByWebContents(window.webContents);
        }
        return undefined;
    }
    getLastActiveWindow() {
        return getLastFocused(Array.from(this.windows.values()));
    }
    getWindows() {
        return Array.from(this.windows.values());
    }
};
AuxiliaryWindowsMainService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], AuxiliaryWindowsMainService);
export { AuxiliaryWindowsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hdXhpbGlhcnlXaW5kb3cvZWxlY3Ryb24tbWFpbi9hdXhpbGlhcnlXaW5kb3dzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGFBQWEsRUFJYixHQUFHLEdBQ0gsTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSxzQkFBc0IsQ0FBQTtBQUV4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUdOLHFCQUFxQixHQUNyQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsMkJBQTJCLEVBQzNCLGNBQWMsR0FDZCxNQUFNLHdDQUF3QyxDQUFBO0FBRXhDLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQ1osU0FBUSxVQUFVO0lBdUJsQixZQUN3QixvQkFBNEQsRUFDdEUsVUFBd0M7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFIaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYs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