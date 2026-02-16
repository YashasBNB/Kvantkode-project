/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../platform/update/common/update.config.contribution.js';
import { app, dialog } from 'electron';
import { unlinkSync, promises } from 'fs';
import { URI } from '../../base/common/uri.js';
import { coalesce, distinct } from '../../base/common/arrays.js';
import { Promises } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { ExpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { isValidBasename, parseLineAndColumnAware, sanitizeFilePath, } from '../../base/common/extpath.js';
import { Event } from '../../base/common/event.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Schemas } from '../../base/common/network.js';
import { basename, resolve } from '../../base/common/path.js';
import { mark } from '../../base/common/performance.js';
import { isMacintosh, isWindows, OS } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { rtrim, trim } from '../../base/common/strings.js';
import { Promises as FSPromises } from '../../base/node/pfs.js';
import { ProxyChannel } from '../../base/parts/ipc/common/ipc.js';
import { connect as nodeIPCConnect, serve as nodeIPCServe, XDG_RUNTIME_DIR, } from '../../base/parts/ipc/node/ipc.net.js';
import { CodeApplication } from './app.js';
import { localize } from '../../nls.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { DiagnosticsService } from '../../platform/diagnostics/node/diagnosticsService.js';
import { EnvironmentMainService, IEnvironmentMainService, } from '../../platform/environment/electron-main/environmentMainService.js';
import { addArg, parseMainProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILifecycleMainService, LifecycleMainService, } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { BufferLogger } from '../../platform/log/common/bufferLog.js';
import { ConsoleMainLogger, getLogLevel, ILoggerService, ILogService, } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IProtocolMainService } from '../../platform/protocol/electron-main/protocol.js';
import { ProtocolMainService } from '../../platform/protocol/electron-main/protocolMainService.js';
import { ITunnelService } from '../../platform/tunnel/common/tunnel.js';
import { TunnelService } from '../../platform/tunnel/node/tunnelService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/electron-utility/requestService.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { SignService } from '../../platform/sign/node/signService.js';
import { IStateReadService, IStateService } from '../../platform/state/node/state.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { IThemeMainService, ThemeMainService, } from '../../platform/theme/electron-main/themeMainService.js';
import { IUserDataProfilesMainService, UserDataProfilesMainService, } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { DisposableStore } from '../../base/common/lifecycle.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { ILoggerMainService, LoggerMainService, } from '../../platform/log/electron-main/loggerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { massageMessageBoxOptions } from '../../platform/dialogs/common/dialogs.js';
import { StateService } from '../../platform/state/node/stateService.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
/**
 * The main VS Code entry point.
 *
 * Note: This class can exist more than once for example when VS Code is already
 * running and a second instance is started from the command line. It will always
 * try to communicate with an existing instance to prevent that 2 VS Code instances
 * are running at the same time.
 */
