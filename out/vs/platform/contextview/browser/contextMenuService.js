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
import { ModifierKeyEmitter } from '../../../base/browser/dom.js';
import { Separator } from '../../../base/common/actions.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getFlatContextMenuActions } from '../../actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../actions/common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { INotificationService } from '../../notification/common/notification.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ContextMenuHandler } from './contextMenuHandler.js';
import { IContextViewService, } from './contextView.js';
let ContextMenuService = class ContextMenuService extends Disposable {
    get contextMenuHandler() {
        if (!this._contextMenuHandler) {
            this._contextMenuHandler = new ContextMenuHandler(this.contextViewService, this.telemetryService, this.notificationService, this.keybindingService);
        }
        return this._contextMenuHandler;
    }
    constructor(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService) {
        super();
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.contextViewService = contextViewService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._contextMenuHandler = undefined;
        this._onDidShowContextMenu = this._store.add(new Emitter());
        this.onDidShowContextMenu = this._onDidShowContextMenu.event;
        this._onDidHideContextMenu = this._store.add(new Emitter());
        this.onDidHideContextMenu = this._onDidHideContextMenu.event;
    }
    configure(options) {
        this.contextMenuHandler.configure(options);
    }
    // ContextMenu
    showContextMenu(delegate) {
        delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);
        this.contextMenuHandler.showContextMenu({
            ...delegate,
            onHide: (didCancel) => {
                delegate.onHide?.(didCancel);
                this._onDidHideContextMenu.fire();
            },
        });
        ModifierKeyEmitter.getInstance().resetKeyStatus();
        this._onDidShowContextMenu.fire();
    }
};
ContextMenuService = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService),
    __param(2, IContextViewService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], ContextMenuService);
export { ContextMenuService };
export var ContextMenuMenuDelegate;
(function (ContextMenuMenuDelegate) {
    function is(thing) {
        return thing && thing.menuId instanceof MenuId;
    }
    function transform(delegate, menuService, globalContextKeyService) {
        if (!is(delegate)) {
            return delegate;
        }
        const { menuId, menuActionOptions, contextKeyService } = delegate;
        return {
            ...delegate,
            getActions: () => {
                let target = [];
                if (menuId) {
                    const menu = menuService.getMenuActions(menuId, contextKeyService ?? globalContextKeyService, menuActionOptions);
                    target = getFlatContextMenuActions(menu);
                }
                if (!delegate.getActions) {
                    return target;
                }
                else {
                    return Separator.join(delegate.getActions(), target);
                }
            },
        };
    }
    ContextMenuMenuDelegate.transform = transform;
})(ContextMenuMenuDelegate || (ContextMenuMenuDelegate = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dE1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dHZpZXcvYnJvd3Nlci9jb250ZXh0TWVudVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakUsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQThCLE1BQU0seUJBQXlCLENBQUE7QUFDeEYsT0FBTyxFQUdOLG1CQUFtQixHQUNuQixNQUFNLGtCQUFrQixDQUFBO0FBRWxCLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUlqRCxJQUFZLGtCQUFrQjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElB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