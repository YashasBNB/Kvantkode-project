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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { ViewsWelcomeContribution } from './viewsWelcomeContribution.js';
import { viewsWelcomeExtensionPointDescriptor, } from './viewsWelcomeExtensionPoint.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint(viewsWelcomeExtensionPointDescriptor);
let WorkbenchConfigurationContribution = class WorkbenchConfigurationContribution {
    constructor(instantiationService) {
        instantiationService.createInstance(ViewsWelcomeContribution, extensionPoint);
    }
};
WorkbenchConfigurationContribution = __decorate([
    __param(0, IInstantiationService)
], WorkbenchConfigurationContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkbenchConfigurationContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVWaWV3cy9jb21tb24vdmlld3NXZWxjb21lLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sb0NBQW9DLEdBQ3BDLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFOUYsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQy9ELG9DQUFvQyxDQUNwQyxDQUFBO0FBRUQsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBa0M7SUFDdkMsWUFBbUMsb0JBQTJDO1FBQzdFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0NBQ0QsQ0FBQTtBQUpLLGtDQUFrQztJQUMxQixXQUFBLHFCQUFxQixDQUFBO0dBRDdCLGtDQUFrQyxDQUl2QztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLGtDQUFrQyxrQ0FBMEIsQ0FBQSJ9