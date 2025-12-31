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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93c01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYXV4aWxpYXJ5V2luZG93L2VsZWN0cm9uLW1haW4vYXV4aWxpYXJ5V2luZG93c01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixhQUFhLEVBSWIsR0FBRyxHQUNILE1BQU0sVUFBVSxDQUFBO0FBQ2pCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sc0JBQXNCLENBQUE7QUFFeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFHTixxQkFBcUIsR0FDckIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLDJCQUEyQixFQUMzQixjQUFjLEdBQ2QsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV4QyxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUNaLFNBQVEsVUFBVTtJQXVCbEIsWUFDd0Isb0JBQTRELEVBQ3RFLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBSGlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckQsZUFBVSxHQUFWLFVBQVUs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