/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { hostname, release } from 'os';
import { raceTimeout } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler, } from '../../base/common/errors.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { isWindows, isMacintosh } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { URI } from '../../base/common/uri.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { NativeEnvironmentService } from '../../platform/environment/node/environmentService.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService, } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService, } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService, LogLevel, } from '../../platform/log/common/log.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { StateReadonlyService } from '../../platform/state/node/stateService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryService, } from '../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, } from '../../platform/telemetry/common/telemetryUtils.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { buildTelemetryMessage } from '../../platform/telemetry/node/telemetry.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, } from '../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfilesReadonlyService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId, } from '../../platform/telemetry/node/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { McpManagementCli } from '../../platform/mcp/common/mcpManagementCli.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
class CliMain extends Disposable {
    constructor(argv) {
        super();
        this.argv = argv;
        this.registerListeners();
    }
    registerListeners() {
        // Dispose on exit
        process.once('exit', () => this.dispose());
    }
    async run() {
        // Services
        const [instantiationService, appenders] = await this.initServices();
        return instantiationService.invokeFunction(async (accessor) => {
            const logService = accessor.get(ILogService);
            const fileService = accessor.get(IFileService);
            const environmentService = accessor.get(INativeEnvironmentService);
            const userDataProfilesService = accessor.get(IUserDataProfilesService);
            // Log info
            logService.info('CLI main', this.argv);
            // Error handler
            this.registerErrorHandler(logService);
            // Run based on argv
            await this.doRun(environmentService, fileService, userDataProfilesService, instantiationService);
            // Flush the remaining data in AI adapter (with 1s timeout)
            await Promise.all(appenders.map((a) => {
                raceTimeout(a.flush(), 1000);
            }));
            return;
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.argv, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Init folders
        await Promise.all([
            this.allowWindowsUNCPath(environmentService.appSettingsHome.with({ scheme: Schemas.file }).fsPath),
            this.allowWindowsUNCPath(environmentService.extensionsPath),
        ].map((path) => (path ? fs.promises.mkdir(path, { recursive: true }) : undefined)));
        // Logger
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        // Log
        const logger = this._register(loggerService.createLogger('cli', { name: localize('cli', 'CLI') }));
        const otherLoggers = [];
        if (loggerService.getLogLevel() === LogLevel.Trace) {
            otherLoggers.push(new ConsoleLogger(loggerService.getLogLevel()));
        }
        const logService = this._register(new LogService(logger, otherLoggers));
        services.set(ILogService, logService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // Uri Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const stateService = new StateReadonlyService(1 /* SaveStrategy.DELAYED */, environmentService, logService, fileService);
        const userDataProfilesService = new UserDataProfilesReadonlyService(stateService, uriIdentityService, environmentService, fileService, logService);
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = this._register(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = this._register(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentService.policyFile) {
            policyService = this._register(new FilePolicyService(environmentService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([stateService.init(), configurationService.initialize()]);
        // Get machine ID
        let machineId = undefined;
        try {
            machineId = await resolveMachineId(stateService, logService);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                logService.error(error);
            }
        }
        const sqmId = await resolveSqmId(stateService, logService);
        const devDeviceId = await resolvedevDeviceId(stateService, logService);
        // Initialize user data profiles after initializing the state
        userDataProfilesService.init();
        // URI Identity
        services.set(IUriIdentityService, new UriIdentityService(fileService));
        // Request
        const requestService = new RequestService('local', configurationService, environmentService, logService);
        services.set(IRequestService, requestService);
        // Download Service
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extensions
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService, undefined, true));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false));
        // Telemetry
        const appenders = [];
        const isInternal = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            if (productService.aiConfig && productService.aiConfig.ariaKey) {
                appenders.push(new OneDataSystemAppender(requestService, isInternal, 'monacoworkbench', null, productService.aiConfig.ariaKey));
            }
            const config = {
                appenders,
                sendErrorTelemetry: false,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, machineId, sqmId, devDeviceId, isInternal),
                piiPaths: getPiiPathsFromEnvironment(environmentService),
            };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        return [new InstantiationService(services), appenders];
    }
    allowWindowsUNCPath(path) {
        if (isWindows) {
            const host = getUNCHost(path);
            if (host) {
                addUNCHostToAllowlist(host);
            }
        }
        return path;
    }
    registerErrorHandler(logService) {
        // Install handler for unexpected errors
        setUnexpectedErrorHandler((error) => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in CLI]: ${message}`);
        });
        // Handle unhandled errors that can occur
        process.on('uncaughtException', (err) => {
            if (!isSigPipeError(err)) {
                onUnexpectedError(err);
            }
        });
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
    }
    async doRun(environmentService, fileService, userDataProfilesService, instantiationService) {
        let profile = undefined;
        if (environmentService.args.profile) {
            profile = userDataProfilesService.profiles.find((p) => p.name === environmentService.args.profile);
            if (!profile) {
                throw new Error(`Profile '${environmentService.args.profile}' not found.`);
            }
        }
        const profileLocation = (profile ?? userDataProfilesService.defaultProfile).extensionsResource;
        // List Extensions
        if (this.argv['list-extensions']) {
            return instantiationService
                .createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false))
                .listExtensions(!!this.argv['show-versions'], this.argv['category'], profileLocation);
        }
        // Install Extension
        else if (this.argv['install-extension'] || this.argv['install-builtin-extension']) {
            const installOptions = {
                isMachineScoped: !!this.argv['do-not-sync'],
                installPreReleaseVersion: !!this.argv['pre-release'],
                donotIncludePackAndDependencies: !!this.argv['do-not-include-pack-dependencies'],
                profileLocation,
            };
            return instantiationService
                .createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false))
                .installExtensions(this.asExtensionIdOrVSIX(this.argv['install-extension'] || []), this.asExtensionIdOrVSIX(this.argv['install-builtin-extension'] || []), installOptions, !!this.argv['force']);
        }
        // Uninstall Extension
        else if (this.argv['uninstall-extension']) {
            return instantiationService
                .createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false))
                .uninstallExtensions(this.asExtensionIdOrVSIX(this.argv['uninstall-extension']), !!this.argv['force'], profileLocation);
        }
        else if (this.argv['update-extensions']) {
            return instantiationService
                .createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false))
                .updateExtensions(profileLocation);
        }
        // Locate Extension
        else if (this.argv['locate-extension']) {
            return instantiationService
                .createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false))
                .locateExtension(this.argv['locate-extension']);
        }
        // Install MCP server
        else if (this.argv['add-mcp']) {
            return instantiationService
                .createInstance(McpManagementCli, new ConsoleLogger(LogLevel.Info, false))
                .addMcpDefinitions(this.argv['add-mcp']);
        }
        // Telemetry
        else if (this.argv['telemetry']) {
            console.log(await buildTelemetryMessage(environmentService.appRoot, environmentService.extensionsPath));
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map((input) => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
export async function main(argv) {
    const cliMain = new CliMain(argv);
    try {
        await cliMain.run();
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL25vZGUvY2xpUHJvY2Vzc01haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDdEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixFQUNqQix5QkFBeUIsR0FDekIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVuRixPQUFPLEVBQUUseUJB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