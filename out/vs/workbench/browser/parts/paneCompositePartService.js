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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZVBhcnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvcGFuZUNvbXBvc2l0ZVBhcnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRy9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEQsT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3JGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHeEUsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBY3ZELFlBQW1DLG9CQUEyQztRQUM3RSxLQUFLLEVBQUUsQ0FBQTtRQUhTLHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUE2QyxDQUFBO1FBS3pGLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENB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