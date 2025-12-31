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
import { dirname, join } from 'path';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { INativeServerExtensionManagementService } from '../../../../platform/extensionManagement/node/extensionManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IFileService, toFileOperationResult, } from '../../../../platform/files/common/files.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
const defaultExtensionsInitStatusKey = 'initializing-default-extensions';
let DefaultExtensionsInitializer = class DefaultExtensionsInitializer extends Disposable {
    constructor(environmentService, extensionManagementService, storageService, fileService, logService) {
        super();
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.fileService = fileService;
        this.logService = logService;
        if (isWindows &&
            storageService.getBoolean(defaultExtensionsInitStatusKey, -1 /* StorageScope.APPLICATION */, true)) {
            storageService.store(defaultExtensionsInitStatusKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.initializeDefaultExtensions().then(() => storageService.store(defaultExtensionsInitStatusKey, false, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */));
        }
    }
    async initializeDefaultExtensions() {
        const extensionsLocation = this.getDefaultExtensionVSIXsLocation();
        let stat;
        try {
            stat = await this.fileService.resolve(extensionsLocation);
            if (!stat.children) {
                this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
                return;
            }
        }
        catch (error) {
            if (toFileOperationResult(error) === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
                return;
            }
            this.logService.error('Error initializing extensions', error);
            return;
        }
        const vsixs = stat.children.filter((child) => child.name.toLowerCase().endsWith('.vsix'));
        if (vsixs.length === 0) {
            this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
            return;
        }
        this.logService.info('Initializing default extensions', extensionsLocation.toString());
        await Promise.all(vsixs.map(async (vsix) => {
            this.logService.info('Installing default extension', vsix.resource.toString());
            try {
                await this.extensionManagementService.install(vsix.resource, {
                    donotIncludePackAndDependencies: true,
                    keepExisting: false,
                });
                this.logService.info('Default extension installed', vsix.resource.toString());
            }
            catch (error) {
                this.logService.error('Error installing default extension', vsix.resource.toString(), getErrorMessage(error));
            }
        }));
        this.logService.info('Default extensions initialized', extensionsLocation.toString());
    }
    getDefaultExtensionVSIXsLocation() {
        // appRoot = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app
        // extensionsPath = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\bootstrap\extensions
        return URI.file(join(dirname(dirname(this.environmentService.appRoot)), 'bootstrap', 'extensions'));
    }
};
DefaultExtensionsInitializer = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, INativeServerExtensionManagementService),
    __param(2, IStorageService),
    __param(3, IFileService),
    __param(4, ILogService)
], DefaultExtensionsInitializer);
export { DefaultExtensionsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUNySSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixZQUFZLEVBRVoscUJBQXFCLEdBQ3JCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE1BQU0sOEJBQThCLEdBQUcsaUNBQWlDLENBQUE7QUFFakUsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBQzNELFlBQzZDLGtCQUE2QyxFQUV4RSwwQkFBbUUsRUFDbkUsY0FBK0IsRUFDakIsV0FBeUIsRUFDMUIsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFQcUMsdUJBQWtCLEdBQWxCLGtC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