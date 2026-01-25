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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50Q2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVFeHRlbnNpb25Ib3N0QWdlbnRDbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUNOLGFBQWEsRUFDYixXQUFXLEVBQ1gsY0FBYyxFQUNkLFdBQVcsR0FDWCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsd0JBQXdCLEdBRXhCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDbEksT0FBTyxFQUNOLDBCQUEwQixFQUMxQix1Q0FBdUMsR0FDdkMsTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLEVBQ04scUNBQXFDLEVBQ3JDLHNDQUFzQyxHQUN0QyxNQUFNLGtGQUFrRixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZE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