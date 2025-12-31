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
var AuxiliaryNativeTitlebarPart_1;
import { Event } from '../../../../base/common/event.js';
import { getZoomFactor } from '../../../../base/browser/browser.js';
import { $, addDisposableListener, append, EventType, getWindow, getWindowId, hide, show, } from '../../../../base/browser/dom.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { isMacintosh, isWindows, isLinux, isBigSurOrNewer, } from '../../../../base/common/platform.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { BrowserTitlebarPart as BrowserTitlebarPart, BrowserTitleService, } from '../../../browser/parts/titlebar/titlebarPart.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { hasNativeTitlebar, useWindowControlsOverlay, DEFAULT_CUSTOM_TITLEBAR_HEIGHT, } from '../../../../platform/window/common/window.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { NativeMenubarControl } from './menubarControl.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { mainWindow } from '../../../../base/browser/window.js';
let NativeTitlebarPart = class NativeTitlebarPart extends BrowserTitlebarPart {
    //#region IView
    get minimumHeight() {
        if (!isMacintosh) {
            return super.minimumHeight;
        }
        return ((this.isCommandCenterVisible ? DEFAULT_CUSTOM_TITLEBAR_HEIGHT : this.macTitlebarSize) /
            (this.preventZoom ? getZoomFactor(getWindow(this.element)) : 1));
    }
    get maximumHeight() {
        return this.minimumHeight;
    }
    get macTitlebarSize() {
        if (this.bigSurOrNewer) {
            return 28; // macOS Big Sur increases title bar height
        }
        return 22;
    }
    constructor(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        super(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
        this.nativeHostService = nativeHostService;
        this.bigSurOrNewer = isBigSurOrNewer(environmentService.os.release);
    }
    onMenubarVisibilityChanged(visible) {
        // Hide title when toggling menu bar
        if ((isWindows || isLinux) && this.currentMenubarVisibility === 'toggle' && visible) {
            // Hack to fix issue #52522 with layered webkit-app-region elements appearing under cursor
            if (this.dragRegion) {
                hide(this.dragRegion);
                setTimeout(() => show(this.dragRegion), 50);
            }
        }
        super.onMenubarVisibilityChanged(visible);
    }
    onConfigurationChanged(event) {
        super.onConfigurationChanged(event);
        if (event.affectsConfiguration('window.doubleClickIconToClose')) {
            if (this.appIcon) {
                this.onUpdateAppIconDragBehavior();
            }
        }
    }
    onUpdateAppIconDragBehavior() {
        const setting = this.configurationService.getValue('window.doubleClickIconToClose');
        if (setting && this.appIcon) {
            ;
            this.appIcon.style['-webkit-app-region'] = 'no-drag';
        }
        else if (this.appIcon) {
            ;
            this.appIcon.style['-webkit-app-region'] = 'drag';
        }
    }
    installMenubar() {
        super.installMenubar();
        if (this.menubar) {
            return;
        }
        if (this.customMenubar) {
            this._register(this.customMenubar.onFocusStateChange((e) => this.onMenubarFocusChanged(e)));
        }
    }
    onMenubarFocusChanged(focused) {
        if ((isWindows || isLinux) && this.currentMenubarVisibility !== 'compact' && this.dragRegion) {
            if (focused) {
                hide(this.dragRegion);
            }
            else {
                show(this.dragRegion);
            }
        }
    }
    createContentArea(parent) {
        const result = super.createContentArea(parent);
        const targetWindow = getWindow(parent);
        const targetWindowId = getWindowId(targetWindow);
        // Native menu controller
        if (isMacintosh || hasNativeTitlebar(this.configurationService)) {
            this._register(this.instantiationService.createInstance(NativeMenubarControl));
        }
        // App Icon (Native Windows/Linux)
        if (this.appIcon) {
            this.onUpdateAppIconDragBehavior();
            this._register(addDisposableListener(this.appIcon, EventType.DBLCLICK, () => {
                this.nativeHostService.closeWindow({ targetWindowId });
            }));
        }
        // Custom Window Controls (Native Windows/Linux)
        if (!hasNativeTitlebar(this.configurationService) && // not for native title bars
            !useWindowControlsOverlay(this.configurationService) && // not when controls are natively drawn
            this.windowControlsContainer) {
            // Minimize
            const minimizeIcon = append(this.windowControlsContainer, $('div.window-icon.window-minimize' + ThemeIcon.asCSSSelector(Codicon.chromeMinimize)));
            this._register(addDisposableListener(minimizeIcon, EventType.CLICK, () => {
                this.nativeHostService.minimizeWindow({ targetWindowId });
            }));
            // Restore
            this.maxRestoreControl = append(this.windowControlsContainer, $('div.window-icon.window-max-restore'));
            this._register(addDisposableListener(this.maxRestoreControl, EventType.CLICK, async () => {
                const maximized = await this.nativeHostService.isMaximized({ targetWindowId });
                if (maximized) {
                    return this.nativeHostService.unmaximizeWindow({ targetWindowId });
                }
                return this.nativeHostService.maximizeWindow({ targetWindowId });
            }));
            // Close
            const closeIcon = append(this.windowControlsContainer, $('div.window-icon.window-close' + ThemeIcon.asCSSSelector(Codicon.chromeClose)));
            this._register(addDisposableListener(closeIcon, EventType.CLICK, () => {
                this.nativeHostService.closeWindow({ targetWindowId });
            }));
            // Resizer
            this.resizer = append(this.rootContainer, $('div.resizer'));
            this._register(Event.runAndSubscribe(this.layoutService.onDidChangeWindowMaximized, ({ windowId, maximized }) => {
                if (windowId === targetWindowId) {
                    this.onDidChangeWindowMaximized(maximized);
                }
            }, {
                windowId: targetWindowId,
                maximized: this.layoutService.isWindowMaximized(targetWindow),
            }));
        }
        // Window System Context Menu
        // See https://github.com/electron/electron/issues/24893
        if (isWindows && !hasNativeTitlebar(this.configurationService)) {
            this._register(this.nativeHostService.onDidTriggerWindowSystemContextMenu(({ windowId, x, y }) => {
                if (targetWindowId !== windowId) {
                    return;
                }
                const zoomFactor = getZoomFactor(getWindow(this.element));
                this.onContextMenu(new MouseEvent(EventType.MOUSE_UP, {
                    clientX: x / zoomFactor,
                    clientY: y / zoomFactor,
                }), MenuId.TitleBarContext);
            }));
        }
        return result;
    }
    onDidChangeWindowMaximized(maximized) {
        if (this.maxRestoreControl) {
            if (maximized) {
                this.maxRestoreControl.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chromeMaximize));
                this.maxRestoreControl.classList.add(...ThemeIcon.asClassNameArray(Codicon.chromeRestore));
            }
            else {
                this.maxRestoreControl.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chromeRestore));
                this.maxRestoreControl.classList.add(...ThemeIcon.asClassNameArray(Codicon.chromeMaximize));
            }
        }
        if (this.resizer) {
            if (maximized) {
                hide(this.resizer);
            }
            else {
                show(this.resizer);
            }
        }
    }
    updateStyles() {
        super.updateStyles();
        // Part container
        if (this.element) {
            if (useWindowControlsOverlay(this.configurationService)) {
                if (!this.cachedWindowControlStyles ||
                    this.cachedWindowControlStyles.bgColor !== this.element.style.backgroundColor ||
                    this.cachedWindowControlStyles.fgColor !== this.element.style.color) {
                    this.nativeHostService.updateWindowControls({
                        targetWindowId: getWindowId(getWindow(this.element)),
                        backgroundColor: this.element.style.backgroundColor,
                        foregroundColor: this.element.style.color,
                    });
                }
            }
        }
    }
    layout(width, height) {
        super.layout(width, height);
        if (useWindowControlsOverlay(this.configurationService)) {
            // When the user goes into full screen mode, the height of the title bar becomes 0.
            // Instead, set it back to the default titlebar height for Catalina users
            // so that they can have the traffic lights rendered at the proper offset.
            // Ref https://github.com/microsoft/vscode/issues/159862
            const newHeight = height > 0 || this.bigSurOrNewer
                ? Math.round(height * getZoomFactor(getWindow(this.element)))
                : this.macTitlebarSize;
            if (newHeight !== this.cachedWindowControlHeight) {
                this.cachedWindowControlHeight = newHeight;
                this.nativeHostService.updateWindowControls({
                    targetWindowId: getWindowId(getWindow(this.element)),
                    height: newHeight,
                });
            }
        }
    }
};
NativeTitlebarPart = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, INativeHostService),
    __param(13, IEditorGroupsService),
    __param(14, IEditorService),
    __param(15, IMenuService),
    __param(16, IKeybindingService)
], NativeTitlebarPart);
export { NativeTitlebarPart };
let MainNativeTitlebarPart = class MainNativeTitlebarPart extends NativeTitlebarPart {
    constructor(contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, 'main', contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService);
    }
};
MainNativeTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IContextKeyService),
    __param(8, IHostService),
    __param(9, INativeHostService),
    __param(10, IEditorGroupsService),
    __param(11, IEditorService),
    __param(12, IMenuService),
    __param(13, IKeybindingService)
], MainNativeTitlebarPart);
export { MainNativeTitlebarPart };
let AuxiliaryNativeTitlebarPart = class AuxiliaryNativeTitlebarPart extends NativeTitlebarPart {
    static { AuxiliaryNativeTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() {
        return this.minimumHeight;
    }
    constructor(container, editorGroupsContainer, mainTitlebar, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService) {
        const id = AuxiliaryNativeTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, nativeHostService, editorGroupService, editorService, menuService, keybindingService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the main title bar
        // The auxiliary title bar never contains any zoomable items itself,
        // but we want to match the behavior of the main title bar.
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryNativeTitlebarPart = AuxiliaryNativeTitlebarPart_1 = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, INativeHostService),
    __param(13, IEditorGroupsService),
    __param(14, IEditorService),
    __param(15, IMenuService),
    __param(16, IKeybindingService)
], AuxiliaryNativeTitlebarPart);
export { AuxiliaryNativeTitlebarPart };
export class NativeTitleService extends BrowserTitleService {
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainNativeTitlebarPart);
    }
    doCreateAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        return this.instantiationService.createInstance(AuxiliaryNativeTitlebarPart, container, editorGroupsContainer, this.mainPart);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvcGFydHMvdGl0bGViYXIvdGl0bGViYXJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25FLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxFQUNULFdBQVcsRUFDWCxJQUFJLEVBQ0osSUFBSSxHQUNKLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUNOLFdBQVcsRUFDWCxTQUFTLEVBQ1QsT0FBTyxFQUNQLGVBQWUsR0FDZixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUNOLG1CQUFtQixJQUFJLG1CQUFtQixFQUMxQyxtQkFBbUIsR0FFbkIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVB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