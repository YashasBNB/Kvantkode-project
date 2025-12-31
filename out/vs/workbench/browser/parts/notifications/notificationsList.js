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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnNMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixDQUFDLEVBQ0QsU0FBUyxFQUNULHlCQUF5QixFQUN6QixVQUFVLEdBQ1YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDMUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTTNGLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQU9oRCxZQUNrQixTQUFzQixFQUN0QixPQUFrQyxFQUM1QixvQkFBNEQsRUFDOUQsa0JBQXdEO1FBRTdFLEtBQUssRUFBRSxDQUFBO1FBTFUsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixZQUFPLEdBQVAsT0FBTyxDQUEyQjtRQUNYLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQVB0RSxjQUFTLEdBQTRCLEVBQUUsQ0FBQTtJQVUvQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU0sQ0FBQyxrQkFBa0I7UUFDMUIsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBQy9CLENBQUM7UUFFRCxlQUFlO1FBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7SUFDdEIsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixpQkFBaUI7UUFDakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQTtRQUV2RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQ2xFLENBQUE7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUU3RixPQUFPO1FBQ1AsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDNUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUM1QixNQUFNLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsQ0FBQSxhQUFvQyxDQUFBLEVBQ3BDLG1CQUFtQixFQUNuQixJQUFJLENBQUMsYUFBYSxFQUNsQixZQUFZLEVBQ1osQ0FBQyxRQUFRLENBQUMsRUFDVjtZQUNDLEdBQUcsT0FBTztZQUNWLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixjQUFjLEVBQUU7Z0JBQ2YsY0FBYyxFQUFFLHdCQUF3QjthQUN4QztZQUNELHFCQUFxQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlELGlDQUFpQyxFQUNqQyxPQUFPLENBQ1A7U0FDRCxDQUNELENBQ0QsQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2hDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLDZCQUE2QixFQUM3Qiw2QkFBNkIsQ0FBQyxFQUFFLEVBQ2hDLDZCQUE2QixDQUFDLEtBQUssQ0FDbkMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO2dCQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU07Z0JBQ3pCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDOUIsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU87Z0JBQ2xDLFlBQVk7YUFDWixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUUsS0FBSyxDQUFDLE9BQWlDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDbEYsQ0FBQTtRQUVELHVDQUF1QztRQUN2QyxtRkFBbUY7UUFDbkYsaUZBQWlGO1FBQ2pGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsU0FBUyxDQUNiLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDL0IsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsY0FBYztRQUNkLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV6RCxnREFBZ0Q7UUFDaEQsK0NBQStDO1FBQy9DLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9CLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELHVCQUF1QixDQUFDLEtBQWEsRUFBRSxXQUFtQixFQUFFLFFBQWlDLEVBQUU7UUFDOUYsTUFBTSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUM3RSxNQUFNLGVBQWUsR0FBRyx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVoRSwrQ0FBK0M7UUFDL0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFaEQsSUFBSSxnQkFBZ0IsR0FBa0IsSUFBSSxDQUFBO1FBQzFDLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUVuRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUViLHdDQUF3QztRQUN4QyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNaLENBQUM7UUFFRCxvQ0FBb0M7YUFDL0IsSUFBSSxPQUFPLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7WUFDcEIsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDL0QsSUFBSSxxQkFBcUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsQyxxQkFBcUIsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFBLENBQUMsK0JBQStCO2dCQUN6RSxDQUFDO2dCQUVELElBQUkscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUkscUJBQXFCLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ2pGLFlBQVksR0FBRyxxQkFBcUIsQ0FBQTtnQkFDckMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLE9BQU8sZ0JBQWdCLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDNUMsQ0FBQztZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUVELHdCQUF3QixDQUFDLElBQTJCO1FBQ25ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNkLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkMsT0FBTSxDQUFDLGlCQUFpQjtRQUN6QixDQUFDO1FBRUQsT0FBTztRQUNQLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBRXRCLGFBQWE7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUxQyxtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU0sQ0FBQyxrQkFBa0I7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRUQsUUFBUTtRQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsT0FBTyxLQUFLLENBQUEsQ0FBQyxrQkFBa0I7UUFDaEMsQ0FBQztRQUVELE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYSxFQUFFLFNBQWtCO1FBQ3ZDLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUE7WUFFN0MsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEdBQUcsU0FBUyxJQUFJLENBQUE7WUFDOUQsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRVgsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCxDQUFBO0FBM09ZLGlCQUFpQjtJQVUzQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7R0FYVCxpQkFBaUIsQ0EyTzdCOztBQUVELElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWlDO0lBR3RDLFlBQ2tCLFFBQW1DLEVBQ2Ysa0JBQXNDLEVBQ25DLHFCQUE0QztRQUZuRSxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQUNmLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtJQUNsRixDQUFDO0lBQ0osWUFBWSxDQUFDLE9BQThCO1FBQzFDLElBQUksa0JBQXNDLENBQUE7UUFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjthQUN4QyxnQkFBZ0IsQ0FBQyw4QkFBOEIsQ0FBQztZQUNqRCxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ2pCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLENBQUM7WUFDakYsa0JBQWtCLEdBQUcsVUFBVTtnQkFDOUIsQ0FBQyxDQUFDLFFBQVEsQ0FDUixnQ0FBZ0MsRUFDaEMsc0RBQXNELEVBQ3RELFVBQVUsQ0FDVjtnQkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLG9DQUFvQyxFQUNwQyxvSUFBb0ksQ0FDcEksQ0FBQTtRQUNKLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLE9BQU8sa0JBQWtCO2dCQUN4QixDQUFDLENBQUMsUUFBUSxDQUNSLDJCQUEyQixFQUMzQix3QkFBd0IsRUFDeEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQ25CLGtCQUFrQixDQUNsQjtnQkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUVELE9BQU8sa0JBQWtCO1lBQ3hCLENBQUMsQ0FBQyxRQUFRLENBQ1IscUNBQXFDLEVBQ3JDLHFDQUFxQyxFQUNyQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFDbkIsT0FBTyxDQUFDLE1BQU0sRUFDZCxrQkFBa0IsQ0FDbEI7WUFDRixDQUFDLENBQUMsUUFBUSxDQUNSLGlDQUFpQyxFQUNqQyxnQ0FBZ0MsRUFDaEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQ2QsQ0FBQTtJQUNKLENBQUM7SUFDRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUM1RixDQUFDO0lBQ0QsT0FBTztRQUNOLE9BQU8sUUFBUSxDQUFBLENBQUMsbURBQW1EO0lBQ3BFLENBQUM7Q0FDRCxDQUFBO0FBekRLLGlDQUFpQztJQUtwQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FObEIsaUNBQWlDLENBeUR0QyJ9