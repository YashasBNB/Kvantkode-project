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
var NativeAuxiliaryWindow_1;
import { localize } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { AuxiliaryWindow, AuxiliaryWindowMode, BrowserAuxiliaryWindowService, IAuxiliaryWindowService, } from '../browser/auxiliaryWindowService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mark } from '../../../../base/common/performance.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHostService } from '../../host/browser/host.js';
import { applyZoom } from '../../../../platform/window/electron-sandbox/window.js';
import { getZoomLevel, isFullscreen, setFullscreen } from '../../../../base/browser/browser.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isMacintosh } from '../../../../base/common/platform.js';
let NativeAuxiliaryWindow = NativeAuxiliaryWindow_1 = class NativeAuxiliaryWindow extends AuxiliaryWindow {
    constructor(window, container, stylesHaveLoaded, configurationService, nativeHostService, instantiationService, hostService, environmentService, dialogService) {
        super(window, container, stylesHaveLoaded, configurationService, hostService, environmentService);
        this.nativeHostService = nativeHostService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.skipUnloadConfirmation = false;
        this.maximized = false;
        if (!isMacintosh) {
            // For now, limit this to platforms that have clear maximised
            // transitions (Windows, Linux) via window buttons.
            this.handleMaximizedState();
        }
        this.handleFullScreenState();
    }
    handleMaximizedState() {
        ;
        (async () => {
            this.maximized = await this.nativeHostService.isMaximized({
                targetWindowId: this.window.vscodeWindowId,
            });
        })();
        this._register(this.nativeHostService.onDidMaximizeWindow((windowId) => {
            if (windowId === this.window.vscodeWindowId) {
                this.maximized = true;
            }
        }));
        this._register(this.nativeHostService.onDidUnmaximizeWindow((windowId) => {
            if (windowId === this.window.vscodeWindowId) {
                this.maximized = false;
            }
        }));
    }
    async handleFullScreenState() {
        const fullscreen = await this.nativeHostService.isFullScreen({
            targetWindowId: this.window.vscodeWindowId,
        });
        if (fullscreen) {
            setFullscreen(true, this.window);
        }
    }
    async handleVetoBeforeClose(e, veto) {
        this.preventUnload(e);
        await this.dialogService.error(veto, localize('backupErrorDetails', 'Try saving or reverting the editors with unsaved changes first and then try again.'));
    }
    async confirmBeforeClose(e) {
        if (this.skipUnloadConfirmation) {
            return;
        }
        this.preventUnload(e);
        const confirmed = await this.instantiationService.invokeFunction((accessor) => NativeAuxiliaryWindow_1.confirmOnShutdown(accessor, 1 /* ShutdownReason.CLOSE */));
        if (confirmed) {
            this.skipUnloadConfirmation = true;
            this.nativeHostService.closeWindow({ targetWindowId: this.window.vscodeWindowId });
        }
    }
    preventUnload(e) {
        e.preventDefault();
        e.returnValue = true;
    }
    createState() {
        const state = super.createState();
        const fullscreen = isFullscreen(this.window);
        return {
            ...state,
            bounds: state.bounds,
            mode: this.maximized
                ? AuxiliaryWindowMode.Maximized
                : fullscreen
                    ? AuxiliaryWindowMode.Fullscreen
                    : AuxiliaryWindowMode.Normal,
        };
    }
};
NativeAuxiliaryWindow = NativeAuxiliaryWindow_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, INativeHostService),
    __param(5, IInstantiationService),
    __param(6, IHostService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IDialogService)
], NativeAuxiliaryWindow);
export { NativeAuxiliaryWindow };
let NativeAuxiliaryWindowService = class NativeAuxiliaryWindowService extends BrowserAuxiliaryWindowService {
    constructor(layoutService, configurationService, nativeHostService, dialogService, instantiationService, telemetryService, hostService, environmentService) {
        super(layoutService, dialogService, configurationService, telemetryService, hostService, environmentService);
        this.nativeHostService = nativeHostService;
        this.instantiationService = instantiationService;
    }
    async resolveWindowId(auxiliaryWindow) {
        mark('code/auxiliaryWindow/willResolveWindowId');
        const windowId = await auxiliaryWindow.vscode.ipcRenderer.invoke('vscode:registerAuxiliaryWindow', this.nativeHostService.windowId);
        mark('code/auxiliaryWindow/didResolveWindowId');
        return windowId;
    }
    createContainer(auxiliaryWindow, disposables, options) {
        // Zoom level (either explicitly provided or inherited from main window)
        let windowZoomLevel;
        if (typeof options?.zoomLevel === 'number') {
            windowZoomLevel = options.zoomLevel;
        }
        else {
            windowZoomLevel = getZoomLevel(getActiveWindow());
        }
        applyZoom(windowZoomLevel, auxiliaryWindow);
        return super.createContainer(auxiliaryWindow, disposables);
    }
    createAuxiliaryWindow(targetWindow, container, stylesHaveLoaded) {
        return new NativeAuxiliaryWindow(targetWindow, container, stylesHaveLoaded, this.configurationService, this.nativeHostService, this.instantiationService, this.hostService, this.environmentService, this.dialogService);
    }
};
NativeAuxiliaryWindowService = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, IConfigurationService),
    __param(2, INativeHostService),
    __param(3, IDialogService),
    __param(4, IInstantiationService),
    __param(5, ITelemetryService),
    __param(6, IHostService),
    __param(7, IWorkbenchEnvironmentService)
], NativeAuxiliaryWindowService);
export { NativeAuxiliaryWindowService };
registerSingleton(IAuxiliaryWindowService, NativeAuxiliaryWindowService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXhpbGlhcnlXaW5kb3cvZWxlY3Ryb24tc2FuZGJveC9hdXhpbGlhcnlXaW5kb3dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9FLE9BQU8sRUFDTixlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLDZCQUE2QixFQUU3Qix1QkFBdUIsR0FDdkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGVB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