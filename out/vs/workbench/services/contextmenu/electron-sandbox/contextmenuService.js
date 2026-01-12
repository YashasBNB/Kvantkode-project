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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29udGV4dG1lbnUvZWxlY3Ryb24tc2FuZGJveC9jb250ZXh0bWVudVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUlOLFNBQVMsRUFDVCxhQUFhLEdBQ2IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFFTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLGtCQUFrQixJQUFJLHNCQUFzQixHQUM1QyxN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