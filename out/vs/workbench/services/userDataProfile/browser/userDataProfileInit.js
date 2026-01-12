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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW5pdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZUluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsT0FBTyxFQUVOLHVCQUF1QixHQUV2QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ25FLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ25FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1B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