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
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Barrier, Promises } from '../../../../base/common/async.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
import { SettingsResourceInitializer } from './settingsResource.js';
import { GlobalStateResourceInitializer } from './globalStateResource.js';
import { KeybindingsResourceInitializer } from './keybindingsResource.js';
import { TasksResourceInitializer } from './tasksResource.js';
import { SnippetsResourceInitializer } from './snippetsResource.js';
import { ExtensionsResourceInitializer } from './extensionsResource.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { isString } from '../../../../base/common/types.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
let UserDataProfileInitializer = class UserDataProfileInitializer {
    constructor(environmentService, fileService, userDataProfileService, storageService, logService, uriIdentityService, requestService) {
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.requestService = requestService;
        this.initialized = [];
        this.initializationFinished = new Barrier();
    }
    async whenInitializationFinished() {
        await this.initializationFinished.wait();
    }
    async requiresInitialization() {
        if (!this.environmentService.options?.profile?.contents) {
            return false;
        }
        if (!this.storageService.isNew(0 /* StorageScope.PROFILE */)) {
            return false;
        }
        return true;
    }
    async initializeRequiredResources() {
        this.logService.trace(`UserDataProfileInitializer#initializeRequiredResources`);
        const promises = [];
        const profileTemplate = await this.getProfileTemplate();
        if (profileTemplate?.settings) {
            promises.push(this.initialize(new SettingsResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.settings, "settings" /* ProfileResourceType.Settings */));
        }
        if (profileTemplate?.globalState) {
            promises.push(this.initialize(new GlobalStateResourceInitializer(this.storageService), profileTemplate.globalState, "globalState" /* ProfileResourceType.GlobalState */));
        }
        await Promise.all(promises);
    }
    async initializeOtherResources(instantiationService) {
        try {
            this.logService.trace(`UserDataProfileInitializer#initializeOtherResources`);
            const promises = [];
            const profileTemplate = await this.getProfileTemplate();
            if (profileTemplate?.keybindings) {
                promises.push(this.initialize(new KeybindingsResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.keybindings, "keybindings" /* ProfileResourceType.Keybindings */));
            }
            if (profileTemplate?.tasks) {
                promises.push(this.initialize(new TasksResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.tasks, "tasks" /* ProfileResourceType.Tasks */));
            }
            if (profileTemplate?.snippets) {
                promises.push(this.initialize(new SnippetsResourceInitializer(this.userDataProfileService, this.fileService, this.uriIdentityService), profileTemplate.snippets, "snippets" /* ProfileResourceType.Snippets */));
            }
            promises.push(this.initializeInstalledExtensions(instantiationService));
            await Promises.settled(promises);
        }
        finally {
            this.initializationFinished.open();
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (!this.initializeInstalledExtensionsPromise) {
            const profileTemplate = await this.getProfileTemplate();
            if (profileTemplate?.extensions) {
                this.initializeInstalledExtensionsPromise = this.initialize(instantiationService.createInstance(ExtensionsResourceInitializer), profileTemplate.extensions, "extensions" /* ProfileResourceType.Extensions */);
            }
            else {
                this.initializeInstalledExtensionsPromise = Promise.resolve();
            }
        }
        return this.initializeInstalledExtensionsPromise;
    }
    getProfileTemplate() {
        if (!this.profileTemplatePromise) {
            this.profileTemplatePromise = this.doGetProfileTemplate();
        }
        return this.profileTemplatePromise;
    }
    async doGetProfileTemplate() {
        if (!this.environmentService.options?.profile?.contents) {
            return null;
        }
        if (isString(this.environmentService.options.profile.contents)) {
            try {
                return JSON.parse(this.environmentService.options.profile.contents);
            }
            catch (error) {
                this.logService.error(error);
                return null;
            }
        }
        try {
            const url = URI.revive(this.environmentService.options.profile.contents).toString(true);
            const context = await this.requestService.request({ type: 'GET', url }, CancellationToken.None);
            if (context.res.statusCode === 200) {
                return await asJson(context);
            }
            else {
                this.logService.warn(`UserDataProfileInitializer: Failed to get profile from URL: ${url}. Status code: ${context.res.statusCode}.`);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        return null;
    }
    async initialize(initializer, content, profileResource) {
        try {
            if (this.initialized.includes(profileResource)) {
                this.logService.info(`UserDataProfileInitializer: ${profileResource} initialized already.`);
                return;
            }
            this.initialized.push(profileResource);
            this.logService.trace(`UserDataProfileInitializer: Initializing ${profileResource}`);
            await initializer.initialize(content);
            this.logService.info(`UserDataProfileInitializer: Initialized ${profileResource}`);
        }
        catch (error) {
            this.logService.info(`UserDataProfileInitializer: Error while initializing ${profileResource}`);
            this.logService.error(error);
        }
    }
};
UserDataProfileInitializer = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, IUserDataProfileService),
    __param(3, IStorageService),
    __param(4, ILogService),
    __param(5, IUriIdentityService),
    __param(6, IRequestService)
], UserDataProfileInitializer);
export { UserDataProfileInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW5pdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVJbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTVGLE9BQU8sRUFFTix1QkFBdUIsR0FFdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVB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