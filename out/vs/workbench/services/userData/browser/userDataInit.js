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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFJbml0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhL2Jyb3dzZXIvdXNlckRhdGFJbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUdOLFVBQVUsR0FDVixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBVTdELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGVBQWUsQ0FDNUQsZ0NBQWdDLENBQ2hDLENBQUE7QUFLRCxNQUFNLE9BQU8sNkJBQTZCO0lBR3pDLFlBQTZCLGVBQXVDLEVBQUU7UUFBekMsaUJBQVksR0FBWixZQUFZLENBQTZCO0lBQUcsQ0FBQztJQUUxRSxLQUFLLENBQUMsMEJBQTBCO1FBQy9CLElBQUksTUFBTSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQ2hGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0I7UUFDM0IsT0FBTyxDQUNOLE1BQU0sT0FBTyxDQUFD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