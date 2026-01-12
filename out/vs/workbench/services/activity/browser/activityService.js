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
import { IActivityService } from '../common/activity.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { GLOBAL_ACTIVITY_ID, ACCOUNTS_ACTIVITY_ID } from '../../../common/activity.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
let ViewContainerActivityByView = class ViewContainerActivityByView extends Disposable {
    constructor(viewId, viewDescriptorService, activityService) {
        super();
        this.viewId = viewId;
        this.viewDescriptorService = viewDescriptorService;
        this.activityService = activityService;
        this.activity = undefined;
        this.activityDisposable = Disposable.None;
        this._register(Event.filter(this.viewDescriptorService.onDidChangeContainer, (e) => e.views.some((view) => view.id === viewId))(() => this.update()));
        this._register(Event.filter(this.viewDescriptorService.onDidChangeLocation, (e) => e.views.some((view) => view.id === viewId))(() => this.update()));
    }
    setActivity(activity) {
        this.activity = activity;
        this.update();
    }
    clearActivity() {
        this.activity = undefined;
        this.update();
    }
    update() {
        this.activityDisposable.dispose();
        const container = this.viewDescriptorService.getViewContainerByViewId(this.viewId);
        if (container && this.activity) {
            this.activityDisposable = this.activityService.showViewContainerActivity(container.id, this.activity);
        }
    }
    dispose() {
        this.activityDisposable.dispose();
        super.dispose();
    }
};
ViewContainerActivityByView = __decorate([
    __param(1, IViewDescriptorService),
    __param(2, IActivityService)
], ViewContainerActivityByView);
let ActivityService = class ActivityService extends Disposable {
    constructor(viewDescriptorService, instantiationService) {
        super();
        this.viewDescriptorService = viewDescriptorService;
        this.instantiationService = instantiationService;
        this.viewActivities = new Map();
        this._onDidChangeActivity = this._register(new Emitter());
        this.onDidChangeActivity = this._onDidChangeActivity.event;
        this.viewContainerActivities = new Map();
        this.globalActivities = new Map();
    }
    showViewContainerActivity(viewContainerId, activity) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
        if (!viewContainer) {
            return Disposable.None;
        }
        let activities = this.viewContainerActivities.get(viewContainerId);
        if (!activities) {
            activities = [];
            this.viewContainerActivities.set(viewContainerId, activities);
        }
        // add activity
        activities.push(activity);
        this._onDidChangeActivity.fire(viewContainer);
        return toDisposable(() => {
            activities.splice(activities.indexOf(activity), 1);
            if (activities.length === 0) {
                this.viewContainerActivities.delete(viewContainerId);
            }
            this._onDidChangeActivity.fire(viewContainer);
        });
    }
    getViewContainerActivities(viewContainerId) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
        if (viewContainer) {
            return this.viewContainerActivities.get(viewContainerId) ?? [];
        }
        return [];
    }
    showViewActivity(viewId, activity) {
        let maybeItem = this.viewActivities.get(viewId);
        if (maybeItem) {
            maybeItem.id++;
        }
        else {
            maybeItem = {
                id: 1,
                activity: this.instantiationService.createInstance(ViewContainerActivityByView, viewId),
            };
            this.viewActivities.set(viewId, maybeItem);
        }
        const id = maybeItem.id;
        maybeItem.activity.setActivity(activity);
        const item = maybeItem;
        return toDisposable(() => {
            if (item.id === id) {
                item.activity.dispose();
                this.viewActivities.delete(viewId);
            }
        });
    }
    showAccountsActivity(activity) {
        return this.showActivity(ACCOUNTS_ACTIVITY_ID, activity);
    }
    showGlobalActivity(activity) {
        return this.showActivity(GLOBAL_ACTIVITY_ID, activity);
    }
    getActivity(id) {
        return this.globalActivities.get(id) ?? [];
    }
    showActivity(id, activity) {
        let activities = this.globalActivities.get(id);
        if (!activities) {
            activities = [];
            this.globalActivities.set(id, activities);
        }
        activities.push(activity);
        this._onDidChangeActivity.fire(id);
        return toDisposable(() => {
            activities.splice(activities.indexOf(activity), 1);
            if (activities.length === 0) {
                this.globalActivities.delete(id);
            }
            this._onDidChangeActivity.fire(id);
        });
    }
};
ActivityService = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IInstantiationService)
], ActivityService);
export { ActivityService };
registerSingleton(IActivityService, ActivityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWN0aXZpdHkvYnJvd3Nlci9hY3Rpdml0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFhLE1BQU0sdUJBQXVCLENBQUE7QUFDbkUsT0FBTyxFQUFlLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFpQixNQUFNLDBCQUEwQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBSW5ELFlBQ2tCLE1BQWMsRUFDUCxxQkFBOEQsRUFDcEUsZUFBa0Q7UUFFcEUsS0FBSyxFQUFFLENBQUE7UUFKVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ1UsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNuRCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFON0QsYUFBUSxHQUEwQixTQUFTLENBQUE7UUFDM0MsdUJBQWtCLEdBQWdCLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFReEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFB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