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
var NotificationRenderer_1, NotificationTemplateRenderer_1;
import { clearNode, addDisposableListener, EventType, EventHelper, $, isEventLike, } from '../../../../base/browser/dom.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionRunner, Separator, toAction, } from '../../../../base/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { dispose, DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { NotificationViewItem, ChoiceAction, } from '../../../common/notifications.js';
import { ClearNotificationAction, ExpandNotificationAction, CollapseNotificationAction, ConfigureNotificationAction, } from './notificationsActions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { INotificationService, NotificationsFilter, Severity, isNotificationSource, } from '../../../../platform/notification/common/notification.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { Gesture, EventType as GestureEventType } from '../../../../base/browser/touch.js';
import { Event } from '../../../../base/common/event.js';
import { defaultButtonStyles, defaultProgressBarStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
export class NotificationsListDelegate {
    static { this.ROW_HEIGHT = 42; }
    static { this.LINE_HEIGHT = 22; }
    constructor(container) {
        this.offsetHelper = this.createOffsetHelper(container);
    }
    createOffsetHelper(container) {
        return container.appendChild($('.notification-offset-helper'));
    }
    getHeight(notification) {
        if (!notification.expanded) {
            return NotificationsListDelegate.ROW_HEIGHT; // return early if there are no more rows to show
        }
        // First row: message and actions
        let expandedHeight = NotificationsListDelegate.ROW_HEIGHT;
        // Dynamic height: if message overflows
        const preferredMessageHeight = this.computePreferredHeight(notification);
        const messageOverflows = NotificationsListDelegate.LINE_HEIGHT < preferredMessageHeight;
        if (messageOverflows) {
            const overflow = preferredMessageHeight - NotificationsListDelegate.LINE_HEIGHT;
            expandedHeight += overflow;
        }
        // Last row: source and buttons if we have any
        if (notification.source ||
            isNonEmptyArray(notification.actions && notification.actions.primary)) {
            expandedHeight += NotificationsListDelegate.ROW_HEIGHT;
        }
        // If the expanded height is same as collapsed, unset the expanded state
        // but skip events because there is no change that has visual impact
        if (expandedHeight === NotificationsListDelegate.ROW_HEIGHT) {
            notification.collapse(true /* skip events, no change in height */);
        }
        return expandedHeight;
    }
    computePreferredHeight(notification) {
        // Prepare offset helper depending on toolbar actions count
        let actions = 0;
        if (!notification.hasProgress) {
            actions++; // close
        }
        if (notification.canCollapse) {
            actions++; // expand/collapse
        }
        if (isNonEmptyArray(notification.actions && notification.actions.secondary)) {
            actions++; // secondary actions
        }
        this.offsetHelper.style.width = `${450 /* notifications container width */ - (10 /* padding */ + 30 /* severity icon */ + actions * 30 /* actions */ - Math.max(actions - 1, 0) * 4) /* less padding for actions > 1 */}px`;
        // Render message into offset helper
        const renderedMessage = NotificationMessageRenderer.render(notification.message);
        this.offsetHelper.appendChild(renderedMessage);
        // Compute height
        const preferredHeight = Math.max(this.offsetHelper.offsetHeight, this.offsetHelper.scrollHeight);
        // Always clear offset helper after use
        clearNode(this.offsetHelper);
        return preferredHeight;
    }
    getTemplateId(element) {
        if (element instanceof NotificationViewItem) {
            return NotificationRenderer.TEMPLATE_ID;
        }
        throw new Error('unknown element type: ' + element);
    }
}
class NotificationMessageRenderer {
    static render(message, actionHandler) {
        const messageContainer = $('span');
        for (const node of message.linkedText.nodes) {
            if (typeof node === 'string') {
                messageContainer.appendChild(document.createTextNode(node));
            }
            else {
                let title = node.title;
                if (!title && node.href.startsWith('command:')) {
                    title = localize('executeCommand', "Click to execute command '{0}'", node.href.substr('command:'.length));
                }
                else if (!title) {
                    title = node.href;
                }
                const anchor = $('a', { href: node.href, title, tabIndex: 0 }, node.label);
                if (actionHandler) {
                    const handleOpen = (e) => {
                        if (isEventLike(e)) {
                            EventHelper.stop(e, true);
                        }
                        actionHandler.callback(node.href);
                    };
                    const onClick = actionHandler.toDispose.add(new DomEmitter(anchor, EventType.CLICK)).event;
                    const onKeydown = actionHandler.toDispose.add(new DomEmitter(anchor, EventType.KEY_DOWN)).event;
                    const onSpaceOrEnter = Event.chain(onKeydown, ($) => $.filter((e) => {
                        const event = new StandardKeyboardEvent(e);
                        return event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */);
                    }));
                    actionHandler.toDispose.add(Gesture.addTarget(anchor));
                    const onTap = actionHandler.toDispose.add(new DomEmitter(anchor, GestureEventType.Tap)).event;
                    Event.any(onClick, onTap, onSpaceOrEnter)(handleOpen, null, actionHandler.toDispose);
                }
                messageContainer.appendChild(anchor);
            }
        }
        return messageContainer;
    }
}
let NotificationRenderer = class NotificationRenderer {
    static { NotificationRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'notification'; }
    constructor(actionRunner, contextMenuService, instantiationService, notificationService) {
        this.actionRunner = actionRunner;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
    }
    get templateId() {
        return NotificationRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.toDispose = new DisposableStore();
        // Container
        data.container = $('.notification-list-item');
        // Main Row
        data.mainRow = $('.notification-list-item-main-row');
        // Icon
        data.icon = $('.notification-list-item-icon.codicon');
        // Message
        data.message = $('.notification-list-item-message');
        // Toolbar
        const that = this;
        const toolbarContainer = $('.notification-list-item-toolbar-container');
        data.toolbar = new ActionBar(toolbarContainer, {
            ariaLabel: localize('notificationActions', 'Notification Actions'),
            actionViewItemProvider: (action, options) => {
                if (action instanceof ConfigureNotificationAction) {
                    return data.toDispose.add(new DropdownMenuActionViewItem(action, {
                        getActions() {
                            const actions = [];
                            const source = {
                                id: action.notification.sourceId,
                                label: action.notification.source,
                            };
                            if (isNotificationSource(source)) {
                                const isSourceFiltered = that.notificationService.getFilter(source) === NotificationsFilter.ERROR;
                                actions.push(toAction({
                                    id: source.id,
                                    label: isSourceFiltered
                                        ? localize('turnOnNotifications', "Turn On All Notifications from '{0}'", source.label)
                                        : localize('turnOffNotifications', "Turn Off Info and Warning Notifications from '{0}'", source.label),
                                    run: () => that.notificationService.setFilter({
                                        ...source,
                                        filter: isSourceFiltered
                                            ? NotificationsFilter.OFF
                                            : NotificationsFilter.ERROR,
                                    }),
                                }));
                                if (action.notification.actions?.secondary?.length) {
                                    actions.push(new Separator());
                                }
                            }
                            if (Array.isArray(action.notification.actions?.secondary)) {
                                actions.push(...action.notification.actions.secondary);
                            }
                            return actions;
                        },
                    }, this.contextMenuService, {
                        ...options,
                        actionRunner: this.actionRunner,
                        classNames: action.class,
                    }));
                }
                return undefined;
            },
            actionRunner: this.actionRunner,
        });
        data.toDispose.add(data.toolbar);
        // Details Row
        data.detailsRow = $('.notification-list-item-details-row');
        // Source
        data.source = $('.notification-list-item-source');
        // Buttons Container
        data.buttonsContainer = $('.notification-list-item-buttons-container');
        container.appendChild(data.container);
        // the details row appears first in order for better keyboard access to notification buttons
        data.container.appendChild(data.detailsRow);
        data.detailsRow.appendChild(data.source);
        data.detailsRow.appendChild(data.buttonsContainer);
        // main row
        data.container.appendChild(data.mainRow);
        data.mainRow.appendChild(data.icon);
        data.mainRow.appendChild(data.message);
        data.mainRow.appendChild(toolbarContainer);
        // Progress: below the rows to span the entire width of the item
        data.progress = new ProgressBar(container, defaultProgressBarStyles);
        data.toDispose.add(data.progress);
        // Renderer
        data.renderer = this.instantiationService.createInstance(NotificationTemplateRenderer, data, this.actionRunner);
        data.toDispose.add(data.renderer);
        return data;
    }
    renderElement(notification, index, data) {
        data.renderer.setInput(notification);
    }
    disposeTemplate(templateData) {
        dispose(templateData.toDispose);
    }
};
NotificationRenderer = NotificationRenderer_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IInstantiationService),
    __param(3, INotificationService)
], NotificationRenderer);
export { NotificationRenderer };
let NotificationTemplateRenderer = class NotificationTemplateRenderer extends Disposable {
    static { NotificationTemplateRenderer_1 = this; }
    static { this.SEVERITIES = [Severity.Info, Severity.Warning, Severity.Error]; }
    constructor(template, actionRunner, openerService, instantiationService, keybindingService, contextMenuService, hoverService) {
        super();
        this.template = template;
        this.actionRunner = actionRunner;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.inputDisposables = this._register(new DisposableStore());
        if (!NotificationTemplateRenderer_1.closeNotificationAction) {
            NotificationTemplateRenderer_1.closeNotificationAction = instantiationService.createInstance(ClearNotificationAction, ClearNotificationAction.ID, ClearNotificationAction.LABEL);
            NotificationTemplateRenderer_1.expandNotificationAction = instantiationService.createInstance(ExpandNotificationAction, ExpandNotificationAction.ID, ExpandNotificationAction.LABEL);
            NotificationTemplateRenderer_1.collapseNotificationAction = instantiationService.createInstance(CollapseNotificationAction, CollapseNotificationAction.ID, CollapseNotificationAction.LABEL);
        }
    }
    setInput(notification) {
        this.inputDisposables.clear();
        this.render(notification);
    }
    render(notification) {
        // Container
        this.template.container.classList.toggle('expanded', notification.expanded);
        this.inputDisposables.add(addDisposableListener(this.template.container, EventType.MOUSE_UP, (e) => {
            if (e.button === 1 /* Middle Button */) {
                // Prevent firing the 'paste' event in the editor textarea - #109322
                EventHelper.stop(e, true);
            }
        }));
        this.inputDisposables.add(addDisposableListener(this.template.container, EventType.AUXCLICK, (e) => {
            if (!notification.hasProgress && e.button === 1 /* Middle Button */) {
                EventHelper.stop(e, true);
                notification.close();
            }
        }));
        // Severity Icon
        this.renderSeverity(notification);
        // Message
        const messageCustomHover = this.inputDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.template.message, ''));
        const messageOverflows = this.renderMessage(notification, messageCustomHover);
        // Secondary Actions
        this.renderSecondaryActions(notification, messageOverflows);
        // Source
        const sourceCustomHover = this.inputDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.template.source, ''));
        this.renderSource(notification, sourceCustomHover);
        // Buttons
        this.renderButtons(notification);
        // Progress
        this.renderProgress(notification);
        // Label Change Events that we can handle directly
        // (changes to actions require an entire redraw of
        // the notification because it has an impact on
        // epxansion state)
        this.inputDisposables.add(notification.onDidChangeContent((event) => {
            switch (event.kind) {
                case 0 /* NotificationViewItemContentChangeKind.SEVERITY */:
                    this.renderSeverity(notification);
                    break;
                case 3 /* NotificationViewItemContentChangeKind.PROGRESS */:
                    this.renderProgress(notification);
                    break;
                case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                    this.renderMessage(notification, messageCustomHover);
                    break;
            }
        }));
    }
    renderSeverity(notification) {
        // first remove, then set as the codicon class names overlap
        NotificationTemplateRenderer_1.SEVERITIES.forEach((severity) => {
            if (notification.severity !== severity) {
                this.template.icon.classList.remove(...ThemeIcon.asClassNameArray(this.toSeverityIcon(severity)));
            }
        });
        this.template.icon.classList.add(...ThemeIcon.asClassNameArray(this.toSeverityIcon(notification.severity)));
    }
    renderMessage(notification, customHover) {
        clearNode(this.template.message);
        this.template.message.appendChild(NotificationMessageRenderer.render(notification.message, {
            callback: (link) => this.openerService.open(URI.parse(link), { allowCommands: true }),
            toDispose: this.inputDisposables,
        }));
        const messageOverflows = notification.canCollapse &&
            !notification.expanded &&
            this.template.message.scrollWidth > this.template.message.clientWidth;
        customHover.update(messageOverflows ? this.template.message.textContent + '' : '');
        return messageOverflows;
    }
    renderSecondaryActions(notification, messageOverflows) {
        const actions = [];
        // Secondary Actions
        if (isNonEmptyArray(notification.actions?.secondary)) {
            const configureNotificationAction = this.instantiationService.createInstance(ConfigureNotificationAction, ConfigureNotificationAction.ID, ConfigureNotificationAction.LABEL, notification);
            actions.push(configureNotificationAction);
            this.inputDisposables.add(configureNotificationAction);
        }
        // Expand / Collapse
        let showExpandCollapseAction = false;
        if (notification.canCollapse) {
            if (notification.expanded) {
                showExpandCollapseAction = true; // allow to collapse an expanded message
            }
            else if (notification.source) {
                showExpandCollapseAction = true; // allow to expand to details row
            }
            else if (messageOverflows) {
                showExpandCollapseAction = true; // allow to expand if message overflows
            }
        }
        if (showExpandCollapseAction) {
            actions.push(notification.expanded
                ? NotificationTemplateRenderer_1.collapseNotificationAction
                : NotificationTemplateRenderer_1.expandNotificationAction);
        }
        // Close (unless progress is showing)
        if (!notification.hasProgress) {
            actions.push(NotificationTemplateRenderer_1.closeNotificationAction);
        }
        this.template.toolbar.clear();
        this.template.toolbar.context = notification;
        actions.forEach((action) => this.template.toolbar.push(action, {
            icon: true,
            label: false,
            keybinding: this.getKeybindingLabel(action),
        }));
    }
    renderSource(notification, sourceCustomHover) {
        if (notification.expanded && notification.source) {
            this.template.source.textContent = localize('notificationSource', 'Source: {0}', notification.source);
            sourceCustomHover.update(notification.source);
        }
        else {
            this.template.source.textContent = '';
            sourceCustomHover.update('');
        }
    }
    renderButtons(notification) {
        clearNode(this.template.buttonsContainer);
        const primaryActions = notification.actions ? notification.actions.primary : undefined;
        if (notification.expanded && isNonEmptyArray(primaryActions)) {
            const that = this;
            const actionRunner = this.inputDisposables.add(new (class extends ActionRunner {
                async runAction(action) {
                    // Run action
                    that.actionRunner.run(action, notification);
                    // Hide notification (unless explicitly prevented)
                    if (!(action instanceof ChoiceAction) || !action.keepOpen) {
                        notification.close();
                    }
                }
            })());
            const buttonToolbar = this.inputDisposables.add(new ButtonBar(this.template.buttonsContainer));
            for (let i = 0; i < primaryActions.length; i++) {
                const action = primaryActions[i];
                const options = {
                    title: true, // assign titles to buttons in case they overflow
                    secondary: i > 0,
                    ...defaultButtonStyles,
                };
                const dropdownActions = action instanceof ChoiceAction ? action.menu : undefined;
                const button = this.inputDisposables.add(dropdownActions
                    ? buttonToolbar.addButtonWithDropdown({
                        ...options,
                        contextMenuProvider: this.contextMenuService,
                        actions: dropdownActions,
                        actionRunner,
                    })
                    : buttonToolbar.addButton(options));
                button.label = action.label;
                this.inputDisposables.add(button.onDidClick((e) => {
                    if (e) {
                        EventHelper.stop(e, true);
                    }
                    actionRunner.run(action);
                }));
            }
        }
    }
    renderProgress(notification) {
        // Return early if the item has no progress
        if (!notification.hasProgress) {
            this.template.progress.stop().hide();
            return;
        }
        // Infinite
        const state = notification.progress.state;
        if (state.infinite) {
            this.template.progress.infinite().show();
        }
        // Total / Worked
        else if (typeof state.total === 'number' || typeof state.worked === 'number') {
            if (typeof state.total === 'number' && !this.template.progress.hasTotal()) {
                this.template.progress.total(state.total);
            }
            if (typeof state.worked === 'number') {
                this.template.progress.setWorked(state.worked).show();
            }
        }
        // Done
        else {
            this.template.progress.done().hide();
        }
    }
    toSeverityIcon(severity) {
        switch (severity) {
            case Severity.Warning:
                return Codicon.warning;
            case Severity.Error:
                return Codicon.error;
        }
        return Codicon.info;
    }
    getKeybindingLabel(action) {
        const keybinding = this.keybindingService.lookupKeybinding(action.id);
        return keybinding ? keybinding.getLabel() : null;
    }
};
NotificationTemplateRenderer = NotificationTemplateRenderer_1 = __decorate([
    __param(2, IOpenerService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IHoverService)
], NotificationTemplateRenderer);
export { NotificationTemplateRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc1ZpZXdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLFNBQVMsRUFDVCxxQkFBcUIsRUFDckIsU0FBUyxFQUNULFdBQVcsRUFDWCxDQUFDLEVBQ0QsV0FBVyxHQUNYLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFNBQVMsRUFBa0IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUNOLFlBQVksRUFHWixTQUFTLEVBQ1QsUUFBUSxHQUNSLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUVOLG9CQUFvQixFQUdwQixZQUFZLEdBQ1osTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHdCQUF3QixFQUN4QiwwQkFBMEIsRUFDMUIsMkJBQTJCLEdBQzNCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3BGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLFFBQVEsRUFDUixvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix3QkFBd0IsR0FDeEIsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFM0UsTUFBTSxPQUFPLHlCQUF5QjthQUNiLGVBQVUsR0FBRyxFQUFFLENBQUE7YUFDZixnQkFBVyxHQUFHLEVBQUUsQ0FBQTtJQUl4QyxZQUFZLFNBQXNCO1FBQ2pDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxTQUFzQjtRQUNoRCxPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsU0FBUyxDQUFDLFlBQW1DO1FBQzVDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDNUIsT0FBTyx5QkFBeUIsQ0FBQyxVQUFVLENBQUEsQ0FBQyxpREFBaUQ7UUFDOUYsQ0FBQztRQUVELGlDQUFpQztRQUNqQyxJQUFJLGNBQWMsR0FBRyx5QkFBeUIsQ0FBQyxVQUFVLENBQUE7UUFFekQsdUNBQXVDO1FBQ3ZDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcseUJBQXlCLENBQUMsV0FBVyxHQUFHLHNCQUFzQixDQUFBO1FBQ3ZGLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLFFBQVEsR0FBRyxzQkFBc0IsR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLENBQUE7WUFDL0UsY0FBYyxJQUFJLFFBQVEsQ0FBQTtRQUMzQixDQUFDO1FBRUQsOENBQThDO1FBQzlDLElBQ0MsWUFBWSxDQUFDLE1BQU07WUFDbkIsZUFBZSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFDcEUsQ0FBQztZQUNGLGNBQWMsSUFBSSx5QkFBeUIsQ0FBQyxVQUFVLENBQUE7UUFDdkQsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxvRUFBb0U7UUFDcEUsSUFBSSxjQUFjLEtBQUsseUJBQXlCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0QsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFlBQW1DO1FBQ2pFLDJEQUEyRDtRQUMzRCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9CLE9BQU8sRUFBRSxDQUFBLENBQUMsUUFBUTtRQUNuQixDQUFDO1FBQ0QsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLENBQUEsQ0FBQyxrQkFBa0I7UUFDN0IsQ0FBQztRQUNELElBQUksZUFBZSxDQUFDLFlBQVksQ0FBQyxPQUFPLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU8sRUFBRSxDQUFBLENBQUMsb0JBQW9CO1FBQy9CLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsbUNBQW1DLEdBQUcsQ0FBQyxFQUFFLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsR0FBRyxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0NBQWtDLElBQUksQ0FBQTtRQUUzTixvQ0FBb0M7UUFDcEMsTUFBTSxlQUFlLEdBQUcsMkJBQTJCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoRixJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUU5QyxpQkFBaUI7UUFDakIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRWhHLHVDQUF1QztRQUN2QyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRTVCLE9BQU8sZUFBZSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBOEI7UUFDM0MsSUFBSSxPQUFPLFlBQVksb0JBQW9CLEVBQUUsQ0FBQztZQUM3QyxPQUFPLG9CQUFvQixDQUFDLFdBQVcsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxPQUFPLENBQUMsQ0FBQTtJQUNwRCxDQUFDOztBQTBCRixNQUFNLDJCQUEyQjtJQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQTZCLEVBQUUsYUFBcUM7UUFDakYsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbEMsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzdDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzlCLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDNUQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7Z0JBRXRCLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDaEQsS0FBSyxHQUFHLFFBQVEsQ0FDZixnQkFBZ0IsRUFDaEIsZ0NBQWdDLEVBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FDbkMsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7Z0JBQ2xCLENBQUM7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUUxRSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQVUsRUFBRSxFQUFFO3dCQUNqQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUNwQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDMUIsQ0FBQzt3QkFFRCxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDbEMsQ0FBQyxDQUFBO29CQUVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7b0JBRTFGLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUM1QyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUMxQyxDQUFDLEtBQUssQ0FBQTtvQkFDUCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ25ELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTt3QkFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUUxQyxPQUFPLEtBQUssQ0FBQyxNQUFNLHdCQUFlLElBQUksS0FBSyxDQUFDLE1BQU0sdUJBQWUsQ0FBQTtvQkFDbEUsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtvQkFFRCxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7b0JBQ3RELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUN4QyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQzVDLENBQUMsS0FBSyxDQUFBO29CQUVQLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDckYsQ0FBQztnQkFFRCxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLGdCQUFnQixDQUFBO0lBQ3hCLENBQUM7Q0FDRDtBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9COzthQUdoQixnQkFBVyxHQUFHLGNBQWMsQUFBakIsQ0FBaUI7SUFFNUMsWUFDUyxZQUEyQixFQUNHLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDNUMsbUJBQXlDO1FBSHhFLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ0csdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzVDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7SUFDOUUsQ0FBQztJQUVKLElBQUksVUFBVTtRQUNiLE9BQU8sc0JBQW9CLENBQUMsV0FBVyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxJQUFJLEdBQThCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXRDLFlBQVk7UUFDWixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBRTdDLFdBQVc7UUFDWCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1FBRXBELE9BQU87UUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFBO1FBRXJELFVBQVU7UUFDVixJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1FBRW5ELFVBQVU7UUFDVixNQUFNLElBQUksR0FBRyxJQUFJLENBQUE7UUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtRQUN2RSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksU0FBUyxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLFNBQVMsRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsc0JBQXNCLENBQUM7WUFDbEUsc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQzNDLElBQUksTUFBTSxZQUFZLDJCQUEyQixFQUFFLENBQUM7b0JBQ25ELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQ3hCLElBQUksMEJBQTBCLENBQzdCLE1BQU0sRUFDTjt3QkFDQyxVQUFVOzRCQUNULE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTs0QkFFN0IsTUFBTSxNQUFNLEdBQUc7Z0NBQ2QsRUFBRSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUTtnQ0FDaEMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTTs2QkFDakMsQ0FBQTs0QkFDRCxJQUFJLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0NBQ2xDLE1BQU0sZ0JBQWdCLEdBQ3JCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssbUJBQW1CLENBQUMsS0FBSyxDQUFBO2dDQUN6RSxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FBQztvQ0FDUixFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7b0NBQ2IsS0FBSyxFQUFFLGdCQUFnQjt3Q0FDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FDUixxQkFBcUIsRUFDckIsc0NBQXNDLEVBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQ1o7d0NBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUixzQkFBc0IsRUFDdEIsb0RBQW9ELEVBQ3BELE1BQU0sQ0FBQyxLQUFLLENBQ1o7b0NBQ0gsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUNULElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7d0NBQ2xDLEdBQUcsTUFBTTt3Q0FDVCxNQUFNLEVBQUUsZ0JBQWdCOzRDQUN2QixDQUFDLENBQUMsbUJBQW1CLENBQUMsR0FBRzs0Q0FDekIsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQUs7cUNBQzVCLENBQUM7aUNBQ0gsQ0FBQyxDQUNGLENBQUE7Z0NBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7b0NBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO2dDQUM5QixDQUFDOzRCQUNGLENBQUM7NEJBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0NBQzNELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTs0QkFDdkQsQ0FBQzs0QkFFRCxPQUFPLE9BQU8sQ0FBQTt3QkFDZixDQUFDO3FCQUNELEVBQ0QsSUFBSSxDQUFDLGtCQUFrQixFQUN2Qjt3QkFDQyxHQUFHLE9BQU87d0JBQ1YsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO3dCQUMvQixVQUFVLEVBQUUsTUFBTSxDQUFDLEtBQUs7cUJBQ3hCLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtTQUMvQixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFaEMsY0FBYztRQUNkLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7UUFFMUQsU0FBUztRQUNULElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFFakQsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtRQUV0RSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVyQyw0RkFBNEY7UUFDNUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVsRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUUxQyxnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFakMsV0FBVztRQUNYLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkQsNEJBQTRCLEVBQzVCLElBQUksRUFDSixJQUFJLENBQUMsWUFBWSxDQUNqQixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWpDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELGFBQWEsQ0FDWixZQUFtQyxFQUNuQyxLQUFhLEVBQ2IsSUFBK0I7UUFFL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUF1QztRQUN0RCxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7O0FBeEpXLG9CQUFvQjtJQU85QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxvQkFBb0IsQ0FBQTtHQVRWLG9CQUFvQixDQXlKaEM7O0FBRU0sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVOzthQUtuQyxlQUFVLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxBQUFwRCxDQUFvRDtJQUl0RixZQUNTLFFBQW1DLEVBQ25DLFlBQTJCLEVBQ25CLGFBQThDLEVBQ3ZDLG9CQUE0RCxFQUMvRCxpQkFBc0QsRUFDckQsa0JBQXdELEVBQzlELFlBQTRDO1FBRTNELEtBQUssRUFBRSxDQUFBO1FBUkMsYUFBUSxHQUFSLFFBQVEsQ0FBMkI7UUFDbkMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDRixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3BDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDN0MsaUJBQVksR0FBWixZQUFZLENBQWU7UUFUM0MscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFheEUsSUFBSSxDQUFDLDhCQUE0QixDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDM0QsOEJBQTRCLENBQUMsdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUN6Rix1QkFBdUIsRUFDdkIsdUJBQXVCLENBQUMsRUFBRSxFQUMxQix1QkFBdUIsQ0FBQyxLQUFLLENBQzdCLENBQUE7WUFDRCw4QkFBNEIsQ0FBQyx3QkFBd0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQzFGLHdCQUF3QixFQUN4Qix3QkFBd0IsQ0FBQyxFQUFFLEVBQzNCLHdCQUF3QixDQUFDLEtBQUssQ0FDOUIsQ0FBQTtZQUNELDhCQUE0QixDQUFDLDBCQUEwQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDNUYsMEJBQTBCLEVBQzFCLDBCQUEwQixDQUFDLEVBQUUsRUFDN0IsMEJBQTBCLENBQUMsS0FBSyxDQUNoQyxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsWUFBbUM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTdCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDMUIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxZQUFtQztRQUNqRCxZQUFZO1FBQ1osSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ3hCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4RSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3hDLG9FQUFvRTtnQkFDcEUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUN4QixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDckUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXpCLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELGdCQUFnQjtRQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRWpDLFVBQVU7UUFDVixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQ2xDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFDckIsRUFBRSxDQUNGLENBQ0QsQ0FBQTtRQUNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUU3RSxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRTNELFNBQVM7UUFDVCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQ2xDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDcEIsRUFBRSxDQUNGLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFFbEQsVUFBVTtRQUNWLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFaEMsV0FBVztRQUNYLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFakMsa0RBQWtEO1FBQ2xELGtEQUFrRDtRQUNsRCwrQ0FBK0M7UUFDL0MsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ3hCLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3pDLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQjtvQkFDQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUNqQyxNQUFLO2dCQUNOO29CQUNDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQ2pDLE1BQUs7Z0JBQ047b0JBQ0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtvQkFDcEQsTUFBSztZQUNQLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxZQUFtQztRQUN6RCw0REFBNEQ7UUFDNUQsOEJBQTRCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzVELElBQUksWUFBWSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDbEMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUM1RCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDL0IsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDekUsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhLENBQUMsWUFBbUMsRUFBRSxXQUEwQjtRQUNwRixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQ2hDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFO1lBQ3hELFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNyRixTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtTQUNoQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sZ0JBQWdCLEdBQ3JCLFlBQVksQ0FBQyxXQUFXO1lBQ3hCLENBQUMsWUFBWSxDQUFDLFFBQVE7WUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUV0RSxXQUFXLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVsRixPQUFPLGdCQUFnQixDQUFBO0lBQ3hCLENBQUM7SUFFTyxzQkFBc0IsQ0FDN0IsWUFBbUMsRUFDbkMsZ0JBQXlCO1FBRXpCLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTtRQUU3QixvQkFBb0I7UUFDcEIsSUFBSSxlQUFlLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDM0UsMkJBQTJCLEVBQzNCLDJCQUEyQixDQUFDLEVBQUUsRUFDOUIsMkJBQTJCLENBQUMsS0FBSyxFQUNqQyxZQUFZLENBQ1osQ0FBQTtZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELG9CQUFvQjtRQUNwQixJQUFJLHdCQUF3QixHQUFHLEtBQUssQ0FBQTtRQUNwQyxJQUFJLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM5QixJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDM0Isd0JBQXdCLEdBQUcsSUFBSSxDQUFBLENBQUMsd0NBQXdDO1lBQ3pFLENBQUM7aUJBQU0sSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLHdCQUF3QixHQUFHLElBQUksQ0FBQSxDQUFDLGlDQUFpQztZQUNsRSxDQUFDO2lCQUFNLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDN0Isd0JBQXdCLEdBQUcsSUFBSSxDQUFBLENBQUMsdUNBQXVDO1lBQ3hFLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsWUFBWSxDQUFDLFFBQVE7Z0JBQ3BCLENBQUMsQ0FBQyw4QkFBNEIsQ0FBQywwQkFBMEI7Z0JBQ3pELENBQUMsQ0FBQyw4QkFBNEIsQ0FBQyx3QkFBd0IsQ0FDeEQsQ0FBQTtRQUNGLENBQUM7UUFFRCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUMvQixPQUFPLENBQUMsSUFBSSxDQUFDLDhCQUE0QixDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUE7UUFDNUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDbEMsSUFBSSxFQUFFLElBQUk7WUFDVixLQUFLLEVBQUUsS0FBSztZQUNaLFVBQVUsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1NBQzNDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FDbkIsWUFBbUMsRUFDbkMsaUJBQWdDO1FBRWhDLElBQUksWUFBWSxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FDMUMsb0JBQW9CLEVBQ3BCLGFBQWEsRUFDYixZQUFZLENBQUMsTUFBTSxDQUNuQixDQUFBO1lBQ0QsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFDckMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQW1DO1FBQ3hELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFekMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUN0RixJQUFJLFlBQVksQ0FBQyxRQUFRLElBQUksZUFBZSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDOUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1lBRWpCLE1BQU0sWUFBWSxHQUFrQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUM1RCxJQUFJLENBQUMsS0FBTSxTQUFRLFlBQVk7Z0JBQ1gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFlO29CQUNqRCxhQUFhO29CQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtvQkFFM0Msa0RBQWtEO29CQUNsRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQzNELFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFDckIsQ0FBQztnQkFDRixDQUFDO2FBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtZQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7WUFDOUYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDaEQsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUVoQyxNQUFNLE9BQU8sR0FBbUI7b0JBQy9CLEtBQUssRUFBRSxJQUFJLEVBQUUsaURBQWlEO29CQUM5RCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ2hCLEdBQUcsbUJBQW1CO2lCQUN0QixDQUFBO2dCQUVELE1BQU0sZUFBZSxHQUFHLE1BQU0sWUFBWSxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDaEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDdkMsZUFBZTtvQkFDZCxDQUFDLENBQUMsYUFBYSxDQUFDLHFCQUFxQixDQUFDO3dCQUNwQyxHQUFHLE9BQU87d0JBQ1YsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjt3QkFDNUMsT0FBTyxFQUFFLGVBQWU7d0JBQ3hCLFlBQVk7cUJBQ1osQ0FBQztvQkFDSCxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FDbkMsQ0FBQTtnQkFFRCxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7Z0JBRTNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ3hCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDdkIsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDMUIsQ0FBQztvQkFFRCxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN6QixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLFlBQW1DO1FBQ3pELDJDQUEyQztRQUMzQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO1lBRXBDLE9BQU07UUFDUCxDQUFDO1FBRUQsV0FBVztRQUNYLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3pDLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3pDLENBQUM7UUFFRCxpQkFBaUI7YUFDWixJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzlFLElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQzNFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUVELElBQUksT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3RELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTzthQUNGLENBQUM7WUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxRQUFrQjtRQUN4QyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLEtBQUssUUFBUSxDQUFDLE9BQU87Z0JBQ3BCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQTtZQUN2QixLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQTtJQUNwQixDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBZTtRQUN6QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNqRCxDQUFDOztBQXRVVyw0QkFBNEI7SUFZdEMsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtHQWhCSCw0QkFBNEIsQ0F1VXhDIn0=