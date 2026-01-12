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
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Extensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { mark } from '../../../../base/common/performance.js';
export const IUserDataInitializationService = createDecorator('IUserDataInitializationService');
export class UserDataInitializationService {
    constructor(initializers = []) {
        this.initializers = initializers;
    }
    async whenInitializationFinished() {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map((initializer) => initializer.whenInitializationFinished()));
        }
    }
    async requiresInitialization() {
        return (await Promise.all(this.initializers.map((initializer) => initializer.requiresInitialization()))).some((result) => result);
    }
    async initializeRequiredResources() {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map((initializer) => initializer.initializeRequiredResources()));
        }
    }
    async initializeOtherResources(instantiationService) {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map((initializer) => initializer.initializeOtherResources(instantiationService)));
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (await this.requiresInitialization()) {
            await Promise.all(this.initializers.map((initializer) => initializer.initializeInstalledExtensions(instantiationService)));
        }
    }
}
let InitializeOtherResourcesContribution = class InitializeOtherResourcesContribution {
    constructor(userDataInitializeService, instantiationService, extensionService) {
        extensionService
            .whenInstalledExtensionsRegistered()
            .then(() => this.initializeOtherResource(userDataInitializeService, instantiationService));
    }
    async initializeOtherResource(userDataInitializeService, instantiationService) {
        if (await userDataInitializeService.requiresInitialization()) {
            mark('code/willInitOtherUserData');
            await userDataInitializeService.initializeOtherResources(instantiationService);
            mark('code/didInitOtherUserData');
        }
    }
};
InitializeOtherResourcesContribution = __decorate([
    __param(0, IUserDataInitializationService),
    __param(1, IInstantiationService),
    __param(2, IExtensionService)
], InitializeOtherResourcesContribution);
if (isWeb) {
    const workbenchRegistry = Registry.as(Extensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(InitializeOtherResourcesContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFJbml0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGEvYnJvd3Nlci91c2VyRGF0YUluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBR04sVUFBVSxHQUNWLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFVN0QsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUM1RCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQUtELE1BQU0sT0FBTyw2QkFBNkI7SUFHekMsWUFBNkIsZUFBdUMsRUFBRTtRQUF6QyxpQkFBWSxHQUFaLFlBQVksQ0FBNkI7SUFBRyxDQUFDO0lBRTFFLEtBQUssQ0FBQywwQkFBMEI7UUFDL0IsSUFBSSxNQUFNLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNoQixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FDaEYsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLHNCQUFzQjtRQUMzQixPQUFPLENBQ04sTUFBTSxPQUFP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