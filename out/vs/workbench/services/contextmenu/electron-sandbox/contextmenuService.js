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
import { Separator, SubmenuAction, } from '../../../../base/common/actions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getZoomFactor } from '../../../../base/browser/browser.js';
import { unmnemonicLabel } from '../../../../base/common/labels.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { popup } from '../../../../base/parts/contextmenu/electron-sandbox/contextmenu.js';
import { hasNativeTitlebar } from '../../../../platform/window/common/window.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextMenuMenuDelegate, ContextMenuService as HTMLContextMenuService, } from '../../../../platform/contextview/browser/contextMenuService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { isAnchor, } from '../../../../base/browser/ui/contextview/contextview.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let ContextMenuService = class ContextMenuService {
    get onDidShowContextMenu() {
        return this.impl.onDidShowContextMenu;
    }
    get onDidHideContextMenu() {
        return this.impl.onDidHideContextMenu;
    }
    constructor(notificationService, telemetryService, keybindingService, configurationService, contextViewService, menuService, contextKeyService) {
        // Custom context menu: Linux/Windows if custom title is enabled
        if (!isMacintosh && !hasNativeTitlebar(configurationService)) {
            this.impl = new HTMLContextMenuService(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        }
        // Native context menu: otherwise
        else {
            this.impl = new NativeContextMenuService(notificationService, telemetryService, keybindingService, menuService, contextKeyService);
        }
    }
    dispose() {
        this.impl.dispose();
    }
    showContextMenu(delegate) {
        this.impl.showContextMenu(delegate);
    }
};
ContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IConfigurationService),
    __param(4, IContextViewService),
    __param(5, IMenuService),
    __param(6, IContextKeyService)
], ContextMenuService);
export { ContextMenuService };
let NativeContextMenuService = class NativeContextMenuService extends Disposable {
    constructor(notificationService, telemetryService, keybindingService, menuService, contextKeyService) {
        super();
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._onDidShowContextMenu = this._store.add(new Emitter());
        this.onDidShowContextMenu = this._onDidShowContextMenu.event;
        this._onDidHideContextMenu = this._store.add(new Emitter());
        this.onDidHideContextMenu = this._onDidHideContextMenu.event;
    }
    showContextMenu(delegate) {
        delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);
        const actions = delegate.getActions();
        if (actions.length) {
            const onHide = createSingleCallFunction(() => {
                delegate.onHide?.(false);
                dom.ModifierKeyEmitter.getInstance().resetKeyStatus();
                this._onDidHideContextMenu.fire();
            });
            const menu = this.createMenu(delegate, actions, onHide);
            const anchor = delegate.getAnchor();
            let x;
            let y;
            let zoom = getZoomFactor(dom.isHTMLElement(anchor) ? dom.getWindow(anchor) : dom.getActiveWindow());
            if (dom.isHTMLElement(anchor)) {
                const elementPosition = dom.getDomNodePagePosition(anchor);
                // When drawing context menus, we adjust the pixel position for native menus using zoom level
                // In areas where zoom is applied to the element or its ancestors, we need to adjust accordingly
                // e.g. The title bar has counter zoom behavior meaning it applies the inverse of zoom level.
                // Window Zoom Level: 1.5, Title Bar Zoom: 1/1.5, Coordinate Multiplier: 1.5 * 1.0 / 1.5 = 1.0
                zoom *= dom.getDomNodeZoomLevel(anchor);
                // Position according to the axis alignment and the anchor alignment:
                // `HORIZONTAL` aligns at the top left or right of the anchor and
                //  `VERTICAL` aligns at the bottom left of the anchor.
                if (delegate.anchorAxisAlignment === 1 /* AnchorAxisAlignment.HORIZONTAL */) {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top;
                    }
                    if (!isMacintosh) {
                        const window = dom.getWindow(anchor);
                        const availableHeightForMenu = window.screen.height - y;
                        if (availableHeightForMenu <
                            actions.length * (isWindows ? 45 : 32) /* guess of 1 menu item height */) {
                            // this is a guess to detect whether the context menu would
                            // open to the bottom from this point or to the top. If the
                            // menu opens to the top, make sure to align it to the bottom
                            // of the anchor and not to the top.
                            // this seems to be only necessary for Windows and Linux.
                            y += elementPosition.height;
                        }
                    }
                }
                else {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top + elementPosition.height;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top + elementPosition.height;
                    }
                }
                // Shift macOS menus by a few pixels below elements
                // to account for extra padding on top of native menu
                // https://github.com/microsoft/vscode/issues/84231
                if (isMacintosh) {
                    y += 4 / zoom;
                }
            }
            else if (isAnchor(anchor)) {
                x = anchor.x;
                y = anchor.y;
            }
            else {
                // We leave x/y undefined in this case which will result in
                // Electron taking care of opening the menu at the cursor position.
            }
            if (typeof x === 'number') {
                x = Math.floor(x * zoom);
            }
            if (typeof y === 'number') {
                y = Math.floor(y * zoom);
            }
            popup(menu, { x, y, positioningItem: delegate.autoSelectFirstItem ? 0 : undefined }, () => onHide());
            this._onDidShowContextMenu.fire();
        }
    }
    createMenu(delegate, entries, onHide, submenuIds = new Set()) {
        return coalesce(entries.map((entry) => this.createMenuItem(delegate, entry, onHide, submenuIds)));
    }
    createMenuItem(delegate, entry, onHide, submenuIds) {
        // Separator
        if (entry instanceof Separator) {
            return { type: 'separator' };
        }
        // Submenu
        if (entry instanceof SubmenuAction) {
            if (submenuIds.has(entry.id)) {
                console.warn(`Found submenu cycle: ${entry.id}`);
                return undefined;
            }
            return {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                submenu: this.createMenu(delegate, entry.actions, onHide, new Set([...submenuIds, entry.id])),
            };
        }
        // Normal Menu Item
        else {
            let type = undefined;
            if (!!entry.checked) {
                if (typeof delegate.getCheckedActionsRepresentation === 'function') {
                    type = delegate.getCheckedActionsRepresentation(entry);
                }
                else {
                    type = 'checkbox';
                }
            }
            const item = {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                checked: !!entry.checked,
                type,
                enabled: !!entry.enabled,
                click: (event) => {
                    // To preserve pre-electron-2.x behaviour, we first trigger
                    // the onHide callback and then the action.
                    // Fixes https://github.com/microsoft/vscode/issues/45601
                    onHide();
                    // Run action which will close the menu
                    this.runAction(entry, delegate, event);
                },
            };
            const keybinding = !!delegate.getKeyBinding
                ? delegate.getKeyBinding(entry)
                : this.keybindingService.lookupKeybinding(entry.id);
            if (keybinding) {
                const electronAccelerator = keybinding.getElectronAccelerator();
                if (electronAccelerator) {
                    item.accelerator = electronAccelerator;
                }
                else {
                    const label = keybinding.getLabel();
                    if (label) {
                        item.label = `${item.label} [${label}]`;
                    }
                }
            }
            return item;
        }
    }
    async runAction(actionToRun, delegate, event) {
        if (!delegate.skipTelemetry) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: actionToRun.id, from: 'contextMenu' });
        }
        const context = delegate.getActionsContext ? delegate.getActionsContext(event) : undefined;
        try {
            if (delegate.actionRunner) {
                await delegate.actionRunner.run(actionToRun, context);
            }
            else if (actionToRun.enabled) {
                await actionToRun.run(context);
            }
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
NativeContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IMenuService),
    __param(4, IContextKeyService)
], NativeContextMenuService);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbnRleHRtZW51L2VsZWN0cm9uLXNhbmRib3gvY29udGV4dG1lbnVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFJTixTQUFTLEVBQ1QsYUFBYSxHQUNiLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBRU4sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixrQkFBa0IsSUFBSSxzQkFBc0IsR0FDNUMsTUFBTSxn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