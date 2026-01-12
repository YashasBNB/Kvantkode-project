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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvbm9kZS9jbGlQcm9jZXNzTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLHlCQUF5QixHQUN6QixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRW5GLE9BQU8sRUFB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