class CodeMain {
    main() {
        try {
            this.startup();
        }
        catch (error) {
            console.error(error.message);
            app.exit(1);
        }
    }
    async startup() {
        // Set the error handler early enough so that we are not getting the
        // default electron error dialog popping up
        setUnexpectedErrorHandler((err) => console.error(err));
        // Create services
        const [instantiationService, instanceEnvironment, environmentMainService, configurationService, stateMainService, bufferLogger, productService, userDataProfilesMainService,] = this.createServices();
        try {
            // Init services
            try {
                await this.initServices(environmentMainService, userDataProfilesMainService, configurationService, stateMainService, productService);
            }
            catch (error) {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                throw error;
            }
            // Startup
            await instantiationService.invokeFunction(async (accessor) => {
                const logService = accessor.get(ILogService);
                const lifecycleMainService = accessor.get(ILifecycleMainService);
                const fileService = accessor.get(IFileService);
                const loggerService = accessor.get(ILoggerService);
                // Create the main IPC server by trying to be the server
                // If this throws an error it means we are not the first
                // instance of VS Code running and so we would quit.
                const mainProcessNodeIpcServer = await this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, true);
                // Write a lockfile to indicate an instance is running
                // (https://github.com/microsoft/vscode/issues/127861#issuecomment-877417451)
                FSPromises.writeFile(environmentMainService.mainLockfile, String(process.pid)).catch((err) => {
                    logService.warn(`app#startup(): Error writing main lockfile: ${err.stack}`);
                });
                // Delay creation of spdlog for perf reasons (https://github.com/microsoft/vscode/issues/72906)
                bufferLogger.logger = loggerService.createLogger('main', {
                    name: localize('mainLog', 'Main'),
                });
                // Lifecycle
                Event.once(lifecycleMainService.onWillShutdown)((evt) => {
                    fileService.dispose();
                    configurationService.dispose();
                    evt.join('instanceLockfile', promises.unlink(environmentMainService.mainLockfile).catch(() => {
                        /* ignored */
                    }));
                });
                return instantiationService
                    .createInstance(CodeApplication, mainProcessNodeIpcServer, instanceEnvironment)
                    .startup();
            });
        }
        catch (error) {
            instantiationService.invokeFunction(this.quit, error);
        }
    }
    createServices() {
        const services = new ServiceCollection();
        const disposables = new DisposableStore();
        process.once('exit', () => disposables.dispose());
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentMainService = new EnvironmentMainService(this.resolveArgs(), productService);
        const instanceEnvironment = this.patchEnvironment(environmentMainService); // Patch `process.env` with the instance's environment
        services.set(IEnvironmentMainService, environmentMainService);
        // Logger
        const loggerService = new LoggerMainService(getLogLevel(environmentMainService), environmentMainService.logsHome);
        services.set(ILoggerMainService, loggerService);
        // Log: We need to buffer the spdlog logs until we are sure
        // we are the only instance running, otherwise we'll have concurrent
        // log file access on Windows (https://github.com/microsoft/vscode/issues/41218)
        const bufferLogger = new BufferLogger(loggerService.getLogLevel());
        const logService = disposables.add(new LogService(bufferLogger, [new ConsoleMainLogger(loggerService.getLogLevel())]));
        services.set(ILogService, logService);
        // Files
        const fileService = new FileService(logService);
        services.set(IFileService, fileService);
        const diskFileSystemProvider = new DiskFileSystemProvider(logService);
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // State
        const stateService = new StateService(1 /* SaveStrategy.DELAYED */, environmentMainService, logService, fileService);
        services.set(IStateReadService, stateService);
        services.set(IStateService, stateService);
        // User Data Profiles
        const userDataProfilesMainService = new UserDataProfilesMainService(stateService, uriIdentityService, environmentMainService, fileService, logService);
        services.set(IUserDataProfilesMainService, userDataProfilesMainService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesMainService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = disposables.add(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = disposables.add(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentMainService.policyFile) {
            policyService = disposables.add(new FilePolicyService(environmentMainService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = new ConfigurationService(userDataProfilesMainService.defaultProfile.settingsResource, fileService, policyService, logService);
        services.set(IConfigurationService, configurationService);
        // Lifecycle
        services.set(ILifecycleMainService, new SyncDescriptor(LifecycleMainService, undefined, false));
        // Request
        services.set(IRequestService, new SyncDescriptor(RequestService, undefined, true));
        // Themes
        services.set(IThemeMainService, new SyncDescriptor(ThemeMainService));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        services.set(ITunnelService, new SyncDescriptor(TunnelService));
        // Protocol (instantiated early and not using sync descriptor for security reasons)
        services.set(IProtocolMainService, new ProtocolMainService(environmentMainService, userDataProfilesMainService, logService));
        return [
            new InstantiationService(services, true),
            instanceEnvironment,
            environmentMainService,
            configurationService,
            stateService,
            bufferLogger,
            productService,
            userDataProfilesMainService,
        ];
    }
    patchEnvironment(environmentMainService) {
        const instanceEnvironment = {
            VSCODE_IPC_HOOK: environmentMainService.mainIPCHandle,
        };
        ['VSCODE_NLS_CONFIG', 'VSCODE_PORTABLE'].forEach((key) => {
            const value = process.env[key];
            if (typeof value === 'string') {
                instanceEnvironment[key] = value;
            }
        });
        Object.assign(process.env, instanceEnvironment);
        return instanceEnvironment;
    }
    async initServices(environmentMainService, userDataProfilesMainService, configurationService, stateService, productService) {
        await Promises.settled([
            // Environment service (paths)
            Promise.all([
                this.allowWindowsUNCPath(environmentMainService.extensionsPath), // enable extension paths on UNC drives...
                environmentMainService.codeCachePath, // ...other user-data-derived paths should already be enlisted from `main.js`
                environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath,
                userDataProfilesMainService.defaultProfile.globalStorageHome.with({
                    scheme: Schemas.file,
                }).fsPath,
                environmentMainService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.localHistoryHome.with({ scheme: Schemas.file }).fsPath,
                environmentMainService.backupHome,
            ].map((path) => (path ? promises.mkdir(path, { recursive: true }) : undefined))),
            // State service
            stateService.init(),
            // Configuration service
            configurationService.initialize(),
        ]);
        // Initialize user data profiles after initializing the state
        userDataProfilesMainService.init();
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
    async claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, retry) {
        // Try to setup a server for running. If that succeeds it means
        // we are the first instance to startup. Otherwise it is likely
        // that another instance is already running.
        let mainProcessNodeIpcServer;
        try {
            mark('code/willStartMainServer');
            mainProcessNodeIpcServer = await nodeIPCServe(environmentMainService.mainIPCHandle);
            mark('code/didStartMainServer');
            Event.once(lifecycleMainService.onWillShutdown)(() => mainProcessNodeIpcServer.dispose());
        }
        catch (error) {
            // Handle unexpected errors (the only expected error is EADDRINUSE that
            // indicates another instance of VS Code is running)
            if (error.code !== 'EADDRINUSE') {
                // Show a dialog for errors that can be resolved by the user
                this.handleStartupDataDirError(environmentMainService, productService, error);
                // Any other runtime error is just printed to the console
                throw error;
            }
            // there's a running instance, let's connect to it
            let client;
            try {
                client = await nodeIPCConnect(environmentMainService.mainIPCHandle, 'main');
            }
            catch (error) {
                // Handle unexpected connection errors by showing a dialog to the user
                if (!retry || isWindows || error.code !== 'ECONNREFUSED') {
                    if (error.code === 'EPERM') {
                        this.showStartupWarningDialog(localize('secondInstanceAdmin', 'Another instance of {0} is already running as administrator.', productService.nameShort), localize('secondInstanceAdminDetail', 'Please close the other instance and try again.'), productService);
                    }
                    throw error;
                }
                // it happens on Linux and OS X that the pipe is left behind
                // let's delete it, since we can't connect to it and then
                // retry the whole thing
                try {
                    unlinkSync(environmentMainService.mainIPCHandle);
                }
                catch (error) {
                    logService.warn('Could not delete obsolete instance handle', error);
                    throw error;
                }
                return this.claimInstance(logService, environmentMainService, lifecycleMainService, instantiationService, productService, false);
            }
            // Tests from CLI require to be the only instance currently
            if (environmentMainService.extensionTestsLocationURI &&
                !environmentMainService.debugExtensionHost.break) {
                const msg = `Running extension tests from the command line is currently only supported if no other instance of ${productService.nameShort} is running.`;
                logService.error(msg);
                client.dispose();
                throw new Error(msg);
            }
            // Show a warning dialog after some timeout if it takes long to talk to the other instance
            // Skip this if we are running with --wait where it is expected that we wait for a while.
            // Also skip when gathering diagnostics (--status) which can take a longer time.
            let startupWarningDialogHandle = undefined;
            if (!environmentMainService.args.wait && !environmentMainService.args.status) {
                startupWarningDialogHandle = setTimeout(() => {
                    this.showStartupWarningDialog(localize('secondInstanceNoResponse', 'Another instance of {0} is running but not responding', productService.nameShort), localize('secondInstanceNoResponseDetail', 'Please close all other instances and try again.'), productService);
                }, 10000);
            }
            const otherInstanceLaunchMainService = ProxyChannel.toService(client.getChannel('launch'), { disableMarshalling: true });
            const otherInstanceDiagnosticsMainService = ProxyChannel.toService(client.getChannel('diagnostics'), { disableMarshalling: true });
            // Process Info
            if (environmentMainService.args.status) {
                return instantiationService.invokeFunction(async () => {
                    const diagnosticsService = new DiagnosticsService(NullTelemetryService, productService);
                    const mainDiagnostics = await otherInstanceDiagnosticsMainService.getMainDiagnostics();
                    const remoteDiagnostics = await otherInstanceDiagnosticsMainService.getRemoteDiagnostics({
                        includeProcesses: true,
                        includeWorkspaceMetadata: true,
                    });
                    const diagnostics = await diagnosticsService.getDiagnostics(mainDiagnostics, remoteDiagnostics);
                    console.log(diagnostics);
                    throw new ExpectedError();
                });
            }
            // Windows: allow to set foreground
            if (isWindows) {
                await this.windowsAllowSetForegroundWindow(otherInstanceLaunchMainService, logService);
            }
            // Send environment over...
            logService.trace('Sending env to running instance...');
            await otherInstanceLaunchMainService.start(environmentMainService.args, process.env);
            // Cleanup
            client.dispose();
            // Now that we started, make sure the warning dialog is prevented
            if (startupWarningDialogHandle) {
                clearTimeout(startupWarningDialogHandle);
            }
            throw new ExpectedError('Sent env to running instance. Terminating...');
        }
        // Print --status usage info
        if (environmentMainService.args.status) {
            console.log(localize('statusWarning', 'Warning: The --status argument can only be used if {0} is already running. Please run it again after {0} has started.', productService.nameShort));
            throw new ExpectedError('Terminating...');
        }
        // Set the VSCODE_PID variable here when we are sure we are the first
        // instance to startup. Otherwise we would wrongly overwrite the PID
        process.env['VSCODE_PID'] = String(process.pid);
        return mainProcessNodeIpcServer;
    }
    handleStartupDataDirError(environmentMainService, productService, error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            const directories = coalesce([
                environmentMainService.userDataPath,
                environmentMainService.extensionsPath,
                XDG_RUNTIME_DIR,
            ]).map((folder) => getPathLabel(URI.file(folder), { os: OS, tildify: environmentMainService }));
            this.showStartupWarningDialog(localize('startupDataDirError', 'Unable to write program user data.'), localize('startupUserDataAndExtensionsDirErrorDetail', '{0}\n\nPlease make sure the following directories are writeable:\n\n{1}', toErrorMessage(error), directories.join('\n')), productService);
        }
    }
    showStartupWarningDialog(message, detail, productService) {
        // use sync variant here because we likely exit after this method
        // due to startup issues and otherwise the dialog seems to disappear
        // https://github.com/microsoft/vscode/issues/104493
        dialog.showMessageBoxSync(massageMessageBoxOptions({
            type: 'warning',
            buttons: [localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, '&&Close')],
            message,
            detail,
        }, productService).options);
    }
    async windowsAllowSetForegroundWindow(launchMainService, logService) {
        if (isWindows) {
            const processId = await launchMainService.getMainProcessId();
            logService.trace('Sending some foreground love to the running instance:', processId);
            try {
                ;
                (await import('windows-foreground-love')).allowSetForegroundWindow(processId);
            }
            catch (error) {
                logService.error(error);
            }
        }
    }
    quit(accessor, reason) {
        const logService = accessor.get(ILogService);
        const lifecycleMainService = accessor.get(ILifecycleMainService);
        let exitCode = 0;
        if (reason) {
            if (reason.isExpected) {
                if (reason.message) {
                    logService.trace(reason.message);
                }
            }
            else {
                exitCode = 1; // signal error to the outside
                if (reason.stack) {
                    logService.error(reason.stack);
                }
                else {
                    logService.error(`Startup error: ${reason.toString()}`);
                }
            }
        }
        lifecycleMainService.kill(exitCode);
    }
    //#region Command line arguments utilities
    resolveArgs() {
        // Parse arguments
        const args = this.validatePaths(parseMainProcessArgv(process.argv));
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        //
        // Note: we are not doing this if the wait marker has been already
        // added as argument. This can happen if VS Code was started from CLI.
        if (args.wait && !args.waitMarkerFilePath) {
            const waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(process.argv, '--waitMarkerFilePath', waitMarkerFilePath);
                args.waitMarkerFilePath = waitMarkerFilePath;
            }
        }
        return args;
    }
    validatePaths(args) {
        // Track URLs if they're going to be used
        if (args['open-url']) {
            args._urls = args._;
            args._ = [];
        }
        // Normalize paths and watch out for goto line mode
        if (!args['remote']) {
            const paths = this.doValidatePaths(args._, args.goto);
            args._ = paths;
        }
        return args;
    }
    doValidatePaths(args, gotoLineMode) {
        const currentWorkingDir = cwd();
        const result = args.map((arg) => {
            let pathCandidate = String(arg);
            let parsedPath = undefined;
            if (gotoLineMode) {
                parsedPath = parseLineAndColumnAware(pathCandidate);
                pathCandidate = parsedPath.path;
            }
            if (pathCandidate) {
                pathCandidate = this.preparePath(currentWorkingDir, pathCandidate);
            }
            const sanitizedFilePath = sanitizeFilePath(pathCandidate, currentWorkingDir);
            const filePathBasename = basename(sanitizedFilePath);
            if (filePathBasename /* can be empty if code is opened on root */ &&
                !isValidBasename(filePathBasename)) {
                return null; // do not allow invalid file names
            }
            if (gotoLineMode && parsedPath) {
                parsedPath.path = sanitizedFilePath;
                return this.toPath(parsedPath);
            }
            return sanitizedFilePath;
        });
        const caseInsensitive = isWindows || isMacintosh;
        const distinctPaths = distinct(result, (path) => path && caseInsensitive ? path.toLowerCase() : path || '');
        return coalesce(distinctPaths);
    }
    preparePath(cwd, path) {
        // Trim trailing quotes
        if (isWindows) {
            path = rtrim(path, '"'); // https://github.com/microsoft/vscode/issues/1498
        }
        // Trim whitespaces
        path = trim(trim(path, ' '), '\t');
        if (isWindows) {
            // Resolve the path against cwd if it is relative
            path = resolve(cwd, path);
            // Trim trailing '.' chars on Windows to prevent invalid file names
            path = rtrim(path, '.');
        }
        return path;
    }
    toPath(pathWithLineAndCol) {
        const segments = [pathWithLineAndCol.path];
        if (typeof pathWithLineAndCol.line === 'number') {
            segments.push(String(pathWithLineAndCol.line));
        }
        if (typeof pathWithLineAndCol.column === 'number') {
            segments.push(String(pathWithLineAndCol.column));
        }
        return segments.join(':');
    }
}
// Main Startup
const code = new CodeMain();
code.main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi1tYWluL21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RixPQUFPLEVBRU4sZUFBZSxFQUNmLHVCQUF1QixFQUN2QixnQkFBZ0IsR0FDaEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLE1B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