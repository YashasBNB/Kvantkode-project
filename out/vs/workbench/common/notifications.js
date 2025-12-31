/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NoOpNotification, Severity, NotificationsFilter, NotificationPriority, isNotificationSource, } from '../../platform/notification/common/notification.js';
import { toErrorMessage, isErrorWithActions } from '../../base/common/errorMessage.js';
import { Event, Emitter } from '../../base/common/event.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { isCancellationError } from '../../base/common/errors.js';
import { Action } from '../../base/common/actions.js';
import { equals } from '../../base/common/arrays.js';
import { parseLinkedText } from '../../base/common/linkedText.js';
import { mapsStrictEqualIgnoreOrder } from '../../base/common/map.js';
export var NotificationChangeType;
(function (NotificationChangeType) {
    /**
     * A notification was added.
     */
    NotificationChangeType[NotificationChangeType["ADD"] = 0] = "ADD";
    /**
     * A notification changed. Check `detail` property
     * on the event for additional information.
     */
    NotificationChangeType[NotificationChangeType["CHANGE"] = 1] = "CHANGE";
    /**
     * A notification expanded or collapsed.
     */
    NotificationChangeType[NotificationChangeType["EXPAND_COLLAPSE"] = 2] = "EXPAND_COLLAPSE";
    /**
     * A notification was removed.
     */
    NotificationChangeType[NotificationChangeType["REMOVE"] = 3] = "REMOVE";
})(NotificationChangeType || (NotificationChangeType = {}));
export var StatusMessageChangeType;
(function (StatusMessageChangeType) {
    StatusMessageChangeType[StatusMessageChangeType["ADD"] = 0] = "ADD";
    StatusMessageChangeType[StatusMessageChangeType["REMOVE"] = 1] = "REMOVE";
})(StatusMessageChangeType || (StatusMessageChangeType = {}));
export class NotificationHandle extends Disposable {
    constructor(item, onClose) {
        super();
        this.item = item;
        this.onClose = onClose;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.registerListeners();
    }
    registerListeners() {
        // Visibility
        this._register(this.item.onDidChangeVisibility((visible) => this._onDidChangeVisibility.fire(visible)));
        // Closing
        Event.once(this.item.onDidClose)(() => {
            this._onDidClose.fire();
            this.dispose();
        });
    }
    get progress() {
        return this.item.progress;
    }
    updateSeverity(severity) {
        this.item.updateSeverity(severity);
    }
    updateMessage(message) {
        this.item.updateMessage(message);
    }
    updateActions(actions) {
        this.item.updateActions(actions);
    }
    close() {
        this.onClose(this.item);
        this.dispose();
    }
}
export class NotificationsModel extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeNotification = this._register(new Emitter());
        this.onDidChangeNotification = this._onDidChangeNotification.event;
        this._onDidChangeStatusMessage = this._register(new Emitter());
        this.onDidChangeStatusMessage = this._onDidChangeStatusMessage.event;
        this._onDidChangeFilter = this._register(new Emitter());
        this.onDidChangeFilter = this._onDidChangeFilter.event;
        this._notifications = [];
        this.filter = {
            global: NotificationsFilter.OFF,
            sources: new Map(),
        };
    }
    static { this.NO_OP_NOTIFICATION = new NoOpNotification(); }
    get notifications() {
        return this._notifications;
    }
    get statusMessage() {
        return this._statusMessage;
    }
    setFilter(filter) {
        let globalChanged = false;
        if (typeof filter.global === 'number') {
            globalChanged = this.filter.global !== filter.global;
            this.filter.global = filter.global;
        }
        let sourcesChanged = false;
        if (filter.sources) {
            sourcesChanged = !mapsStrictEqualIgnoreOrder(this.filter.sources, filter.sources);
            this.filter.sources = filter.sources;
        }
        if (globalChanged || sourcesChanged) {
            this._onDidChangeFilter.fire({
                global: globalChanged ? filter.global : undefined,
                sources: sourcesChanged ? filter.sources : undefined,
            });
        }
    }
    addNotification(notification) {
        const item = this.createViewItem(notification);
        if (!item) {
            return NotificationsModel.NO_OP_NOTIFICATION; // return early if this is a no-op
        }
        // Deduplicate
        const duplicate = this.findNotification(item);
        duplicate?.close();
        // Add to list as first entry
        this._notifications.splice(0, 0, item);
        // Events
        this._onDidChangeNotification.fire({ item, index: 0, kind: 0 /* NotificationChangeType.ADD */ });
        // Wrap into handle
        return new NotificationHandle(item, (item) => this.onClose(item));
    }
    onClose(item) {
        const liveItem = this.findNotification(item);
        if (liveItem && liveItem !== item) {
            liveItem.close(); // item could have been replaced with another one, make sure to close the live item
        }
        else {
            item.close(); // otherwise just close the item that was passed in
        }
    }
    findNotification(item) {
        return this._notifications.find((notification) => notification.equals(item));
    }
    createViewItem(notification) {
        const item = NotificationViewItem.create(notification, this.filter);
        if (!item) {
            return undefined;
        }
        // Item Events
        const fireNotificationChangeEvent = (kind, detail) => {
            const index = this._notifications.indexOf(item);
            if (index >= 0) {
                this._onDidChangeNotification.fire({ item, index, kind, detail });
            }
        };
        const itemExpansionChangeListener = item.onDidChangeExpansion(() => fireNotificationChangeEvent(2 /* NotificationChangeType.EXPAND_COLLAPSE */));
        const itemContentChangeListener = item.onDidChangeContent((e) => fireNotificationChangeEvent(1 /* NotificationChangeType.CHANGE */, e.kind));
        Event.once(item.onDidClose)(() => {
            itemExpansionChangeListener.dispose();
            itemContentChangeListener.dispose();
            const index = this._notifications.indexOf(item);
            if (index >= 0) {
                this._notifications.splice(index, 1);
                this._onDidChangeNotification.fire({ item, index, kind: 3 /* NotificationChangeType.REMOVE */ });
            }
        });
        return item;
    }
    showStatusMessage(message, options) {
        const item = StatusMessageViewItem.create(message, options);
        if (!item) {
            return Disposable.None;
        }
        // Remember as current status message and fire events
        this._statusMessage = item;
        this._onDidChangeStatusMessage.fire({ kind: 0 /* StatusMessageChangeType.ADD */, item });
        return toDisposable(() => {
            // Only reset status message if the item is still the one we had remembered
            if (this._statusMessage === item) {
                this._statusMessage = undefined;
                this._onDidChangeStatusMessage.fire({ kind: 1 /* StatusMessageChangeType.REMOVE */, item });
            }
        });
    }
}
export function isNotificationViewItem(obj) {
    return obj instanceof NotificationViewItem;
}
export var NotificationViewItemContentChangeKind;
(function (NotificationViewItemContentChangeKind) {
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["SEVERITY"] = 0] = "SEVERITY";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["MESSAGE"] = 1] = "MESSAGE";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["ACTIONS"] = 2] = "ACTIONS";
    NotificationViewItemContentChangeKind[NotificationViewItemContentChangeKind["PROGRESS"] = 3] = "PROGRESS";
})(NotificationViewItemContentChangeKind || (NotificationViewItemContentChangeKind = {}));
export class NotificationViewItemProgress extends Disposable {
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._state = Object.create(null);
    }
    get state() {
        return this._state;
    }
    infinite() {
        if (this._state.infinite) {
            return;
        }
        this._state.infinite = true;
        this._state.total = undefined;
        this._state.worked = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
    done() {
        if (this._state.done) {
            return;
        }
        this._state.done = true;
        this._state.infinite = undefined;
        this._state.total = undefined;
        this._state.worked = undefined;
        this._onDidChange.fire();
    }
    total(value) {
        if (this._state.total === value) {
            return;
        }
        this._state.total = value;
        this._state.infinite = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
    worked(value) {
        if (typeof this._state.worked === 'number') {
            this._state.worked += value;
        }
        else {
            this._state.worked = value;
        }
        this._state.infinite = undefined;
        this._state.done = undefined;
        this._onDidChange.fire();
    }
}
export class NotificationViewItem extends Disposable {
    static { this.MAX_MESSAGE_LENGTH = 1000; }
    static create(notification, filter) {
        if (!notification || !notification.message || isCancellationError(notification.message)) {
            return undefined; // we need a message to show
        }
        let severity;
        if (typeof notification.severity === 'number') {
            severity = notification.severity;
        }
        else {
            severity = Severity.Info;
        }
        const message = NotificationViewItem.parseNotificationMessage(notification.message);
        if (!message) {
            return undefined; // we need a message to show
        }
        let actions;
        if (notification.actions) {
            actions = notification.actions;
        }
        else if (isErrorWithActions(notification.message)) {
            actions = { primary: notification.message.actions };
        }
        let priority = notification.priority ?? NotificationPriority.DEFAULT;
        if (priority === NotificationPriority.DEFAULT && severity !== Severity.Error) {
            if (filter.global === NotificationsFilter.ERROR) {
                priority = NotificationPriority.SILENT; // filtered globally
            }
            else if (isNotificationSource(notification.source) &&
                filter.sources.get(notification.source.id) === NotificationsFilter.ERROR) {
                priority = NotificationPriority.SILENT; // filtered by source
            }
        }
        return new NotificationViewItem(notification.id, severity, notification.sticky, priority, message, notification.source, notification.progress, actions);
    }
    static parseNotificationMessage(input) {
        let message;
        if (input instanceof Error) {
            message = toErrorMessage(input, false);
        }
        else if (typeof input === 'string') {
            message = input;
        }
        if (!message) {
            return undefined; // we need a message to show
        }
        const raw = message;
        // Make sure message is in the limits
        if (message.length > NotificationViewItem.MAX_MESSAGE_LENGTH) {
            message = `${message.substr(0, NotificationViewItem.MAX_MESSAGE_LENGTH)}...`;
        }
        // Remove newlines from messages as we do not support that and it makes link parsing hard
        message = message.replace(/(\r\n|\n|\r)/gm, ' ').trim();
        // Parse Links
        const linkedText = parseLinkedText(message);
        return { raw, linkedText, original: input };
    }
    constructor(id, _severity, _sticky, _priority, _message, _source, progress, actions) {
        super();
        this.id = id;
        this._severity = _severity;
        this._sticky = _sticky;
        this._priority = _priority;
        this._message = _message;
        this._source = _source;
        this._visible = false;
        this._onDidChangeExpansion = this._register(new Emitter());
        this.onDidChangeExpansion = this._onDidChangeExpansion.event;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        if (progress) {
            this.setProgress(progress);
        }
        this.setActions(actions);
    }
    setProgress(progress) {
        if (progress.infinite) {
            this.progress.infinite();
        }
        else if (progress.total) {
            this.progress.total(progress.total);
            if (progress.worked) {
                this.progress.worked(progress.worked);
            }
        }
    }
    setActions(actions = { primary: [], secondary: [] }) {
        this._actions = {
            primary: Array.isArray(actions.primary) ? actions.primary : [],
            secondary: Array.isArray(actions.secondary) ? actions.secondary : [],
        };
        this._expanded = actions.primary && actions.primary.length > 0;
    }
    get canCollapse() {
        return !this.hasActions;
    }
    get expanded() {
        return !!this._expanded;
    }
    get severity() {
        return this._severity;
    }
    get sticky() {
        if (this._sticky) {
            return true; // explicitly sticky
        }
        const hasActions = this.hasActions;
        if ((hasActions && this._severity === Severity.Error) || // notification errors with actions are sticky
            (!hasActions && this._expanded) || // notifications that got expanded are sticky
            (this._progress && !this._progress.state.done) // notifications with running progress are sticky
        ) {
            return true;
        }
        return false; // not sticky
    }
    get priority() {
        return this._priority;
    }
    get hasActions() {
        if (!this._actions) {
            return false;
        }
        if (!this._actions.primary) {
            return false;
        }
        return this._actions.primary.length > 0;
    }
    get hasProgress() {
        return !!this._progress;
    }
    get progress() {
        if (!this._progress) {
            this._progress = this._register(new NotificationViewItemProgress());
            this._register(this._progress.onDidChange(() => this._onDidChangeContent.fire({ kind: 3 /* NotificationViewItemContentChangeKind.PROGRESS */ })));
        }
        return this._progress;
    }
    get message() {
        return this._message;
    }
    get source() {
        return typeof this._source === 'string'
            ? this._source
            : this._source
                ? this._source.label
                : undefined;
    }
    get sourceId() {
        return this._source && typeof this._source !== 'string' && 'id' in this._source
            ? this._source.id
            : undefined;
    }
    get actions() {
        return this._actions;
    }
    get visible() {
        return this._visible;
    }
    updateSeverity(severity) {
        if (severity === this._severity) {
            return;
        }
        this._severity = severity;
        this._onDidChangeContent.fire({ kind: 0 /* NotificationViewItemContentChangeKind.SEVERITY */ });
    }
    updateMessage(input) {
        const message = NotificationViewItem.parseNotificationMessage(input);
        if (!message || message.raw === this._message.raw) {
            return;
        }
        this._message = message;
        this._onDidChangeContent.fire({ kind: 1 /* NotificationViewItemContentChangeKind.MESSAGE */ });
    }
    updateActions(actions) {
        this.setActions(actions);
        this._onDidChangeContent.fire({ kind: 2 /* NotificationViewItemContentChangeKind.ACTIONS */ });
    }
    updateVisibility(visible) {
        if (this._visible !== visible) {
            this._visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
    }
    expand() {
        if (this._expanded || !this.canCollapse) {
            return;
        }
        this._expanded = true;
        this._onDidChangeExpansion.fire();
    }
    collapse(skipEvents) {
        if (!this._expanded || !this.canCollapse) {
            return;
        }
        this._expanded = false;
        if (!skipEvents) {
            this._onDidChangeExpansion.fire();
        }
    }
    toggle() {
        if (this._expanded) {
            this.collapse();
        }
        else {
            this.expand();
        }
    }
    close() {
        this._onDidClose.fire();
        this.dispose();
    }
    equals(other) {
        if (this.hasProgress || other.hasProgress) {
            return false;
        }
        if (typeof this.id === 'string' || typeof other.id === 'string') {
            return this.id === other.id;
        }
        if (typeof this._source === 'object') {
            if (this._source.label !== other.source || this._source.id !== other.sourceId) {
                return false;
            }
        }
        else if (this._source !== other.source) {
            return false;
        }
        if (this._message.raw !== other.message.raw) {
            return false;
        }
        const primaryActions = (this._actions && this._actions.primary) || [];
        const otherPrimaryActions = (other.actions && other.actions.primary) || [];
        return equals(primaryActions, otherPrimaryActions, (action, otherAction) => action.id + action.label === otherAction.id + otherAction.label);
    }
}
export class ChoiceAction extends Action {
    constructor(id, choice) {
        super(id, choice.label, undefined, true, async () => {
            // Pass to runner
            choice.run();
            // Emit Event
            this._onDidRun.fire();
        });
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
        this._keepOpen = !!choice.keepOpen;
        this._menu =
            !choice.isSecondary && choice.menu
                ? choice.menu.map((c, index) => new ChoiceAction(`${id}.${index}`, c))
                : undefined;
    }
    get menu() {
        return this._menu;
    }
    get keepOpen() {
        return this._keepOpen;
    }
}
class StatusMessageViewItem {
    static create(notification, options) {
        if (!notification || isCancellationError(notification)) {
            return undefined; // we need a message to show
        }
        let message;
        if (notification instanceof Error) {
            message = toErrorMessage(notification, false);
        }
        else if (typeof notification === 'string') {
            message = notification;
        }
        if (!message) {
            return undefined; // we need a message to show
        }
        return { message, options };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vbm90aWZpY2F0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBS04sZ0JBQWdCLEVBQ2hCLFFBQVEsRUFJUixtQkFBbUIsRUFHbkIsb0JBQW9CLEVBRXBCLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFjLE1BQU0saUNBQWlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUEyQnJFLE1BQU0sQ0FBTixJQUFrQixzQkFxQmpCO0FBckJELFdBQWtCLHNCQUFzQjtJQUN2Qzs7T0FFRztJQUNILGlFQUFHLENBQUE7SUFFSDs7O09BR0c7SUFDSCx1RUFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCx5RkFBZSxDQUFBO0lBRWY7O09BRUc7SUFDSCx1RUFBTSxDQUFBO0FBQ1AsQ0FBQyxFQXJCaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQXFCdkM7QUF5QkQsTUFBTSxDQUFOLElBQWtCLHVCQUdqQjtBQUhE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