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
import './media/notificationsList.css';
import { localize } from '../../../../nls.js';
import { $, getWindow, isAncestorOfActiveElement, trackFocus, } from '../../../../base/browser/dom.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NOTIFICATIONS_BACKGROUND } from '../../../common/theme.js';
import { NotificationsListDelegate, NotificationRenderer } from './notificationsViewer.js';
import { CopyNotificationMessageAction } from './notificationsActions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { assertAllDefined } from '../../../../base/common/types.js';
import { NotificationFocusedContext } from '../../../common/contextkeys.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { NotificationActionRunner } from './notificationsCommands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let NotificationsList = class NotificationsList extends Disposable {
    constructor(container, options, instantiationService, contextMenuService) {
        super();
        this.container = container;
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.viewModel = [];
    }
    show() {
        if (this.isVisible) {
            return; // already visible
        }
        // Lazily create if showing for the first time
        if (!this.list) {
            this.createNotificationsList();
        }
        // Make visible
        this.isVisible = true;
    }
    createNotificationsList() {
        // List Container
        this.listContainer = $('.notifications-list-container');
        const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));
        // Notification Renderer
        const renderer = this.instantiationService.createInstance(NotificationRenderer, actionRunner);
        // List
        const listDelegate = (this.listDelegate = new NotificationsListDelegate(this.listContainer));
        const options = this.options;
        const list = (this.list = this._register(this.instantiationService.createInstance((WorkbenchList), 'NotificationsList', this.listContainer, listDelegate, [renderer], {
            ...options,
            setRowLineHeight: false,
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: NOTIFICATIONS_BACKGROUND,
            },
            accessibilityProvider: this.instantiationService.createInstance(NotificationAccessibilityProvider, options),
        })));
        // Context menu to copy message
        const copyAction = this._register(this.instantiationService.createInstance(CopyNotificationMessageAction, CopyNotificationMessageAction.ID, CopyNotificationMessageAction.LABEL));
        this._register(list.onContextMenu((e) => {
            if (!e.element) {
                return;
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => [copyAction],
                getActionsContext: () => e.element,
                actionRunner,
            });
        }));
        // Toggle on double click
        this._register(list.onMouseDblClick((event) => event.element.toggle()));
        // Clear focus when DOM focus moves out
        // Use document.hasFocus() to not clear the focus when the entire window lost focus
        // This ensures that when the focus comes back, the notification is still focused
        const listFocusTracker = this._register(trackFocus(list.getHTMLElement()));
        this._register(listFocusTracker.onDidBlur(() => {
            if (getWindow(this.listContainer).document.hasFocus()) {
                list.setFocus([]);
            }
        }));
        // Context key
        NotificationFocusedContext.bindTo(list.contextKeyService);
        // Only allow for focus in notifications, as the
        // selection is too strong over the contents of
        // the notification
        this._register(list.onDidChangeSelection((e) => {
            if (e.indexes.length > 0) {
                list.setSelection([]);
            }
        }));
        this.container.appendChild(this.listContainer);
    }
    updateNotificationsList(start, deleteCount, items = []) {
        const [list, listContainer] = assertAllDefined(this.list, this.listContainer);
        const listHasDOMFocus = isAncestorOfActiveElement(listContainer);
        // Remember focus and relative top of that item
        const focusedIndex = list.getFocus()[0];
        const focusedItem = this.viewModel[focusedIndex];
        let focusRelativeTop = null;
        if (typeof focusedIndex === 'number') {
            focusRelativeTop = list.getRelativeTop(focusedIndex);
        }
        // Update view model
        this.viewModel.splice(start, deleteCount, ...items);
        // Update list
        list.splice(start, deleteCount, items);
        list.layout();
        // Hide if no more notifications to show
        if (this.viewModel.length === 0) {
            this.hide();
        }
        // Otherwise restore focus if we had
        else if (typeof focusedIndex === 'number') {
            let indexToFocus = 0;
            if (focusedItem) {
                let indexToFocusCandidate = this.viewModel.indexOf(focusedItem);
                if (indexToFocusCandidate === -1) {
                    indexToFocusCandidate = focusedIndex - 1; // item could have been removed
                }
                if (indexToFocusCandidate < this.viewModel.length && indexToFocusCandidate >= 0) {
                    indexToFocus = indexToFocusCandidate;
                }
            }
            if (typeof focusRelativeTop === 'number') {
                list.reveal(indexToFocus, focusRelativeTop);
            }
            list.setFocus([indexToFocus]);
        }
        // Restore DOM focus if we had focus before
        if (this.isVisible && listHasDOMFocus) {
            list.domFocus();
        }
    }
    updateNotificationHeight(item) {
        const index = this.viewModel.indexOf(item);
        if (index === -1) {
            return;
        }
        const [list, listDelegate] = assertAllDefined(this.list, this.listDelegate);
        list.updateElementHeight(index, listDelegate.getHeight(item));
        list.layout();
    }
    hide() {
        if (!this.isVisible || !this.list) {
            return; // already hidden
        }
        // Hide
        this.isVisible = false;
        // Clear list
        this.list.splice(0, this.viewModel.length);
        // Clear view model
        this.viewModel = [];
    }
    focusFirst() {
        if (!this.list) {
            return; // not created yet
        }
        this.list.focusFirst();
        this.list.domFocus();
    }
    hasFocus() {
        if (!this.listContainer) {
            return false; // not created yet
        }
        return isAncestorOfActiveElement(this.listContainer);
    }
    layout(width, maxHeight) {
        if (this.listContainer && this.list) {
            this.listContainer.style.width = `${width}px`;
            if (typeof maxHeight === 'number') {
                this.list.getHTMLElement().style.maxHeight = `${maxHeight}px`;
            }
            this.list.layout();
        }
    }
    dispose() {
        this.hide();
        super.dispose();
    }
};
NotificationsList = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService)
], NotificationsList);
export { NotificationsList };
let NotificationAccessibilityProvider = class NotificationAccessibilityProvider {
    constructor(_options, _keybindingService, _configurationService) {
        this._options = _options;
        this._keybindingService = _keybindingService;
        this._configurationService = _configurationService;
    }
    getAriaLabel(element) {
        let accessibleViewHint;
        const keybinding = this._keybindingService
            .lookupKeybinding('editor.action.accessibleView')
            ?.getAriaLabel();
        if (this._configurationService.getValue('accessibility.verbosity.notification')) {
            accessibleViewHint = keybinding
                ? localize('notificationAccessibleViewHint', 'Inspect the response in the accessible view with {0}', keybinding)
                : localize('notificationAccessibleViewHintNoKb', 'Inspect the response in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding');
        }
        if (!element.source) {
            return accessibleViewHint
                ? localize('notificationAriaLabelHint', '{0}, notification, {1}', element.message.raw, accessibleViewHint)
                : localize('notificationAriaLabel', '{0}, notification', element.message.raw);
        }
        return accessibleViewHint
            ? localize('notificationWithSourceAriaLabelHint', '{0}, source: {1}, notification, {2}', element.message.raw, element.source, accessibleViewHint)
            : localize('notificationWithSourceAriaLabel', '{0}, source: {1}, notification', element.message.raw, element.source);
    }
    getWidgetAriaLabel() {
        return this._options.widgetAriaLabel ?? localize('notificationsList', 'Notifications List');
    }
    getRole() {
        return 'dialog'; // https://github.com/microsoft/vscode/issues/82728
    }
};
NotificationAccessibilityProvider = __decorate([
    __param(1, IKeybindingService),
    __param(2, IConfigurationService)
], NotificationAccessibilityProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLENBQUMsRUFDRCxTQUFTLEVBQ1QseUJBQXlCLEVBQ3pCLFVBQVUsR0FDVixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUtsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYs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