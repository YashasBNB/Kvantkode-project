/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService, } from '../../platform/log/common/log.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAllowedExtensionsService, IExtensionGalleryService, } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService, } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService, } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import product from '../../platform/product/common/product.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../base/common/network.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IServerEnvironmentService, ServerEnvironmentService, } from './serverEnvironmentService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { getErrorMessage } from '../../base/common/errors.js';
import { URI } from '../../base/common/uri.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { cwd } from '../../base/common/process.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { buildHelpMessage, buildVersionMessage, } from '../../platform/environment/node/argv.js';
import { isWindows } from '../../base/common/platform.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
class CliMain extends Disposable {
    constructor(args, remoteDataFolder) {
        super();
        this.args = args;
        this.remoteDataFolder = remoteDataFolder;
        this.registerListeners();
    }
    registerListeners() {
        // Dispose on exit
        process.once('exit', () => this.dispose());
    }
    async run() {
        const instantiationService = await this.initServices();
        await instantiationService.invokeFunction(async (accessor) => {
            const configurationService = accessor.get(IConfigurationService);
            const logService = accessor.get(ILogService);
            // On Windows, configure the UNC allow list based on settings
            if (isWindows) {
                if (configurationService.getValue('security.restrictUNCAccess') === false) {
                    disableUNCAccessRestrictions();
                }
                else {
                    addUNCHostToAllowlist(configurationService.getValue('security.allowedUNCHosts'));
                }
            }
            try {
                await this.doRun(instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(logService.getLevel(), false)));
            }
            catch (error) {
                logService.error(error);
                console.error(getErrorMessage(error));
                throw error;
            }
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        const environmentService = new ServerEnvironmentService(this.args, productService);
        services.set(IServerEnvironmentService, environmentService);
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        const logService = new LogService(this._register(loggerService.createLogger('remoteCLI', { name: localize('remotecli', 'Remote CLI') })));
        services.set(ILogService, logService);
        logService.trace(`Remote configuration data at ${this.remoteDataFolder}`);
        logService.trace('process arguments:', this.args);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        fileService.registerProvider(Schemas.file, this._register(new DiskFileSystemProvider(logService)));
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService));
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, new NullPolicyService(), logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([configurationService.initialize(), userDataProfilesService.init()]);
        services.set(IRequestService, new SyncDescriptor(RequestService, ['remote']));
        services.set(IDownloadService, new SyncDescriptor(DownloadService));
        services.set(ITelemetryService, NullTelemetryService);
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService));
        return new InstantiationService(services);
    }
    async doRun(extensionManagementCLI) {
        // List Extensions
        if (this.args['list-extensions']) {
            return extensionManagementCLI.listExtensions(!!this.args['show-versions'], this.args['category']);
        }
        // Install Extension
        else if (this.args['install-extension'] || this.args['install-builtin-extension']) {
            const installOptions = {
                isMachineScoped: !!this.args['do-not-sync'],
                installPreReleaseVersion: !!this.args['pre-release'],
                donotIncludePackAndDependencies: !!this.args['do-not-include-pack-dependencies'],
            };
            return extensionManagementCLI.installExtensions(this.asExtensionIdOrVSIX(this.args['install-extension'] || []), this.asExtensionIdOrVSIX(this.args['install-builtin-extension'] || []), installOptions, !!this.args['force']);
        }
        // Uninstall Extension
        else if (this.args['uninstall-extension']) {
            return extensionManagementCLI.uninstallExtensions(this.asExtensionIdOrVSIX(this.args['uninstall-extension']), !!this.args['force']);
        }
        // Update the installed extensions
        else if (this.args['update-extensions']) {
            return extensionManagementCLI.updateExtensions();
        }
        // Locate Extension
        else if (this.args['locate-extension']) {
            return extensionManagementCLI.locateExtension(this.args['locate-extension']);
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map((input) => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
export async function run(args, REMOTE_DATA_FOLDER, optionDescriptions) {
    if (args.help) {
        const executable = product.serverApplicationName + (isWindows ? '.cmd' : '');
        console.log(buildHelpMessage(product.nameLong, executable, product.version, optionDescriptions, {
            noInputFiles: true,
            noPipe: true,
        }));
        return;
    }
    // Version Info
    if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
        return;
    }
    const cliMain = new CliMain(args, REMOTE_DATA_FOLDER);
    try {
        await cliMain.run();
        eventuallyExit(0);
    }
    catch (err) {
        eventuallyExit(1);
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50Q2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50Q2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFDTixhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxXQUFXLEdBQ1gsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRixPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHdCQUF3QixHQUV4QixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ2xJLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsdUNBQXVDLEdBQ3ZDLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUNOLHFDQUFxQyxFQUNyQyxzQ0FBc0MsR0FDdEMsTUFBTSxrRkFBa0YsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQs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