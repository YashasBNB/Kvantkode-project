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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9ub3RpZmljYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFLTixnQkFBZ0IsRUFDaEIsUUFBUSxFQUlSLG1CQUFtQixFQUduQixvQkFBb0IsRUFFcEIsb0JBQW9CLEdBQ3BCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQTJCckUsTUFBTSxDQUFOLElBQWtCLHNCQXFCakI7QUFyQkQsV0FBa0Isc0JBQXNCO0lBQ3ZDOztPQUVHO0lBQ0gsaUVBQUcsQ0FBQTtJQUVIOzs7T0FHRztJQUNILHVFQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILHlGQUFlLENBQUE7SUFFZjs7T0FFRztJQUNILHVFQUFNLENBQUE7QUFDUCxDQUFDLEVBckJpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBcUJ2QztBQXlCRCxNQUFNLENBQU4sSUFBa0IsdUJBR2pC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