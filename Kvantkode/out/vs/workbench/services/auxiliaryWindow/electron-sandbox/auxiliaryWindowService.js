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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1eGlsaWFyeVdpbmRvdy9lbGVjdHJvbi1zYW5kYm94L2F1eGlsaWFyeVdpbmRvd1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0UsT0FBTyxFQUNOLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsNkJBQTZCLEVBRTdCLHVCQUF1QixHQUN2QixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRixPQUFPLEVB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