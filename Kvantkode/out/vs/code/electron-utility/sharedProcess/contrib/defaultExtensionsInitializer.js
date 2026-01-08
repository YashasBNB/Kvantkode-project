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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3MvY29udHJpYi9kZWZhdWx0RXh0ZW5zaW9uc0luaXRpYWxpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3JJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLFlBQVksRUFFWixxQkFBcUIsR0FDckIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFbkUsTUFBTSw4QkFBOEIsR0FBRyxpQ0FBaUMsQ0FBQTtBQUVqRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFDM0QsWUFDNkMsa0JBQTZDLEVBRXhFLDBCQUFtRSxFQUNuRSxjQUErQixFQUNqQixXQUF5QixFQUMxQixVQUF1QjtRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQVBxQyx1QkFBa0IsR0FB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