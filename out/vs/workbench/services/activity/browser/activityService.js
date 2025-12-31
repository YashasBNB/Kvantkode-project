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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjdGl2aXR5L2Jyb3dzZXIvYWN0aXZpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBYSxNQUFNLHVCQUF1QixDQUFBO0FBQ25FLE9BQU8sRUFBZSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBaUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUluRCxZQUNrQixNQUFjLEVBQ1AscUJBQThELEVBQ3BFLGVBQWtEO1FBRXBFLEtBQUssRUFBRSxDQUFBO1FBSlUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDbkQsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBTjdELGFBQVEsR0FBMEIsU0FBUyxDQUFBO1FBQzNDLHVCQUFrQixHQUFnQixVQUFVLENBQUMsSUFBSSxDQUFBO1FBUXhELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLEVB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