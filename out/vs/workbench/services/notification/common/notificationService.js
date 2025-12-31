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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9ub3RpZmljYXRpb24vY29tbW9uL25vdGlmaWNhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sb0JBQW9CLEVBR3BCLFFBQVEsRUFNUixnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUluQixvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFlBQVksR0FFWixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFXLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7O0lBV2xELFlBQTZCLGNBQWdEO1FBQzVFLEtBQUssRUFBRSxDQUFBO1FBRHNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQVJwRSxVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUV4QywwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFpQixDQUFDLENBQUE7UUFDNUUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQUUvQyw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFpQixDQUFDLENBQUE7UUFDL0UsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQTtRQWdFckQsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDaEUsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUl6QyxzQkFBaUIsR0FDakMsQ0FBQyxHQUFHLEVBQUU7WUFDTCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQTtZQUV4RCxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUN2RCxxQkFBbUIsQ0FBQyw4QkFBOEIscUNBRWxELEVBQUUsQ0FDRixFQUFFLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7WUFFRCxPQUFPLEdBQUcsQ0FBQTtRQUNYLENBQUMsQ0FBQyxFQUFFLENBQUE7UUE3RUosSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUN4RCxxQkFBbUIsQ0FBQywwQkFBMEIscUNBRTlDLEtBQUssQ0FDTCxDQUFBO1FBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLHdDQUFnQztnQkFDaEMsMENBQWtDLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxNQUFNLE1BQU0sR0FDWCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVE7d0JBQ3ZFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtvQkFFakIsTUFBTSxZQUFZLEdBQWtCO3dCQUNuQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUTt3QkFDaEMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUTt3QkFDekIsTUFBTTt3QkFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRO3FCQUN6QixDQUFBO29CQUVELElBQUksQ0FBQyxDQUFDLElBQUksdUNBQStCLEVBQUUsQ0FBQzt3QkFDM0MsOERBQThEO3dCQUM5RCxpRUFBaUU7d0JBRWpFLElBQUksb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0NBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLE1BQU0sRUFBRSxNQUFNLEVBQUUsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTs0QkFDL0QsQ0FBQztpQ0FBTSxDQUFDO2dDQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTs0QkFDaEMsQ0FBQzt3QkFDRixDQUFDO3dCQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7b0JBQzlDLENBQUM7b0JBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSwwQ0FBa0MsRUFBRSxDQUFDO3dCQUM5QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUNqRCxDQUFDO29CQUVELE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELGlCQUFpQjthQUVPLCtCQUEwQixHQUFHLGdDQUFnQyxBQUFuQyxDQUFtQzthQUM3RCxtQ0FBOEIsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNEM7SUFzQmxHLFNBQVMsQ0FBQyxNQUF1RDtRQUNoRSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLG1CQUFtQixLQUFLLENBQUMsTUFBTSxLQUFLLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLE9BQU0sQ0FBQyxZQUFZO1lBQ3BCLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE1BQU0sS0FBSyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7WUFDL0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHFCQUFtQixDQUFDLDBCQUEwQixFQUM5QyxJQUFJLENBQUMsbUJBQW1CLG1FQUd4QixDQUFBO1lBRUQsZUFBZTtZQUNmLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUVwQixTQUFTO1lBQ1QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdEQsSUFBSSxRQUFRLEVBQUUsTUFBTSxLQUFLLE1BQU0sQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzNFLE9BQU0sQ0FBQyxZQUFZO1lBQ3BCLENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFO2dCQUNyQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO2dCQUNuQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07YUFDckIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFFeEIsZUFBZTtZQUNmLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUE0QjtRQUNyQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFBO1FBQ2hGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUE7SUFDdEYsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQTJCO1FBQ3JELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU0sQ0FBQyxnQkFBZ0I7UUFDeEIsQ0FBQztRQUVELCtCQUErQjtRQUMvQixJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRTtnQkFDckMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUNiLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztnQkFDbkIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ3ZCLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixxQkFBbUIsQ0FBQyw4QkFBOEIsRUFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsbUVBR3BELENBQUE7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFTyxhQUFhO1FBQ3BCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsR0FBRztZQUN0RixPQUFPLEVBQUUsSUFBSSxHQUFHLENBQ2YsQ0FBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUNoRjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxZQUFZLENBQUMsUUFBZ0I7UUFDNUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDN0MsVUFBVTtZQUNWLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1lBRXhCLGVBQWU7WUFDZixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosSUFBSSxDQUFDLE9BQW9EO1FBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLEtBQUssTUFBTSxZQUFZLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDeEIsQ0FBQztZQUVELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBb0Q7UUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsS0FBSyxNQUFNLFlBQVksSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN4QixDQUFDO1lBRUQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFvRDtRQUN6RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1QixLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3pCLENBQUM7WUFFRCxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQsTUFBTSxDQUFDLFlBQTJCO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFdkMsMkNBQTJDO1FBRTNDLElBQUksWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzlELE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFBO1lBRXpDLDBEQUEwRDtZQUMxRCxrREFBa0Q7WUFDbEQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxJQUFJLGdCQUFnQixFQUFFLENBQUE7WUFDOUIsQ0FBQztZQUVELE1BQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FDekMsSUFBSSxNQUFNLENBQ1QsdUNBQXVDLEVBQ3ZDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQyxFQUM5QyxTQUFTLEVBQ1QsSUFBSSxFQUNKLEtBQUssSUFBSSxFQUFFO2dCQUNWLHFCQUFxQjtnQkFDckIsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUVkLGtCQUFrQjtnQkFDbEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLDZCQUFxQixDQUFBO1lBQy9ELENBQUMsQ0FDRCxDQUNELENBQUE7WUFFRCx3Q0FBd0M7WUFDeEMsTUFBTSxPQUFPLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUU7Z0JBQzVDLFNBQVMsRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFLFNBQVMsSUFBSSxFQUFFO2FBQ2hELENBQUE7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBLENBQUMscUJBQXFCO1lBQ25GLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUEsQ0FBQyxxQkFBcUI7WUFDdkYsQ0FBQztZQUVELFlBQVksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQy9CLENBQUM7UUFFRCxvQkFBb0I7UUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFdkQsMENBQTBDO1FBQzFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRXhELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLGNBQWMsQ0FBQyxPQUErQjtRQUNyRCxRQUFRLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixLQUFLLG1CQUFtQixDQUFDLFdBQVc7Z0JBQ25DLHlDQUErQjtZQUNoQyxLQUFLLG1CQUFtQixDQUFDLE9BQU87Z0JBQy9CLG9DQUEyQjtZQUM1QixLQUFLLG1CQUFtQixDQUFDLFNBQVM7Z0JBQ2pDLHNDQUE2QjtZQUM5QjtnQkFDQyx5Q0FBK0I7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQ0wsUUFBa0IsRUFDbEIsT0FBZSxFQUNmLE9BQXdCLEVBQ3hCLE9BQXdCO1FBRXhCLDJDQUEyQztRQUMzQyxJQUFJLE9BQU8sRUFBRSxjQUFjLEVBQUUsQ0FBQztZQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUN6RCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQTtZQUVwQywwREFBMEQ7WUFDMUQsa0RBQWtEO1lBQ2xELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLE9BQU8sSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO1lBQzlCLENBQUM7WUFFRCxNQUFNLG9CQUFvQixHQUFHO2dCQUM1QixLQUFLLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDO2dCQUNyRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLDZCQUFxQjtnQkFDekUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVzthQUMvQyxDQUFBO1lBRUQsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QyxPQUFPLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUMscUJBQXFCO1lBQ25FLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFBLENBQUMscUJBQXFCO1lBQ25FLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFdkMsaURBQWlEO1FBQ2pELE1BQU0sY0FBYyxHQUFjLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLGdCQUFnQixHQUFjLEVBQUUsQ0FBQTtRQUN0QyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLDJCQUEyQixLQUFLLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMzRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QixjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUIsQ0FBQztZQUVELGdDQUFnQztZQUNoQyxTQUFTLENBQUMsR0FBRyxDQUNaLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUNwQixhQUFhLEdBQUcsSUFBSSxDQUFBO2dCQUVwQixxREFBcUQ7Z0JBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3RCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDZixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQUE7UUFFRixpQ0FBaUM7UUFDakMsTUFBTSxPQUFPLEdBQXlCLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQTtRQUM5RixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzFCLFFBQVE7WUFDUixPQUFPO1lBQ1AsT0FBTztZQUNQLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTTtZQUN2QixRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVE7U0FDM0IsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFO1lBQ2xDLDBDQUEwQztZQUMxQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFFbkIsaUVBQWlFO1lBQ2pFLElBQUksT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxVQUFVLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUE0QixFQUFFLE9BQStCO1FBQ25FLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdEQsQ0FBQzs7QUEzWFcsbUJBQW1CO0lBV2xCLFdBQUEsZUFBZSxDQUFBO0dBWGhCLG1CQUFtQixDQTRYL0I7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFBIn0=