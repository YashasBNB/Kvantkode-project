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
var NotificationService_1;
import { localize } from '../../../../nls.js';
import { INotificationService, Severity, NoOpNotification, NeverShowAgainScope, NotificationsFilter, isNotificationSource, } from '../../../../platform/notification/common/notification.js';
import { NotificationsModel, ChoiceAction, } from '../../../common/notifications.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Action } from '../../../../base/common/actions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
let NotificationService = class NotificationService extends Disposable {
    static { NotificationService_1 = this; }
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.model = this._register(new NotificationsModel());
        this._onDidAddNotification = this._register(new Emitter());
        this.onDidAddNotification = this._onDidAddNotification.event;
        this._onDidRemoveNotification = this._register(new Emitter());
        this.onDidRemoveNotification = this._onDidRemoveNotification.event;
        this._onDidChangeFilter = this._register(new Emitter());
        this.onDidChangeFilter = this._onDidChangeFilter.event;
        this.mapSourceToFilter = (() => {
            const map = new Map();
            for (const sourceFilter of this.storageService.getObject(NotificationService_1.PER_SOURCE_FILTER_SETTINGS_KEY, -1 /* StorageScope.APPLICATION */, [])) {
                map.set(sourceFilter.id, sourceFilter);
            }
            return map;
        })();
        this.globalFilterEnabled = this.storageService.getBoolean(NotificationService_1.GLOBAL_FILTER_SETTINGS_KEY, -1 /* StorageScope.APPLICATION */, false);
        this.updateFilters();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification((e) => {
            switch (e.kind) {
                case 0 /* NotificationChangeType.ADD */:
                case 3 /* NotificationChangeType.REMOVE */: {
                    const source = typeof e.item.sourceId === 'string' && typeof e.item.source === 'string'
                        ? { id: e.item.sourceId, label: e.item.source }
                        : e.item.source;
                    const notification = {
                        message: e.item.message.original,
                        severity: e.item.severity,
                        source,
                        priority: e.item.priority,
                    };
                    if (e.kind === 0 /* NotificationChangeType.ADD */) {
                        // Make sure to track sources for notifications by registering
                        // them with our do not disturb system which is backed by storage
                        if (isNotificationSource(source)) {
                            if (!this.mapSourceToFilter.has(source.id)) {
                                this.setFilter({ ...source, filter: NotificationsFilter.OFF });
                            }
                            else {
                                this.updateSourceFilter(source);
                            }
                        }
                        this._onDidAddNotification.fire(notification);
                    }
                    if (e.kind === 3 /* NotificationChangeType.REMOVE */) {
                        this._onDidRemoveNotification.fire(notification);
                    }
                    break;
                }
            }
        }));
    }
    //#region Filters
    static { this.GLOBAL_FILTER_SETTINGS_KEY = 'notifications.doNotDisturbMode'; }
    static { this.PER_SOURCE_FILTER_SETTINGS_KEY = 'notifications.perSourceDoNotDisturbMode'; }
    setFilter(filter) {
        if (typeof filter === 'number') {
            if (this.globalFilterEnabled === (filter === NotificationsFilter.ERROR)) {
                return; // no change
            }
            // Store into model and persist
            this.globalFilterEnabled = filter === NotificationsFilter.ERROR;
            this.storageService.store(NotificationService_1.GLOBAL_FILTER_SETTINGS_KEY, this.globalFilterEnabled, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Update model
            this.updateFilters();
            // Events
            this._onDidChangeFilter.fire();
        }
        else {
            const existing = this.mapSourceToFilter.get(filter.id);
            if (existing?.filter === filter.filter && existing.label === filter.label) {
                return; // no change
            }
            // Store into model and persist
            this.mapSourceToFilter.set(filter.id, {
                id: filter.id,
                label: filter.label,
                filter: filter.filter,
            });
            this.saveSourceFilters();
            // Update model
            this.updateFilters();
        }
    }
    getFilter(source) {
        if (source) {
            return this.mapSourceToFilter.get(source.id)?.filter ?? NotificationsFilter.OFF;
        }
        return this.globalFilterEnabled ? NotificationsFilter.ERROR : NotificationsFilter.OFF;
    }
    updateSourceFilter(source) {
        const existing = this.mapSourceToFilter.get(source.id);
        if (!existing) {
            return; // nothing to do
        }
        // Store into model and persist
        if (existing.label !== source.label) {
            this.mapSourceToFilter.set(source.id, {
                id: source.id,
                label: source.label,
                filter: existing.filter,
            });
            this.saveSourceFilters();
        }
    }
    saveSourceFilters() {
        this.storageService.store(NotificationService_1.PER_SOURCE_FILTER_SETTINGS_KEY, JSON.stringify([...this.mapSourceToFilter.values()]), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getFilters() {
        return [...this.mapSourceToFilter.values()];
    }
    updateFilters() {
        this.model.setFilter({
            global: this.globalFilterEnabled ? NotificationsFilter.ERROR : NotificationsFilter.OFF,
            sources: new Map([...this.mapSourceToFilter.values()].map((source) => [source.id, source.filter])),
        });
    }
    removeFilter(sourceId) {
        if (this.mapSourceToFilter.delete(sourceId)) {
            // Persist
            this.saveSourceFilters();
            // Update model
            this.updateFilters();
        }
    }
    //#endregion
    info(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.info(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Info, message });
    }
    warn(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.warn(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Warning, message });
    }
    error(message) {
        if (Array.isArray(message)) {
            for (const messageEntry of message) {
                this.error(messageEntry);
            }
            return;
        }
        this.model.addNotification({ severity: Severity.Error, message });
    }
    notify(notification) {
        const toDispose = new DisposableStore();
        // Handle neverShowAgain option accordingly
        if (notification.neverShowAgain) {
            const scope = this.toStorageScope(notification.neverShowAgain);
            const id = notification.neverShowAgain.id;
            // If the user already picked to not show the notification
            // again, we return with a no-op notification here
            if (this.storageService.getBoolean(id, scope)) {
                return new NoOpNotification();
            }
            const neverShowAgainAction = toDispose.add(new Action('workbench.notification.neverShowAgain', localize('neverShowAgain', "Don't Show Again"), undefined, true, async () => {
                // Close notification
                handle.close();
                // Remember choice
                this.storageService.store(id, true, scope, 0 /* StorageTarget.USER */);
            }));
            // Insert as primary or secondary action
            const actions = {
                primary: notification.actions?.primary || [],
                secondary: notification.actions?.secondary || [],
            };
            if (!notification.neverShowAgain.isSecondary) {
                actions.primary = [neverShowAgainAction, ...actions.primary]; // action comes first
            }
            else {
                actions.secondary = [...actions.secondary, neverShowAgainAction]; // actions comes last
            }
            notification.actions = actions;
        }
        // Show notification
        const handle = this.model.addNotification(notification);
        // Cleanup when notification gets disposed
        Event.once(handle.onDidClose)(() => toDispose.dispose());
        return handle;
    }
    toStorageScope(options) {
        switch (options.scope) {
            case NeverShowAgainScope.APPLICATION:
                return -1 /* StorageScope.APPLICATION */;
            case NeverShowAgainScope.PROFILE:
                return 0 /* StorageScope.PROFILE */;
            case NeverShowAgainScope.WORKSPACE:
                return 1 /* StorageScope.WORKSPACE */;
            default:
                return -1 /* StorageScope.APPLICATION */;
        }
    }
    prompt(severity, message, choices, options) {
        // Handle neverShowAgain option accordingly
        if (options?.neverShowAgain) {
            const scope = this.toStorageScope(options.neverShowAgain);
            const id = options.neverShowAgain.id;
            // If the user already picked to not show the notification
            // again, we return with a no-op notification here
            if (this.storageService.getBoolean(id, scope)) {
                return new NoOpNotification();
            }
            const neverShowAgainChoice = {
                label: localize('neverShowAgain', "Don't Show Again"),
                run: () => this.storageService.store(id, true, scope, 0 /* StorageTarget.USER */),
                isSecondary: options.neverShowAgain.isSecondary,
            };
            // Insert as primary or secondary action
            if (!options.neverShowAgain.isSecondary) {
                choices = [neverShowAgainChoice, ...choices]; // action comes first
            }
            else {
                choices = [...choices, neverShowAgainChoice]; // actions comes last
            }
        }
        let choiceClicked = false;
        const toDispose = new DisposableStore();
        // Convert choices into primary/secondary actions
        const primaryActions = [];
        const secondaryActions = [];
        choices.forEach((choice, index) => {
            const action = new ChoiceAction(`workbench.dialog.choice.${index}`, choice);
            if (!choice.isSecondary) {
                primaryActions.push(action);
            }
            else {
                secondaryActions.push(action);
            }
            // React to action being clicked
            toDispose.add(action.onDidRun(() => {
                choiceClicked = true;
                // Close notification unless we are told to keep open
                if (!choice.keepOpen) {
                    handle.close();
                }
            }));
            toDispose.add(action);
        });
        // Show notification with actions
        const actions = { primary: primaryActions, secondary: secondaryActions };
        const handle = this.notify({
            severity,
            message,
            actions,
            sticky: options?.sticky,
            priority: options?.priority,
        });
        Event.once(handle.onDidClose)(() => {
            // Cleanup when notification gets disposed
            toDispose.dispose();
            // Indicate cancellation to the outside if no action was executed
            if (options && typeof options.onCancel === 'function' && !choiceClicked) {
                options.onCancel();
            }
        });
        return handle;
    }
    status(message, options) {
        return this.model.showStatusMessage(message, options);
    }
};
NotificationService = NotificationService_1 = __decorate([
    __param(0, IStorageService)
], NotificationService);
export { NotificationService };
registerSingleton(INotificationService, NotificationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL25vdGlmaWNhdGlvbi9jb21tb24vbm90aWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixvQkFBb0IsRUFHcEIsUUFBUSxFQU1SLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBSW5CLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsWUFBWSxHQUVaLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQVcsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBRWhELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7SUFXbEQsWUFBNkIsY0FBZ0Q7UUFDNUUsS0FBSyxFQUFFLENBQUE7UUFEc0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUnBFLFVBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1FBRXhDLDBCQUFxQixHQUFHLElBQUks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