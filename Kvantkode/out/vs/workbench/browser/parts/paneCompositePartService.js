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
import { Event } from '../../../base/common/event.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { AuxiliaryBarPart } from './auxiliarybar/auxiliaryBarPart.js';
import { PanelPart } from './panel/panelPart.js';
import { SidebarPart } from './sidebar/sidebarPart.js';
import { ViewContainerLocations } from '../../common/views.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
let PaneCompositePartService = class PaneCompositePartService extends Disposable {
    constructor(instantiationService) {
        super();
        this.paneCompositeParts = new Map();
        const panelPart = instantiationService.createInstance(PanelPart);
        const sideBarPart = instantiationService.createInstance(SidebarPart);
        const auxiliaryBarPart = instantiationService.createInstance(AuxiliaryBarPart);
        this.paneCompositeParts.set(1 /* ViewContainerLocation.Panel */, panelPart);
        this.paneCompositeParts.set(0 /* ViewContainerLocation.Sidebar */, sideBarPart);
        this.paneCompositeParts.set(2 /* ViewContainerLocation.AuxiliaryBar */, auxiliaryBarPart);
        const eventDisposables = this._register(new DisposableStore());
        this.onDidPaneCompositeOpen = Event.any(...ViewContainerLocations.map((loc) => Event.map(this.paneCompositeParts.get(loc).onDidPaneCompositeOpen, (composite) => {
            return { composite, viewContainerLocation: loc };
        }, eventDisposables)));
        this.onDidPaneCompositeClose = Event.any(...ViewContainerLocations.map((loc) => Event.map(this.paneCompositeParts.get(loc).onDidPaneCompositeClose, (composite) => {
            return { composite, viewContainerLocation: loc };
        }, eventDisposables)));
    }
    openPaneComposite(id, viewContainerLocation, focus) {
        return this.getPartByLocation(viewContainerLocation).openPaneComposite(id, focus);
    }
    getActivePaneComposite(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getActivePaneComposite();
    }
    getPaneComposite(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposite(id);
    }
    getPaneComposites(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposites();
    }
    getPinnedPaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPinnedPaneCompositeIds();
    }
    getVisiblePaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getVisiblePaneCompositeIds();
    }
    getPaneCompositeIds(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneCompositeIds();
    }
    getProgressIndicator(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getProgressIndicator(id);
    }
    hideActivePaneComposite(viewContainerLocation) {
        this.getPartByLocation(viewContainerLocation).hideActivePaneComposite();
    }
    getLastActivePaneCompositeId(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getLastActivePaneCompositeId();
    }
    getPartByLocation(viewContainerLocation) {
        return assertIsDefined(this.paneCompositeParts.get(viewContainerLocation));
    }
};
PaneCompositePartService = __decorate([
    __param(0, IInstantiationService)
], PaneCompositePartService);
export { PaneCompositePartService };
registerSingleton(IPaneCompositePartService, PaneCompositePartService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZVBhcnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9wYW5lQ29tcG9zaXRlUGFydFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV0RCxPQUFPLEVBQXlCLHNCQUFzQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDckYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUd4RSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFjdkQsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBSFMsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQTZDLENBQUE7UUFLekYsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLGNB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