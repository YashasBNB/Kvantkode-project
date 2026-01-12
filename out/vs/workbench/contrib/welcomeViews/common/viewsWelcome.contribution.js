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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVZpZXdzL2NvbW1vbi92aWV3c1dlbGNvbWUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFFTixvQ0FBb0MsR0FDcEMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUU5RixNQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FDL0Qsb0NBQW9DLENBQ3BDLENBQUE7QUFFRCxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQztJQUN2QyxZQUFtQyxvQkFBMkM7UUFDN0Usb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzlFLENBQUM7Q0FDRCxDQUFBO0FBSkssa0NBQWtDO0lBQzFCLFdBQUEscUJBQXFCLENBQUE7R0FEN0Isa0NBQWtDLENBSXZDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsa0NBQWtDLGtDQUEwQixDQUFBIn0=