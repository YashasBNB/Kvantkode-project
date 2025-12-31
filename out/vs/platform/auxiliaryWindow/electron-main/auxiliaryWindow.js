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
import { BrowserWindow } from 'electron';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { hasNativeTitlebar } from '../../window/common/window.js';
import { BaseWindow } from '../../windows/electron-main/windowImpl.js';
let AuxiliaryWindow = class AuxiliaryWindow extends BaseWindow {
    get win() {
        if (!super.win) {
            this.tryClaimWindow();
        }
        return super.win;
    }
    constructor(webContents, environmentMainService, logService, configurationService, stateService, lifecycleMainService) {
        super(configurationService, stateService, environmentMainService, logService);
        this.webContents = webContents;
        this.lifecycleMainService = lifecycleMainService;
        this.parentId = -1;
        this.stateApplied = false;
        this.id = this.webContents.id;
        // Try to claim window
        this.tryClaimWindow();
    }
    tryClaimWindow(options) {
        if (this._store.isDisposed || this.webContents.isDestroyed()) {
            return; // already disposed
        }
        this.doTryClaimWindow(options);
        if (options && !this.stateApplied) {
            this.stateApplied = true;
            this.applyState({
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height,
                // We currently do not support restoring fullscreen state for auxiliary
                // windows because we do not get hold of the original `features` string
                // that contains that info in `window-fullscreen`. However, we can
                // probe the `options.show` value for whether the window should be maximized
                // or not because we never show maximized windows initially to reduce flicker.
                mode: options.show === false ? 0 /* WindowMode.Maximized */ : 1 /* WindowMode.Normal */,
            });
        }
    }
    doTryClaimWindow(options) {
        if (this._win) {
            return; // already claimed
        }
        const window = BrowserWindow.fromWebContents(this.webContents);
        if (window) {
            this.logService.trace('[aux window] Claimed browser window instance');
            // Remember
            this.setWin(window, options);
            // Disable Menu
            window.setMenu(null);
            if ((isWindows || isLinux) &&
                hasNativeTitlebar(this.configurationService, options?.titleBarStyle === 'hidden' ? "custom" /* TitlebarStyle.CUSTOM */ : undefined /* unknown */)) {
                window.setAutoHideMenuBar(true); // Fix for https://github.com/microsoft/vscode/issues/200615
            }
            // Lifecycle
            this.lifecycleMainService.registerAuxWindow(this);
        }
    }
    matches(webContents) {
        return this.webContents.id === webContents.id;
    }
};
AuxiliaryWindow = __decorate([
    __param(1, IEnvironmentMainService),
    __param(2, ILogService),
    __param(3, IConfigurationService),
    __param(4, IStateService),
    __param(5, ILifecycleMainService)
], AuxiliaryWindow);
export { AuxiliaryWindow };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYXV4aWxpYXJ5V2luZG93L2VsZWN0cm9uLW1haW4vYXV4aWxpYXJ5V2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWdELE1BQU0sVUFBVSxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQWlCLE1BQU0sK0JBQStCLENBQUE7QUFFaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBTS9ELElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsVUFBVTtJQUk5QyxJQUFhLEdBQUc7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFBO0lBQ2pCLENBQUM7SUFJRCxZQUNrQixXQUF3QixFQUNoQixzQkFBK0MsRUFDM0QsVUFBdUIsRUFDYixvQkFBMkMsRUFDbkQsWUFBMkIsRUFDbkIsb0JBQTREO1FBRW5GLEtBQUss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